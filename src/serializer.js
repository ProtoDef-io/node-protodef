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
    let buf;
    try {
      buf = this.createPacketBuffer(chunk);
    } catch (e) {
      return cb(e);
    }
    this.push(buf);
    return cb();
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
      let packet;
      try {
        packet = this.parsePacketBuffer(this.queue);
      }
      catch (e) {
        if (e.partialReadError)
          return cb();
        else {
          e.buffer=this.queue;
          this.queue=new Buffer(0);
          return cb(e);
        }
      }

      this.push(packet);
      this.queue=this.queue.slice(packet.metadata.size);
    }
  }
}

module.exports={
  Serializer:Serializer,
  Parser:Parser
};