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

function readMapper(read,{type,mappings},rootNode)
{
  return this.read(read, type, rootNode)
  .then(value => {
    var mappedValue=mappings[value];
    if(mappedValue==undefined) throw new Error(value+" is not in the mappings value");
    return mappedValue;
  })
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

function readVarInt(read) {
  var result = 0;
  var shift = 0;

  function next() {
     return read(1)
      .then(val => val.readUInt8(0))
      .then(b => {
        result |= ((b & 0x7f) << shift); // Add the bits to our number, except MSB
        if (!(b & 0x80)) { // If the MSB is not set, we return the number
          return result;
        }
        shift += 7; // we only have 7 bits, MSB being the return-trigger
        assert.ok(shift < 64, "varint is too big"); // Make sure our shift don't overflow.
        return null;
      })
      .then(result => result!=null ? result : next());
  }
  return next();
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


function readPString(read, {countType,countTypeArgs},rootNode) {
  return tryDoc(() => this.read(read, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count")
  .then(read)
  .then(buffer => buffer.toString('utf8', 0, size));
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

function readBool(read) {
  return read(1).then(buffer => !!buffer.readInt8(0));
}

function writeBool(value, buffer, offset) {
  buffer.writeInt8(+value, offset);
  return offset + 1;
}


function readBuffer(read, {count,countType,countTypeArgs}, rootNode) {
  var p;
  if (typeof count !== "undefined")
    p = Promise.resolve(getField(count, rootNode));
  else if (typeof countType !== "undefined")
    p = this.read(read, { type: countType, typeArgs: countTypeArgs }, rootNode);

  return p.then(read(totalCount));
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
  return Promise.resolve(undefined);
}

function writeVoid(value, buffer, offset) {
  return offset;
}

function generateBitMask(n) {
  return (1 << n) - 1;
}

function readBitField(read, typeArgs) {

  function compute({currentSize,val,curVal,bits}) {
    if(currentSize <= 0)
      return Promise.resolve({currentSize,val,curVal,bits});

    var p2=Promise.resolve(curVal);
    if (bits == 0) {
      bits = 8;
      p2=read(1).then(buf => buf[0]);
    }
    return p2.then(curVal => {
        var bitsToRead = Math.min(currentSize, bits);
        val = (val << bitsToRead) | (curVal & generateBitMask(bits)) >> (bits - bitsToRead);
        bits -= bitsToRead;
        currentSize -= bitsToRead;
        return {currentSize,val,curVal,bits};
      })
      .then(compute)
  }

  return typeArgs.reduce((acc_, {size,signed,name}) =>
    acc_.then(({values,curVal,bits}) => {
      return compute({currentSize:size,val:0,curVal,bits})
      .then(({val,curVal,bits}) => {
        if (signed && val >= 1 << (size - 1))
          val -= 1 << size;
        values[name] = val;
        return {values,curVal,bits};
      })
    }),
    Promise.resolve({values:{},curVal:null,bits:0}))
  .then(({values}) => values);
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

async function readCString(read) {
  var str = "";
  var c;
  while ((c=await read(1)) != 0x00)
    str += c;
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
