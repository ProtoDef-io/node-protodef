const { getField, getCount, sendCount, calcCount, tryDoc } = require('../utils')

module.exports = {
  array: [readArray, writeArray, sizeOfArray, require('../../ProtoDef/schemas/structures.json').array],
  count: [readCount, writeCount, sizeOfCount, require('../../ProtoDef/schemas/structures.json').count],
  container: [readContainer, writeContainer, sizeOfContainer, require('../../ProtoDef/schemas/structures.json').container]
}

function readArray (buffer, offset, typeArgs, rootNode) {
  const results = []
  const offsetStart = offset
  let value
  let { count, size } = getCount.call(this, buffer, offset, typeArgs, rootNode)
  offset += size
  for (let i = 0; i < count; i++) {
    ({ size, value } = tryDoc(this.read.bind(this, buffer, offset, typeArgs.type, rootNode), i))
    offset += size
    results.push(value)
  }
  return {
    value: results,
    size: offset - offsetStart
  }
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

const ParentSymbol = '..' // Symbol('ProtoDefInterpreterFieldParent')

function readContainer (buffer, offset, typeArgs, context) {
  const results = { [ParentSymbol]: context }
  const offsetStart = offset
  for (const { type, name, anon = false } of typeArgs) {
    const { value, size } = tryDoc(this.read.bind(this, buffer, offset, type, results), name || 'unknown')
    offset += size
    if (anon && typeof value === 'object') {
      for (const k in value) {
        results[k] = value[k]
      }
      continue
    }
    results[k] = value
  }
  delete results.value[ParentSymbol]
  return {
    value: results,
    size: offset - offsetStart
  }
}

function writeContainer (value, buffer, offset, typeArgs, context) {
  value[ParentSymbol] = context
  for (const { type, name, anon } of typeArgs) {
    offset = tryDoc(this.write.bind(this, anon ? value : value[name], buffer, offset, type, value), name || 'unknown')
  }
  delete value[ParentSymbol]
  return offset
}

function sizeOfContainer (value, typeArgs, context) {
  value[ParentSymbol] = context
  let size = 0
  for (const { type, name, anon } of typeArgs) {
    size += tryDoc(this.sizeOf.bind(this, anon ? value : value[name], type, value), name || 'unknown')
  }
  delete value[ParentSymbol]
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
