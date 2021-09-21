const { getField, getFieldInfo, tryDoc, PartialReadError } = require('../utils')

module.exports = {
  switch: [readSwitch, writeSwitch, sizeOfSwitch, require('../../ProtoDef/schemas/conditional.json').switch],
  option: [readOption, writeOption, sizeOfOption, require('../../ProtoDef/schemas/conditional.json').option]
}

function readSwitch (buffer, offset, { compareTo, fields, compareToValue, default: defVal }, rootNode) {
  compareTo = compareToValue !== undefined ? compareToValue : getField(compareTo, rootNode)
  if (typeof fields[compareTo] === 'undefined' && typeof defVal === 'undefined') { throw new Error(compareTo + ' has no associated fieldInfo in switch') }
  for (const field in fields) {
    if (field.startsWith('/')) {
      fields[this.types[field.slice(1)]] = fields[field]
      delete fields[field]
    }
  }
  const caseDefault = typeof fields[compareTo] === 'undefined'
  const resultingType = caseDefault ? defVal : fields[compareTo]
  const fieldInfo = getFieldInfo(resultingType)
  return tryDoc(() => this.read(buffer, offset, fieldInfo, rootNode), caseDefault ? 'default' : compareTo)
}

function writeSwitch (value, buffer, offset, { compareTo, fields, compareToValue, default: defVal }, rootNode) {
  compareTo = compareToValue !== undefined ? compareToValue : getField(compareTo, rootNode)
  if (typeof fields[compareTo] === 'undefined' && typeof defVal === 'undefined') { throw new Error(compareTo + ' has no associated fieldInfo in switch') }
  for (const field in fields) {
    if (field.startsWith('/')) {
      fields[this.types[field.slice(1)]] = fields[field]
      delete fields[field]
    }
  }
  const caseDefault = typeof fields[compareTo] === 'undefined'
  const fieldInfo = getFieldInfo(caseDefault ? defVal : fields[compareTo])
  return tryDoc(() => this.write(value, buffer, offset, fieldInfo, rootNode), caseDefault ? 'default' : compareTo)
}

function sizeOfSwitch (value, { compareTo, fields, compareToValue, default: defVal }, rootNode) {
  compareTo = compareToValue !== undefined ? compareToValue : getField(compareTo, rootNode)
  if (typeof fields[compareTo] === 'undefined' && typeof defVal === 'undefined') { throw new Error(compareTo + ' has no associated fieldInfo in switch') }
  for (const field in fields) {
    if (field.startsWith('/')) {
      fields[this.types[field.slice(1)]] = fields[field]
      delete fields[field]
    }
  }
  const caseDefault = typeof fields[compareTo] === 'undefined'
  const fieldInfo = getFieldInfo(caseDefault ? defVal : fields[compareTo])
  return tryDoc(() => this.sizeOf(value, fieldInfo, rootNode), caseDefault ? 'default' : compareTo)
}

function readOption (buffer, offset, typeArgs, context) {
  if (buffer.length < offset + 1) { throw new PartialReadError() }
  if (buffer.readUInt8(offset++)) {
    const retval = this.read(buffer, offset, typeArgs, context)
    retval.size++
    return retval
  } else { return { size: 1 } }
}

function writeOption (value, buffer, offset, typeArgs, context) {
  const isPresent = value != null
  buffer.writeUInt8(isPresent | 0, offset++)
  if (isPresent) {
    offset = this.write(value, buffer, offset, typeArgs, context)
  }
  return offset
}

function sizeOfOption (value, typeArgs, context) {
  return value == null ? 1 : this.sizeOf(value, typeArgs, context) + 1
}
