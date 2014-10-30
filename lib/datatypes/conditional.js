var _ = require("lodash");
var createType = require("../utils").createType;

module.exports = {
  'switch': createType({ read: readSwitch, write: writeSwitch, sizeOf: sizeOfSwitch }),
  'range': createType({ read: readRange, write: writeRange, sizeOf: sizeOfRange })
};
// TODO : Add multiswitch : simulate
// switch(x)
//   case 1:
//   case 6:
//   case 9:
//    //do stuff for 1, 6 and 9
var getField = require("../utils").getField;
var getFieldInfo = require("../utils").getFieldInfo;

function readSwitch(buffer, offset, typeArgs, rootNode) {
  var compareTo;
  try {
    compareTo = getField(typeArgs.compareTo, rootNode);
  } catch(e) {
    return { error: e };
  }
  var fieldInfo;
  if (typeof typeArgs.fields[compareTo] === 'undefined' && typeof typeArgs.default === "undefined")
    return { error: new Error(compareTo + " has no associated fieldInfo in switch") };
  else if (typeof typeArgs.fields[compareTo] === 'undefined')
    fieldInfo = getFieldInfo(typeArgs.default);
  else
    fieldInfo = getFieldInfo(typeArgs.fields[compareTo]);
  var tmpFieldInfo = { name: "[" + compareTo + "]", type: fieldInfo.type, typeArgs: fieldInfo.typeArgs };
  return this._readField(buffer, offset, tmpFieldInfo, rootNode);
}

// TODO : Support default
function writeSwitch(value, buffer, offset, typeArgs, rootNode) {
  var compareTo = getField(typeArgs.compareTo, rootNode);
  return this._writeField(value, buffer, offset, typeArgs.fields[compareTo], rootNode);
}
// TODO : support default
function sizeOfSwitch(value, typeArgs, rootNode) {
  var compareTo = getField(typeArgs.compareTo, rootNode);
  return this._sizeOfField(value, typeArgs.fields[compareTo], rootNode);
}

function readRange(buffer, offset, typeArgs, rootNode) {
  try {
    var compareTo = getField(typeArgs.compareTo, rootNode);
  } catch(e) {
    return { error: e }
  }
  var fieldInfo = _.find(typeArgs.fields, function(field) {
    return field.from <= compareTo && compareTo <= field.to;
  });
  if (typeof fieldInfo === "undefined" && typeof typeArgs.default === "undefined")
    return { error: new Error(compareTo + " has no associated fieldInfo in range") };
  else if (typeof fieldInfo === "undefined")
    fieldInfo = typeArgs.default;
  else
    fieldInfo = fieldInfo.fields;
  if (Array.isArray(fieldInfo)) {
    fieldInfo = { type: "struct", typeArgs: { fields: fieldInfo } };
  }
  var subRoot = { super: rootNode };
  var tmpFieldInfo = { name: "[" + compareTo + "]", type: fieldInfo.type, typeArgs: fieldInfo.typeArgs };
  return this._readField(buffer, offset, tmpFieldInfo, subRoot);
}

function writeRange(value, buffer, offset, typeArgs, rootNode) {
  var compareTo = getField(typeArgs.compareTo, rootNode);
  var fieldInfo = _.find(typeArgs.fields, function(field) {
    return field.from <= compareTo && compareTo <= field.to;
  });
  if (typeof fieldInfo === "undefined" && typeof typeArgs.default === "undefined")
    return { error: new Error(compareTo + " has no associated fieldInfo in range") };
  else if (typeof fieldInfo === "undefined")
    fieldInfo = typeArgs.default;
  if (Array.isArray(fieldInfo)) {
    fieldInfo = { type: "struct", typeArgs: { fields: fieldInfo } };
  }
  var subRoot = { super: rootNode };
  return this._writeField(value, buffer, offset, fieldInfo, subRoot);
}

function sizeOfRange(value, typeArgs, rootNode) {
  var compareTo = getField(typeArgs.compareTo, rootNode);
  var fieldInfo = _.find(typeArgs.fields, function(field) {
    return field.from <= compareTo && compareTo <= field.to;
  });
  if (typeof fieldInfo === "undefined" && typeof typeArgs.default === "undefined")
    return { error: new Error(compareTo + " has no associated fieldInfo in range") };
  else if (typeof fieldInfo === "undefined")
    fieldInfo = typeArgs.default;
  if (Array.isArray(fieldInfo)) {
    fieldInfo = { type: "struct", typeArgs: { fields: fieldInfo } };
  }
  var subRoot = { super: rootNode };
  return this._sizeOfField(value, fieldInfo, subRoot);
}
