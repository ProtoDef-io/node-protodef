var ITERATIONS = 10000;

var ProtoDef=require("protodef").ProtoDef;
var Parser=require("protodef").Parser;

var testDataWrite = [
  {
    name: "entity_look",
    params: {
      "entityId": 1,
      "yaw": 1,
      "pitch": 1,
      "onGround": true
    }
  }
];

var proto = new ProtoDef();

var example_protocol={
  "container": "native",
  "varint": "native",
  "byte": "native",
  "bool": "native",
  "switch": "native",
  "entity_look": [
    "container",
    [
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
  ],
  "packet": [
    "container",
    [
      {
        "name": "name",
        "type": [
          "mapper",
          {
            "type": "varint",
            "mappings": {
              "22": "entity_look"
            }
          }
        ]
      },
      {
        "name": "params",
        "type": [
          "switch",
          {
            "compareTo": "name",
            "fields": {
              "entity_look": "entity_look"
            }
          }
        ]
      }
    ]
  ]
};

proto.addTypes(example_protocol);

describe("benchmark",function(){
  this.timeout(60 * 1000);
  var inputData = [];
  it("bench serializing",function(done){
    var start, i, j;
    console.log('Beginning write test');
    start = Date.now();
    for(i = 0; i < ITERATIONS; i++) {
      for(j = 0; j < testDataWrite.length; j++) {
        inputData.push(proto.createPacketBuffer("packet",testDataWrite[j]));
      }
    }
    var result=(Date.now() - start) / 1000;
    console.log('Finished write test in ' + result + ' seconds');
    done();
  });

  it("bench parsing",function(cb){
    var parser=new Parser(proto,"packet");
    inputData.forEach(data => parser.write(data));
    console.log('Beginning read test');
    var start = Date.now();
    var i=0;
    parser.on("data",function(){
      i++;
      if(i==inputData.length)
        cb();
    });
    console.log('Finished read test in ' + (Date.now() - start) / 1000 + ' seconds');
  });
});
