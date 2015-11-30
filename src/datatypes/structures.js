var { getField, tryCatch, addErrorField } = require("../utils");

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
    var countResults=tryCatch(() => this.read(buffer, offset, { type: typeArgs.countType, typeArgs: typeArgs.countTypeArgs }, rootNode),
      (e) => addErrorField(e, "$count"));
    results.size += countResults.size;
    offset += countResults.size;
    count = countResults.value;
  } else // TODO : broken schema, should probably error out.
    count = 0;
  for(var i = 0; i < count; i++) {
    var readResults=tryCatch(() => this.read(buffer, offset, typeArgs.type, rootNode), (e) => addErrorField(e, i));
    results.size += readResults.size;
    offset += readResults.size;
    results.value.push(readResults.value);
  }
  return results;
}

function writeArray(value, buffer, offset, typeArgs, rootNode) {
  if (typeof typeArgs.count === "undefined" && typeof typeArgs.countType !== "undefined")
    offset= tryCatch(() => this.write(value.length, buffer, offset, { type: typeArgs.countType, typeArgs: typeArgs.countTypeArgs }, rootNode),
      (e) => addErrorField(e, "$count"));
  else if (typeof typeArgs.count === "undefined") { // Broken schema, should probably error out
  }
  return value.reduce((offset,v,index) =>tryCatch(
    () => offset+this.write(v, buffer, offset, typeArgs.type, rootNode),
    (e) => addErrorField(e, index)),offset);
}

function sizeOfArray(value, typeArgs, rootNode) {
  var size = 0;
  if (typeof typeArgs.count === "undefined" &&  typeof typeArgs.countType !== "undefined")
    size=tryCatch(() => this.sizeOf(value.length, { type: typeArgs.countType, typeArgs: typeArgs.countTypeArgs }, rootNode),
      (e) => addErrorField(e, "$count"));

  return value.reduce((offset,v,index) =>tryCatch(
    () => offset+this.sizeOf(v, typeArgs.type, rootNode),
    (e) => addErrorField(e, index)),size);
}


function readContainer(buffer, offset, typeArgs, context) {
  var results = {
    value: { "..": context },
    size: 0
  };
  typeArgs.forEach((typeArg) => {
    tryCatch(() => {
      var readResults = this.read(buffer, offset, typeArg.type, results.value);
      results.size += readResults.size;
      offset += readResults.size;
      if (typeArg.anon) {
        if(readResults.value !== undefined) Object.keys(readResults.value).forEach(function(key) {
          results.value[key] = readResults.value[key];
        });
      } else
        results.value[typeArg.name] = readResults.value;
    }, (e) => addErrorField(e, typeArgs && typeArg && typeArg.name ? typeArg.name : "unknown"));
  });
  delete results.value[".."];
  return results;
}

function writeContainer(value, buffer, offset, typeArgs, context) {
  value[".."] = context;
  typeArgs.forEach((typeArg) => {
    tryCatch(() => {
      if (typeArg.anon)
        offset = this.write(value, buffer, offset, typeArg.type, value);
      else
        offset = this.write(value[typeArg.name], buffer, offset, typeArg.type, value);
    }, (e) => addErrorField(e,typeArgs && typeArg && typeArg.name ?  typeArg.name : "unknown"));
  });
  delete value[".."];
  return offset;
}

function sizeOfContainer(value, typeArgs, context) {
  value[".."] = context;
  var size = 0;
  typeArgs.forEach((typeArg) => {
    tryCatch(() => {
      if (typeArg.anon)
        size += this.sizeOf(value, typeArg.type, value);
      else
        size += this.sizeOf(value[typeArg.name], typeArg.type, value);
    }, (e) =>  addErrorField(e, typeArgs && typeArg && typeArg.name ? typeArg.name : "unknown"));
  });
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
