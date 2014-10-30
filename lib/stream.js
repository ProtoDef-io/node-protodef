var stream = require("stream");
var util = require("util");

util.inherits(ProtoToObject, stream.Writable);
function ProtoToObject(options) {
  if (!(this instanceof ProtoToObject))
    return new ProtoToObject(options);

  stream.Writable.call(this, options);
  this._packetType = options.packetType;
  this._protocol = options.protocol;
  this._buffer = new Buffer(0);
  this._packetState = {
    cursor: 0,
    context: {}
  };
}

ProtoToObject.prototype._write = function (chunk, encoding, callback) {
  this._buffer = Buffer.concat([this._buffer, chunk], this._buffer.length + chunk.length);
  var readResults;
  while ((readResults = this._protocol._readField(this._buffer, 0, this._packetType, {})) !== null)  {
    // What if packetType.condition === true ???
    // My guess is, we should make it clear that it should never happen.
    if (readResults.error)
      return callback(readResults.error);
    this._buffer = this._buffer.slice(readResults.size);
    //this._packetState.context = {};
    //this._packetState.cursor = 0;
    this.emit('packet', readResults.value);
  }
  callback();
};

ProtoToObject.prototype.changeType = function (functions) {
  this._packetType = functions;
};

module.exports.ProtoToObject = ProtoToObject;
