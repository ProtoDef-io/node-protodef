var Transform = require("readable-stream").Transform;

class Serializer extends Transform {
  constructor(proto,mainType) {
    super({ writableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  createPacketBuffer(packet,write) {
    this.proto.createPacketBuffer(this.mainType,packet,write);
  }

  _transform(chunk, enc, cb) {
    //var transformedBuffer=new Buffer(0);
    // buf => buf.copy(transformedBuffer,transformedBuffer.length)

    try {
      this.createPacketBuffer(chunk, buf => this.push(buf));
      cb();
    }
    catch(err) {
      cb(err);
    }
  }
}

const EventEmitter = require('events').EventEmitter;

class DataGetter {
  incomingBuffer = new Buffer(0);
  wait = new EventEmitter();
  asker = new EventEmitter();

  constructor() {

  }

  push(chunk) {
    this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk]);
    this.wait.emit("moreData");
  }

  moreData(count) {
    this.asker.emit("needMoreData");
    return new Promise((cb) => {
      if(this.incomingBuffer.length<count)
        this.wait.once("moreData",function(){
          cb();
        });
      else cb();
    })
  }

  hasMore() {
    return this.incomingBuffer.length>0;
  }

  get(count) {
    var p=Promise.resolve();
    if(this.incomingBuffer.length<count)
      p=this.moreData(count);
    return p.then(() => {
      var data=this.incomingBuffer.slice(0,count);
      this.incomingBuffer=this.incomingBuffer.slice(count);
      return data;
    })
  }
}

class Parser extends Transform {
  dataGetter = new DataGetter();
  constructor(proto,mainType) {
    super({ readableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
    this.readData();
  }


  parsePacketBuffer(read) {
    return this.proto.parsePacketBuffer(this.mainType,read);
  }

  readData() {
    return this.parsePacketBuffer(this.dataGetter.get.bind(this.dataGetter))
    .then(packet => {
      this.push(packet);
    })
    .then(() => this.readData())
  }

  _transform(chunk,enc, cb) {
    this.dataGetter.asker.once('needMoreData',cb);
    this.dataGetter.push(chunk);
  }
}

module.exports={
  Serializer:Serializer,
  Parser:Parser,
  DataGetter:DataGetter
};