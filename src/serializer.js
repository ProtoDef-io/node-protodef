const Transform = require('readable-stream').Transform

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
  }

  parsePacketBuffer (buffer) {
    return this.proto.parsePacketBuffer(this.mainType, buffer)
  }

  _transform (chunk, enc, cb) {
    let packet
    try {
      packet = this.parsePacketBuffer(chunk)
      if (packet.metadata.size !== chunk.length && !this.noErrorLogging) {
        console.log('Chunk size is ' + chunk.length + ' but only ' + packet.metadata.size + ' was read ; partial packet : ' +
          JSON.stringify(packet.data) + '; buffer :' + chunk.toString('hex'))
      }
    } catch (e) {
      if (e.partialReadError) {
        if (!this.noErrorLogging) {
          console.log(e.stack)
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

class LazyPacketParser extends Transform {
  constructor (proto, mainType, shallowType, noErrorLogging = false) {
    super({ readableObjectMode: true })
    this.proto = proto
    this.mainType = mainType
    this.shallowType = shallowType
    this.noErrorLogging = noErrorLogging
  }

  parsePacketBuffer (buffer) {
    let packetName
    try {
      packetName = this.proto.parsePacketBuffer(this.shallowType, buffer).data.name
    } catch (e) {
      console.error(e)
      return this.proto.parsePacketBuffer(this.mainType, buffer)
    }

    const packetParams = {
      toJSON: () => '' // lot of accesses to toJSON for some reason, not sure who's making these
    }

    const self = this
    const paramsProxy = {
      get: function (target, prop, receiver) {
        if (!(prop in target)) {
          console.log(`parsing for ${prop}`)
          const parsed = self.proto.parsePacketBuffer(self.mainType, buffer).data.params
          Object.assign(packetParams, parsed)
        }
        return Reflect.get(...arguments)
      }
    }

    let packet = {
      data: {
        name: packetName,
        params: new Proxy(packetParams, paramsProxy)
      },
      metadata: { size: buffer.length },
      buffer
    }

    return packet
  }

  _transform (chunk, enc, cb) {
    let packet
    try {
      packet = this.parsePacketBuffer(chunk)
      if (packet.metadata.size !== chunk.length && !this.noErrorLogging) {
        console.log('Chunk size is ' + chunk.length + ' but only ' + packet.metadata.size + ' was read ; partial packet : ' +
          JSON.stringify(packet.data) + '; buffer :' + chunk.toString('hex'))
      }
    } catch (e) {
      if (e.partialReadError) {
        if (!this.noErrorLogging) {
          console.log(e.stack)
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
  Serializer: Serializer,
  Parser: Parser,
  FullPacketParser: FullPacketParser,
  LazyPacketParser: LazyPacketParser
}
