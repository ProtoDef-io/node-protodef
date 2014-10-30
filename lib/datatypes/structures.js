/* Support for structural datatypes here. */
var _ = require("lodash");
var createType = require("../utils").createType;

module.exports = {
  'array': createType({ read: readArray, write: writeArray, sizeOf: sizeOfArray }),
  'count': createType({ read: readCount, write: writeCount, sizeOf: sizeOfCount }), // TODO : I seriously want to remove count...
  'struct': createType({ read: readContainer, write: writeContainer, sizeOf: sizeOfContainer }),
  'container': createType({ read: readContainer, write: writeContainer, sizeOf: sizeOfContainer }) // TODO : Deprecated. Use struct instead.
};

var getField = require("../utils").getField;
var getCount = require("../utils").getCount;

// # Array Type
function readArray(buffer, offset, typeArgs, context) {
  var results = {
    value: [],
    size: 0
  };

  var count;
  var error = (function (obj) {
    if (!obj || obj.error)
      return obj;
    count = obj.count;
    results.size = obj.offset - offset;
    offset = obj.offset;
    return null;
  })(getCount.call(this, buffer, offset, typeArgs, context));
  if (error) return error;
  var fieldInfo;
  if (typeArgs.fields)
    fieldInfo = { type: "struct", typeArgs: { fields: typeArgs.fields } };
  else
    fieldInfo = { type: typeArgs.type, typeArgs: typeArgs.typeArgs };
  for (var i = 0; i < count; i++) {
    var readResults = this._readField(buffer, offset, { name: "" + i, type: fieldInfo.type, typeArgs: fieldInfo.typeArgs }, context);
    if (!readResults || readResults.error) {
      return readResults;
    }
    results.size += readResults.size;
    offset += readResults.size;
    results.value.push(readResults.value);
  }
  return results;
}

function writeArray(value, buffer, offset, typeArgs, context) {
  if (typeof typeArgs.countType !== "undefined")
    offset = this._writeField(value.length, buffer, offset, { type: typeArgs.countType }, context);
  for (var index in value)
    offset = this._writeField(value[index], buffer, offset, { type: typeArgs.type, typeArgs: typeArgs.typeArgs }, context);
  return offset;
}

function sizeOfArray(value, typeArgs, context) {
  var size = 0;
  if (typeof typeArgs.countType !== "undefined")
    size += this._sizeOfField(value.length, { type: typeArgs.countType }, context);
  for (var index in value) {
    size += this._sizeOfField(value[index], { type: typeArgs.type, typeArgs: typeArgs.typeArgs }, context);
  }
  return size;
}

function readCount(buffer, offset, typeArgs, context) {
  return this._readField(buffer, offset, { type: typeArgs.type }, context);
}

function writeCount(value, buffer, offset, typeArgs, context) {
  var count;
  if (typeof typeArgs.countFor === "function")
    count = typeArgs.countFor(context);
  else
    count = getField(typeArgs.countFor, context).length;
  return this._writeField(count, buffer, offset, { type: typeArgs.type }, context);
}

function sizeOfCount(value, typeArgs, context) {
  var count;
  if (typeof typeArgs.countFor === "function")
    count = typeArgs.countFor(context);
  else
    count = getField(typeArgs.countFor, context).length;
  return this._sizeOfField(count, { type: typeArgs.type }, context);
}

function readContainer(buffer, offset, typeArgs, context) {
  var results = {
    value: {},
    size: 0
  };
  var subRoot = {super: context};
  _.every(typeArgs.fields, function (field) {
    var readResults = this._readField(buffer, offset, field, subRoot);
    if (readResults == null) { results = null; return false; } // Wut to do, wut to do...
    if (readResults.error) { results.error = readResults.error; return false; }
    results.size += readResults.size;
    offset += readResults.size;
    results.value[field.name] = readResults.value;
    return true;
  }, this);
  return results;
}

function writeContainer(value, buffer, offset, typeArgs, context) {
  var subRoot = { super: context };
  _.forEach(typeArgs.fields, function(field) {
    offset = this._writeField(value[field.name], buffer, offset, field, subRoot);
  }, this);
  return offset;
}

function sizeOfContainer(value, typeArgs, context) {
  var size = 0;
  var subRoot = { super: context };
  _.forEach(typeArgs.fields, function(field) {
    size += this._sizeOfField(value[field.name], field, subRoot);
  }, this);
  return size;
}

