(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['exports'], factory);
  else if (typeof exports === 'object') factory(module.exports);
  else
    root['ktor-ktor-serialization-kotlinx'] = factory(
      typeof this['ktor-ktor-serialization-kotlinx'] === 'undefined' ? {} : this['ktor-ktor-serialization-kotlinx'],
    );
})(this, function (_) {
  'use strict';
  //region block: pre-declaration
  //endregion
  return _;
});

//# sourceMappingURL=ktor-ktor-serialization-kotlinx.js.map
