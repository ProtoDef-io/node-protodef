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

function range(a,b)
{
  var arr=[];
  for(var i=a;i<b;i++)
    arr.push(i);
  return arr;
}

function readArray(read, {type,count,countType,countTypeArgs}, rootNode) {
  var p;
  if(typeof count === "object")
    p = Promise.resolve(evalCount(count, rootNode));
  else if (typeof count !== "undefined")
    p = Promise.resolve(getField(count, rootNode));
  else if (typeof countType !== "undefined") {
    p=tryDoc(() => this.read(read, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  } else // TODO : broken schema, should probably error out.
    p = Promise.resolve(0);
  return p.then(c =>
    range(0,c)
      .reduce((presults,i) =>
        presults.then(results =>
            tryDoc(() => this.read(read, type, rootNode), i)
            .then(val => {results.push(val);return results})
        )
        ,Promise.resolve([]))
  );
}

function writeArray(value, write, {type,count,countType,countTypeArgs}, rootNode) {
  if (typeof count === "undefined" && typeof countType !== "undefined")
    tryDoc(() => this.write(value.length, write, { type: countType, typeArgs: countTypeArgs }, rootNode),"$count");
  else if (typeof count === "undefined") { // Broken schema, should probably error out
  }
  value.map((v,index) =>tryDoc(() => this.write(v, write, type, rootNode),index));
}

function readContainer(read, typeArgs, context) {
  return typeArgs.reduce((p,{type,name,anon}) =>
    tryDoc(() =>
      p.then(values =>
        this.read(read, type, values)
        .then(value => {
          if(!anon)
            values[name] = value;
          else if (value !== undefined)
            Object.keys(value).forEach(key => values[key] = value[key]);
          return values;
        }))
    , name ? name : "unknown")
  ,Promise.resolve({ "..": context }))
  .then(values => {delete values[".."];return values});
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

