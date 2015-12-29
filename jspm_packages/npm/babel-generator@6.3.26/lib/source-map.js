/* */ 
"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _interopRequireDefault = require("babel-runtime/helpers/interop-require-default")["default"];

var _interopRequireWildcard = require("babel-runtime/helpers/interop-require-wildcard")["default"];

exports.__esModule = true;

var _sourceMap = require("source-map");

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _babelTypes = require("babel-types");

var t = _interopRequireWildcard(_babelTypes);

/**
 * Build a sourcemap.
 */

var SourceMap = (function () {
  function SourceMap(position, opts, code) {
    _classCallCheck(this, SourceMap);

    this.position = position;
    this.opts = opts;

    if (opts.sourceMaps) {
      this.map = new _sourceMap2["default"].SourceMapGenerator({
        file: opts.sourceMapTarget,
        sourceRoot: opts.sourceRoot
      });

      this.map.setSourceContent(opts.sourceFileName, code);
    } else {
      this.map = null;
    }
  }

  /**
   * Get the sourcemap.
   */

  SourceMap.prototype.get = function get() {
    var map = this.map;
    if (map) {
      return map.toJSON();
    } else {
      return map;
    }
  };

  /**
   * Mark a node's generated position, and add it to the sourcemap.
   */

  SourceMap.prototype.mark = function mark(node, type) {
    var loc = node.loc;
    if (!loc) return; // no location info

    var map = this.map;
    if (!map) return; // no source map

    if (t.isProgram(node) || t.isFile(node)) return; // illegal mapping nodes

    var position = this.position;

    var generated = {
      line: position.line,
      column: position.column
    };

    var original = loc[type];

    map.addMapping({
      source: this.opts.sourceFileName,
      generated: generated,
      original: original
    });
  };

  return SourceMap;
})();

exports["default"] = SourceMap;
module.exports = exports["default"];