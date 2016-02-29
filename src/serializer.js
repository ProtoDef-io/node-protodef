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
        if (e.partialReadError)
          return cb();
        else {
          e.buffer=this.queue;
          this.queue=new Buffer(0);
          return cb(e);
        }
      }
    }
  }
}


class FullPacketParser extends Transform {
  constructor(proto,mainType) {
    super({ readableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  parsePacketBuffer(buffer) {
    return this.proto.parsePacketBuffer(this.mainType,buffer);
  }

  _transform(chunk, enc, cb) {
    try {
      var packet = this.parsePacketBuffer(chunk);
      if(packet.metadata.size!=chunk.length)
        cb(new Error("Chunk size is "+chunk.length+" but only "+packet.metadata.size+" was read "+chunk.buffer.toString("hex")));
      else {
        this.push(packet);
        cb();
      }
    }
    catch(e) {
      cb(e);
    }

  }
}

module.exports={
  Serializer:Serializer,
  Parser:Parser,
  FullPacketParser:FullPacketParser
};