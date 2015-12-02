function readLong(read) {
  return read(8)
    .then(buffer => [buffer.readInt32BE(offset), buffer.readInt32BE(offset + 4)])
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
    return read(size).then(buffer => buffer[bufferReader](0));
  };
  var writer=function(value, write) {
    var buffer=new Buffer(size);
    buffer[bufferWriter](value, 0)
    write(buffer);
  };
  return [reader, writer, size];
}

var nums= {
  'byte': ["readInt8", "writeInt8"],
  'ubyte': ["readUInt8", "writeUInt8"],
  'short': ["readInt16BE", "writeInt16BE"],
  'ushort': ["readUInt16BE", "writeUInt16BE"],
  'int': ["readInt32BE", "writeInt32BE"],
  'float': ["readFloatBE", "writeFloatBE"],
  'double': ["readDoubleBE", "writeDoubleBE"]
};

var types=Object.keys(nums).reduce(function(types,num){
  types[num]=generateFunctions(nums[num][0], nums[num][1], nums[num][2]);
  return types;
},{});
types["long"]=[readLong, writeLong];


module.exports = types;
