Protocols
=========

[![Join the chat at https://gitter.im/roblabla/Protocols](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/roblabla/Protocols?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
This is a node.js module to simplify defining, reading and writing binary blobs,
whether they be internet protocols or files.

Installing
==========
This project is not on NPM yet, since it is far from being usable. If you still
want to use it,

```
npm i --save roblabla/protocols
```

## API Stability
This project is going to undergo lots of api changes before 1.0, so if you
depend on this project, you should specify the hash you build against

Usage
=====
```javascript
var protocols = require('protocols');
var proto = protocols.create();
proto.addType("");
```

What's done
===========
Currently, only the deserialization engine is done and used. Serialization is
far from done.

TODO
====
- Write tests for every datatypes, and the different \*Field behaviors.
- Rethink datatype function signature
- Datatypes should include name when creating them, instead of being provided
by the user, to ease datatype dependencies.
- Write the serialization stream.
- Probably more...
