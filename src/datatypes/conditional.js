var { getField, getFieldInfo, tryDoc, PartialReadError} = require('../utils');

module.exports = {
  'switch': [readSwitch, writeSwitch, sizeOfSwitch, readSwitchGenerator],
  'option': [readOption, writeOption, sizeOfOption, readOptionGenerator]
};

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

function readSwitchGenerator({compareTo,fields,compareToValue,...rest},proto){
  return `
      (buffer, offset, context) => {
      var compareTo = ${compareToValue !==undefined ? `"${compareToValue}"` : `getField("${compareTo}", context)`};
      switch(compareTo) {
      ${Object.keys(fields).reduce((old,key) =>
            `${old} case ${key}:
                return proto.read${capitalizeFirstLetter(fields[key])}(buffer, offset,context);
              break;
            `,"")}
          default:
            ${rest.default ?
    `return proto.read${capitalizeFirstLetter(rest.default)}(buffer, offset,context);` :
    `throw new Error(compareTo + " has no associated fieldInfo in switch");`}
      }
     }`;
}

function readSwitch(buffer, offset, {compareTo,fields,compareToValue,...rest}, rootNode) {
  compareTo = compareToValue!==undefined ? compareToValue : getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var resultingType = caseDefault ? rest.default : fields[compareTo];
  var fieldInfo = getFieldInfo(resultingType);
  return tryDoc(() => this.read(buffer, offset, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function writeSwitch(value, buffer, offset, {compareTo,fields,compareToValue,...rest}, rootNode) {
  compareTo = compareToValue!==undefined ? compareToValue : getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var fieldInfo = getFieldInfo(caseDefault ? rest.default : fields[compareTo]);
  return tryDoc(() => this.write(value, buffer, offset, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function sizeOfSwitch(value, {compareTo,fields,compareToValue,...rest}, rootNode) {
  compareTo = compareToValue!==undefined ? compareToValue : getField(compareTo, rootNode);
  if (typeof fields[compareTo] === 'undefined' && typeof rest.default === "undefined")
    throw new Error(compareTo + " has no associated fieldInfo in switch");

  var caseDefault=typeof fields[compareTo] === 'undefined';
  var fieldInfo = getFieldInfo(caseDefault ? rest.default : fields[compareTo]);
  return tryDoc(() => this.sizeOf(value, fieldInfo, rootNode),caseDefault ? "default" : compareTo);
}

function readOptionGenerator(typeArgs) {
  return `(buffer,offset,context) => {
  if(buffer.length<offset+1)
    throw new PartialReadError();
  var val = buffer.readUInt8(offset++);
  if (val !== 0) {
    var retval = proto.read${capitalizeFirstLetter(typeArgs)}(buffer, offset,context);
    retval.size++;
    return retval;
  }
  else
    return {size: 1};
   }`;
}

function readOption(buffer, offset, typeArgs, context) {
  if(buffer.length<offset+1)
    throw new PartialReadError();
  var val = buffer.readUInt8(offset++);
  if (val !== 0) {
    var retval = this.read(buffer, offset, typeArgs, context);
    retval.size++;
    return retval;
  }
  else
    return {size: 1};
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
