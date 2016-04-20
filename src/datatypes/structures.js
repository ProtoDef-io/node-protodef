var { getField, tryDoc } = require("../utils");

module.exports = {
  'array': [readArray, writeArray, sizeOfArray, readArrayGenerator],
  'count': [readCount, writeCount, sizeOfCount, readCountGenerator],
  'container': [readContainer, writeContainer, sizeOfContainer, readContainerGenerator]
};

function readArrayGenerator({type,count,countType,countTypeArgs}, proto)
{
  let countingCode;
  if(typeof count === "number")
    countingCode=`c=${count};`;
  else if (typeof count !== "undefined")
    countingCode=`c=getField("${count}", context);`;
  else if (typeof countType !== "undefined") {
    countingCode=`
    let r1=proto.read${capitalizeFirstLetter(countType)}(buffer, offset,context);
    results.size += r1.size;
    offset += r1.size;
    c = r1.value;
    `
  } else // TODO : broken schema, should probably error out.
    countingCode=`c = 0;`;
  return `(buffer,offset,context) => {
    const results = {
      value: [],
      size: 0
    };

    var c;
    ${countingCode}
    for(var i = 0; i < c; i++) {
      let r=proto.read${capitalizeFirstLetter(type)}(buffer, offset,context);
      results.size += r.size;
      offset += r.size;
      results.value.push(r.value);
    }
    return results;
  }`;
}

function readArray(buffer, offset, {type,count,countType,countTypeArgs}, rootNode) {
  var results = {
    value: [],
    size: 0
  };
  var c;
  if(typeof count === "number")
    c = count;
  else if (typeof count !== "undefined")
    c = getField(count, rootNode);
  else if (typeof countType !== "undefined") {
    var {size,value}=tryDoc(() => this.read(buffer, offset, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
    results.size += size;
    offset += size;
    c = value;
  } else // TODO : broken schema, should probably error out.
    c = 0;
  for(var i = 0; i < c; i++) {
    ({size,value}=tryDoc(() => this.read(buffer, offset, type, rootNode), i));
    results.size += size;
    offset += size;
    results.value.push(value);
  }
  return results;
}

function writeArray(value, buffer, offset, {type,count,countType,countTypeArgs}, rootNode) {
  if (typeof count === "undefined" && typeof countType !== "undefined")
    offset= tryDoc(() => this.write(value.length, buffer, offset, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  else if (typeof count === "undefined") { // Broken schema, should probably error out
  }
  return value.reduce((offset,v,index) =>tryDoc(() => this.write(v, buffer, offset, type, rootNode),index),offset);
}

function sizeOfArray(value, {type,count,countType,countTypeArgs}, rootNode) {
  var size = 0;
  if (typeof count === "undefined" &&  typeof countType !== "undefined")
    size=tryDoc(() => this.sizeOf(value.length, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");

  return value.reduce((size,v,index) =>tryDoc(() => size+this.sizeOf(v, type, rootNode), index),size);
}

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

function readContainerGenerator(typeArgs,proto){
  typeArgs=typeArgs.map(o => {
    if(typeof o.type !== "string")
    {
      const subTypeName="type"+proto.typeId;
      proto.addType(subTypeName,o.type);
      proto.typeId++;
      return {
        type:subTypeName,
        name:o.name,
        anon:o.anon
      }
    }
    return o;
  });
  const requireContext=typeArgs.filter(o => proto[`read${capitalizeFirstLetter(o.type)}`].length==3).length>0;
  return `(buffer, offset${requireContext ? `,context`:``}) => {
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
    }`;
}


function readContainer(buffer, offset, typeArgs, context) {
  var results = {
    value: { "..": context },
    size: 0
  };
  typeArgs.forEach(({type,name,anon}) => {
    tryDoc(() => {
      var readResults = this.read(buffer, offset, type, results.value);
      results.size += readResults.size;
      offset += readResults.size;
      if (anon) {
        if(readResults.value !== undefined) Object.keys(readResults.value).forEach(function(key) {
          results.value[key] = readResults.value[key];
        });
      } else
        results.value[name] = readResults.value;
    }, name ? name : "unknown");
  });
  delete results.value[".."];
  return results;
}

function writeContainer(value, buffer, offset, typeArgs, context) {
  value[".."] = context;
  offset=typeArgs.reduce((offset,{type,name,anon}) =>
    tryDoc(() => this.write(anon ? value : value[name], buffer, offset, type, value),name ?  name : "unknown"),offset);
  delete value[".."];
  return offset;
}

function sizeOfContainer(value, typeArgs, context) {
  value[".."] = context;
  var size = typeArgs.reduce((size,{type,name,anon}) =>
    size + tryDoc(() => this.sizeOf(anon ? value : value[name], type, value), name ? name : "unknown"),0);
  delete value[".."];
  return size;
}

function readCountGenerator({type})
{
  return `(buffer,offset,context) => proto.read${capitalizeFirstLetter(type)}(buffer, offset,context);`
}

function readCount(buffer, offset, {type}, rootNode) {
  return this.read(buffer, offset, type, rootNode);
}

function writeCount(value, buffer, offset, {countFor,type}, rootNode) {
  // Actually gets the required field, and writes its length. Value is unused.
  // TODO : a bit hackityhack.
  return this.write(getField(countFor, rootNode).length, buffer, offset, type, rootNode);
}

function sizeOfCount(value, {countFor,type}, rootNode) {
  // TODO : should I use value or getField().length ?
  return this.sizeOf(getField(countFor, rootNode).length, type, rootNode);
}
