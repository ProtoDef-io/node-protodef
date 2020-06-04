const { getCount, sendCount, calcCount, PartialReadError } = require('../utils')

function readMapper (buffer, offset, { type, mappings }, rootNode) {
  const { size, value } = this.read(buffer, offset, type, rootNode)
  for (const key in mappings) {
    if (key === value || +key === +value) {
      return { value: mappings[key], size }
    }
  }
  throw new Error(`${typeof value} "${value}" is not in the mappings value`)
}

function writeMapper (value, buffer, offset, { type, mappings }, rootNode) {
  for (const key in mappings) {
    const writeValue = mappings[key]
    if (writeValue === value || +writeValue === +value) {
      return this.write(key, buffer, offset, type, rootNode)
    }
  }
  throw new Error(`${value} is not in the mappings value`)
}

function sizeOfMapper (value, { type, mappings }, rootNode) {
  for (const key in mappings) {
    const sizeValue = mappings[key]
    if (sizeValue === value || +sizeValue === +value) {
      return this.sizeOf(key, type, rootNode)
    }
  }
  throw new Error(`${value} is not in the mappings value`)
}

function readVarInt (buffer, offset) {
  let value = 0
  let size = 0
  while (true) {
    const v = buffer[offset + size]
    value |= (v & 0x7F) << (size++ * 7)
    if ((v & 0x80) === 0) break
  }
  if (offset + size > buffer.length) throw new PartialReadError()
  return { value, size }
}

function sizeOfVarInt (value) {
  let size = 1
  while (value & ~0x7F) {
    size++
    value >>>= 7
  }
  return size
}

function writeVarInt (value, buffer, offset) {
  while (value & ~0x7F) {
    buffer[offset++] = (value & 0xFF) | 0x80
    value >>>= 7
  }
  buffer[offset++] = value | 0
  return offset
}

function readPString (buffer, offset, typeArgs, rootNode) {
  const { size, count } = getCount.call(this, buffer, offset, typeArgs, rootNode)
  const cursor = offset + size
  const strEnd = cursor + count
  if (strEnd > buffer.length) {
    throw new PartialReadError('Missing characters in string, found size is ' +
    buffer.length + ' expected size was ' + strEnd)
  }
  return {
    value: buffer.toString('utf8', cursor, strEnd),
    size: size + count
  }
}

function writePString (value, buffer, offset, typeArgs, rootNode) {
  const length = Buffer.byteLength(value, 'utf8')
  offset = sendCount.call(this, length, buffer, offset, typeArgs, rootNode)
  buffer.write(value, offset, length, 'utf8')
  return offset + length
}

function sizeOfPString (value, typeArgs, rootNode) {
  const length = Buffer.byteLength(value, 'utf8')
  const size = calcCount.call(this, length, typeArgs, rootNode)
  return size + length
}

function readBool (buffer, offset) {
  if (buffer.length <= offset) throw new PartialReadError()
  return {
    value: buffer[offset] === 1,
    size: 1
  }
}

function writeBool (value, buffer, offset) {
  buffer.writeUInt8(value & 1, offset++)
  return offset
}

function readBuffer (buffer, offset, typeArgs, rootNode) {
  const { size, count } = getCount.call(this, buffer, offset, typeArgs, rootNode)
  offset += size
  if (offset + count > buffer.length) throw new PartialReadError()
  return {
    value: buffer.slice(offset, offset + count),
    size: size + count
  }
}

function writeBuffer (value, buffer, offset, typeArgs, rootNode) {
  offset = sendCount.call(this, value.length, buffer, offset, typeArgs, rootNode)
  return offset + value.copy(buffer, offset)
}

function sizeOfBuffer (value, typeArgs, rootNode) {
  return calcCount.call(this, value.length, typeArgs, rootNode) + value.length
}

function readVoid () {
  return {
    value: undefined,
    size: 0
  }
}

function writeVoid (value, buffer, offset) {
  return offset
}

function generateBitMask (n) {
  return (1 << n) - 1
}

function readBitField (buffer, offset, typeArgs) {
  const beginOffset = offset
  let curVal = null
  let bits = 0
  const results = {}
  results.value = typeArgs.reduce((acc, { size, signed, name }) => {
    let currentSize = size
    let val = 0
    while (currentSize > 0) {
      if (bits === 0) {
        if (buffer.length < offset + 1) { throw new PartialReadError() }
        curVal = buffer[offset++]
        bits = 8
      }
      const bitsToRead = Math.min(currentSize, bits)
      val = (val << bitsToRead) | (curVal & generateBitMask(bits)) >> (bits - bitsToRead)
      bits -= bitsToRead
      currentSize -= bitsToRead
    }
    if (signed && val >= 1 << (size - 1)) { val -= 1 << size }
    acc[name] = val
    return acc
  }, {})
  results.size = offset - beginOffset
  return results
}
function writeBitField (value, buffer, offset, typeArgs) {
  let toWrite = 0
  let bits = 0
  typeArgs.forEach(({ size, signed, name }) => {
    const val = value[name]
    if ((!signed && val < 0) || (signed && val < -(1 << (size - 1)))) { throw new Error(value + ' < ' + signed ? (-(1 << (size - 1))) : 0) } else if ((!signed && val >= 1 << size) ||
        (signed && val >= (1 << (size - 1)) - 1)) { throw new Error(value + ' >= ' + signed ? (1 << size) : ((1 << (size - 1)) - 1)) }
    while (size > 0) {
      const writeBits = Math.min(8 - bits, size)
      toWrite = toWrite << writeBits |
        ((val >> (size - writeBits)) & generateBitMask(writeBits))
      size -= writeBits
      bits += writeBits
      if (bits === 8) {
        buffer[offset++] = toWrite
        bits = 0
        toWrite = 0
      }
    }
  })
  if (bits !== 0) { buffer[offset++] = toWrite << (8 - bits) }
  return offset
}

function sizeOfBitField (value, typeArgs) {
  let i = 0
  for (const { size } of typeArgs) { i += size }
  return Math.ceil(i / 8)
}

function readCString (buffer, offset) {
  const index = buffer.indexOf(0x00)
  if (index === -1) throw new PartialReadError()
  return {
    value: buffer.toString('utf8', offset, index),
    size: index - offset + 1
  }
}

function writeCString (value, buffer, offset) {
  const length = Buffer.byteLength(value, 'utf8')
  buffer.write(value, offset, length, 'utf8')
  return buffer.writeInt8(0x00, offset + length)
}

function sizeOfCString (value) {
  return Buffer.byteLength(value, 'utf8') + 1
}

module.exports = {
  'varint': [readVarInt, writeVarInt, sizeOfVarInt, require('../../ProtoDef/schemas/utils.json')['varint']],
  'bool': [readBool, writeBool, 1, require('../../ProtoDef/schemas/utils.json')['bool']],
  'pstring': [readPString, writePString, sizeOfPString, require('../../ProtoDef/schemas/utils.json')['pstring']],
  'buffer': [readBuffer, writeBuffer, sizeOfBuffer, require('../../ProtoDef/schemas/utils.json')['buffer']],
  'void': [readVoid, writeVoid, 0, require('../../ProtoDef/schemas/utils.json')['void']],
  'bitfield': [readBitField, writeBitField, sizeOfBitField, require('../../ProtoDef/schemas/utils.json')['bitfield']],
  'cstring': [readCString, writeCString, sizeOfCString, require('../../ProtoDef/schemas/utils.json')['cstring']],
  'mapper': [readMapper, writeMapper, sizeOfMapper, require('../../ProtoDef/schemas/utils.json')['mapper']]
}
