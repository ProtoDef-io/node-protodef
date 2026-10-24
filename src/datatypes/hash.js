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

// The spec allows exactly these as `type`, directly or through an alias: the
// digest is an unsigned 32 bit integer, and a signed type holds the same bits
// read as two's complement.
const hashTypes = { u32: false, i32: true, lu32: false, li32: true }

// Checks the native type an alias resolved to, and returns whether it is signed
function hashTypeIsSigned (native, type) {
  if (!Object.prototype.hasOwnProperty.call(hashTypes, native)) {
    throw new Error('hash type must be a 32 bit integer (' + Object.keys(hashTypes).join(', ') + '), ' + JSON.stringify(type) + ' is not')
  }
  return hashTypes[native]
}

// An alias is added with its native's functions, so it resolves by identity
function resolveHashType (proto, type) {
  const functions = typeof type === 'string' ? proto.types[type] : undefined
  const native = functions && Object.keys(hashTypes).find(name => proto.types[name] === functions)
  return hashTypeIsSigned(native, type)
}

function readHash (buffer, offset, { type }, rootNode) {
  resolveHashType(this, type)
  return this.read(buffer, offset, type, rootNode)
}

function writeHash (value, buffer, offset, { alg, type, body }, rootNode) {
  const signed = resolveHashType(this, type)
  if (typeof body !== 'string') throw new Error('hash body must be a named type, ' + JSON.stringify(body) + ' is not')
  const bodyBuffer = Buffer.alloc(this.sizeOf(value, body, rootNode))
  this.write(value, bodyBuffer, 0, body, rootNode)
  const hash = digest(alg, bodyBuffer)
  return this.write(signed ? hash | 0 : hash, buffer, offset, type, rootNode)
}

// The digest has a fixed width, so a hash is sized without hashing
function sizeOfHash (value, { alg, type }) {
  resolveHashType(this, type)
  return algorithms[alg].bytes
}

module.exports = {
  digest,
  algorithms,
  hashTypeIsSigned,
  hash: [readHash, writeHash, sizeOfHash, require('../../ProtoDef/schemas/utils.json').hash]
}
