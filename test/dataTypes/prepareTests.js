var ProtoDef = require("protodef").ProtoDef;

var proto = new ProtoDef();

var testData=[
  {
    "kind":"conditional",
    "data":require("../ProtoDef/test/conditional.json")
  },
  {
    "kind":"numeric",
    "data":require("../ProtoDef/test/numeric.json")
  },
  {
    "kind":"structures",
    "data":require("../ProtoDef/test/structures.json")
  },
  {
    "kind":"utils",
    "data":require("../ProtoDef/test/utils.json")
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
  tests.originalData=JSON.parse(JSON.stringify(tests.data));
  tests.data.forEach(test => {
    var subTypes = [];
    if (test.subtypes)
      test.subtypes.forEach((subtype, i) => {
        var type = test.type + "_" + i;
        proto.addType(type, subtype.type);

        subtype.values = transformValues(test.type, subtype.values);
        subtype.type = type;
        subtype.read=proto.getRead(type);
        subTypes.push(subtype);
      });
    else {
      test.values = transformValues(test.type, test.values);
      subTypes.push({type: test.type, values: test.values,read:proto.getRead(test.type)});
    }
    test.subtypes=subTypes;
  });
});

module.exports.testData=testData;
module.exports.proto=proto;