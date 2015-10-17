var Protocols=require("./").Protocols;
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

var protocol=new Protocols();

var parser=new Parser(protocol,packets);
var serializer=new Serializer(protocol,packets);

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
