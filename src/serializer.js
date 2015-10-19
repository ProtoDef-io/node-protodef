var Transform = require("readable-stream").Transform;

class Serializer extends Transform {
  constructor(proto,mainType) {
    super({ writableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  createPacketBuffer(packet) {
    var length=this.proto.sizeOf(packet, this.mainType, {});
    var buffer = new Buffer(length);
    this.proto.write(packet, buffer, 0, this.mainType, {});
    return buffer;
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

  parsePacketData(buffer) {
    var r=this.proto.read(buffer, 0, this.mainType, {});
    return {
      data: r.value,
      metadata:{
        size:r.size,
        type:r.type
      },
      buffer
    };
  }


  _transform(chunk, enc, cb) {
    var packet;
    try {
      packet = this.parsePacketData(chunk);
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