var ProtoDef = require("./").ProtoDef;
var Serializer = require("./").Serializer;
var Parser = require("./").Parser;

var proto = new ProtoDef();
proto.addTypes(require("./example_protocol.json").types);
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
serializer.pipe(parser);

parser.on('data', function (chunk) {
  console.log(JSON.stringify(chunk, null, 2));
});
