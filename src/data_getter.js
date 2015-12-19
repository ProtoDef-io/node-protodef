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

module.exports=DataGetter;
