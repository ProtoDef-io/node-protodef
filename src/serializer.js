var Transform = require("readable-stream").Transform;

class Serializer extends Transform {
  constructor(proto,mainType) {
    super({ writableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  createPacketBuffer(packet) {
    return this.proto.createPacketBuffer(this.mainType,packet);
  }

  _transform(chunk, enc, cb) {
    try {
      var buf = this.createPacketBuffer(chunk);
      this.push(buf);
      return cb();
    } catch (e) {
      return cb(e);
    }
  }
}

class Parser extends Transform {
  constructor(proto,mainType) {
    super({ readableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  parsePacketBuffer(buffer) {
    return this.proto.parsePacketBuffer(this.mainType,buffer);
  }

  _transform(chunk, enc, cb) {
    var packet;
    try {
      packet = this.parsePacketBuffer(chunk);
    } catch (e) {
      return cb(e);
    }
    this.push(packet);
    return cb();
  }
}

module.exports={
  Serializer:Serializer,
  Parser:Parser
};