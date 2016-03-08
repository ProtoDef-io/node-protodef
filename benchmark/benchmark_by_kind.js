var testData=require("../test/dataTypes/prepareTests").testData;
var proto=require("../test/dataTypes/prepareTests").proto;
var Benchmark = require('benchmark');

testData.forEach(tests => {
  describe(tests.kind,function(){
    this.timeout(1000*60*10);

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

