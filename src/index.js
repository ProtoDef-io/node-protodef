var ProtoDef = require("./protodef");
var proto = new ProtoDef();

global.Promise = require('bluebird');

module.exports = {
  ProtoDef:ProtoDef,
  Serializer:require("./serializer"),
  Parser:require("./parser"),
  types:proto.types,
  utils:require("./utils"),
  DataGetter:require("./data_getter")
};
