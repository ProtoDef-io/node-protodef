var ProtoDef = require("./protodef");
var proto = new ProtoDef();

global.Promise = require('bluebird');

module.exports = {
  ProtoDef:ProtoDef,
  Serializer:require("./serializer").Serializer,
  Parser:require("./serializer").Parser,
  types:proto.types,
  utils:require("./utils"),
  DataGetter:require("./serializer").DataGetter
};
