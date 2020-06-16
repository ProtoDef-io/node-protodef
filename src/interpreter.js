const { getFieldInfo, isFieldInfo, tryCatch } = require('./utils')
const reduce = require('lodash.reduce')
const get = require('lodash.get')
const Validator = require('protodef-validator')
const defaultDatatypes = require('./datatypes/interpreter')

// FIXME: Increases performance but introduces unexpected bugs in future
const DATATYPE_NOCOPY = false

class ProtoDef {
  constructor (validation = true) {
    this.validator = validation ? new Validator() : null
    this.clearTypes()
    this.addTypes(defaultDatatypes)
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

      let { type, typeArgs } = getFieldInfo(functions)
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
    let { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error('missing data type: ' + type) }
    return typeFunctions[0].call(this, buffer, cursor, typeArgs, rootNodes)
  }

  write (value, buffer, offset, _fieldInfo, rootNode) {
    let { type, typeArgs } = getFieldInfo(_fieldInfo)
    const typeFunctions = this.types[type]
    if (!typeFunctions) { throw new Error('missing data type: ' + type) }
    return typeFunctions[1].call(this, value, buffer, offset, typeArgs, rootNode)
  }

  sizeOf (value, _fieldInfo, rootNode) {
    let { type, typeArgs } = getFieldInfo(_fieldInfo)
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

  createPacketBuffer (type, packet) {
    const length = tryCatch(() => this.sizeOf(packet, type, {}),
      (e) => {
        e.message = `SizeOf error for ${e.field} : ${e.message}`
        throw e
      })
    const buffer = Buffer.allocUnsafe(length)
    tryCatch(() => this.write(packet, buffer, 0, type, {}),
      (e) => {
        e.message = `Write error for ${e.field} : ${e.message}`
        throw e
      })
    return buffer
  }

  parsePacketBuffer (type, buffer) {
    const { value: data, size } = tryCatch(() => this.read(buffer, 0, type, {}),
      (e) => {
        e.message = `Read error for ${e.field} : ${e.message}`
        throw e
      })
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

function extendType (functions, defaultTypeArgs) {
  const argPos = reduce(defaultTypeArgs, findArgs, [])
  const produceArgs = !DATATYPE_NOCOPY && typeof defaultTypeArgs === 'object'
    ? function produceArgsObject (typeArgs) {
      const args = Object.assign(defaultTypeArgs.constructor(), defaultTypeArgs)
      argPos.forEach(({ path, val }) => {
        // Set field
        const c = path.split('.').reverse()
        let into = args
        while (c.length > 1) {
          into = into[c.pop()]
        }
        into[c.pop()] = typeArgs[val]
      })
      return args
    }
    : function produceArgsPrimitive () { return defaultTypeArgs }
  function read (buffer, offset, typeArgs, context) {
    return functions[0].call(this, buffer, offset, produceArgs(typeArgs), context)
  }
  function write (value, buffer, offset, typeArgs, context) {
    return functions[1].call(this, value, buffer, offset, produceArgs(typeArgs), context)
  }
  function sizeOf (value, typeArgs, context) {
    if (typeof functions[2] === 'function') {
      return functions[2].call(this, value, produceArgs(typeArgs), context)
    }
    return functions[2]
  }
  return [read, write, sizeOf]
}

module.exports = ProtoDef
