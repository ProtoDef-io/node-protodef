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

function testType(type,values)
{
  values = values.map(value => ({
    buffer: arrayToBuffer(value.buffer),
    value: type.indexOf("buffer") == 0 ? arrayToBuffer(value.value) : value.value,
    description: value.description
  }));
  it('reads',function() {
    var readSuite = new Benchmark.Suite;
    readSuite.add('read', function () {
        values.forEach((value) => {
          proto.parsePacketBuffer(type, value.buffer);
        });
      })
      .on('cycle', function (event) {
        console.log(String(event.target));
      })
      .run({'async': false});
  });

  it('writes',function() {
    var writeSuite = new Benchmark.Suite;
    writeSuite.add('write', function () {
        values.forEach((value) => {
          proto.createPacketBuffer(type, value.value);
        });
      })
      .on('cycle', function (event) {
        console.log(String(event.target));
      })
      .run({'async': false});
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

