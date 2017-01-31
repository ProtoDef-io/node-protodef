var ProtoDef = require("protodef").ProtoDef;
var Serializer = require("protodef").Serializer;
var Parser = require("protodef").Parser;

var example_protocol=require("./full_protocol_example.json");

var proto = new ProtoDef();
proto.addProtocol(example_protocol,["login","toClient"]);
var parser = new Parser(proto, "packet");
var serializer = new Serializer(proto, "packet");

serializer.write({
  name: "success",
  params: {
    "uuid": "some uuid",
    "username": "some name"
  }
});

parser.on('error',function(err){
  console.log(err.stack);
  console.log(err.buffer);
});

serializer.pipe(parser);

parser.on('data', function (chunk) {
  console.log(JSON.stringify(chunk.data, null, 2));
});
