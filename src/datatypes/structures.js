var { getField, tryDoc } = require("../utils");

module.exports = {
  'array': [readArray, writeArray, sizeOfArray],
  'count': [readCount, writeCount, sizeOfCount],
  'container': [readContainer, writeContainer, sizeOfContainer]
};


function evalCount(count, fields) {
  if(fields[count["field"]] in count["map"])
    return count["map"][fields[count["field"]]];
  return count["default"];
}

async function readArray(read, {type,count,countType,countTypeArgs}, rootNode) {
  var c;
  if(typeof count === "object")
    c = evalCount(count, rootNode);
  else if (typeof count !== "undefined")
    c = getField(count, rootNode);
  else if (typeof countType !== "undefined") {
    c=await tryDoc(() => this.read(read, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  } else // TODO : broken schema, should probably error out.
    c = 0;
  var results=[];
  for(var i = 0; i < c; i++)
    results.push(await tryDoc(() => this.read(read, type, rootNode), i));
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


async function readContainer(read, typeArgs, context) {
  var values=await typeArgs.reduce(async (p,{type,name,anon}) =>
    tryDoc(async () => {
      var values = await p;
      var value = await this.read(read, type, values);
      if (anon) {
        if (value !== undefined) Object.keys(value).forEach(key => values[key] = value[key]);
      }
      else
        values[name] = value;
      return values;
    }, name ? name : "unknown")
  ,Promise.resolve({ "..": context }));
  delete values[".."];
  return values;
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

function readCount(read, {type}, rootNode) {
  return this.read(read, type, rootNode);
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
