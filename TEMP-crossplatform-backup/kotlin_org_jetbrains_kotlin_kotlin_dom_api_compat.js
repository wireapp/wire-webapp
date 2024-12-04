(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['exports'], factory);
  else if (typeof exports === 'object') factory(module.exports);
  else
    root.kotlin_org_jetbrains_kotlin_kotlin_dom_api_compat = factory(
      typeof kotlin_org_jetbrains_kotlin_kotlin_dom_api_compat === 'undefined'
        ? {}
        : kotlin_org_jetbrains_kotlin_kotlin_dom_api_compat,
    );
})(this, function (_) {
  'use strict';
  //region block: pre-declaration
  //endregion
  function set(_this__u8e3s4, index, value) {
    // Inline function 'kotlin.js.asDynamic' call
    _this__u8e3s4[index] = value;
  }
  function set_0(_this__u8e3s4, index, value) {
    // Inline function 'kotlin.js.asDynamic' call
    _this__u8e3s4[index] = value;
  }
  function get(_this__u8e3s4, index) {
    // Inline function 'kotlin.js.asDynamic' call
    return _this__u8e3s4[index];
  }
  return _;
});

//# sourceMappingURL=kotlin_org_jetbrains_kotlin_kotlin_dom_api_compat.js.map
