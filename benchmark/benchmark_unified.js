var testData=require("../test/dataTypes/prepareTests").testData;
var proto=require("../test/dataTypes/prepareTests").proto;
var Benchmark = require('benchmark');

it('read/write',function() {
  this.timeout(1000*60*10);
  var suite = new Benchmark.Suite;
  suite.add('read/write', function () {
      testData.forEach(tests => {
        tests.data.forEach(test => {
          test.subtypes.forEach(subType => {
            subType.values.forEach((value) => {
              subType.read(value.buffer,0,{});
              proto.createPacketBuffer(subType.type, value.value);
            });
          })
        });
      });
    })
    .on('cycle', function (event) {
      console.log(String(event.target));
    })
    .run({'async': false});
});

