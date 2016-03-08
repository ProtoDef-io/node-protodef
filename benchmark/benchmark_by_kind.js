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

function transformValues(type,values)
{
  return values.map(value => ({
    buffer: arrayToBuffer(value.buffer),
    value: type.indexOf("buffer") == 0 ? arrayToBuffer(value.value) : value.value,
    description: value.description
  }));
}

testData.forEach(tests => {
  describe(tests.kind,function(){
    this.timeout(1000*60*10);


    tests.data.forEach(test => {
      var subTypes = [];
      if (test.subtypes)
        test.subtypes.forEach((subtype, i) => {
          var type = test.type + "_" + i;
          proto.addType(type, subtype.type);

          subtype.values = transformValues(test.type, subtype.values);
          subtype.type = type;
          subTypes.push(subtype);
        });
      else {
        test.values = transformValues(test.type, test.values);
        subTypes.push({type: test.type, values: test.values});
      }
      test.subtypes=subTypes;
    });

    it('reads',function() {
      var readSuite = new Benchmark.Suite;
      readSuite.add('read', function () {
          tests.data.forEach(test => {
            test.subtypes.forEach(subType => {
              subType.values.forEach((value) => {
                proto.parsePacketBuffer(subType.type, value.buffer);
              });
            })
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
        tests.data.forEach(test => {
          test.subtypes.forEach(subType => {
            subType.values.forEach((value) => {
              proto.createPacketBuffer(subType.type, value.value);
            });
          });
        });
      })
      .on('cycle', function (event) {
        console.log(String(event.target));
      })
      .run({'async': false});
    });
  });
});

