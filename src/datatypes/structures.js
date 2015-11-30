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

function readArray(buffer, offset, {type,count,countType,countTypeArgs}, rootNode) {
  var results = {
    value: [],
    size: 0
  };
  var c;
  if(typeof count === "object")
    c = evalCount(count, rootNode);
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
