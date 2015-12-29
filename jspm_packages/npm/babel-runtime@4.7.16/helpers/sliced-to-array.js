/* */ 
"use strict";
var _core = require('../core-js')["default"];
exports["default"] = function(arr, i) {
  if (Array.isArray(arr)) {
    return arr;
  } else if (_core.$for.isIterable(Object(arr))) {
    var _arr = [];
    for (var _iterator = _core.$for.getIterator(arr),
        _step; !(_step = _iterator.next()).done; ) {
      _arr.push(_step.value);
      if (i && _arr.length === i)
        break;
    }
    return _arr;
  } else {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }
};
exports.__esModule = true;
