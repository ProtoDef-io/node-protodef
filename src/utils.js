function getField (countField, context) {
  if (countField.startsWith('/')) {
    while (context.hasOwnProperty('..')) {
      context = context['..']
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
      throw new Error('Not a fieldinfo')
  }
}

function getCount (buffer, offset, { count, countType }, rootNode) {
  if (count !== undefined) {
    count = typeof count === 'number' ? count : getField(count, rootNode)
    return { count, size: 0 }
  }
  if (countType !== undefined) {
    const { size, value } = tryDoc(() => this.read(buffer, offset, getFieldInfo(countType), rootNode), '$count')
    return { count: value, size }
  }
  // TODO : broken schema, should probably error out.
  return { count: 0, size: 0 }
}

function sendCount (len, buffer, offset, { count, countType }, rootNode) {
  if (count !== undefined && len !== count) {
    // TODO: Throw
  } else if (countType !== undefined) {
    offset = this.write(len, buffer, offset, getFieldInfo(countType), rootNode)
  } else {
    // TODO: Throw
  }
  return offset
}

function calcCount (len, { count, countType }, rootNode) {
  if (count === undefined && countType !== undefined) {
    return tryDoc(() => this.sizeOf(len, getFieldInfo(countType), rootNode), '$count')
  }
  return 0
}

function tryCatch (tryfn, catchfn) {
  try { return tryfn() } catch (e) { catchfn(e) }
}

function tryDoc (tryfn, field) {
  return tryCatch(tryfn, e => {
    e.field = e.field ? `${field}.${e.field}` : field
    throw e
  })
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

const Enum = Object.freeze({
  CompilerTypeKind: {
    NATIVE: 'native',
    CONTEXT: 'context',
    PARAMETRIZABLE: 'parametrizable'
  }
})

module.exports = {
  getField,
  getFieldInfo,
  getCount,
  sendCount,
  calcCount,
  tryCatch,
  tryDoc,
  PartialReadError,
  Enum
}
