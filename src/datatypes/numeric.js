async function readLong(read) {
  var buffer=await read(8);
  return [buffer.readInt32BE(0), buffer.readInt32BE(4)]
}

function writeLong(value, write) {
  var buffer=new Buffer(8);
  buffer.writeInt32BE(value[0], 0);
  buffer.writeInt32BE(value[1], 4);
  write(buffer);
}

function generateFunctions(bufferReader,bufferWriter,size)
{
  var reader=async function(read)
  {
    var buffer=await read(size);
    return buffer[bufferReader](0);
  };
  var writer=function(value, write) {
    var buffer=new Buffer(size);
    buffer[bufferWriter](value, 0)
    write(buffer);
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
types["long"]=[readLong, writeLong];


module.exports = types;
