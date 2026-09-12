# Using the ProtoDef compiler

The ProtoDef compiler can convert your protocol JSON into javascript code that can read and write buffers directly instead of using the ProtoDef interpreter. Depending on the types, the expected speedups are in the range of x10 - x100.

## Simple usage

Let's take a simple ProtoDef definition and convert it to use the ProtoDef compiler:

ProtoDef:
```javascript
const ProtoDef = require('protodef').ProtoDef

// Create a ProtoDef instance
const proto = new ProtoDef()
proto.addTypes(require('./protocol.json'))

// Encode and decode a message
const buffer = proto.createPacketBuffer('mainType', result)
const result = proto.parsePacketBuffer('mainType', buffer)
```

ProtoDef Compiler:
```javascript
const { ProtoDefCompiler } = require('protodef').Compiler

// Create a ProtoDefCompiler instance
const compiler = new ProtoDefCompiler()
compiler.addTypesToCompile(require('./protocol.json'))

// Compile a ProtoDef instance
const compiledProto = await compiler.compileProtoDef()

// Use it as if it were a normal ProtoDef
const buffer = compiledProto.createPacketBuffer('mainType', result)
const result = compiledProto.parsePacketBuffer('mainType', buffer)
```

## New datatypes

Like the ProtoDef interpreter, the ProtoDef compiler can be extended with custom datatypes. To register a custom type, use the `addTypes(types)` method of the ProtoDef compiler. The `types` parameter is an object with the following structure:

```javascript
{
  Read: {
    'type1': ['native', /* implementation */],
    'type2': ['context', /* implementation */],
    'type3': ['parametrizable', /* implementation */],
    /* ... */
  },

  Write: {
    'type1': ['native', /* implementation */],
    'type2': ['context', /* implementation */],
    'type3': ['parametrizable', /* implementation */],
    /* ... */
  },

  SizeOf: {
    'type1': ['native', /* implementation */],
    'type2': ['context', /* implementation */],
    'type3': ['parametrizable', /* implementation */],
    /* ... */
  }
}
```

The types can be divided into 3 categories:

### Native Type

A native type is a type read or written by a function that will be called in its original context. Use this when you need access to external definitions.

Example:
```javascript
const UUID = require('uuid-1345')

{
  Read: {
    'UUID': ['native', (buffer, offset) => {
      return {
        value: UUID.stringify(buffer.slice(offset, 16 + offset)), // A native type can access all captured definitions
        size: 16
      }
    }]
  },
  Write: {
    'UUID': ['native', (value, buffer, offset) => {
      const buf = UUID.parse(value)
      buf.copy(buffer, offset)
      return offset + 16
    }]
  },
  SizeOf: {
    'UUID': ['native', 16] // For SizeOf, a native type can be a function or directly an integer
  }
}
```

The native types implementations are compatible with the native functions of the ProtoDef interpreter, and can reuse them.

### Context Type

A context type is a type that will be called in the protocol's context. It can refer to registred native types using `native.{type}()` or context types (provided and generated) using `ctx.{type}()`, but cannot access its original context.

Example:
```javascript
const originalContextDefinition = require('something')
/* global ctx */
{
  Read: {
    'compound': ['context', (buffer, offset) => {
      // originalContextDefinition.someting() // BAD: originalContextDefinition cannot be accessed in a context type
      const results = {
        value: {},
        size: 0
      }
      while (true) {
        const typ = ctx.i8(buffer, offset) // Access to a native type (that was copied in the context)
        if (typ.value === 0) {
          results.size += typ.size
          break
        }

        const readResults = ctx.nbt(buffer, offset) // Access to a type that was compiled and placed in the context
        offset += readResults.size
        results.size += readResults.size
        results.value[readResults.value.name] = {
          type: readResults.value.type,
          value: readResults.value.value
        }
      }
      return results
    }]
  },

  Write: {
    'compound': ['context', (value, buffer, offset) => {
      for (const key in value) {
        offset = ctx.nbt({
          name: key,
          type: value[key].type,
          value: value[key].value
        }, buffer, offset)
      }
      offset = ctx.i8(0, buffer, offset)
      return offset
    }]
  },

  SizeOf: {
    'compound': ['context', (value) => {
      let size = 1
      for (const key in value) {
        size += ctx.nbt({
          name: key,
          type: value[key].type,
          value: value[key].value
        })
      }
      return size
    }]
  }
}
```

### Parametrized Type

A parametrizable type is a function that will be generated at compile time using the provided maker function.

Example:
```javascript
{
  Read: {
    'option': ['parametrizable', (compiler, type) => {
      let code = 'const {value} = ctx.bool(buffer, offset)\n'
      code += 'if (value) {\n'
      code += '  const { value, size } = ' + compiler.callType(type) + '\n'
      code += '  return { value, size: size + 1 }\n'
      code += '}\n'
      code += 'return { value: undefined, size: 1}'
      return compiler.wrapCode(code)
    }]
  },

  Write: {
    'option': ['parametrizable', (compiler, type) => {
      let code = 'if (value !== null) {\n'
      code += '  offset = ctx.bool(1, buffer, offset)\n'
      code += '  offset = ' + compiler.callType('value', type) + '\n'
      code += '} else {\n'
      code += '  offset = ctx.bool(0, buffer, offset)\n'
      code += '}\n'
      code += 'return offset'
      return compiler.wrapCode(code)
    }]
  },

  SizeOf: {
    'option': ['parametrizable', (compiler, type) => {
      let code = 'if (value !== null) {\n'
      code += '  return 1 + ' + compiler.callType('value', type) + '\n'
      code += '}'
      code += 'return 0'
      return compiler.wrapCode(code)
    }]
  }
```

### Skip Checks (optional)

ProtoDef Compiler allows an optional `noArraySizeCheck` to be set. By default this value is `false`.

If set to `true`, the compiler will skip array checks that appliy safety limits to avoid out of memory crashes. Sometimes these checks can be too restrictive, and the `noArraySizeCheck` parameter allows you to disable them.

```javascript
const { ProtoDefCompiler } = require('protodef').Compiler

// Create a ProtoDefCompiler instance
const compiler = new ProtoDefCompiler()
compiler.addTypesToCompile(require('./protocol.json'))

// Compile a ProtoDef instance
const compiledProto = await compiler.compileProtoDef()

// Set the `noArraySizeCheck` variable to skip array checks.
compiledProto.setVariable('noArraySizeCheck', true);

// Use it as if it were a normal ProtoDef
const buffer = compiledProto.createPacketBuffer('mainType', result)
const result = compiledProto.parsePacketBuffer('mainType', buffer)
```
### Sizing inside a writer

A parametrizable type is compiled by one compiler at a time, so a writer normally has no way to know how large a nested value will be. When it must serialize part of the value before writing (a checksum of it, for example), `WriteCompiler.callTypeSize(value, type)` returns code computing the size of `value` as `type`. It is only available when the types are compiled through `ProtoDefCompiler`, since it calls into the sizeOf context. A named type is already a function there and is called directly; an anonymous type has none, so its sizer is generated in place, against the current scope so that field references resolve to the same variables.

A datatype that needs a helper function in its generated code registers it as a context type, which copies the function's source into the compiled output, rather than reaching for something outside it. The `hash` datatype is built on both:

```javascript
Write: {
  _crc32c: ['context', crc32c],
  hash: ['parametrizable', (compiler, { alg, type, body }) => {
    let code = `const bodyBuffer = Buffer.alloc(${compiler.callTypeSize('value', body)})\n`
    code += `;((buffer) => ${compiler.callType('value', body, '0')})(bodyBuffer)\n`
    code += `const hash = ctx._${alg}(bodyBuffer)\n`
    code += 'return ' + compiler.callType('hash', type)
    return compiler.wrapCode(code)
  }]
}
```

The context is shared with the protocol's own type names, and a context entry wins over a type of the same name, so a helper's name is underscored to keep it out of the way.
