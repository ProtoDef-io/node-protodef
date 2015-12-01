# ProtoDef
[![NPM version](https://img.shields.io/npm/v/protodef.svg)](http://npmjs.com/package/protodef)
[![Join the chat at https://gitter.im/roblabla/ProtoDef](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/roblabla/ProtoDef?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://img.shields.io/circleci/project/roblabla/ProtoDef/master.svg)]
(https://circleci.com/gh/roblabla/ProtoDef)
[![Tonic](https://img.shields.io/badge/tonic-try%20it-blue.svg)](https://tonicdev.com/npm/protodef)

This is a node.js module to simplify defining, reading and writing binary blobs,
whether they be internet protocols or files.

## Installing

```
npm install ProtoDef
```


## Usage

See [example](example.js)


## API

### ProtoDef()

#### ProtoDef.addType(name,functions)

Add the type `name` with the data `functions` which can be either:
* "native" : that type is already implemented by ProtoDef
* a js object defining a type based on other already defined types
* `[read,write,sizeOf]` functions

#### ProtoDef.read(buffer, cursor, _fieldInfo, rootNodes)

Read the packet defined by `_fieldInfo` in `buffer` starting from `cursor` using the context `rootNodes`.

#### ProtoDef.write(value, buffer, offset, _fieldInfo, rootNode)

Write the packet defined by `_fieldInfo` in `buffer` starting from `offset` with the value `value` and context `rootNode`

#### ProtoDef.sizeOf(value, _fieldInfo, rootNode)

Size of the packet `value` defined by `_fieldInfo` with context `rootNode`

#### ProtoDef.createPacketBuffer(type,packet)

Returns a buffer of the `packet` for `type`.

#### ProtoDef.parsePacketBuffer(type,buffer)

Returns a parsed packet of `buffer` for `type`.

### Serializer(proto,mainType)

Create a serializer of `mainType` defined in `proto`. This is a Transform stream.

#### Serializer.createPacketBuffer(packet)

Returns a buffer of the `packet`.

### Parser(proto,mainType)

Create a parser of `mainType` defined in `proto`. This is a Transform stream.

#### Parser.parsePacketBuffer(buffer)

Returns a parsed packet of `buffer`.

### types

An object mapping the default type names to the corresponding `[read,write,sizeOf]` functions.

### utils

Some functions that can be useful to build new datatypes reader and writer.

#### utils.getField(countField, context)

Get `countField` given `context`. Example: "../field" will get "field" one level above.

#### utils.getFieldInfo(fieldInfo)

Takes `fieldInfo` as :
* `"type"`
* `["type",typeArgs]`
* `{ type: "type", typeArgs: typeArgs }`

Returns `{ type: "type", typeArgs: typeArgs }`

#### utils.addErrorField(e, field)

Add `field` to error `e` and throw e.

#### utils.tryCatch(tryfn, catchfn)

A simple tryCatch function, useful for optimization.
returns what tryfn returns

#### utils.tryDoc(tryfn, field)

Try `tryfn`, it it fails, use addErrorField with `field`


## TODO
- Write tests for every datatypes, and the different \*Field behaviors.
- Rethink datatype function signature
- Datatypes should include name when creating them, instead of being provided
by the user, to ease datatype dependencies.
- Probably more...

## History

### 0.2.5
* fix small error in switch

### 0.2.4
* get back the example file as one file for simplicity and for tonic

### 0.2.3
* fix a small mistake in mapping error
* improve internal code
* improve example
* integrate with tonicdev

### 0.2.2

* Fix writeOption : the offset wasn't properly updated

### 0.2.1

* Anon fields may now be null/undefined.

### 0.2.0

* add createPacketBuffer and parsePacketBuffer to ProtoDef class
* expose utils functions
* add mapper and pstring datatypes

### 0.1.0

* add the serializer and parser
* expose the default datatypes
* add an example

### 0.0.1

* basic version, mostly contain the ProtoDef class and the datatype
