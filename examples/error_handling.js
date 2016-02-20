var ProtoDef = require("protodef").ProtoDef;
var Serializer = require("protodef").Serializer;
var Parser = require("protodef").Parser;

var example_protocol=require("./example_protocol.json");

var proto = new ProtoDef();
proto.addTypes(example_protocol);
var parser = new Parser(proto, "packet");
var serializer = new Serializer(proto, "packet");

serializer.write({
  name: "entity_look",
  params: {
    "entityId": 1,
    "yaw": 1,
    "pitch": 1,
    "onGround": true
  }
});

parser.on('error',function(err){
  console.log(err.stack);
  console.log(err.buffer);
});

parser.write(new Buffer([0x17,0x01,0x01,0x01,0x01]));

serializer.pipe(parser);

parser.on('data', function (chunk) {
  console.log(JSON.stringify(chunk.data, null, 2));
});
