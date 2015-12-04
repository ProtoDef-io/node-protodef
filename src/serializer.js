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

const EventEmitter = require('events').EventEmitter;

class Waiter extends EventEmitter {
  constructor() {
    super();
  }
}

class DataGetter {
  incomingBuffer = new Buffer(0);
  wait = new Waiter();
  constructor() {

  }

  push(chunk) {
    this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk]);
    this.wait.emit("moreData");
  }

  moreData() {
    return new Promise((cb) => {
      this.wait.once("moreData",cb);
    })
  }

  hasMore() {
    return this.incomingBuffer.length>0;
  }
}

DataGetter.prototype.get=async function get(count) {
  if(this.incomingBuffer.length<count)
    await this.moreData();

  var data=this.incomingBuffer.slice(0,count);
  this.incomingBuffer=this.incomingBuffer.slice(count);
  return data;
}

class Parser extends Transform {
  constructor(proto,mainType) {
    super({ readableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  dataGetter = new DataGetter();

  parsePacketBuffer(read) {
    return this.proto.parsePacketBuffer(this.mainType,read);
  }

  _transform(chunk,enc, cb) {
    this.dataGetter.push(chunk);
    this.readData().then(cb).catch(cb);
  }
}

Parser.prototype.readData=async function(){
  var packet=await this.parsePacketBuffer(this.dataGetter.get.bind(this.dataGetter));
  this.push(packet);
  if(this.dataGetter.hasMore())
    await this.readData();
}

module.exports={
  Serializer:Serializer,
  Parser:Parser,
  DataGetter:DataGetter
};