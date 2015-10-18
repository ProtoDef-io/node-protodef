var ProtoDef=require("./").ProtoDef;
var Serializer=require("./").Serializer;
var Parser=require("./").Parser;

var proto=new ProtoDef();

proto.addType("entity_look",["container",[
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
]]);
proto.addType("packet",["container", [
  { "name": "id", "type": "varint" },
  { "name": "params", "type": ["switch", {
    "compareTo": "id",
    "fields": {
      "22": "entity_look"
    }
  }]}
]]);

var parser=new Parser(proto,"packet");
var serializer=new Serializer(proto,"packet");

serializer.write({
  id:"22",
  params:{
    "entityId":1,
    "yaw":1,
    "pitch":1,
    "onGround":true
  }
});
serializer.pipe(parser);

parser.on('data', function(chunk) {
  console.log(JSON.stringify(chunk,null,2));
});
