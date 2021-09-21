const { getFieldInfo, tryCatch } = require('./utils')
const reduce = require('lodash.reduce')
const get = require('lodash.get')
const Validator = require('protodef-validator')

function isFieldInfo (type) {
  return typeof type === 'string' ||
    (Array.isArray(type) && typeof type[0] === 'string') ||
    type.type
}

function findArgs (acc, v, k) {
  if (typeof v === 'string' && v.charAt(0) === '$') {
    acc.push({ path: k, val: v.substr(1) })
  } else if (Array.isArray(v) || typeof v === 'object') {
    acc = acc.concat(
      reduce(v, findArgs, [])
      .map((v) => ({ path: k + '.' + v.path, val: v.val }))
    )
  }
  return acc
}

function setField (path, val, into) {
  const c = path.split('.').reverse()
  while (c.length > 1) {
    into = into[c.pop()]
  }
  into[c.pop()] = val
}

let deepSerialize = JSON.stringify
let deepDeserialize = JSON.parse
{
  // Try something better&faster&stronger than JSON.parse(JSON.stringify)
  if (typeof globalThis !== 'undefined' && 'structuredClone' in globalThis) {
    deepSerialize = obj => obj
    deepDeserialize = globalThis.structuredClone
  } else if (typeof require === 'function' && typeof process === 'function') {
    const v8 = require('v8')
    deepSerialize = v8.serialize
    deepDeserialize = v8.deserialize
  }
}

function extendType (functions, defaultTypeArgs) {
  const serialized = deepSerialize(defaultTypeArgs)
  const argPos = reduce(defaultTypeArgs, findArgs, [])
  function produceArgs (typeArgs) {
    const args = deepDeserialize(serialized)
    argPos.forEach((v) => {
      setField(v.path, typeArgs[v.val], args)
    })
    return args
  }
  return [function read (buffer, offset, typeArgs, context) {
    return functions[0].call(this, buffer, offset, produceArgs(typeArgs), context)
  }, function write (value, buffer, offset, typeArgs, context) {
    return functions[1].call(this, value, buffer, offset, produceArgs(typeArgs), context)
  }, function sizeOf (value, typeArgs, context) {
    if (typeof functions[2] === 'function') { return functions[2].call(this, value, produceArgs(typeArgs), context) } else { return functions[2] }
  }]
}

class ProtoDef {
  constructor (validation = true) {
    this.types = {}
    this.validator = validation ? new Validator() : null
    this.addDefaultTypes()
  }

  addDefaultTypes () {
    this.addTypes(require('./datatypes/numeric'))
    this.addTypes(require('./datatypes/utils'))
    this.addTypes(require('./datatypes/structures'))
    this.addTypes(require('./datatypes/conditional'))
  }

  addProtocol (protocolData, path) {
    const self = this
    function recursiveAddTypes (protocolData, path) {
      if (protocolData === undefined) { return }
      if (protocolData.types) { self.addTypes(protocolData.types) }
      recursiveAddTypes(get(protocolData, path.shift()), path)
    }

    if (this.validator) { this.validator.validateProtocol(protocolData) }

    recursiveAddTypes(protocolData, path)
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

      const { type, typeArgs } = getFieldInfo(functions)
      this.types[name] = typeArgs ? extendType(this.types[type], typeArgs) : this.types[type]
    } else {
      if (this.validator) {
        if (functions[3]) {
          this.validator.addType(name, functions[3])
        } else { this.validator.addType(name) }
      }

      this.types[name] = functions
    }
  }

  addTypes (types) {
    const validate = !!this.validator
    for (const name in types) {
      this.addType(name, types[name], validate)
    }
  }

  setVariable (key, val) {
    this.types[key] = val
  }

  read (buffer, cursor, _fieldInfo, rootNodes) {
    const { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error('missing data type: ' + type) }
    return typeFunctions[0].call(this, buffer, cursor, typeArgs, rootNodes)
  }

  write (value, buffer, offset, _fieldInfo, rootNode) {
    const { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error('missing data type: ' + type) }
    return typeFunctions[1].call(this, value, buffer, offset, typeArgs, rootNode)
  }

  sizeOf (value, _fieldInfo, rootNode) {
    const { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) {
      throw new Error('missing data type: ' + type)
    }
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
    const length = tryCatch(this.sizeOf.bind(this, packet, type, {}), this._sizeOfErrorHandler)
    const buffer = Buffer.allocUnsafe(length)
    tryCatch(this.write.bind(this, packet, buffer, 0, type, {}), this._writeErrorHandler)
    return buffer
  }

  parsePacketBuffer (type, buffer) {
    const { value, size } = tryCatch(this.read.bind(this, buffer, 0, type, {}), this._readErrorHandler)
    return {
      data: value,
      metadata: { size },
      buffer: buffer.slice(0, size),
      fullBuffer: buffer
    }
  }
}

module.exports = ProtoDef
