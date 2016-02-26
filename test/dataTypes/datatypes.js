var ProtoDef = require("protodef").ProtoDef;
var expect = require('chai').expect;
var PartialReadError=require("../../").utils.PartialReadError;

var proto = new ProtoDef();

var testData=[
  {
    "kind":"numeric",
    "data":require("./numeric.json")
  },
  {
    "kind":"utils",
    "data":require("./utils.json")
  }
];

function arrayToBuffer(arr)
{
  return new Buffer(arr.map(e => parseInt(e)));
}

function testValue(type,value,buffer)
{
  it('writes',function(){
    expect(proto.createPacketBuffer(type,value)).to.deep.equal(buffer);
  });
  it('reads',function(){
    var actualResult=proto.parsePacketBuffer(type,buffer);
    expect(actualResult.data).to.deep.equal(value);
    expect(actualResult.metadata.size).to.deep.equal(buffer.length);
  });
}

function testType(type,values)
{
  if(values.length==0)
    it.skip('Has no tests', () => {

    });
  values.forEach((value) => {
    var buffer=arrayToBuffer(value.buffer);
    if(value.description)
      describe(value.description,() => {
        testValue(type,value.value,buffer);
      });
    else
      testValue(type,value.value,buffer);
  });
  if(type!="void")
    it('reads 0 bytes and throw a PartialReadError', () => {
      try {
        proto.parsePacketBuffer(type,new Buffer(0));
      }
      catch (e) {
        if(!e instanceof PartialReadError)
          throw e;
        return;
      }
      throw Error("no PartialReadError thrown");
    });
}

testData.forEach(tests => {
  describe(tests.kind,()=> {
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

