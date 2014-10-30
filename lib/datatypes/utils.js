var createType = require("../utils").createType;

module.exports = {
  bool: createType({ read: readBool, write: writeBool, sizeOf: 1 }),
  varint: createType({ read: readVarInt, write: writeVarInt, sizeOf: sizeOfVarInt }),
  buffer: createType({ read: readBuffer, write: writeBuffer, sizeOf: sizeOfBuffer }),
  string: createType({ read: readString, write: writeString, sizeOf: sizeOfString }),
  cstring: createType({ read: readCString, write: writeCString, sizeOf: sizeOfCString })
};

var getCount = require("../utils").getCount;

function readBool(buffer, offset) {
  if (offset + 1 > buffer.length) return null;
  var value = buffer.readInt8(offset);
  return {
    value: !!value,
    size: 1,
  };
}

function writeBool(value, buffer, offset) {
  buffer.writInt8(value, offset);
  return offset + 1;
}

function readBuffer(buffer, offset, typeArgs, rootNode) {
  var count = 0;
  var size = 0;
  (function (obj) {
    size = obj.offset - offset;
    offset = obj.offset;
    count = obj.count;
  })(getCount.call(this, buffer, offset, typeArgs, rootNode));
  return {
    value: buffer.slice(offset, offset + count),
    size: size + count
  };
}

function writeBuffer(value, buffer, offset, typeArgs, rootNode) {
    if (typeof typeArgs.countType !== "undefined")
      offset = write(value.length, buffer, offset, { type: typeArgs.countType }, rootNode);
    value.copy(buffer, offset);
    return offset + value.length;
}

function sizeOfBuffer(value, typeArgs, rootNode) {
    var size = 0;
    if (typeof typeArgs.countType !== "undefined")
      size += sizeOf(value.length, { type: typeArgs.countType }, rootNode);
    size += value.length;
    return size;
}

function readString(buffer, offset, typeArgs, rootNode) {
  if (typeof typeArgs.count === "undefined" && typeof typeArgs.countType === "undefined")
    typeArgs.countType = "varint";
  var results = readBuffer.call(this, buffer, offset, typeArgs, rootNode);
  results.value = results.value.toString('utf8');
  return results;
}

function writeString(value, buffer, offset, typeArgs, rootNode) {
  if (typeof typeArgs.count === "undefined" && typeof typeArgs.countType === "undefined")
    typeArgs.countType = "varint";
  return writeBuffer(new Buffer(value, 'utf8'), buffer, offset, typeArgs, rootNode);
}

function sizeOfString(value, typeArgs, rootNode) {
  if (typeof typeArgs.count === "undefined" && typeof typeArgs.countType === "undefined")
    typeArgs.countType = "varint";
  return sizeOfBuffer(new Buffer(value, 'utf8'), typeArgs, rootNode);
}

function readVarInt(buffer, offset) {
  var result = 0;
  var shift = 0;
  var cursor = offset;

  while (true) {
    if (cursor + 1 > buffer.length) return null;
    var b = buffer.readUInt8(cursor);
    result |= ((b & 0x7f) << shift); // Add the bits to our number, except MSB
    cursor++;
    if (!(b & 0x80)) { // If the MSB is not set, we return the number
      return {
        value: result,
        size: cursor - offset
      };
    }
    shift += 7; // we only have 7 bits, MSB being the return-trigger
    assert.ok(shift < 64, "varint is too big"); // Make sure our shift don't overflow.
  }
}

function writeVarInt(value, buffer, offset) {
  var cursor = 0;
  while (value & ~0x7F) {
    buffer.writeUInt8((value & 0xFF) | 0x80, offset + cursor);
    cursor++;
    value >>>= 7;
  }
  buffer.writeUInt8(value, offset + cursor);
  return offset + cursor + 1;
}

function sizeOfVarInt(value) {
  var cursor = 0;
  while (value & ~0x7F) {
    value >>>= 7;
    cursor++;
  }
  return cursor + 1;
}

function readCString(buffer, offset) {
  var str = "";
  var currChar;
  while (offset < buffer.length && buffer[offset] != 0x00)
    str += buffer[offset++];
  if (offset < buffer.length)
    return null;
  else
    return str;
}

function writeCString(value, buffer, offset) {
  buffer.write(value, offset);
  offset += value.length;
  buffer.writeInt8(0x00, offset);
  return offset + 1;
}

function sizeOfCString(value) {
  return value.length + 1;
}
