var assert = require("assert");

module.exports = {readPackets: readPackets};

function readPackets(packets) {
  var packetFields = {};
  var packetNames = {};
  var packetIds = {};

  Object.keys(packets).forEach((name)=>{
    var info = packets[name];
    var id = parseInt(info.id);
    var fields = info.fields;

    assert(id !== undefined, 'missing id for packet ' + name);
    assert(fields !== undefined, 'missing fields for packet ' + name);
    assert(!packetNames.hasOwnProperty(id), 'duplicate packet id ' + id + ' for ' + name);
    assert(!packetIds.hasOwnProperty(name), 'duplicate packet name ' + name + ' for ' + id);
    assert(!packetFields.hasOwnProperty(name), 'duplicate packet id ' + id + ' for ' + name);

    packetNames[id] = name;
    packetIds[name] = id;
    packetFields[name] = fields;
  });
  return {
    packetFields: packetFields,
    packetNames: packetNames,
    packetIds: packetIds
  };
}
