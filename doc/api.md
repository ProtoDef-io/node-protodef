# API

## ProtoDef()

### ProtoDef.addType(name,functions)

Add the type `name` with the data `functions` which can be either:
* "native" : that type is already implemented by ProtoDef
* a js object defining a type based on other already defined types
* `[read,write,sizeOf]` functions

### ProtoDef.read(buffer, cursor, _fieldInfo, rootNodes)

Read the packet defined by `_fieldInfo` in `buffer` starting from `cursor` using the context `rootNodes`.

### ProtoDef.write(value, buffer, offset, _fieldInfo, rootNode)

Write the packet defined by `_fieldInfo` in `buffer` starting from `offset` with the value `value` and context `rootNode`

### ProtoDef.sizeOf(value, _fieldInfo, rootNode)

Size of the packet `value` defined by `_fieldInfo` with context `rootNode`

### ProtoDef.createPacketBuffer(type,packet)

Returns a buffer of the `packet` for `type`.

### ProtoDef.parsePacketBuffer(type,buffer)

Returns a parsed packet of `buffer` for `type`.

## Serializer(proto,mainType)

Create a serializer of `mainType` defined in `proto`. This is a Transform stream.

### Serializer.createPacketBuffer(packet)

Returns a buffer of the `packet`.

## Parser(proto,mainType)

Create a parser of `mainType` defined in `proto`. This is a Transform stream.

### Parser.parsePacketBuffer(buffer)

Returns a parsed packet of `buffer`.

## types

An object mapping the default type names to the corresponding `[read,write,sizeOf]` functions.

## utils

Some functions that can be useful to build new datatypes reader and writer.

### utils.getField(countField, context)

Get `countField` given `context`. Example: "../field" will get "field" one level above.

### utils.getFieldInfo(fieldInfo)

Takes `fieldInfo` as :
* `"type"`
* `["type",typeArgs]`
* `{ type: "type", typeArgs: typeArgs }`

Returns `{ type: "type", typeArgs: typeArgs }`

### utils.addErrorField(e, field)

Add `field` to error `e` and throw e.

### utils.tryCatch(tryfn, catchfn)

A simple tryCatch function, useful for optimization.
returns what tryfn returns

### utils.tryDoc(tryfn, field)

Try `tryfn`, it it fails, use addErrorField with `field`
