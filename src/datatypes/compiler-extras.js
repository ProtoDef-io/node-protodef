/* eslint-disable multiline-ternary */
function validateNT (nt) {
  if (nt !== null && typeof nt !== 'number') throw new Error('Loop terminator must be a number like 0 or null for EOF')
  return nt !== null
}

module.exports = {
  Read: {
    loop: ['parametrizable', (compiler, struct) => {
      const nt = struct.nt
      const hasTerminator = validateNT(nt)

      return compiler.wrapCode(`
        const results = []
        let size = 0
        while (offset !== buffer.length) {
          ${hasTerminator ? `
          const typ = ctx.i8(buffer, offset)
          if (typ.value === ${nt}) {
            return { value: results, size: size + 1 }
          }` : ''}
          const entry = ${compiler.callType(struct.type)}
          results.push(entry.value)
          offset += entry.size
          size += entry.size
        }
        return { value: results, size }
      `)
    }],
    restBuffer: ['native', (buffer, offset) => {
      return {
        value: buffer.slice(offset),
        size: buffer.length - offset
      }
    }]
  },
  Write: {
    loop: ['parametrizable', (compiler, struct) => {
      const nt = struct.nt
      const hasTerminator = validateNT(nt)

      return compiler.wrapCode(`
        for (const key in value) {
          offset = ${compiler.callType('value[key]', struct.type)}
        }
        ${hasTerminator ? `offset = ctx.i8(${nt}, buffer, offset)` : ''}
        return offset
      `)
    }],
    restBuffer: ['native', (value, buffer, offset) => {
      if (!(value instanceof Buffer)) value = Buffer.from(value)
      value.copy(buffer, offset)
      return offset + value.length
    }]
  },
  SizeOf: {
    loop: ['parametrizable', (compiler, struct) => {
      const nt = struct.nt
      const hasTerminator = validateNT(nt)

      return compiler.wrapCode(`
        let size = ${hasTerminator ? '1' : '0'}
        for (const key in value) {
          size += ${compiler.callType('value[key]', struct.type)}
        }
        return size
      `)
    }],
    restBuffer: ['native', (value) => {
      if (!(value instanceof Buffer)) value = Buffer.from(value)
      return value.length
    }]
  }
}
