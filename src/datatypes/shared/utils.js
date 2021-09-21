const { PartialReadError, Result } = require('../../utils')
const schema = require('../../../ProtoDef/schemas/utils.json')

const LOG2 = Math.log2(0x7F)
function readVarInt (buffer, offset) {
  let value = 0
  let size = 0
  while (true) {
    const v = buffer[offset + size]
    value |= (v & 0x7F) << (size++ * 7)
    if ((v & 0x80) === 0) break
  }
  if (offset + size > buffer.length) throw new PartialReadError()
  return new Result(value, size)
}

function sizeOfVarInt (value) {
  return value >= 0 ? Math.ceil(Math.log2(Math.max(value, 127)) / LOG2) : 5
}

function writeVarInt (value, buffer, offset) {
  while (value & ~0x7F) {
    buffer[offset++] = (value & 0xFF) | 0x80
    value >>>= 7
  }
  buffer[offset++] = value | 0
  return offset
}

function readBool (buffer, offset) {
  if (buffer.length <= offset) throw new PartialReadError()
  return new Result(buffer[offset] === 1, 1)
}

function writeBool (value, buffer, offset) {
  return buffer.writeUInt8(value & 1, offset)
}

function readVoid () {
  return new Result(undefined, 0)
}

function writeVoid (value, buffer, offset) {
  return offset
}

function readCString (buffer, offset) {
  const index = buffer.indexOf(0x00)
  if (index === -1) throw new PartialReadError()
  return new Result(buffer.toString('utf8', offset, index), index - offset + 1)
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
  'varint': [readVarInt, writeVarInt, sizeOfVarInt, schema['varint']],
  'bool': [readBool, writeBool, 1, schema['bool']],
  'void': [readVoid, writeVoid, 0, schema['void']],
  'cstring': [readCString, writeCString, sizeOfCString, schema['cstring']]
}
