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

function readArray(buffer, offset, typeArgs, rootNode) {
  var results = {
    value: [],
    size: 0
  };
  var count;
  if(typeof typeArgs.count === "object")
    count = evalCount(typeArgs.count, rootNode);
  else if (typeof typeArgs.count !== "undefined")
    count = getField(typeArgs.count, rootNode);
  else if (typeof typeArgs.countType !== "undefined") {
    var countResults=tryDoc(() => this.read(buffer, offset, { type: typeArgs.countType, typeArgs: typeArgs.countTypeArgs }, rootNode),"$count");
    results.size += countResults.size;
    offset += countResults.size;
    count = countResults.value;
  } else // TODO : broken schema, should probably error out.
    count = 0;
  for(var i = 0; i < count; i++) {
    var readResults=tryDoc(() => this.read(buffer, offset, typeArgs.type, rootNode), i);
    results.size += readResults.size;
    offset += readResults.size;
    results.value.push(readResults.value);
  }
  return results;
}

function writeArray(value, buffer, offset, typeArgs, rootNode) {
  if (typeof typeArgs.count === "undefined" && typeof typeArgs.countType !== "undefined")
    offset= tryDoc(() => this.write(value.length, buffer, offset, { type: typeArgs.countType, typeArgs: typeArgs.countTypeArgs }, rootNode),"$count");
  else if (typeof typeArgs.count === "undefined") { // Broken schema, should probably error out
  }
  return value.reduce((offset,v,index) =>tryDoc(() => this.write(v, buffer, offset, typeArgs.type, rootNode),index),offset);
}

function sizeOfArray(value, typeArgs, rootNode) {
  var size = 0;
  if (typeof typeArgs.count === "undefined" &&  typeof typeArgs.countType !== "undefined")
    size=tryDoc(() => this.sizeOf(value.length, { type: typeArgs.countType, typeArgs: typeArgs.countTypeArgs }, rootNode),"$count");

  return value.reduce((size,v,index) =>tryDoc(() => size+this.sizeOf(v, typeArgs.type, rootNode), index),size);
}


function readContainer(buffer, offset, typeArgs, context) {
  var results = {
    value: { "..": context },
    size: 0
  };
  typeArgs.forEach((typeArg) => {
    tryDoc(() => {
      var readResults = this.read(buffer, offset, typeArg.type, results.value);
      results.size += readResults.size;
      offset += readResults.size;
      if (typeArg.anon) {
        if(readResults.value !== undefined) Object.keys(readResults.value).forEach(function(key) {
          results.value[key] = readResults.value[key];
        });
      } else
        results.value[typeArg.name] = readResults.value;
    }, typeArgs && typeArg && typeArg.name ? typeArg.name : "unknown");
  });
  delete results.value[".."];
  return results;
}

function writeContainer(value, buffer, offset, typeArgs, context) {
  value[".."] = context;
  offset=typeArgs.reduce((offset,typeArg) =>
    tryDoc(() => this.write(typeArg.anon ? value : value[typeArg.name], buffer, offset, typeArg.type, value),
      typeArgs && typeArg && typeArg.name ?  typeArg.name : "unknown"),offset);
  delete value[".."];
  return offset;
}

function sizeOfContainer(value, typeArgs, context) {
  value[".."] = context;
  var size = typeArgs.reduce((size,typeArg) =>
    size + tryDoc(() => this.sizeOf(typeArg.anon ? value : value[typeArg.name], typeArg.type, value),
      typeArgs && typeArg && typeArg.name ? typeArg.name : "unknown"),0);
  delete value[".."];
  return size;
}

function readCount(buffer, offset, typeArgs, rootNode) {
  return this.read(buffer, offset, typeArgs.type, rootNode);
}

function writeCount(value, buffer, offset, typeArgs, rootNode) {
  // Actually gets the required field, and writes its length. Value is unused.
  // TODO : a bit hackityhack.
  return this.write(getField(typeArgs.countFor, rootNode).length, buffer, offset, typeArgs.type, rootNode);
}

function sizeOfCount(value, typeArgs, rootNode) {
  // TODO : should I use value or getField().length ?
  return this.sizeOf(getField(typeArgs.countFor, rootNode).length, typeArgs.type, rootNode);
}
