const ClosureCompiler = require('google-closure-compiler').jsCompiler

const numeric = require('./datatypes/numeric')
const utils = require('./datatypes/utils')

function indent (code, indent = '  ') {
  return code.split('\n').map((line) => indent + line).join('\n')
}

class ReadCompiler {
  constructor () {
    this.primitiveTypes = {}
    this.native = {}
    this.context = {}
    this.types = {}
    this.scopeStack = [{}]
    this.parameterizableTypes = {
      // conditional
      'switch': (compiler, struct) => {
        let compare = struct.compareTo ? struct.compareTo : struct.compareToValue
        let args = []
        if (compare.startsWith('$')) args.push(compare)
        else if (struct.compareTo) {
          compare = compiler.getField(compare)
        }
        let code = `switch (${compare}) {\n`
        for (const key in struct.fields) {
          let val = key
          if (isNaN(val) && val !== 'true' && val !== 'false') val = '"' + val + '"'
          code += indent(`case ${val}: return ` + compiler.callType(struct.fields[key])) + '\n'
        }
        if (struct.default) {
          code += indent('default: return ' + compiler.callType(struct.type)) + '\n'
        }
        code += `}`
        return compiler.wrapCode(code, args)
      },
      'option': (compiler, type) => {
        let code = 'const {value} = ctx.bool(buffer, offset)\n'
        code += 'if (value) {\n'
        code += '  const { value, size } = ' + compiler.callType(type) + '\n'
        code += '  return { value, size: size + 1 }\n'
        code += '}\n'
        code += 'return { value: undefined, size: 1}'
        return compiler.wrapCode(code)
      },

      // structures
      'array': (compiler, array) => {
        let code = ''
        if (array.countType) {
          code += 'const { value: count, size: countSize } = ' + compiler.callType(array.countType) + '\n'
        } else if (array.count) {
          code += 'const count = ' + array.count + '\n'
          code += 'const countSize = 0\n'
        } else {
          throw new Error('Array must contain either count or countType')
        }
        code += 'const data = []\n'
        code += 'let size = countSize\n'
        code += 'for (let i=0 ; i<count ; i++) {\n'
        code += '  const elem = ' + compiler.callType(array.type, 'offset + size') + '\n'
        code += '  data.push(elem.value)\n'
        code += '  size += elem.size\n'
        code += '}\n'
        code += 'return { value: data, size }'
        return compiler.wrapCode(code)
      },
      'count': (compiler, type) => {
        throw new Error('count not supported, use array')
      },
      'container': (compiler, values) => {
        // Inlining (support only 1 level)
        const newValues = []
        for (const i in values) {
          const { type, anon } = values[i]
          if (anon) {
            if (type instanceof Array && type[0] === 'container') {
              for (const j in type[1]) newValues.push(type[1][j])
              console.log('Inlined an anonymous container')
            } else if (type instanceof Array && type[0] === 'switch') {
              const theSwitch = type[1]
              const valueSet = new Set()
              // search for containers and build a set of possible values
              for (const field in theSwitch.fields) {
                if (theSwitch.fields[field] instanceof Array && theSwitch.fields[field][0] === 'container') {
                  for (const j in theSwitch.fields[field][1]) {
                    const item = theSwitch.fields[field][1][j]
                    valueSet.add(item.name)
                  }
                }
              }
              // For each value create a switch
              for (const name of valueSet.keys()) {
                const fields = {}
                for (const field in theSwitch.fields) {
                  if (theSwitch.fields[field] instanceof Array && theSwitch.fields[field][0] === 'container') {
                    for (const j in theSwitch.fields[field][1]) {
                      const item = theSwitch.fields[field][1][j]
                      if (item.name === name) {
                        fields[field] = theSwitch.fields[field][1][j].type
                        break
                      }
                    }
                  } else {
                    fields[field] = theSwitch.fields[field]
                  }
                }
                newValues.push({
                  name,
                  type: ['switch', {
                    compareTo: theSwitch.compareTo,
                    compareToValue: theSwitch.compareToValue,
                    default: theSwitch.default,
                    fields
                  }]
                })
              }
              console.log('Inlined an anonymous switch')
            } else {
              throw new Error('Cannot inline anonymous type: ' + type)
            }
          } else {
            newValues.push(values[i])
          }
        }
        values = newValues

        let code = ''
        let offsetExpr = 'offset'
        let names = []
        for (const i in values) {
          const { type, name } = values[i]
          const trueName = compiler.getField(name)
          code += `const { value: ${trueName}, size: ${trueName}Size } = ` + compiler.callType(type, offsetExpr) + '\n'
          offsetExpr += ` + ${trueName}Size`
          if (name === trueName) names.push(name)
          else names.push(`${name}: ${trueName}`)
        }
        const sizes = offsetExpr.split(' + ')
        sizes.shift()
        if (sizes.length === 0) sizes.push('0')
        code += 'return { value: { ' + names.join(', ') + ' }, size: ' + sizes.join(' + ') + '}'
        return compiler.wrapCode(code)
      },

      // utils
      'pstring': (compiler, string) => {
        let code = ''
        if (string.countType) {
          code += 'const { value: count, size: countSize } = ' + compiler.callType(string.countType) + '\n'
        } else if (string.count) {
          code += 'const count = ' + string.count + '\n'
          code += 'const countSize = 0\n'
        } else {
          throw new Error('pstring must contain either count or countType')
        }
        code += 'offset += countSize\n'
        code += 'if (offset + count > buffer.length) {\n'
        code += '  throw new Error("Partial read at " + offset + " count: " + count)\n'
        code += '}\n'
        code += 'return { value: buffer.toString(\'utf8\', offset, offset + count), size: count + countSize }'
        return compiler.wrapCode(code)
      },
      'buffer': (compiler, buffer) => {
        let code = ''
        if (buffer.countType) {
          code += 'const { value: count, size: countSize } = ' + compiler.callType(buffer.countType) + '\n'
        } else if (buffer.count) {
          code += 'const count = ' + buffer.count + '\n'
          code += 'const countSize = 0\n'
        } else {
          throw new Error('buffer must contain either count or countType')
        }
        code += 'offset += countSize\n'
        code += 'if (offset + count > buffer.length) {\n'
        code += '  throw new Error("Partial read at " + offset + " count: " + count)\n'
        code += '}\n'
        code += 'return { value: buffer.slice(offset, offset + count), size: count + countSize }'
        return compiler.wrapCode(code)
      },
      'bitfield': (compiler, values) => {
        let code = ''
        let names = []
        let totalSize = 8
        code += 'let bits = buffer[offset++]\n'
        for (const i in values) {
          const { name, size, signed } = values[i]
          const trueName = compiler.getField(name)
          while (totalSize < size) {
            totalSize += 8
            code += `bits = (bits << 8) | buffer[offset++]\n`
          }
          code += `let ${trueName} = (bits >> ` + (totalSize - size) + ') & 0x' + ((1 << size) - 1).toString(16) + '\n'
          if (signed) code += `${trueName} -= (${trueName} & 0x` + (1 << (size - 1)).toString(16) + ') << 1\n'
          totalSize -= size
          if (name === trueName) names.push(name)
          else names.push(`${name}: ${trueName}`)
        }
        code += 'return { value: { ' + names.join(', ') + ' }, size: offset }'
        return compiler.wrapCode(code)
      },
      'mapper': (compiler, mapper) => {
        let code = 'const { value, size } = ' + compiler.callType(mapper.type) + '\n'
        code += 'return { value: ' + JSON.stringify(mapper.mappings) + '[value], size }'
        return compiler.wrapCode(code)
      }
    }

    // Add default types
    for (const key in numeric) {
      this.addNativeType(key, numeric[key][0])
    }
    for (const key in utils) {
      this.addNativeType(key, utils[key][0])
    }
  }

  /**
   * A native type is a type read or written by a function that will be called in it's
   * original context.
   * @param {*} type
   */
  addNativeType (type, fn) {
    this.primitiveTypes[type] = `native.${type}`
    this.native[type] = fn
  }

  /**
   * A context type is a type that will be called in the protocol's context. It can refer to
   * registred native types using native.{type}() or context type (provided and generated)
   * using ctx.{type}(), but cannot access it's original context.
   * @param {*} type
   */
  addContextType (type, fn) {
    this.primitiveTypes[type] = `ctx.${type}`
    this.context[type] = fn.toString()
  }

  /**
   * A parametrizable type is a function that will be generated at compile time using the
   * provided maker function
   * @param {*} type
   */
  addParametrizableType (type, maker) {
    this.parameterizableTypes[type] = maker
  }

  addTypes (types) {
    for (const [type, [kind, fn]] of Object.entries(types)) {
      if (kind === 'native') this.addNativeType(type, fn)
      else if (kind === 'context') this.addContextType(type, fn)
      else if (kind === 'parametrizable') this.addParametrizableType(type, fn)
    }
  }

  addTypesToCompile (types) {
    for (const [type, json] of Object.entries(types)) {
      // Replace native type, otherwise first in wins
      if (!this.types[type] || this.types[type] === 'native') this.types[type] = json
    }
  }

  addProtocol (protocolData, path) {
    const self = this
    function recursiveAddTypes (protocolData, path) {
      if (protocolData === undefined) { return }
      if (protocolData.types) { self.addTypesToCompile(protocolData.types) }
      recursiveAddTypes(protocolData[path.shift()], path)
    }
    recursiveAddTypes(protocolData, path)
  }

  wrapCode (code, args = []) {
    if (args.length > 0) return '(buffer, offset, ' + args.join(', ') + ') => {\n' + indent(code) + '\n}'
    return '(buffer, offset) => {\n' + indent(code) + '\n}'
  }

  getField (name) {
    let path = name.split('/')
    let i = this.scopeStack.length - 1
    while (path.length) {
      let scope = this.scopeStack[i]
      let field = path.shift()
      if (field === '..') {
        i--
        continue
      }
      // We are at the right level
      if (scope[field]) return scope[field] + (path.length ? ('.' + path.join('.')) : '')
      if (path.length !== 0) {
        throw new Error('Cannot access properties of undefined field')
      }
      // Count how many collision occured in the scope
      let count = 0
      for (let j = 0; j < i; j++) {
        if (this.scopeStack[j][field]) count++
      }
      if (name === 'flags') {
        console.log(this.scopeStack)
        console.log(name)
        console.log(count)
      }
      scope[field] = field + (count || '') // If the name is already used, add a number
      return scope[field]
    }
    throw new Error('Unknown field ' + path)
  }

  callType (type, offsetExpr = 'offset', args = []) {
    if (type instanceof Array && (type[0] === 'container' || type[0] === 'bitfield')) this.scopeStack.push({})
    const code = this.compileType(type)
    if (type instanceof Array && (type[0] === 'container' || type[0] === 'bitfield')) this.scopeStack.pop()
    if (args.length > 0) return '(' + code + `)(buffer, ${offsetExpr}, ` + args.join(', ') + ')'
    return '(' + code + `)(buffer, ${offsetExpr})`
  }

  compileType (type) {
    if (type instanceof Array) {
      if (this.parameterizableTypes[type[0]]) { return this.parameterizableTypes[type[0]](this, type[1]) }
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.wrapCode('return ' + this.callType(type[0], 'offset', Object.values(type[1])))
      }
      throw new Error('Unknown parametrizable type: ' + type[0])
    } else { // Primitive type
      if (type === 'native') return 'null'
      if (this.types[type]) { return 'ctx.' + type }
      return this.primitiveTypes[type]
    }
  }

  generate () {
    this.scopeStack = [{}]
    let functions = []
    for (const type in this.context) {
      functions[type] = this.context[type]
    }
    for (const type in this.types) {
      if (!functions[type]) {
        if (this.types[type] !== 'native') { functions[type] = this.compileType(this.types[type]) } else { functions[type] = `native.${type}` }
      }
    }
    return '() => {\nconst ctx = {\n' + indent(Object.keys(functions).map((type) => {
      return type + ': ' + functions[type]
    }).join(',\n')) + '\n}\n  return ctx\n}'
  }

  /**
   * Compile the given js code, providing native.{type} to the context, return the compiled types
   * @param {*} code
   */
  compile (code) {
    // Local variable to provide some context to eval()
    const native = this.native // eslint-disable-line
    return eval(code)() // eslint-disable-line
  }
}

function optimize (code, cb) {
  const closureCompiler = new ClosureCompiler({
    compilation_level: 'SIMPLE'
  })
  closureCompiler.run([{
    src: code
  }], (exitCode, stdOut, stdErr) => {
    cb(stdOut[0].src)
  })
}

module.exports = {
  ReadCompiler,
  optimize
}
