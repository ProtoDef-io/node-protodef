const { getField, getCount, sendCount, calcCount, tryDoc, Enum: { ParentSymbol }, Result } = require('../../utils')
const schema = require('../../../ProtoDef/schemas/structures.json')

function readArray (buffer, offset, typeArgs, rootNode) {
  const value = []
  let { count, size } = getCount.call(this, buffer, offset, typeArgs, rootNode)
  offset += size
  for (let i = 0; i < count; i++) {
    const res = tryDoc(this.read.bind(this, buffer, offset, typeArgs.type, rootNode), i)
    size += res.size
    offset += res.size
    value.push(res.value)
  }
  return new Result(value, size)
}

function writeArray (value, buffer, offset, typeArgs, rootNode) {
  offset = sendCount.call(this, value.length, buffer, offset, typeArgs, rootNode)
  for (let i = 0, l = value.length; i < l; i++) {
    offset = tryDoc(this.write.bind(this, value[i], buffer, offset, typeArgs.type, rootNode), i)
  }
  return offset
}

function sizeOfArray (value, typeArgs, rootNode) {
  let size = calcCount.call(this, value.length, typeArgs, rootNode)
  for (let i = 0, l = value.length; i < l; i++) {
    size += tryDoc(this.sizeOf.bind(this, value[i], typeArgs.type, rootNode), i)
  }
  return size
}

function readCount (buffer, offset, { type }, rootNode) {
  return this.read(buffer, offset, type, rootNode)
}

function writeCount (value, buffer, offset, { countFor, type }, rootNode) {
  // Actually gets the required field, and writes its length. Value is unused.
  // TODO : a bit hackityhack.
  return this.write(getField(countFor, rootNode).length, buffer, offset, type, rootNode)
}

function sizeOfCount (value, { countFor, type }, rootNode) {
  // TODO : should I use value or getField().length ?
  return this.sizeOf(getField(countFor, rootNode).length, type, rootNode)
}

function readContainer (buffer, offset, typeArgs, context) {
  const value = { [ParentSymbol]: context }
  let size = 0
  for (const { type, name, anon } of typeArgs) {
    const res = tryDoc(this.read.bind(this, buffer, offset, type, value), name || 'unknown')
    size += res.size
    offset += res.size
    if (anon && res.value !== undefined) {
      for (const k in res.value) {
        value[k] = res.value[k]
      }
      continue
    }
    value[name] = res.value
  }
  value[ParentSymbol] = undefined
  return new Result(value, size)
}

function writeContainer (value, buffer, offset, typeArgs, context) {
  value[ParentSymbol] = context
  for (const { type, name, anon } of typeArgs) {
    offset = tryDoc(this.write.bind(this, anon ? value : value[name], buffer, offset, type, value), name || 'unknown')
  }
  value[ParentSymbol] = undefined
  return offset
}

function sizeOfContainer (value, typeArgs, context) {
  value[ParentSymbol] = context
  let size = 0
  for (const { type, name, anon } of typeArgs) {
    size += tryDoc(this.sizeOf.bind(this, anon ? value : value[name], type, value), name || 'unknown')
  }
  value[ParentSymbol] = undefined
  return size
}

module.exports = {
  'array': [readArray, writeArray, sizeOfArray, schema['array']],
  'count': [readCount, writeCount, sizeOfCount, schema['count']],
  'container': [readContainer, writeContainer, sizeOfContainer, schema['container']]
}
