var Transform = require("readable-stream").Transform;
var { PartialReadError} = require('./utils');

class Serializer extends Transform {
  constructor(proto,mainType) {
    super({ writableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
    this.queue=new Buffer(0);
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
    this.queue=new Buffer(0);
  }

  parsePacketBuffer(buffer) {
    return this.proto.parsePacketBuffer(this.mainType,buffer);
  }

  _transform(chunk, enc, cb) {
    this.queue = Buffer.concat([this.queue, chunk]);
    while(true) {
      var packet;
      try {
        packet = this.parsePacketBuffer(this.queue);
        this.push(packet);
        this.queue=this.queue.slice(packet.metadata.size);
      } catch (e) {
        if (e instanceof PartialReadError)
          return cb();
        else
          return cb(e);
      }
    }
  }
}

module.exports={
  Serializer:Serializer,
  Parser:Parser
};