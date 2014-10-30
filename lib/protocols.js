var utils = require("./utils");
var _ = require("lodash");
var ProtoToObject = require("./stream").ProtoToObject;

var Protocols = {};

module.exports.datatypes = (function exportDatatypes() {
  var types = {};
  var addType = function (value, key) {
    types[key] = value;
  }
  _.forOwn(require('./datatypes/numeric'), addType);
  _.forOwn(require('./datatypes/structures'), addType);
  _.forOwn(require('./datatypes/conditional'), addType);
  _.forOwn(require('./datatypes/utils'), addType);
  return types;
})();

module.exports.createType = utils.createType;
module.exports.extendType = utils.extendType;
module.exports.create = function() {
  var proto = Object.create(Protocols);
  proto._types = [];
  proto.addDefaultTypes();
  return proto;
};

Protocols.addDefaultTypes = function() {
  var self = this;
  _.forOwn(module.exports.datatypes, function(value, key) {
    self.addType(key, value);
  });
  return this;
};

Protocols.addType = function (name, functions) {
  this._types[name] = functions;
  return this;
};

Protocols.createReader = function(fieldInfo) {
  return new ProtoToObject({ packetType: fieldInfo, protocol: this });
};

Protocols._getReader = function(name) {
  if (this._types[name])
    return utils.getReader(this._types[name]);
  else
    return null
};

Protocols._getWriter = function(name) {
  if (this._types[name])
    return utils.getWriter(this._types[name]);
  else
    return null
};

Protocols._getSizeOf = function(name) {
  if (this._types[name])
    return utils.getSizeOf(this._types[name]);
  else
    return null
};

// TODO : use Buffer.slice instead of bringing a cursor arround everywhere.
// It would make the code more DRY, as there wouldn't be any need to fiddle
// with the offset anymore.
// It would improve testability, as it removes one argument that could
// potentially fuck everything up.
// Furthermore, Buffer.slice creates a view, so there should be no major
// performance penalty with it (it should be as efficient as creating a pointer
// in C).
// Another alternative would be to use something like node-buffercursor
Protocols._readField = function (buffer, cursor, fieldInfo, context) {
  try {
    if (fieldInfo.condition && !fieldInfo.condition(context)) {
      return null; // TODO : Don't return null. Null means "not enough data".
    }
    var read = this._getReader(fieldInfo.type);
    if (!read) {
      var err = new Error("missing data type: " + fieldInfo.type);
      err.fieldName = fieldInfo.name;
      return {
        error: err
      };
    }
    // Bind this to Protocols, enabling this._readField !
    var typeArgs = fieldInfo.typeArgs || {};
    var readResults = read.call(this, buffer, cursor, typeArgs, context);
    //console.log(fieldInfo.name + ' : ' + readResults.value);
    if (!readResults) return null;
    else if (readResults.error) {
      if (!readResults.error.logged) {
        //console.log(JSON.stringify(context, null, 4));
        readResults.error.logged = true;
      }
      var name = readResults.error.fieldName;
      var fieldName = fieldInfo.name || "anonymous";
      if (name)
        name = fieldName + '.' + readResults.error.fieldName;
      else
        name = fieldName;
      readResults.error.fieldName = name; 
      return { error: readResults.error };
    } else {
      if (typeof readResults.size !== "number") {
        console.log(fieldInfo);
        var err = new Error("size is NaN");
        err.name = fieldName;
        return { error: err };
      }
      if (fieldInfo.name)
        context[fieldInfo.name] = readResults.value;
      return readResults;
    }
  } catch (e) {
    e.fieldName = fieldInfo.name || "anonymous";
    return { error: e };
  }
};

Protocols._writeField = function (value, buffer, cursor, fieldInfo, context) {
  if (fieldInfo.condition && !fieldInfo.condition(context)) {
    return offset;
  }
  var write = this._getWriter(fieldInfo.type);
  if (!write) {
    return {
      error: new Error("missing data type: " + fieldInfo.type)
    };
  }
  var typeArgs = fieldInfo.typeArgs || {};
  return write.call(this, value, buffer, offset, typeArgs, context);
};

Protocols._sizeOfField = function (value, fieldInfo, context) {
  if (fieldInfo.condition && !fieldInfo.condition(context)) {
    return 0;
  }
  var sizeof = this._getSizeOf(fieldInfo.type);
  if (!sizeof) {
    return {
      error: new Error("missing data type: " + fieldInfo.type)
    };
  }
  if (typeof sizeof === 'function') {
    var typeArgs = fieldInfo.typeArgs || {};
    return sizeof.call(this, value, typeArgs, context);
  } else {
    return sizeof;
  }
};
