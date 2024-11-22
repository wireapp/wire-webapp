(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './kotlin-kotlin-stdlib.js', './kotlinx-serialization-kotlinx-serialization-json.js'], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlin-kotlin-stdlib.js'),
      require('./kotlinx-serialization-kotlinx-serialization-json.js'),
    );
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-serialization-kotlinx-json'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'ktor-ktor-serialization-kotlinx-json'.",
      );
    }
    if (typeof this['kotlinx-serialization-kotlinx-serialization-json'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-serialization-kotlinx-json'. Its dependency 'kotlinx-serialization-kotlinx-serialization-json' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-json' is loaded prior to 'ktor-ktor-serialization-kotlinx-json'.",
      );
    }
    root['ktor-ktor-serialization-kotlinx-json'] = factory(
      typeof this['ktor-ktor-serialization-kotlinx-json'] === 'undefined'
        ? {}
        : this['ktor-ktor-serialization-kotlinx-json'],
      this['kotlin-kotlin-stdlib'],
      this['kotlinx-serialization-kotlinx-serialization-json'],
    );
  }
})(this, function (_, kotlin_kotlin, kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json) {
  'use strict';
  //region block: imports
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var VOID = kotlin_kotlin.$_$.f;
  var Json = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.s;
  //endregion
  //region block: pre-declaration
  //endregion
  function get_DefaultJson() {
    _init_properties_JsonSupport_kt__yf438r();
    return DefaultJson;
  }
  var DefaultJson;
  function DefaultJson$lambda($this$Json) {
    _init_properties_JsonSupport_kt__yf438r();
    $this$Json.set_encodeDefaults_c5evsg_k$(true);
    $this$Json.set_isLenient_kuajk5_k$(true);
    $this$Json.set_allowSpecialFloatingPointValues_xyc2ru_k$(true);
    $this$Json.set_allowStructuredMapKeys_sxzxe_k$(true);
    $this$Json.set_prettyPrint_v2gnff_k$(false);
    $this$Json.set_useArrayPolymorphism_54w3tr_k$(false);
    return Unit_getInstance();
  }
  var properties_initialized_JsonSupport_kt_9cgd93;
  function _init_properties_JsonSupport_kt__yf438r() {
    if (!properties_initialized_JsonSupport_kt_9cgd93) {
      properties_initialized_JsonSupport_kt_9cgd93 = true;
      DefaultJson = Json(VOID, DefaultJson$lambda);
    }
  }
  return _;
});

//# sourceMappingURL=ktor-ktor-serialization-kotlinx-json.js.map
