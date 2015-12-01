async function readLong(getter) {
  var buffer=await getter.get(8);
  return [buffer.readInt32BE(offset), buffer.readInt32BE(offset + 4)]
}

function writeLong(value, buffer, offset) {
  buffer.writeInt32BE(value[0], offset);
  buffer.writeInt32BE(value[1], offset + 4);
  return offset + 8;
}

function generateFunctions(bufferReader,bufferWriter,size)
{
  var reader=async function(getter)
  {
    var buffer=getter.get(size);
    return buffer[bufferReader](0);
  };
  var writer=function(value, buffer, offset) {
    buffer[bufferWriter](value, offset);
    return offset + size;
  };
  return [reader, writer, size];
}

var nums= {
  'byte': ["readInt8", "writeInt8", 1],
  'ubyte': ["readUInt8", "writeUInt8", 1],
  'short': ["readInt16BE", "writeInt16BE", 2],
  'ushort': ["readUInt16BE", "writeUInt16BE", 2],
  'int': ["readInt32BE", "writeInt32BE", 4],
  'float': ["readFloatBE", "writeFloatBE", 4],
  'double': ["readDoubleBE", "writeDoubleBE", 8]
};

var types=Object.keys(nums).reduce(function(types,num){
  types[num]=generateFunctions(nums[num][0], nums[num][1], nums[num][2]);
  return types;
},{});
types["long"]=[readLong, writeLong, 8];


module.exports = types;
