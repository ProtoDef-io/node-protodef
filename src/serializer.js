var [readVarInt, writeVarInt, sizeOfVarInt] = require("./datatypes/utils").varint;
var Protocols = require("./protocols");
var Transform = require("readable-stream").Transform;
var debug = require("./debug");
var assert = require('assert');
var { getFieldInfo, tryCatch, addErrorField } = require('./utils');

var structures = require("./datatypes/structures");
var utils = require("./datatypes/utils");
var readPackets = require("./packets").readPackets;


class Serializer extends Transform {
  constructor(proto,packets) {
    super({ writableObjectMode: true });

    var packetIndexes = readPackets(packets);

    this.proto=proto;

    this.packetFields = packetIndexes.packetFields;
    this.packetIds = packetIndexes.packetIds;
  }

  createPacketBuffer(packetName, params) {
    var packetId = this.packetIds[packetName];
    assert.notEqual(packetId, undefined, `${packetName} : ${packetId}`);
    var packet = this.packetFields[packetName];
    packet=packet ? packet : null;

    assert.notEqual(packet, null);

    var length = utils.varint[2](packetId);
    tryCatch(() => {
      length += structures.container[2].call(this.proto, params, packet, {});
    }, (e) => {
      e.field = [packetName, e.field].join(".");
      e.message = `SizeOf error for ${e.field} : ${e.message}`;
      throw e;
    });

    var buffer = new Buffer(length);
    var offset = utils.varint[1](packetId, buffer, 0);
    tryCatch(() => {
      offset = structures.container[1].call(this.proto, params, buffer, offset, packet, {});
    }, (e) => {
      e.field = [packetName, e.field].join(".");
      e.message = `Write error for ${e.field} : ${e.message}`;
      throw e;
    });
    return buffer;
  }

  _transform(chunk, enc, cb) {
    try {
      var buf = this.createPacketBuffer(chunk.packetName, chunk.params);
      this.push(buf);
      return cb();
    } catch (e) {
      return cb(e);
    }
  }
}

class Parser extends Transform {
  constructor(proto,packets,{packetsToParse = {"packet": true}} = {}) {
    super({ readableObjectMode: true });
    this.packetsToParse = packetsToParse;

    var packetIndexes = readPackets(packets);

    this.proto=proto;

    this.packetFields = packetIndexes.packetFields;
    this.packetNames = packetIndexes.packetNames;
  }

  parsePacketData(buffer) {
    var { value: packetId, size: cursor } = utils.varint[0](buffer, 0);

    var packetName = this.packetNames[packetId];
    var results = {
      metadata: {
        name: packetName,
        id: packetId
      },
      data: {},
      buffer
    };

    // Only parse the packet if there is a need for it, AKA if there is a listener
    // attached to it.
    var shouldParse =
      (this.packetsToParse.hasOwnProperty(packetName) && this.packetsToParse[packetName] > 0) ||
      (this.packetsToParse.hasOwnProperty("packet") && this.packetsToParse["packet"] > 0);
    if (!shouldParse)
      return results;

    var packetInfo = this.packetFields[packetName];
    packetInfo=packetInfo ? packetInfo : null;
    if(packetInfo === null)
      throw new Error("Unrecognized packetId: " + packetId + " (0x" + packetId.toString(16) + ")")
    else
      debug("read packetId " + this.protocolState + "." + packetName + " (0x" + packetId.toString(16) + ")");

    var res;
    tryCatch(() => {
      res = this.proto.read(buffer, cursor, ["container", packetInfo], {});
    }, (e) => {
      e.field = [packetName, e.field].join(".");
      e.message = `Read error for ${e.field} : ${e.message}`;
      throw e;
    });
    results.data = res.value;
    cursor += res.size;
    if(buffer.length > cursor)
      throw new Error(`Read error for ${packetName} : Packet data not entirely read :
        ${JSON.stringify(results)}`);
    debug(results);
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