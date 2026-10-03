const { PartialReadError } = require('../utils')

module.exports = {
  loop: [readLoop, writeLoop, sizeOfLoop, require('../../ProtoDef/schemas/extras.json').loop],
  restBuffer: [readRestBuffer, writeRestBuffer, sizeOfRestBuffer, require('../../ProtoDef/schemas/extras.json').restBuffer]
}

function readLoop (buffer, offset, typeArgs, rootNode) {
  if (!typeArgs) {
    throw new Error('typeArgs is required for loop type')
  }

  const results = []
  const startOffset = offset
  const nt = typeArgs.nt
  const hasTerminator = nt !== null && typeof nt === 'number'

  while (offset < buffer.length) {
    // Check for terminator if specified
    if (hasTerminator) {
      if (offset >= buffer.length) break
      const terminatorValue = buffer.readInt8(offset)
      if (terminatorValue === nt) {
        // Found terminator, consume it and return
        return {
          value: results,
          size: offset - startOffset + 1
        }
      }
    }

    // Read the next element
    try {
      const entry = this.read(buffer, offset, typeArgs.type, rootNode)
      results.push(entry.value)
      offset += entry.size
    } catch (error) {
      if (error instanceof PartialReadError) {
        break
      }
      throw error
    }
  }

  return {
    value: results,
    size: offset - startOffset
  }
}

function writeLoop (value, buffer, offset, typeArgs, rootNode) {
  if (!typeArgs) {
    throw new Error('typeArgs is required for loop type')
  }

  const nt = typeArgs.nt
  const hasTerminator = nt !== null && typeof nt === 'number'

  // Write each element in the array
  for (const item of value) {
    offset = this.write(item, buffer, offset, typeArgs.type, rootNode)
  }

  // Write terminator if specified
  if (hasTerminator) {
    buffer.writeInt8(nt, offset)
    offset++
  }

  return offset
}

function sizeOfLoop (value, typeArgs, rootNode) {
  if (!typeArgs) {
    throw new Error('typeArgs is required for loop type')
  }

  const nt = typeArgs.nt
  const hasTerminator = nt !== null && typeof nt === 'number'
  let size = hasTerminator ? 1 : 0 // 1 byte for terminator if present

  // Calculate size of all elements
  for (const item of value) {
    size += this.sizeOf(item, typeArgs.type, rootNode)
  }

  return size
}

function readRestBuffer (buffer, offset) {
  const remainingBuffer = buffer.slice(offset)
  return {
    value: remainingBuffer,
    size: remainingBuffer.length
  }
}

function writeRestBuffer (value, buffer, offset) {
  if (!(value instanceof Buffer)) {
    value = Buffer.from(value)
  }
  value.copy(buffer, offset)
  return offset + value.length
}

function sizeOfRestBuffer (value) {
  if (!(value instanceof Buffer)) {
    value = Buffer.from(value)
  }
  return value.length
}
