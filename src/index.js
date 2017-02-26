const ProtoDef = require("./protodef");
const proto = new ProtoDef();

module.exports = {
  ProtoDef:ProtoDef,
  Serializer:require("./serializer").Serializer,
  Parser:require("./serializer").Parser,
  types:proto.types,
  utils:require("./utils")
};
