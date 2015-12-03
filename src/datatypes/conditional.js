var { getField, getFieldInfo, tryDoc} = require('../utils');

module.exports = {
  'switch': [readSwitch, writeSwitch, sizeOfSwitch],
  'option': [readOption, writeOption, sizeOfOption]
};

function readSwitch(read, {compareTo,fields,...rest}, rootNode) {
  compareTo = getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var resultingType = caseDefault ? rest.default : fields[compareTo];
  var fieldInfo = getFieldInfo(resultingType);
  return tryDoc(() => this.read(read, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function writeSwitch(value, buffer, offset, {compareTo,fields,...rest}, rootNode) {
  compareTo = getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var fieldInfo = getFieldInfo(caseDefault ? rest.default : fields[compareTo]);
  return tryDoc(() => this.write(value, buffer, offset, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function sizeOfSwitch(value, {compareTo,fields,...rest}, rootNode) {
  compareTo = getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var fieldInfo = getFieldInfo(caseDefault ? rest.default : fields[compareTo]);
  return tryDoc(() => this.sizeOf(value, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function readOption(read, typeArgs, context) {
  readUInt8(0)
    .then(buf => buf.readUInt8(0))
    .then(val => (val !== 0) ? this.read(read, typeArgs, context) : undefined);
}

function writeOption(value, buffer, offset, typeArgs, context) {
  if (value != null) {
    buffer.writeUInt8(1, offset++);
    offset=this.write(value, buffer, offset, typeArgs, context);
  }
  else
    buffer.writeUInt8(0, offset++);
  return offset;
}

function sizeOfOption(value, typeArgs, context) {
  return value == null ? 1 : this.sizeOf(value, typeArgs, context) + 1;
}
