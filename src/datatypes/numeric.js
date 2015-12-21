function readLong(read) {
  return read(8)
    .then(buffer => [buffer.readInt32BE(0), buffer.readInt32BE(4)])
}

function writeLong(value, write) {
  write(4, buffer => buffer.writeInt32BE(value[0],0));
  write(4, buffer => buffer.writeInt32BE(value[1],0));
}

function generateFunctions(bufferReader,bufferWriter,size)
{
  var reader=function(read)
  {
    return read(size).then(buffer => buffer[bufferReader](0));
  };
  var writer=function(value, write) {
    write(size,buffer => buffer[bufferWriter](value, 0));
  };
  return [reader, writer, size];
}

var nums= {
  'byte': ["readInt8", "writeInt8", 1],
  'ubyte': ["readUInt8", "writeUInt8", 1],
  'short': ["readInt16BE", "writeInt16BE", 2],
  'ushort': ["readUInt16BE", "writeUInt16BE", 2],
  'int': ["readInt32BE", "writeInt32BE", 4],
  'uint': ["readUInt32BE", "writeUInt32BE", 4],
  'float': ["readFloatBE", "writeFloatBE", 4],
  'double': ["readDoubleBE", "writeDoubleBE", 8]
};

var types=Object.keys(nums).reduce(function(types,num){
  types[num]=generateFunctions(nums[num][0], nums[num][1], nums[num][2]);
  return types;
},{});
types["long"]=[readLong, writeLong];


module.exports = types;
