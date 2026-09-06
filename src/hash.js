const crypto = require('crypto')

// Reflected table-driven CRC with all-ones init and final xor; `poly` is the
// reversed polynomial.
const tables = {}
function table (poly) {
  if (!tables[poly]) {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? poly ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    tables[poly] = t
  }
  return tables[poly]
}

function crc (poly, buffer) {
  const t = table(poly)
  let c = -1
  for (let i = 0; i < buffer.length; i++) c = t[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

const algorithms = {
  crc32: buffer => crc(0xEDB88320, buffer),
  crc32c: buffer => crc(0x82F63B78, buffer)
}

// CRC digests are unsigned integers; every other algorithm is delegated to
// node's crypto and yields a Buffer.
function digest (alg, buffer) {
  const algorithm = algorithms[alg]
  if (algorithm) return algorithm(buffer)
  return crypto.createHash(alg).update(buffer).digest()
}

module.exports = { digest, algorithms }
