module.exports = {
  getField: getField,
  getFieldInfo: getFieldInfo,
  addErrorField: addErrorField,
  tryCatch: tryCatch,
  tryDoc: tryDoc
};

function getField(countField, context) {
  var countFieldArr = countField.split("/");
  var i = 0;
  if (countFieldArr[i] === "") {
    while (context.hasOwnProperty(".."))
      context = context[".."];
    i++;
  }
  for(; i < countFieldArr.length; i++)
    context = context[countFieldArr[i]];
  return context;
}

function getFieldInfo(fieldInfo) {
  if (typeof fieldInfo === "string")
    return { type: fieldInfo };
  else if (Array.isArray(fieldInfo))
    return { type: fieldInfo[0], typeArgs: fieldInfo[1] };
  else if (typeof fieldInfo.type === "string")
    return fieldInfo;
  else
    throw new Error("Not a fieldinfo");
}

function addErrorField(e, field) {
  e.field = e.field ? field + "." + e.field : field;
  throw e;
}

function tryCatch(tryfn, catchfn) {
  try { return tryfn(); } catch (e) { catchfn(e); }
}

function tryDoc(tryfn,field) {
  return tryCatch(tryfn,(e) => addErrorField(e,field));
}
