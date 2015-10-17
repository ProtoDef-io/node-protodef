var ProtoDef=require("./").ProtoDef;
var Serializer=require("./").Serializer;
var Parser=require("./").Parser;

var packets={
  "entity_look": {
    "id": "0x16",
      "fields": [
      {
        "name": "entityId",
        "type": "varint"
      },
      {
        "name": "yaw",
        "type": "byte"
      },
      {
        "name": "pitch",
        "type": "byte"
      },
      {
        "name": "onGround",
        "type": "bool"
      }
    ]
  }
};

var proto=new ProtoDef();

var parser=new Parser(proto,packets);
var serializer=new Serializer(proto,packets);

serializer.write({
  packetName:"entity_look",
  params:{
    "entityId":1,
    "yaw":1,
    "pitch":1,
    "onGround":true
  }
});
serializer.pipe(parser);

parser.on('data', function(chunk) {
  console.log(chunk);
});
