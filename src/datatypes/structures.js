var { getField, tryDoc } = require("../utils");

module.exports = {
  'array': [readArray, writeArray],
  'count': [readCount, writeCount],
  'container': [readContainer, writeContainer]
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

function writeArray(value, write, {type,count,countType,countTypeArgs}, rootNode) {
  if (typeof count === "undefined" && typeof countType !== "undefined")
    tryDoc(() => this.write(value.length, write, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  else if (typeof count === "undefined") { // Broken schema, should probably error out
  }
  value.map((v,index) =>tryDoc(() => this.write(v, write, type, rootNode),index));
}

async function readContainer(read, typeArgs, context) {
  var values=await typeArgs.reduce(async (p,{type,name,anon}) =>
    tryDoc(async () => {
      var values = await p;
      console.log("plop1")
      var value = await this.read(read, type, values);
      console.log(value)
      console.log("plop")
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

function writeContainer(value, write, typeArgs, context) {
  value[".."] = context;
  typeArgs.map(({type,name,anon}) =>
    tryDoc(() => this.write(anon ? value : value[name], write, type, value),name ?  name : "unknown"));
  delete value[".."];
}

function readCount(read, {type}, rootNode) {
  return this.read(read, type, rootNode);
}

function writeCount(value, write, {countFor,type}, rootNode) {
  // Actually gets the required field, and writes its length. Value is unused.
  // TODO : a bit hackityhack.
  return this.write(getField(countFor, rootNode).length, write, type, rootNode);
}

