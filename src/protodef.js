var { getFieldInfo, tryCatch } = require('./utils');
var reduce = require('lodash.reduce');

function isFieldInfo(type) {
  return typeof type === "string"
    || (Array.isArray(type) && typeof type[0] === "string")
    || type.type;
}

function findArgs(acc, v, k) {
  if (typeof v === "string" && v.charAt(0) === '$')
    acc.push({ "path": k, "val": v.substr(1) });
  else if (Array.isArray(v) || typeof v === "object")
    acc = acc.concat(reduce(v, findArgs, []).map((v) => ({ "path": k + "." + v.path, "val": v.val })));
  return acc;
}

function setField(path, val, into) {
  var c = path.split('.').reverse();
  while (c.length > 1) {
    into = into[c.pop()];
  }
  into[c.pop()] = val;
}

function extendType(functions, defaultTypeArgs) {
  var json=JSON.stringify(defaultTypeArgs);
  var argPos = reduce(defaultTypeArgs, findArgs, []);
  function produceArgs(typeArgs) {
    var args = JSON.parse(json);
    argPos.forEach((v) => {
      setField(v.path, typeArgs[v.val], args);
    });
    return args;
  }
  return [function read(read, typeArgs, context) {
    return functions[0].call(this, read, produceArgs(typeArgs), context);
  }, function write(value, write, typeArgs, context) {
    return functions[1].call(this, value, write, produceArgs(typeArgs), context);
  }];
}

class ProtoDef
{
  types={};

  constructor() {
    this.addDefaultTypes();
  }

  addDefaultTypes() {
    this.addTypes(require("./datatypes/numeric"));
    this.addTypes(require("./datatypes/utils"));
    this.addTypes(require("./datatypes/structures"));
    this.addTypes(require("./datatypes/conditional"));
  }

  addType(name, functions) {
    if (functions === "native")
      return;
    if (isFieldInfo(functions)) {
      var {type,typeArgs} = getFieldInfo(functions);
      this.types[name] = extendType(this.types[type], typeArgs);
    }
    else
      this.types[name] = functions;
  }

  addTypes(types) {
    Object.keys(types).forEach((name) => this.addType(name, types[name]));
  }

  read(read, _fieldInfo, rootNodes) {
    let {type,typeArgs} = getFieldInfo(_fieldInfo);
    var typeFunctions = this.types[type];
    if(!typeFunctions) {
      return {
        error: new Error("missing data type: " + type)
      };
    }
    return typeFunctions[0].call(this, read, typeArgs, rootNodes);
  }

  write(value, write, _fieldInfo, rootNode) {
    let {type,typeArgs} = getFieldInfo(_fieldInfo);
    var typeFunctions = this.types[type];
    if(!typeFunctions) {
      return {
        error: new Error("missing data type: " + type)
      };
    }
    typeFunctions[1].call(this, value, write, typeArgs, rootNode);
  }

  createPacketBuffer(type,packet,write) {
    tryCatch(()=> this.write(packet, write, type, {}),
      (e)=> {
        e.message = `Write error for ${e.field} : ${e.message}`;
        throw e;
      });
  }

  parsePacketBuffer(type,read) {
    return tryCatch(()=> this.read(read, type, {}),
      (e) => {
        e.message=`Read error for ${e.field} : ${e.message}`;
        throw e;
      });
  }
}

module.exports = ProtoDef;
