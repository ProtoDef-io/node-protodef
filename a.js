var Benchmark = require('benchmark');
var ProtoDef = require("protodef").ProtoDef;
var proto=new ProtoDef();

var buf=new Buffer([0x1d,0x2d,0x3d,0x4d]);
var suite = new Benchmark.Suite;

var types=[
  {
    "name":"a",
    "type":"i8"
  },
  {
    "name":"b",
    "type":"i8"
  },
  {
    "name":"c",
    "type":"i8"
  },
  {
    "name":"d",
    "type":"i8"
  }
];

proto.addType("myContainer",["container",types]);

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function containerReaderBuild(typeArgs,proto){
  const requireContext=typeArgs.filter(o => proto[`read${capitalizeFirstLetter(o.type)}`].length==3).length>0;
  return eval(`((proto) =>
      (buffer, offset${requireContext ? `,context`:``}) => {
      var size=0;
      var value2={};
      ${requireContext ? `
      var value={};
      value[".."]=context;
      ` :``}
      var result;
      ${typeArgs.reduce((old, o) =>  old + `
      result = proto.read${capitalizeFirstLetter(o.type)}(buffer, offset + size${requireContext ? `,value`:``});
      ${o.anon
    ? `if(result.value !== undefined)
      Object.keys(result.value).forEach(key => ${requireContext ? `value[key]=` : ``}value2[key] = result[key]);`
    : `${requireContext ? `value['${o.name}'] =` : ``} value2['${o.name}'] = result.value;`
    }
      size += result.size;
      `, "")}
      return {value:value2,size:size};
    });`)(proto);
}
const generated = containerReaderBuild(types,proto);
console.log(generated(buf,0));


function myCustomContainer(buffer, offset, typeArgs, context){
  var size=0;
  var value={};

  var result;
  result=proto.readI8(buffer,offset+size);
  value["a"]=result.value;
  size+=result.size;
  result=proto.readI8(buffer,offset+size);
  value["b"]=result.value;
  size+=result.size;
  result=proto.readI8(buffer,offset+size);
  value["c"]=result.value;
  size+=result.size;
  result=proto.readI8(buffer,offset+size);
  value["d"]=result.value;
  size+=result.size;

  return {
    value:value,
    size:size
  }
}
console.log(myCustomContainer(buf,0));

suite
  .add('readContainer', function() {
    return  {
      value: {
        a: buf.readInt8(0),
        b: buf.readInt8(1),
        c: buf.readInt8(2),
        d: buf.readInt8(3)
      },
      size:4
    };
  })
  .add('protodef generated container', function() {
    generated(buf,0,{});
  })
  .add('protodef myCustomContainer', function() {
    myCustomContainer(buf,0,types,{});
  })
  .add('protodef readContainer', function() {
    proto.readMyContainer(buf,0,{},{});
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .run({ 'async': false });

