var ProtoDef = require("protodef").ProtoDef;
var Parser = require("protodef").Parser;

var proto = new ProtoDef();
proto.addType("packet", [
  "container",
  [
    {
      "name": "field1",
      "type": "byte"
    },

    {
      "name": "field2",
      "type": "byte"
    }
  ]
]);
var parser = new Parser(proto, "packet");

parser.write(new Buffer([0x01]));
parser.write(new Buffer([0x01]));
parser.on('data', function (chunk) {
  console.log(JSON.stringify(chunk, null, 2));
});

process.on('unhandledRejection', function(reason, p) {
  console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
  // application specific logging, throwing an error, or other logic here
});