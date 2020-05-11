const ClosureCompiler = require('google-closure-compiler').jsCompiler

const numeric = require('./datatypes/numeric')
const utils = require('./datatypes/utils')

function indent(code, indent='  ') {
  return code.split('\n').map((line) => indent + line).join('\n')
}

/**
 * Compile a json protodef to js and return the code of the main deserialize function
 * @param {*} types 
 * @param {*} mainType 
 */
function generateRead(types, mainType) {
  const primitiveTypes = {}
  for (const key in numeric) {
    primitiveTypes[key] = [`numeric.${key}[0]`]
  }
  for (const key in utils) {
    primitiveTypes[key] = [`utils.${key}[0]`]
  }

  const parameterizableTypes = {
    // conditional
    'switch': (struct) => {
      const compare = struct.compareTo ? struct.compareTo : struct.compareToValue
      let code = `switch (${compare}) {\n`
      for (const key in struct.fields) {
        code += indent(`case "${key}": return ` + callType(struct.fields[key]))+'\n'
      }
      if (struct.default) {
        code += indent('default: return ' + callType(struct.type)) + '\n'
      }
      code += `}`
      return wrapReadCode(code)
    },
    'option': (type) => {
      let code = 'const {value} = utils.bool[0](buffer, offset)\n'
      code += 'if (value) {\n'
      code += '  const { value, size } = ' + callType(type) + '\n'
      code += '  return { value, size: size + 1 }\n'
      code += '}\n'
      code += 'return {size: 1}'
      return wrapReadCode(code)
    },

    // structures
    'array': (array) => {
      let code = ''
      if (array.countType) {
        code += 'const { value: count, size: countSize } = ' + callType(array.countType) + '\n'
      } else if (array.count) {
        code += 'const count = ' + array.count + '\n'
        code += 'const countSize = 0\n'
      } else {
        throw new Error('Array must contain either count or countType')
      }
      code += 'const data = []\n'
      code += 'let size = countSize'
      code += 'for (let i=0 ; i<count ; i++) {\n'
      code += '  const elem = ' + callType(array.type, 'size') + '\n'
      code += '  data.push(elem.value)\n'
      code += '  size += elem.size\n'
      code += '}\n'
      code += 'return { value: data, size }'
      return wrapReadCode(code)
    },
    'count': (type) => {
      throw new Error('count not supported, use array')
    },
    'container': (values) => {
      let code = ''
      let offsetExpr = 'offset'
      let names = []
      for (const i in values) {
        const { type, name } = values[i]
        code += `const { value: ${name}, size: ${name}Size } = ` + callType(type, offsetExpr) + '\n'
        offsetExpr += ` + ${name}Size`
        names.push(name)
      }
      const sizes = offsetExpr.split(' + ')
      sizes.shift()
      if (sizes.length === 0) sizes.push('0')
      code += 'return {value: { ' + names.join(', ') + ' }, size: ' + sizes.join(' + ') + '}'
      return wrapReadCode(code)
    },

    // utils
    'pstring': (string) => {
      let code = ''
      if (string.countType) {
        code += 'const { value: count, size: countSize } = ' + callType(string.countType) + '\n'
      } else if (string.count) {
        code += 'const count = ' + string.count + '\n'
        code += 'const countSize = 0\n'
      } else {
        throw new Error('pstring must contain either count or countType')
      }
      code += 'offset += countSize\n'
      code += 'if (offset + count > buffer.length) {\n'
      code += '  throw new PartialReadError()\n'
      code += '}\n'
      code += 'return { value: buffer.toString(\'utf8\', offset, offset + count), size: count + countSize }'
      return wrapReadCode(code)
    },
    'buffer': (buffer) => {
      let code = ''
      if (buffer.countType) {
        code += 'const { value: count, size: countSize } = ' + callType(buffer.countType) + '\n'
      } else if (buffer.count) {
        code += 'const count = ' + buffer.count + '\n'
        code += 'const countSize = 0\n'
      } else {
        throw new Error('buffer must contain either count or countType')
      }
      code += 'offset += countSize\n'
      code += 'if (offset + count > buffer.length) {\n'
      code += '  throw new PartialReadError()\n'
      code += '}\n'
      code += 'return { value: buffer.slice(offset, offset + count), size: count + countSize }'
      return wrapReadCode(code)
    },
    'bitfield': (values) => {
      let code = ''
      let names = []
      let totalSize = 8
      code += 'let bits = buffer[offset++]\n'
      for (const i in values) {
        const { name, size, signed } = values[i]
        while (totalSize < size) {
          totalSize += 8
          code += `bits = (bits << 8) | buffer[offset++]\n`
        }
        code += `let ${name} = (bits >> `+(totalSize - size)+') & 0x' + ((1 << size) - 1).toString(16) + '\n'
        if (signed) code += `${name} -= (${name} & 0x` + (1 << (size - 1)).toString(16) + ') << 1\n'
        totalSize -= size
        names.push(name)
      }
      code += 'return { value: { ' + names.join(', ') + ' }, size: offset }'
      return wrapReadCode(code)
    },
    'mapper': (mapper) => {
      let code = 'const { value, size } = ' + callType(mapper.type) + '\n'
      code += 'return { value: ' + JSON.stringify(mapper.mappings) + '[value], size }'
      return wrapReadCode(code)
    }
  }

  function wrapReadCode(code) {
    return '(buffer, offset) => {\n' + indent(code) + '\n}'
  }

  function callType (type, offsetExpr = 'offset') {
    return '(' + compileType(type) + `)(buffer, ${offsetExpr})`
  }

  function compileType (type) {
    if (type instanceof Array) {
      if (parameterizableTypes[type[0]])
        return parameterizableTypes[type[0]](type[1])
      throw new Error('Unknown parametrizable type: ' + type[0])
    } else { // Primitive type
      if (types[type] && types[type] !== 'native')
        return compileType(types[type])
      return primitiveTypes[type][0]
    }
  }

  return compileType(types[mainType])
}

function optimize(code, cb) {
  const closureCompiler = new ClosureCompiler({
    compilation_level: 'SIMPLE'
  })
  closureCompiler.run([{
    src: code
  }], (exitCode, stdOut, stdErr) => {
    cb(stdOut[0].src)
  })
}

function compile(code) {
  return eval(code)
}

module.exports = {
  compile,
  optimize,
  generateRead
}
