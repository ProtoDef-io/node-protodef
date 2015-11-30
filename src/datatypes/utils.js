var assert = require('assert');

var { getField, tryDoc } = require("../utils");

module.exports = {
  'varint': [readVarInt, writeVarInt, sizeOfVarInt],
  'bool': [readBool, writeBool, 1],
  'pstring': [readPString, writePString, sizeOfPString],
  'buffer': [readBuffer, writeBuffer, sizeOfBuffer],
  'void': [readVoid, writeVoid, 0],
  'bitfield': [readBitField, writeBitField, sizeOfBitField],
  'cstring': [readCString, writeCString, sizeOfCString],
  'mapper':[readMapper,writeMapper,sizeOfMapper]
};

function readMapper(buffer,offset,{type,mappings},rootNode)
{
  var {size,value}=this.read(buffer, offset, type, rootNode);
  var results={
    size:size,
    value:mappings[value]
  };
  if(results.value==undefined) throw new Error(value+" is not in the mappings value");
  return results;
}

function writeMapper(value,buffer,offset,{type,mappings},rootNode)
{
  var keys=Object.keys(mappings);
  var mappedValue=null;
  for(var i=0;i<keys.length;i++) {
    if(mappings[keys[i]]==value) {
      mappedValue = keys[i];
      break;
    }
  }
  if(mappedValue==null) throw new Error(value+" is not in the mappings value");
  return this.write(mappedValue,buffer,offset,type,rootNode);
}

function sizeOfMapper(value,{type,mappings},rootNode)
{
  var keys=Object.keys(mappings);
  var mappedValue=null;
  for(var i=0;i<keys.length;i++) {
    if(mappings[keys[i]]==value) {
      mappedValue = keys[i];
      break;
    }
  }
  if(mappedValue==null) throw new Error(value+" is not in the mappings value");
  return this.sizeOf(mappedValue,type,rootNode);
}

function readVarInt(buffer, offset) {
  var result = 0;
  var shift = 0;
  var cursor = offset;

  while(true) {
    if(cursor + 1 > buffer.length) return null;
    var b = buffer.readUInt8(cursor);
    result |= ((b & 0x7f) << shift); // Add the bits to our number, except MSB
    cursor++;
    if(!(b & 0x80)) { // If the MSB is not set, we return the number
      return {
        value: result,
        size: cursor - offset
      };
    }
    shift += 7; // we only have 7 bits, MSB being the return-trigger
    assert.ok(shift < 64, "varint is too big"); // Make sure our shift don't overflow.
  }
}

function sizeOfVarInt(value) {
  var cursor = 0;
  while(value & ~0x7F) {
    value >>>= 7;
    cursor++;
  }
  return cursor + 1;
}

function writeVarInt(value, buffer, offset) {
  var cursor = 0;
  while(value & ~0x7F) {
    buffer.writeUInt8((value & 0xFF) | 0x80, offset + cursor);
    cursor++;
    value >>>= 7;
  }
  buffer.writeUInt8(value, offset + cursor);
  return offset + cursor + 1;
}


function readPString(buffer, offset, {countType,countTypeArgs},rootNode) {
  var {size,value}=tryDoc(() => this.read(buffer, offset, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  var cursor = offset + size;
  var strEnd = cursor + value;
  if(strEnd > buffer.length) throw new Error("Missing characters in string, found size is "+buffer.length+
    " expected size was "+strEnd);

  return {
    value: buffer.toString('utf8', cursor, strEnd),
    size: strEnd - offset
  };
}

function writePString(value, buffer, offset, {countType,countTypeArgs},rootNode) {
  var length = Buffer.byteLength(value, 'utf8');
  offset=tryDoc(() => this.write(length, buffer, offset, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  buffer.write(value, offset, length, 'utf8');
  return offset + length;
}


function sizeOfPString(value, {countType,countTypeArgs},rootNode) {
  var length = Buffer.byteLength(value, 'utf8');
  var size=tryDoc(() => this.sizeOf(length, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  return size + length;
}

function readBool(buffer, offset) {
  if(offset + 1 > buffer.length) return null;
  var value = buffer.readInt8(offset);
  return {
    value: !!value,
    size: 1
  };
}

function writeBool(value, buffer, offset) {
  buffer.writeInt8(+value, offset);
  return offset + 1;
}


function readBuffer(buffer, offset, {count,countType,countTypeArgs}, rootNode) {
  var totalSize = 0;
  var totalCount;
  if (typeof count !== "undefined")
    totalCount = getField(count, rootNode);
  else if (typeof countType !== "undefined") {
    var {value,size} = this.read(buffer, offset, { type: countType, typeArgs: countTypeArgs }, rootNode);
    totalSize += size;
    offset += size;
    totalCount = value;
  }
  return {
    value: buffer.slice(offset, offset + totalCount),
    size: totalSize + totalCount
  };
}

function writeBuffer(value, buffer, offset, {count,countType,countTypeArgs}, rootNode) {
  if (typeof count === "undefined" && typeof countType !== "undefined") {
    offset = this.write(value.length, buffer, offset, { type: countType, typeArgs: countTypeArgs }, rootNode);
  } else if (typeof count === "undefined") { // Broken schema, should probably error out
  }
  value.copy(buffer, offset);
  return offset + value.length;
}

function sizeOfBuffer(value, {count,countType,countTypeArgs}, rootNode) {
  var size = 0;
  if (typeof count === "undefined" &&
      typeof countType !== "undefined") {
    size = this.sizeOf(value.length, { type: countType, typeArgs: countTypeArgs }, rootNode);
  }
  return size + value.length;
}

function readVoid() {
  return {
    value: undefined,
    size: 0
  };
}

function writeVoid(value, buffer, offset) {
  return offset;
}

function generateBitMask(n) {
  return (1 << n) - 1;
}

function readBitField(buffer, offset, typeArgs) {
  var beginOffset = offset;
  var curVal = null;
  var bits = 0;
  var results = {};
  results.value = typeArgs.reduce(function(acc, {size,signed,name}) {
    var currentSize = size;
    var val = 0;
    while (currentSize > 0) {
      if (bits == 0) {
        curVal = buffer[offset++];
        bits = 8;
      }
      var bitsToRead = Math.min(currentSize, bits);
      val = (val << bitsToRead) | (curVal & generateBitMask(bits)) >> (bits - bitsToRead);
      bits -= bitsToRead;
      currentSize -= bitsToRead;
    }
    if (signed && val >= 1 << (size - 1))
      val -= 1 << size;
    acc[name] = val;
    return acc;
  }, {});
  results.size = offset - beginOffset;
  return results;
}
function writeBitField(value, buffer, offset, typeArgs) {
  var toWrite = 0;
  var bits = 0;
  typeArgs.forEach(function({size,signed,name}) {
    var val = value[name];
    if ((!signed && val < 0) || (signed && val < -(1 << (size - 1))))
      throw new Error(value + " < " + signed ? (-(1 << (size - 1))) : 0);
    else if ((!signed && val >= 1 << size)
        || (signed && val >= (1 << (size - 1)) - 1))
      throw new Error(value + " >= " + signed ? (1 << size) : ((1 << (size - 1)) - 1));
    while (size > 0) {
      var writeBits = Math.min(8 - bits, size);
      toWrite = toWrite << writeBits |
        ((val >> (size - writeBits)) & generateBitMask(writeBits));
      size -= writeBits;
      bits += writeBits;
      if (bits === 8) {
        buffer[offset++] = toWrite;
        bits = 0;
        toWrite = 0;
      }
    }
  });
  if (bits != 0)
    buffer[offset++] = toWrite << (8 - bits);
  return offset;
}

function sizeOfBitField(value, typeArgs) {
  return Math.ceil(typeArgs.reduce(function(acc, {size}) {
    return acc + size;
  }, 0) / 8);
}

function readCString(buffer, offset) {
  var str = "";
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
