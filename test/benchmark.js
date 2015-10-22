var ITERATIONS = 100000;

var ProtoDef=require("../").ProtoDef;

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

proto.addTypes(require("../example_protocol.json").types);

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

  it("bench parsing",function(done){
    console.log('Beginning read test');
    start = Date.now();
    for (j = 0; j < inputData.length; j++) {
      proto.parsePacketBuffer("packet",inputData[j]);
    }
    console.log('Finished read test in ' + (Date.now() - start) / 1000 + ' seconds');
    done();
  });
});
