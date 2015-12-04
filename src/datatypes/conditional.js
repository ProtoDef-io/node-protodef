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
    .then(({buffer,offset}) => buffer.readUInt8(offset))
    .then(val => (val !== 0) ? this.read(read, typeArgs, context) : undefined);
}

function writeOption(value, write, typeArgs, context) {
  if (value != null) {
    write((new Buffer(1).writeUInt8(1)));
    this.write(value, write, typeArgs, context);
  }
  else
    write((new Buffer(0).writeUInt8(1)));
}
