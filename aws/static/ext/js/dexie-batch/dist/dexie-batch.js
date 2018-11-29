/*! dexie-batch v0.4.1 | github.com/raphinesse/dexie-batch | MIT License */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('dexie')) :
  typeof define === 'function' && define.amd ? define(['dexie'], factory) :
  (global.DexieBatch = factory(global.Dexie));
}(this, (function (dexie) { 'use strict';

  dexie = dexie && dexie.hasOwnProperty('default') ? dexie['default'] : dexie;

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  var Promise$1 = dexie.Promise;

  var dexieBatch = function () {
    function DexieBatch(opts) {
      classCallCheck(this, DexieBatch);

      assertValidOptions(opts);
      this.opts = opts;
    }

    createClass(DexieBatch, [{
      key: 'isParallel',
      value: function isParallel() {
        return Boolean(this.opts.limit);
      }
    }, {
      key: 'each',
      value: function each(collection, callback) {
        var _this = this;

        assertValidMethodArgs.apply(undefined, arguments);

        return this.eachBatch(collection, function (batch, batchIdx) {
          var baseIdx = batchIdx * _this.opts.batchSize;
          return Promise$1.all(batch.map(function (item, i) {
            return callback(item, baseIdx + i);
          }));
        });
      }
    }, {
      key: 'eachBatch',
      value: function eachBatch(collection, callback) {
        assertValidMethodArgs.apply(undefined, arguments);

        var delegate = this.isParallel() ? 'eachBatchParallel' : 'eachBatchSerial';
        return this[delegate](collection, callback);
      }
    }, {
      key: 'eachBatchParallel',
      value: function eachBatchParallel(collection, callback) {
        assertValidMethodArgs.apply(undefined, arguments);
        if (!this.opts.limit) {
          throw new Error('Option "limit" must be set for parallel operation');
        }

        var batchSize = this.opts.batchSize;
        var batchPromises = [];

        var _loop = function _loop(batchIdx) {
          var batchPromise = collection.clone().offset(batchIdx * batchSize).limit(batchSize).toArray().then(function (batch) {
            return callback(batch, batchIdx);
          });
          batchPromises.push(batchPromise);
        };

        for (var batchIdx = 0; batchIdx * batchSize < this.opts.limit; batchIdx++) {
          _loop(batchIdx);
        }
        return Promise$1.all(batchPromises).then(function (batches) {
          return batches.length;
        });
      }
    }, {
      key: 'eachBatchSerial',
      value: function eachBatchSerial(collection, callback) {
        var _this2 = this;

        var batchIdx = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

        assertValidMethodArgs.apply(undefined, arguments);

        var batchSize = this.opts.batchSize;
        return collection.clone().limit(batchSize).toArray().then(function (batch) {
          if (batch.length === 0) return 0;

          var userPromise = callback(batch, batchIdx);
          var nextBatchesPromise = _this2.eachBatchSerial(collection.clone().offset(batchSize), callback, batchIdx + 1);

          return Promise$1.all([userPromise, nextBatchesPromise]).then(function (_ref) {
            var _ref2 = slicedToArray(_ref, 2),
                batchCount = _ref2[1];

            return batchCount + 1;
          });
        });
      }
    }]);
    return DexieBatch;
  }();

  function assertValidOptions(opts) {
    var batchSize = opts && opts.batchSize;
    if (!(batchSize && Number.isInteger(batchSize) && batchSize > 0)) {
      throw new Error('Mandatory option "batchSize" must be a positive integer');
    }

    if ('limit' in opts && !(Number.isInteger(opts.limit) && opts.limit >= 0)) {
      throw new Error('Option "limit" must be a non-negative integer');
    }
  }

  function assertValidMethodArgs(collection, callback) {
    if (arguments.length < 2) {
      throw new Error('Arguments "collection" and "callback" are mandatory');
    }
    if (!isCollectionInstance(collection)) {
      throw new Error('"collection" must be of type Collection');
    }
    if (!(typeof callback === 'function')) {
      throw new TypeError('"callback" must be a function');
    }
  }

  // We would need the Dexie instance that created the collection to get the
  // Collection constructor and do some proper type checking.
  // So for now we resort to duck typing
  function isCollectionInstance(obj) {
    if (!obj) return false;
    return ['clone', 'offset', 'limit', 'toArray'].every(function (name) {
      return typeof obj[name] === 'function';
    });
  }

  return dexieBatch;

})));
//# sourceMappingURL=dexie-batch.js.map
