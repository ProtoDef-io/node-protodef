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
  return [function read(buffer, offset, typeArgs, context) {
    return functions[0].call(this, buffer, offset, produceArgs(typeArgs), context);
  }, function write(value, buffer, offset, typeArgs, context) {
    return functions[1].call(this, value, buffer, offset, produceArgs(typeArgs), context);
  }, function sizeOf(value, typeArgs, context) {
    if (typeof functions[2] === "function")
      return functions[2].call(this, value, produceArgs(typeArgs), context);
    else
      return functions[2];
  }];
}

class ProtoDef
{
  constructor() {
    this.types={};
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

  read(buffer, cursor, _fieldInfo, rootNodes) {
    let {type,typeArgs} = getFieldInfo(_fieldInfo);
    var typeFunctions = this.types[type];
    if(!typeFunctions)
      throw new Error("missing data type: " + type);
    return typeFunctions[0].call(this, buffer, cursor, typeArgs, rootNodes);
  }

  write(value, buffer, offset, _fieldInfo, rootNode) {
    let {type,typeArgs} = getFieldInfo(_fieldInfo);
    var typeFunctions = this.types[type];
    if(!typeFunctions)
      throw new Error("missing data type: " + type);
    return typeFunctions[1].call(this, value, buffer, offset, typeArgs, rootNode);
  }

  sizeOf(value, _fieldInfo, rootNode) {
    let {type,typeArgs} = getFieldInfo(_fieldInfo);
    var typeFunctions = this.types[type];
    if(!typeFunctions) {
      throw new Error("missing data type: " + type);
    }
    if(typeof typeFunctions[2] === 'function') {
      return typeFunctions[2].call(this, value, typeArgs, rootNode);
    } else {
      return typeFunctions[2];
    }
  }

  createPacketBuffer(type,packet) {
    var length=tryCatch(()=> this.sizeOf(packet, type, {}),
      (e)=> {
        e.message = `SizeOf error for ${e.field} : ${e.message}`;
        throw e;
      });
    var buffer = new Buffer(length);
    tryCatch(()=> this.write(packet, buffer, 0, type, {}),
      (e)=> {
        e.message = `Write error for ${e.field} : ${e.message}`;
        throw e;
      });
    return buffer;
  }

  parsePacketBuffer(type,buffer) {
    var {value,size}=tryCatch(()=> this.read(buffer, 0, type, {}),
      (e) => {
        e.message=`Read error for ${e.field} : ${e.message}`;
        throw e;
      });
    return {
      data: value,
      metadata:{
        size:size
      },
      buffer:buffer.slice(0,size)
    };
  }
}

module.exports = ProtoDef;
