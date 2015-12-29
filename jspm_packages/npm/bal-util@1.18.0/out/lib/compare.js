/* */ 
var balUtilCompare,
    balUtilPaths;
balUtilCompare = null;
balUtilPaths = require('./paths');
balUtilCompare = {
  versionCompare: function(v1, operator, v2) {
    var compare,
        i,
        numVersion,
        prepVersion,
        result,
        vm,
        x,
        _i;
    i = x = compare = 0;
    vm = {
      'dev': -6,
      'alpha': -5,
      'a': -5,
      'beta': -4,
      'b': -4,
      'RC': -3,
      'rc': -3,
      '#': -2,
      'p': -1,
      'pl': -1
    };
    prepVersion = function(v) {
      v = ('' + v).replace(/[_\-+]/g, '.');
      v = v.replace(/([^.\d]+)/g, '.$1.').replace(/\.{2,}/g, '.');
      if (!v.length) {
        return [-8];
      } else {
        return v.split('.');
      }
    };
    numVersion = function(v) {
      if (!v) {
        return 0;
      } else {
        if (isNaN(v)) {
          return vm[v] || -7;
        } else {
          return parseInt(v, 10);
        }
      }
    };
    v1 = prepVersion(v1);
    v2 = prepVersion(v2);
    x = Math.max(v1.length, v2.length);
    for (i = _i = 0; 0 <= x ? _i <= x : _i >= x; i = 0 <= x ? ++_i : --_i) {
      if (v1[i] === v2[i]) {
        continue;
      }
      v1[i] = numVersion(v1[i]);
      v2[i] = numVersion(v2[i]);
      if (v1[i] < v2[i]) {
        compare = -1;
        break;
      } else if (v1[i] > v2[i]) {
        compare = 1;
        break;
      }
    }
    if (!operator) {
      return compare;
    }
    result = (function() {
      switch (operator) {
        case '>':
        case 'gt':
          return compare > 0;
        case '>=':
        case 'ge':
          return compare >= 0;
        case '<=':
        case 'le':
          return compare <= 0;
        case '==':
        case '=':
        case 'eq':
        case 'is':
          return compare === 0;
        case '<>':
        case '!=':
        case 'ne':
        case 'isnt':
          return compare !== 0;
        case '':
        case '<':
        case 'lt':
          return compare < 0;
        default:
          return null;
      }
    })();
    return result;
  },
  packageCompare: function(_arg) {
    var details,
        errorCallback,
        local,
        newVersionCallback,
        oldVersionCallback,
        remote,
        runCompare,
        sameVersionCallback;
    local = _arg.local, remote = _arg.remote, newVersionCallback = _arg.newVersionCallback, sameVersionCallback = _arg.sameVersionCallback, oldVersionCallback = _arg.oldVersionCallback, errorCallback = _arg.errorCallback;
    details = {};
    runCompare = function() {
      if (balUtilCompare.versionCompare(details.local.version, '<', details.remote.version)) {
        return typeof newVersionCallback === "function" ? newVersionCallback(details) : void 0;
      } else if (balUtilCompare.versionCompare(details.local.version, '==', details.remote.version)) {
        return typeof sameVersionCallback === "function" ? sameVersionCallback(details) : void 0;
      } else if (balUtilCompare.versionCompare(details.local.version, '>', details.remote.version)) {
        return typeof oldVersionCallback === "function" ? oldVersionCallback(details) : void 0;
      }
    };
    balUtilPaths.readPath(local, function(err, data) {
      var dataStr;
      if (err) {
        return typeof errorCallback === "function" ? errorCallback(err, data) : void 0;
      }
      try {
        dataStr = data.toString();
        details.local = JSON.parse(dataStr);
      } catch (_error) {
        err = _error;
        return typeof errorCallback === "function" ? errorCallback(err, data) : void 0;
      }
      return balUtilPaths.readPath(remote, function(err, data) {
        if (err) {
          return typeof errorCallback === "function" ? errorCallback(err, data) : void 0;
        }
        try {
          dataStr = data.toString();
          details.remote = JSON.parse(dataStr);
        } catch (_error) {
          err = _error;
          return typeof errorCallback === "function" ? errorCallback(err, data) : void 0;
        }
        return runCompare();
      });
    });
    return this;
  }
};
module.exports = balUtilCompare;
