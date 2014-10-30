var _ = require("lodash"); // TODO : can we do away of this dep ?

module.exports = {
  createSubRoot: createSubroot,
  getField: getField,
  getFieldInfo: getFieldInfo,
  createType: createType,
  extendType: extendType,
  getCount: getCount,
  getReader: getReader,
  getWriter: getWriter,
  getSizeOf: getSizeOf
};

function createSubroot(currentRoot) {
  var subRoot = { __super: currentRoot };
  var toplevel = currentRoot;
  while (toplevel.hasOwnProperty("__super")) {
    toplevel = toplevel.__super;
  }
  subRoot.__root = toplevel;
  return subRoot;
}

function getField(fieldPath, context) {
  if (typeof fieldPath === "function")
    return fieldPath(context);
  var fieldPathArr = fieldPath.split(".");
  var field = context;
  fieldPathArr.forEach(function (currPath) {
    field = field[currPath];
  });
  return field;
}

function getFieldInfo(fieldInfo) {
  if (Array.isArray(fieldInfo)) // Syntastic suggar.
    fieldInfo = { type: "struct", typeArgs: { fields: fieldInfo } };
  return fieldInfo;
}

function createType(readFunc, writeFunc, sizeOfFunc) {
  var obj = readFunc;
  if (typeof readFunc === "object")
    return [obj.read, obj.write, obj.sizeOf];
  else
    return [readFunc, writeFunc, sizeOfFunc];
}

function getReader(functions) {
  return functions[0];
}

function getWriter(functions) {
  return functions[1];
}

function getSizeOf(functions) {
  return functions[2];
}

function extendType(functions, typeArgs) {
  if (functions == null)
    throw new Error();
  function wrapperRead(buffer, offset, calledTypeArgs, rootNode) {
    calledTypeArgs = _.defaults(calledTypeArgs, typeArgs);
    return getReader(functions).call(this, buffer, offset, calledTypeArgs, rootNode);
  }
  function wrapperWrite(value, buffer, offset, calledTypeArgs, rootNode) {
    calledTypeArgs = _.defaults(calledTypeArgs, typeArgs);
    return getWriter(functions).call(this, value, buffer, offset, calledTypeArgs, rootNode);
  }
  function wrapperSizeOf(value, calledTypeArgs, rootNode) {
    calledTypeArgs = _.defaults(calledTypeArgs, typeArgs);
    return getSizeOf(functions).call(this, value, calledTypeArgs, rootNode);
  }
  return createType(wrapperRead, wrapperWrite, wrapperSizeOf);
}

function getCount(buffer, offset, typeArgs, context) {
  var count;
  if (typeof typeArgs.countType !== "undefined" && typeof typeArgs.count !== "undefined")
    // TODO : Move this to a "verifyProtocol" method or something ?
    throw new Error("count and countFor are both defined !");
  else if (typeof typeArgs.countType !== "undefined") {
    var countResults = this._readField(buffer, offset, { type: typeArgs.countType }, context);
    if (!countResults || countResults.error)
      return countResults;
    offset += countResults.size;
    count = countResults.value;
  } else if (typeof typeArgs.count === "function") {
    count = typeArgs.count(context);
  } else if (typeof typeArgs.count === "number") {
    count = typeArgs.count;
  } else if (typeof typeArgs.count === "string") {
    count = getField(typeArgs.count, context);  
  } else {
    // TODO : Move this to a "verifyProtocol" method or something ?
    throw new Error("Invalid protocol definition : invalid or missing count or countFor");
  }
  return { count: count, offset: offset };
}
