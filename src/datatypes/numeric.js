function readLong(read) {
  return read(8)
    .then(({buffer,offset}) => [buffer.readInt32BE(offset), buffer.readInt32BE(offset + 4)])
}

function writeLong(value, write) {
  var buffer=new Buffer(8);
  buffer.writeInt32BE(value[0], 0);
  buffer.writeInt32BE(value[1], 4);
  write(buffer);
}

function generateFunctions(bufferReader,bufferWriter,size)
{
  var reader=function(read)
  {
    return read(size).then(({buffer,offset}) => buffer[bufferReader](offset));
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
