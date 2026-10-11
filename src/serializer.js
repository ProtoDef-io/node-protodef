const Transform = require('readable-stream').Transform

// A malformed stream can make the same packet fail to parse for every frame it sends -- thousands
// of identical stacks a minute. Log the first occurrence of each in full, then only at 1, 2, 4, 8,
// ... so a persistent fault stays O(log n) instead of unbounded. Keyed per parser instance.
function logThrottled (counts, key, full) {
  const n = (counts.get(key) || 0) + 1
  counts.set(key, n)
  if (n === 1) console.log(full)
  else if ((n & (n - 1)) === 0) console.log(`${key} (repeated ${n} times)`)
}

class Serializer extends Transform {
  constructor (proto, mainType) {
    super({ writableObjectMode: true })
    this.proto = proto
    this.mainType = mainType
    this.queue = Buffer.alloc(0)
  }

  createPacketBuffer (packet) {
    return this.proto.createPacketBuffer(this.mainType, packet)
  }

  _transform (chunk, enc, cb) {
    let buf
    try {
      buf = this.createPacketBuffer(chunk)
    } catch (e) {
      return cb(e)
    }
    this.push(buf)
    return cb()
  }
}

class Parser extends Transform {
  constructor (proto, mainType) {
    super({ readableObjectMode: true })
    this.proto = proto
    this.mainType = mainType
    this.queue = Buffer.alloc(0)
  }

  parsePacketBuffer (buffer) {
    return this.proto.parsePacketBuffer(this.mainType, buffer)
  }

  _transform (chunk, enc, cb) {
    this.queue = Buffer.concat([this.queue, chunk])
    while (true) {
      let packet
      try {
        packet = this.parsePacketBuffer(this.queue)
      } catch (e) {
        if (e.partialReadError) { return cb() } else {
          e.buffer = this.queue
          this.queue = Buffer.alloc(0)
          return cb(e)
        }
      }

      this.push(packet)
      this.queue = this.queue.slice(packet.metadata.size)
    }
  }
}

class FullPacketParser extends Transform {
  constructor (proto, mainType, noErrorLogging = false) {
    super({ readableObjectMode: true })
    this.proto = proto
    this.mainType = mainType
    this.noErrorLogging = noErrorLogging
    this.errorCounts = new Map()
  }

  parsePacketBuffer (buffer) {
    return this.proto.parsePacketBuffer(this.mainType, buffer)
  }

  _transform (chunk, enc, cb) {
    let packet
    try {
      packet = this.parsePacketBuffer(chunk)
      if (packet.metadata.size !== chunk.length && !this.noErrorLogging) {
        logThrottled(this.errorCounts, 'chunk size mismatch',
          'Chunk size is ' + chunk.length + ' but only ' + packet.metadata.size + ' was read ; partial packet : ' +
          JSON.stringify(packet.data) + '; buffer :' + chunk.toString('hex'))
      }
    } catch (e) {
      if (e.partialReadError) {
        e.buffer = chunk
        this.emit('partialReadError', e)
        if (!this.noErrorLogging) {
          logThrottled(this.errorCounts, e.stack.split('\n')[0], e.stack)
        }
        return cb()
      } else {
        return cb(e)
      }
    }
    this.push(packet)
    cb()
  }
}

module.exports = {
  Serializer,
  Parser,
  FullPacketParser
}
