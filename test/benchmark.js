var ITERATIONS = 100000;

var ProtoDef=require("protodef").ProtoDef;
var Parser=require("protodef").Parser;
var Serializer=require("protodef").Serializer;

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
  var size=ITERATIONS*testDataWrite.length;
  it("bench serializing",function(done){
    var start, i, j;
    console.log('Beginning write test');
    var serializer = new Serializer(proto, "packet");
    start = Date.now();
    for(i = 0; i < ITERATIONS; i++) {
      for(j = 0; j < testDataWrite.length; j++) {
        serializer.write(testDataWrite[j]);
      }
    }
    function wait(cb) {
      var i=0;
      serializer.on("data",function(data){
        inputData.push(data);
        i++;
        if(i==size)
          cb();
      });
    }
    wait(function(){
      console.log('Finished write test in ' + (Date.now() - start) / 1000 + ' seconds');
      done();
    });
  });

  it("bench parsing",function(done){
    console.log('Beginning read test');
    var start = Date.now();
    var parser=new Parser(proto,"packet");
    inputData.forEach(data => parser.write(data));
    function wait(cb) {
      var i=0;
      parser.on("data",function(){
        i++;
        if(i==inputData.length)
          cb();
      });
    }
    wait(function(){
      console.log('Finished read test in ' + (Date.now() - start) / 1000 + ' seconds');
      done();
    });
  });
});
