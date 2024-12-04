(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './kotlinx-serialization-kotlinx-serialization-json.js', './kotlin-kotlin-stdlib.js'], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlinx-serialization-kotlinx-serialization-json.js'),
      require('./kotlin-kotlin-stdlib.js'),
    );
  else {
    if (typeof this['kotlinx-serialization-kotlinx-serialization-json'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-util'. Its dependency 'kotlinx-serialization-kotlinx-serialization-json' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-json' is loaded prior to 'kalium-util'.",
      );
    }
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-util'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'kalium-util'.",
      );
    }
    root['kalium-util'] = factory(
      typeof this['kalium-util'] === 'undefined' ? {} : this['kalium-util'],
      this['kotlinx-serialization-kotlinx-serialization-json'],
      this['kotlin-kotlin-stdlib'],
    );
  }
})(this, function (_, kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json, kotlin_kotlin) {
  'use strict';
  //region block: imports
  var JsonNull_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.c;
  var JsonElement = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.i;
  var Map = kotlin_kotlin.$_$.y5;
  var isInterface = kotlin_kotlin.$_$.pb;
  var List = kotlin_kotlin.$_$.w5;
  var isArray = kotlin_kotlin.$_$.hb;
  var JsonPrimitive = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.n;
  var JsonPrimitive_0 = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.p;
  var JsonPrimitive_1 = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.o;
  var isNumber = kotlin_kotlin.$_$.rb;
  var ArrayList_init_$Create$ = kotlin_kotlin.$_$.m;
  var JsonArray = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.f;
  var LinkedHashMap_init_$Create$ = kotlin_kotlin.$_$.v;
  var THROW_CCE = kotlin_kotlin.$_$.qg;
  var JsonObject = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.m;
  var to = kotlin_kotlin.$_$.xh;
  var mapOf = kotlin_kotlin.$_$.j8;
  //endregion
  //region block: pre-declaration
  //endregion
  function toJsonElement(_this__u8e3s4) {
    var tmp;
    if (isNumber(_this__u8e3s4)) {
      tmp = JsonPrimitive_1(_this__u8e3s4);
    } else {
      if (!(_this__u8e3s4 == null) ? typeof _this__u8e3s4 === 'boolean' : false) {
        tmp = JsonPrimitive_0(_this__u8e3s4);
      } else {
        if (!(_this__u8e3s4 == null) ? typeof _this__u8e3s4 === 'string' : false) {
          tmp = JsonPrimitive(_this__u8e3s4);
        } else {
          if (!(_this__u8e3s4 == null) ? isArray(_this__u8e3s4) : false) {
            tmp = toJsonArray(_this__u8e3s4);
          } else {
            if (!(_this__u8e3s4 == null) ? isInterface(_this__u8e3s4, List) : false) {
              tmp = toJsonArray_0(_this__u8e3s4);
            } else {
              if (!(_this__u8e3s4 == null) ? isInterface(_this__u8e3s4, Map) : false) {
                tmp = toJsonObject(_this__u8e3s4);
              } else {
                if (_this__u8e3s4 instanceof JsonElement) {
                  tmp = _this__u8e3s4;
                } else {
                  tmp = JsonNull_getInstance();
                }
              }
            }
          }
        }
      }
    }
    return tmp;
  }
  function toJsonArray(_this__u8e3s4) {
    // Inline function 'kotlin.collections.mutableListOf' call
    var array = ArrayList_init_$Create$();
    // Inline function 'kotlin.collections.forEach' call
    var inductionVariable = 0;
    var last = _this__u8e3s4.length;
    while (inductionVariable < last) {
      var element = _this__u8e3s4[inductionVariable];
      inductionVariable = (inductionVariable + 1) | 0;
      // Inline function 'com.wire.kalium.util.serialization.toJsonArray.<anonymous>' call
      array.add_utx5q5_k$(toJsonElement(element));
    }
    return new JsonArray(array);
  }
  function toJsonArray_0(_this__u8e3s4) {
    // Inline function 'kotlin.collections.mutableListOf' call
    var array = ArrayList_init_$Create$();
    // Inline function 'kotlin.collections.forEach' call
    var tmp0_iterator = _this__u8e3s4.iterator_jk1svi_k$();
    while (tmp0_iterator.hasNext_bitz1p_k$()) {
      var element = tmp0_iterator.next_20eer_k$();
      // Inline function 'com.wire.kalium.util.serialization.toJsonArray.<anonymous>' call
      array.add_utx5q5_k$(toJsonElement(element));
    }
    return new JsonArray(array);
  }
  function toJsonObject(_this__u8e3s4) {
    // Inline function 'kotlin.collections.mutableMapOf' call
    var map = LinkedHashMap_init_$Create$();
    // Inline function 'kotlin.collections.forEach' call
    // Inline function 'kotlin.collections.iterator' call
    var tmp0_iterator = _this__u8e3s4.get_entries_p20ztl_k$().iterator_jk1svi_k$();
    while (tmp0_iterator.hasNext_bitz1p_k$()) {
      var element = tmp0_iterator.next_20eer_k$();
      // Inline function 'com.wire.kalium.util.serialization.toJsonObject.<anonymous>' call
      var tmp = element.get_key_18j28a_k$();
      if (!(tmp == null) ? typeof tmp === 'string' : false) {
        // Inline function 'kotlin.collections.set' call
        var tmp_0 = element.get_key_18j28a_k$();
        var key = (!(tmp_0 == null) ? typeof tmp_0 === 'string' : false) ? tmp_0 : THROW_CCE();
        var value = toJsonElement(element.get_value_j01efc_k$());
        map.put_4fpzoq_k$(key, value);
      }
    }
    return new JsonObject(map);
  }
  function get_mimeTypeToExtensionMap() {
    _init_properties_MimeTypeUtil_kt__hra8c0();
    return mimeTypeToExtensionMap;
  }
  var mimeTypeToExtensionMap;
  var properties_initialized_MimeTypeUtil_kt_t1c8z6;
  function _init_properties_MimeTypeUtil_kt__hra8c0() {
    if (!properties_initialized_MimeTypeUtil_kt_t1c8z6) {
      properties_initialized_MimeTypeUtil_kt_t1c8z6 = true;
      mimeTypeToExtensionMap = mapOf([
        to('image/jpg', 'jpg'),
        to('image/jpeg', 'jpeg'),
        to('image/png', 'png'),
        to('image/heic', 'heic'),
        to('image/gif', 'gif'),
        to('image/webp', 'webp'),
        to('audio/mpeg', 'mp3'),
        to('audio/ogg', 'ogg'),
        to('audio/wav', 'wav'),
        to('audio/x-wav', 'wav'),
        to('audio/x-pn-wav', 'wav'),
        to('video/mp4', 'mp4'),
        to('video/webm', 'webm'),
        to('video/3gpp', '3gpp'),
        to('video/mkv', 'mkv'),
      ]);
    }
  }
  //region block: exports
  _.$_$ = _.$_$ || {};
  _.$_$.a = toJsonElement;
  //endregion
  return _;
});

//# sourceMappingURL=kalium-util.js.map
