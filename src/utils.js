const Enum = Object.freeze({
  CompilerTypeKind: {
    NATIVE: 0,
    CONTEXT: 1,
    PARAMETRIZABLE: 2
  },
  ParentSymbol: typeof Symbol !== 'undefined' ? Symbol('ProtoDefContext') : '..'
})

class Result {
  // Using this wrapper is up to 30% faster than constructing
  // plain objects ({ value, size }). V8 will use inline caching
  // and hidden classes to speed this up.
  constructor (value = undefined, size = 0) {
    this.value = value
    this.size = size
  }
}

class CountResult extends Result {
  // This line will be inlined
  get count () { return this.value }
}

class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.message = message
    if (Error.captureStackTrace != null) {
      Error.captureStackTrace(this, this.constructor.name)
    }
  }
}

class PartialReadError extends ExtendableError {
  constructor (message) {
    super(message)
    this.partialReadError = true
  }
}

function tryCatch (tryfn, catchfn) {
  try { return tryfn() } catch (e) { catchfn(e) }
}

function typeDocErrorHandler (field, e) {
  e.field = e.field ? `${field}.${e.field}` : field
  throw e
}

function tryDoc (tryfn, field) {
  return tryCatch(tryfn, typeDocErrorHandler.bind(this, field))
}

function getField (countField, context) {
  if (countField.startsWith('/')) {
    while (context.hasOwnProperty(Enum.ParentSymbol)) {
      context = context[Enum.ParentSymbol]
    }
    countField = countField.slice(1)
  }
  const countFieldArr = countField.split('/')
  for (const field of countFieldArr) {
    context = context[field]
  }
  return context
}

function getFieldInfo (fieldInfo) {
  switch (true) {
    case typeof fieldInfo === 'string':
      return { type: fieldInfo }
    case Array.isArray(fieldInfo):
      return { type: fieldInfo[0], typeArgs: fieldInfo[1] }
    case typeof fieldInfo.type === 'string':
      return fieldInfo
    default:
      throw new Error(`${fieldInfo} is not a fieldinfo`)
  }
}

function isFieldInfo (type) {
  return typeof type === 'string' ||
    (Array.isArray(type) && typeof type[0] === 'string') ||
    type.type
}

function getCount (buffer, offset, { count, countType }, rootNode) {
  if (count !== undefined) {
    count = typeof count === 'number' ? count : getField(count, rootNode)
    return new CountResult(count, 0)
  }
  if (countType !== undefined) {
    const { size, value } = tryDoc(() => this.read(buffer, offset, getFieldInfo(countType), rootNode), '$count')
    return new CountResult(value, size)
  }
  throw new Error('Broken schema, neither count nor countType defined')
}

function sendCount (len, buffer, offset, { count, countType }, rootNode) {
  if (count !== undefined) {
    if (typeof count === 'number' && len !== count) {
      throw new Error('Datatype length is not equal to count defined in schema')
    }
    return offset
  }
  if (countType !== undefined) {
    return this.write(len, buffer, offset, getFieldInfo(countType), rootNode)
  }
  throw new Error('Broken schema, neither count nor countType defined')
}

function calcCount (len, { count, countType }, rootNode) {
  if (count === undefined && countType !== undefined) {
    return tryDoc(() => this.sizeOf(len, getFieldInfo(countType), rootNode), '$count')
  }
  return 0
}

class ProtoDefEncoding {
  constructor (inst, type) {
    this.inst = inst
    this.type = type
    this.encode.bytes = 0
    this.decode.bytes = 0
  }

  encode (obj, buffer, offset) {
    if (buffer) {
      this.encode.bytes = this.inst.write(obj, buffer, offset, this.type)
    } else {
      buffer = this.inst.createPacketBuffer(this.type, obj)
      this.encode.bytes = buffer.length
    }
    return buffer
  }

  decode (buffer, start, end) {
    const { value, size } = this.inst.read(buffer.slice(start, end), 0, this.type)
    this.decode.bytes = size
    return value
  }

  encodingLength (obj) {
    return this.inst.sizeOf(obj, this.type)
  }
}

function createEncoding (inst, type) {
  return new ProtoDefEncoding(inst, type)
}

module.exports = {
  Enum,
  Result,
  PartialReadError,
  tryCatch,
  tryDoc,
  getField,
  getFieldInfo,
  isFieldInfo,
  getCount,
  sendCount,
  calcCount,
  createEncoding
}
