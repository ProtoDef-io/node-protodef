var [readVarInt, writeVarInt, sizeOfVarInt] = require("./datatypes/utils").varint;
var Protocols = require("./protodef");
var Transform = require("readable-stream").Transform;
var debug = require("./debug");
var assert = require('assert');
var { getFieldInfo, tryCatch, addErrorField } = require('./utils');

var structures = require("./datatypes/structures");
var utils = require("./datatypes/utils");
var readPackets = require("./packets").readPackets;


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

    var results = {
      metadata: {},
      data: {},
      buffer
    };

    results.data=this.proto.read(buffer, 0, this.mainType, {});
    return results;
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