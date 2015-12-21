var Transform = require("readable-stream").Transform;
var DataGetter=require("./data_getter");

class Parser extends Transform {
  dataGetter = new DataGetter();
  constructor(proto,mainType) {
    super({ readableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
    this.readData();
  }

  readData() {
    return this.proto.read(this.dataGetter.get.bind(this.dataGetter),this.mainType,{})
      .then(packet => {
        this.push(packet);
      })
      .catch(err => this.emit('error',err))
      .then(() => this.readData())
  }

  _transform(chunk,enc, cb) {
    this.dataGetter.asker.once('needMoreData',cb);
    this.dataGetter.push(chunk);
  }
}

module.exports=Parser;