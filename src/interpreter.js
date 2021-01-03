const { getFieldInfo, isFieldInfo, tryCatch } = require('./utils')
const reduce = require('lodash.reduce')
const get = require('lodash.get')
const clonedeep = require('lodash.clonedeep')
const Validator = require('protodef-validator')
const defaultDatatypes = require('./datatypes/interpreter')

class ProtoDef {
  constructor (validation = true) {
    this.validator = validation ? new Validator() : null
    this.clearTypes()
    this.addTypes(defaultDatatypes)
  }

  addProtocol (protocolData, path) {
    if (this.validator) { this.validator.validateProtocol(protocolData) }
    this.recursiveAddTypes(protocolData, path)
  }

  recursiveAddTypes (protocolData, path) {
    if (protocolData === undefined) return
    if (protocolData.types) { this.addTypes(protocolData.types) }
    this.recursiveAddTypes(get(protocolData, path.shift()), path)
  }

  addType (name, functions, validate = true) {
    if (functions === 'native') {
      if (this.validator) { this.validator.addType(name) }
      return
    }
    if (isFieldInfo(functions)) {
      if (this.validator) {
        if (validate) { this.validator.validateType(functions) }
        this.validator.addType(name)
      }

      let { type, typeArgs } = getFieldInfo(functions)
      this.types[name] = typeArgs ? extendType.call(this, this.types[type], typeArgs) : this.types[type]
    } else {
      if (this.validator) {
        if (functions[3]) {
          this.validator.addType(name, functions[3])
        } else { this.validator.addType(name) }
      }

      this.types[name] = functions
    }
  }

  removeType (name) {
    delete this.types[name]
  }

  addTypes (types) {
    for (const name in types) {
      this.addType(name, types[name], this.validator)
    }
  }

  clearTypes () {
    this.types = {}
  }

  read (buffer, cursor, _fieldInfo, rootNodes) {
    const { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error(`missing data type: ${type}`) }
    return typeFunctions[0].call(this, buffer, cursor, typeArgs, rootNodes)
  }

  write (value, buffer, offset, _fieldInfo, rootNode) {
    const { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error(`missing data type: ${type}`) }
    return typeFunctions[1].call(this, value, buffer, offset, typeArgs, rootNode)
  }

  sizeOf (value, _fieldInfo, rootNode) {
    const { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error(`missing data type: ${type}`) }
    if (typeof typeFunctions[2] === 'function') {
      return typeFunctions[2].call(this, value, typeArgs, rootNode)
    } else {
      return typeFunctions[2]
    }
  }

  _readErrorHandler (e) {
    e.message = `Read error for ${e.field} : ${e.message}`
    throw e
  }

  _writeErrorHandler (e) {
    e.message = `Write error for ${e.field} : ${e.message}`
    throw e
  }

  _sizeOfErrorHandler (e) {
    e.message = `SizeOf error for ${e.field} : ${e.message}`
    throw e
  }

  createPacketBuffer (type, packet) {
    const length = tryCatch(() => this.sizeOf(packet, type, {}), this._sizeOfErrorHandler)
    const buffer = Buffer.allocUnsafe(length)
    tryCatch(() => this.write(packet, buffer, 0, type, {}), this._writeErrorHandler)
    return buffer
  }

  parsePacketBuffer (type, buffer) {
    const { value: data, size } = tryCatch(() => this.read(buffer, 0, type, {}), this._readErrorHandler)
    return {
      data,
      metadata: { size },
      buffer: buffer.slice(0, size)
    }
  }
}

function findArgs (acc, v, k) {
  if (typeof v === 'string' && v.charAt(0) === '$') {
    acc.push({ path: k, val: v.substr(1) })
  } else if (Array.isArray(v) || typeof v === 'object') {
    acc = acc.concat(reduce(v, findArgs, []).map((v) => ({ path: `${k}.${v.path}`, val: v.val })))
  }
  return acc
}

function produceArgsObject (defaultTypeArgs, argPos, typeArgs) {
  if (typeArgs === undefined) return defaultTypeArgs
  const args = clonedeep(defaultTypeArgs)
  for (const { path, val } of argPos) {
    // Set field
    const c = path.split('.').reverse()
    let into = args
    while (c.length > 1) {
      into = into[c.pop()]
    }
    into[c.pop()] = typeArgs[val]
  }
  return args
}

function constructProduceArgs (defaultTypeArgs) {
  const argPos = reduce(defaultTypeArgs, findArgs, [])
  if (typeof defaultTypeArgs !== 'object') return () => defaultTypeArgs
  return produceArgsObject.bind(this, defaultTypeArgs, argPos)
}

function extendedRead (_read, _produceArgs, buffer, offset, typeArgs, context) {
  return _read.call(this, buffer, offset, _produceArgs(typeArgs), context)
}

function extendedWrite (_write, _produceArgs, value, buffer, offset, typeArgs, context) {
  return _write.call(this, value, buffer, offset, _produceArgs(typeArgs), context)
}

function extendedSizeOf (_sizeOf, _produceArgs, value, typeArgs, context) {
  return _sizeOf.call(this, value, _produceArgs(typeArgs), context)
}

function staticSizeOf (_sizeOf) {
  return _sizeOf
}

function extendType ([ _read, _write, _sizeOf ], defaultTypeArgs) {
  const produceArgs = constructProduceArgs(defaultTypeArgs)
  return [
    extendedRead.bind(this, _read, produceArgs),
    extendedWrite.bind(this, _write, produceArgs),
    typeof _sizeOf === 'function'
      ? extendedSizeOf.bind(this, _sizeOf, produceArgs)
      : staticSizeOf.bind(this, _sizeOf)
  ]
}

module.exports = ProtoDef
