var ProtoDef = require("protodef").ProtoDef;
var Benchmark = require('benchmark');

Error.stackTraceLimit=0;

var proto = new ProtoDef();

var testData=[
  {
    "kind":"conditional",
    "data":require("./../test/dataTypes/conditional.json")
  },
  {
    "kind":"numeric",
    "data":require("./../test/dataTypes/numeric.json")
  },
  {
    "kind":"structures",
    "data":require("./../test/dataTypes/structures.json")
  },
  {
    "kind":"utils",
    "data":require("./../test/dataTypes/utils.json")
  }
];

function arrayToBuffer(arr)
{
  return new Buffer(arr.map(e => parseInt(e)));
}


function testValue(type,value,buffer)
{
  if(type.indexOf("buffer")==0)
    value=arrayToBuffer(value);
  it('writes',function(){
    var suite = new Benchmark.Suite;
    suite.add('writes', function() {
        proto.createPacketBuffer(type,value);
      })
      .on('cycle', function(event) {
        console.log(String(event.target));
      })
      .run({ 'async': false });
  });
  it('reads',function(){
    var suite = new Benchmark.Suite;
    suite.add('read', function() {
        proto.parsePacketBuffer(type,buffer)
      })
      .on('cycle', function(event) {
        console.log(String(event.target));
      })
      .run({ 'async': false });
  });
}

function testType(type,values)
{
  values.forEach((value) => {
    var buffer=arrayToBuffer(value.buffer);
    if(value.description)
      describe(value.description,() => {
        testValue(type,value.value,buffer);
      });
    else
      testValue(type,value.value,buffer);
  });
}

testData.forEach(tests => {
  describe(tests.kind,function(){
    this.timeout(1000*60*10);

    tests.data.forEach(test => {
      describe(test.type,() => {
        if(test.subtypes)
          test.subtypes.forEach((subtype,i) => {
            var type=test.type + "_" + i;
            proto.addType(type, subtype.type);
            describe(subtype.description,() => {
              testType(type,subtype.values);
            })
          });
        else
          testType(test.type,test.values);
      });
    });
  });
});

