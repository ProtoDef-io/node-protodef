var Transform = require("readable-stream").Transform;

class Serializer extends Transform {
  constructor(proto,mainType) {
    super({ writableObjectMode: true });
    this.proto=proto;
    this.mainType=mainType;
  }

  _transform(chunk, enc, cb) {
    try {
      this.push(this.proto.createBuffer(chunk,this.mainType,{}));
      cb();
    }
    catch(err) {
      cb(err);
    }
  }
}

module.exports=Serializer;