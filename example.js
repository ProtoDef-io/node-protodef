var ProtoDef = require("./").ProtoDef;
var Serializer = require("./").Serializer;
var Parser = require("./").Parser;

var proto = new ProtoDef();

proto.addType("entity_look", ["container", [
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

proto.addType("packet", ["container", [
  {
    "name": "name", "type": ["mapper", {
    "type": "varint", "mappings": {
      "22": "entity_look"
    }
  }]
  },
  {
    "name": "params", "type": ["switch", {
    "compareTo": "name",
    "fields": {
      "entity_look": "entity_look"
    }
  }]
  }
]]);

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
