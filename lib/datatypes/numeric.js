var createType = require("../utils").createType;

module.exports = {
  'byte': createType({ read: readByte, write: writeByte, sizeOf: 1 }),
  'ubyte': createType({ read: readUByte, write: writeUByte, sizeOf: 1 }),
  'short': createType({ read: readShort, write: writeShort, sizeOf: 2 }),
  'ushort': createType({ read: readUShort, write: writeUShort, sizeOf: 2 }),
  'int': createType({ read: readInt, write: writeInt, sizeOf: 4 }),
  'uint': createType({ read: readUInt, write: writeUInt, sizeOf: 4 }),
  'float': createType({ read: readFloat, write: writeFloat, sizeOf: 4 }),
  'double': createType({ read: readDouble, write: writeDouble, sizeOf: 8 })
};

function readByte(buffer, offset) {
  if (offset + 1 > buffer.length) return null;
  var value = buffer.readInt8(offset);
  return {
    value: value,
    size: 1,
  };
}

function writeByte(value, buffer, offset) {
  buffer.writeInt8(value, offset);
  return offset + 1;
}

function readUByte(buffer, offset) {
  if (offset + 1 > buffer.length) return null;
  var value = buffer.readUInt8(offset);
  return {
    value: value,
    size: 1,
  };
}

function writeUByte(value, buffer, offset) {
  buffer.writeUInt8(value, offset);
  return offset + 1;
}

function readShort(buffer, offset) {
  if (offset + 2 > buffer.length) return null;
  var value = buffer.readInt16BE(offset);
  return {
    value: value,
    size: 2,
  };
}

function writeShort(value, buffer, offset) {
  buffer.writeInt16BE(value, offset);
  return offset + 2;
}

function readUShort(buffer, offset) {
  if (offset + 2 > buffer.length) return null;
  var value = buffer.readUInt16BE(offset);
  return {
    value: value,
    size: 2,
  };
}

function writeUShort(value, buffer, offset) {
  buffer.writeUInt16BE(value, offset);
  return offset + 2;
}

function readInt(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  var value = buffer.readInt32BE(offset);
  return {
    value: value,
    size: 4,
  };
}

function writeInt(value, buffer, offset) {
  buffer.writeInt32BE(value, offset);
  return offset + 4;
}

function readUInt(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  var value = buffer.readUInt32BE(offset);
  return {
    value: value,
    size: 4,
  };
}

function writeUInt(value, buffer, offset) {
  buffer.writeUInt32BE(value, offset);
  return offset + 4;
}

function readFloat(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  var value = buffer.readFloatBE(offset);
  return {
    value: value,
    size: 4,
  };
}

function writeFloat(value, buffer, offset) {
  buffer.writeFloatBE(value, offset);
  return offset + 4;
}

function readDouble(buffer, offset) {
  if (offset + 8 > buffer.length) return null;
  var value = buffer.readDoubleBE(offset);
  return {
    value: value,
    size: 8,
  };
}

function writeDouble(value, buffer, offset) {
  buffer.writeDoubleBE(value, offset);
  return offset + 8;
}
