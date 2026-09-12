const { getFieldInfo } = require('../utils')

// CRC-32C (Castagnoli): reflected table-driven, all-ones init and final xor.
// The compiler copies this function into the code it generates, so it has to
// stand on its own: no imports, no module scope, its table cached on itself.
function crc32c (buffer) {
  let table = crc32c.table
  if (!table) {
    table = crc32c.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0x82F63B78 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < buffer.length; i++) c = table[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

// `alg` is an explicit list in the spec, so a protocol means the same thing in
// every implementation; adding an algorithm here is a spec change. The width of
// the digest is what lets a hash be sized without hashing.
const algorithms = {
  crc32c: { bytes: 4, digest: crc32c }
}

function digest (alg, buffer) {
  const algorithm = algorithms[alg]
  if (!algorithm) throw new Error('Unknown hash algorithm: ' + alg)
  return algorithm.digest(buffer)
}

function readHash (buffer, offset, { type }, rootNode) {
  return this.read(buffer, offset, type, rootNode)
}

// A CRC is unsigned; a signed `type` takes its two's complement.
function writeHash (value, buffer, offset, { alg, type, body }, rootNode) {
  const bodyBuffer = Buffer.alloc(this.sizeOf(value, body, rootNode))
  this.write(value, bodyBuffer, 0, body, rootNode)
  const hash = digest(alg, bodyBuffer)
  try {
    return this.write(hash, buffer, offset, type, rootNode)
  } catch (e) {
    if (!(e instanceof RangeError)) throw e
    return this.write(hash | 0, buffer, offset, type, rootNode)
  }
}

// The digest has a fixed width, so the size of a hash never depends on the
// value: `type` is required to be of constant size and is looked up as one.
function sizeOfHash (value, { alg, type }, rootNode) {
  const functions = this.types[getFieldInfo(type).type]
  const size = functions ? functions[2] : undefined
  if (typeof size !== 'number') throw new Error('hash type must be of constant size, ' + JSON.stringify(type) + ' is not')
  if (size < algorithms[alg].bytes) throw new Error('hash type is too small for a ' + alg + ' digest')
  return size
}

module.exports = {
  digest,
  algorithms,
  hash: [readHash, writeHash, sizeOfHash, require('../../ProtoDef/schemas/utils.json').hash]
}
