var Transform = require("readable-stream").Transform;

class Serializer extends Transform {
  constructor(proto,mainType) {
    super({ writableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  createPacketBuffer(packet,write) {
    return this.proto.createPacketBuffer(this.mainType,packet,write);
  }

  _transform(chunk, enc, cb) {
    //var transformedBuffer=new Buffer(0);
    // buf => buf.copy(transformedBuffer,transformedBuffer.length)

    this.createPacketBuffer(chunk,buf => this.push(buf))
      .then(cb)
      .catch(cb);
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

  get(count) {
    var p=Promise.resolve();
    if(this.incomingBuffer.length<count)
      p=this.moreData();

    return p.then(() => {
      var data=this.incomingBuffer.slice(0,count);
      this.incomingBuffer=this.incomingBuffer.slice(count);
      return data;
    })
  }
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

  readData() {
    return this.parsePacketBuffer(this.dataGetter.get.bind(this.dataGetter))
    .then(packet => {
      this.push(packet);
    })
    .then(() => this.dataGetter.hasMore() ? this.readData() : Promise.resolve())
  }

  _transform(chunk,enc, cb) {
    this.dataGetter.push(chunk);
    this.readData().then(cb).catch(cb);
  }
}

module.exports={
  Serializer:Serializer,
  Parser:Parser,
  DataGetter:DataGetter
};