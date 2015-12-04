var { getField, getFieldInfo, tryDoc} = require('../utils');

module.exports = {
  'switch': [readSwitch, writeSwitch],
  'option': [readOption, writeOption]
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

function writeSwitch(value, write, {compareTo,fields,...rest}, rootNode) {
  compareTo = getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var fieldInfo = getFieldInfo(caseDefault ? rest.default : fields[compareTo]);
  tryDoc(() => this.write(value, write, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function readOption(read, typeArgs, context) {
  read(1)
    .then(buffer => buffer.readUInt8(0))
    .then(val => (val !== 0) ? this.read(read, typeArgs, context) : undefined);
}

function writeOption(value, write, typeArgs, context) {
  if (value != null) {
    write(1, buffer => buffer.writeUInt8(1,0));
    this.write(value, write, typeArgs, context);
  }
  else
    write(1, buffer => buffer.writeUInt8(0,0));
}
