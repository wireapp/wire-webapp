(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define([
      'exports',
      './kotlin-kotlin-stdlib.js',
      './kotlinx-serialization-kotlinx-serialization-core.js',
      './kalium-logger.js',
      './kotlinx-serialization-kotlinx-serialization-json.js',
    ], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlin-kotlin-stdlib.js'),
      require('./kotlinx-serialization-kotlinx-serialization-core.js'),
      require('./kalium-logger.js'),
      require('./kotlinx-serialization-kotlinx-serialization-json.js'),
    );
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-data'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'kalium-data'.",
      );
    }
    if (typeof this['kotlinx-serialization-kotlinx-serialization-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-data'. Its dependency 'kotlinx-serialization-kotlinx-serialization-core' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-core' is loaded prior to 'kalium-data'.",
      );
    }
    if (typeof this['kalium-logger'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-data'. Its dependency 'kalium-logger' was not found. Please, check whether 'kalium-logger' is loaded prior to 'kalium-data'.",
      );
    }
    if (typeof this['kotlinx-serialization-kotlinx-serialization-json'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-data'. Its dependency 'kotlinx-serialization-kotlinx-serialization-json' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-json' is loaded prior to 'kalium-data'.",
      );
    }
    root['kalium-data'] = factory(
      typeof this['kalium-data'] === 'undefined' ? {} : this['kalium-data'],
      this['kotlin-kotlin-stdlib'],
      this['kotlinx-serialization-kotlinx-serialization-core'],
      this['kalium-logger'],
      this['kotlinx-serialization-kotlinx-serialization-json'],
    );
  }
})(
  this,
  function (
    _,
    kotlin_kotlin,
    kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core,
    kotlin_com_wire_logger,
    kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json,
  ) {
    'use strict';
    //region block: imports
    var imul = Math.imul;
    var setOf = kotlin_kotlin.$_$.w8;
    var protoOf = kotlin_kotlin.$_$.dc;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var InlineClassDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.a2;
    var StringSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.s;
    var THROW_CCE = kotlin_kotlin.$_$.qg;
    var typeParametersSerializers = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.y1;
    var GeneratedSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.z1;
    var VOID = kotlin_kotlin.$_$.f;
    var getStringHashCode = kotlin_kotlin.$_$.eb;
    var classMeta = kotlin_kotlin.$_$.ta;
    var PluginGeneratedSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.g2;
    var UnknownFieldException_init_$Create$ = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.e;
    var throwMissingFieldException = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.k2;
    var objectCreate = kotlin_kotlin.$_$.bc;
    var charSequenceLength = kotlin_kotlin.$_$.ra;
    var obfuscateId = kotlin_com_wire_logger.$_$.b;
    var obfuscateDomain = kotlin_com_wire_logger.$_$.a;
    var isBlank = kotlin_kotlin.$_$.wd;
    var _Char___init__impl__6a9atx = kotlin_kotlin.$_$.t2;
    var Regex_init_$Create$ = kotlin_kotlin.$_$.d1;
    var SerializersModuleBuilder = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.n2;
    var getKClass = kotlin_kotlin.$_$.d;
    var PolymorphicModuleBuilder = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.m2;
    var get_nullable = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.w;
    var LinkedHashMapSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.c2;
    var SealedClassSerializer_init_$Create$ = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.b;
    var equals = kotlin_kotlin.$_$.xa;
    var hashCode = kotlin_kotlin.$_$.fb;
    var LazyThreadSafetyMode_PUBLICATION_getInstance = kotlin_kotlin.$_$.j;
    var lazy = kotlin_kotlin.$_$.mh;
    var SerializerFactory = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.h2;
    var ObjectSerializer_init_$Create$ = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.a;
    var ArrayListSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.w1;
    var BooleanSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.p;
    var getBooleanHashCode = kotlin_kotlin.$_$.bb;
    var IntSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.q;
    var LongSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.r;
    var toString = kotlin_kotlin.$_$.wh;
    var JsonObjectSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.d;
    //endregion
    //region block: pre-declaration
    setMetadataFor(Companion, 'Companion', objectMeta);
    setMetadataFor($serializer, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(PlainId, 'PlainId', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance});
    setMetadataFor(Companion_0, 'Companion', objectMeta);
    setMetadataFor($serializer_0, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(QualifiedID, 'QualifiedID', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_0});
    setMetadataFor(Companion_1, 'Companion', objectMeta);
    setMetadataFor($serializer_1, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_2, 'Companion', objectMeta);
    setMetadataFor($serializer_2, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_3, 'Companion', objectMeta);
    setMetadataFor($serializer_3, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_4, 'Companion', objectMeta);
    setMetadataFor($serializer_4, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebEventContent, 'WebEventContent', classMeta, VOID, VOID, VOID, VOID, {0: Companion_getInstance_6});
    setMetadataFor(Conversation, 'Conversation', classMeta, WebEventContent, VOID, VOID, VOID, {
      0: Companion_getInstance_5,
    });
    setMetadataFor(NewGroup, 'NewGroup', classMeta, Conversation, VOID, VOID, VOID, {0: $serializer_getInstance_1});
    setMetadataFor(TextMessage, 'TextMessage', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_2,
    });
    setMetadataFor(AssetMessage, 'AssetMessage', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_3,
    });
    setMetadataFor(KnockMessage, 'KnockMessage', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_4,
    });
    setMetadataFor(Companion_5, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Unknown, 'Unknown', objectMeta, WebEventContent, [WebEventContent, SerializerFactory], VOID, VOID, {
      0: Unknown_getInstance,
    });
    setMetadataFor(Companion_6, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_7, 'Companion', objectMeta);
    setMetadataFor($serializer_5, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebGroupMembers, 'WebGroupMembers', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_5,
    });
    setMetadataFor(Companion_8, 'Companion', objectMeta);
    setMetadataFor($serializer_6, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebTextData, 'WebTextData', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_6});
    setMetadataFor(Companion_9, 'Companion', objectMeta);
    setMetadataFor($serializer_7, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebAssetData, 'WebAssetData', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_7});
    setMetadataFor(Companion_10, 'Companion', objectMeta);
    setMetadataFor($serializer_8, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebKnockData, 'WebKnockData', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_8});
    setMetadataFor(Companion_11, 'Companion', objectMeta);
    setMetadataFor($serializer_9, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebAssetInfo, 'WebAssetInfo', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_9});
    setMetadataFor(Companion_12, 'Companion', objectMeta);
    setMetadataFor($serializer_10, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(WebAssetMeta, 'WebAssetMeta', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_10});
    //endregion
    function get_SUPPORTED_IMAGE_ASSET_MIME_TYPES() {
      _init_properties_Asset_kt__hhbibm();
      return SUPPORTED_IMAGE_ASSET_MIME_TYPES;
    }
    var SUPPORTED_IMAGE_ASSET_MIME_TYPES;
    function get_SUPPORTED_AUDIO_ASSET_MIME_TYPES() {
      _init_properties_Asset_kt__hhbibm();
      return SUPPORTED_AUDIO_ASSET_MIME_TYPES;
    }
    var SUPPORTED_AUDIO_ASSET_MIME_TYPES;
    function get_SUPPORTED_VIDEO_ASSET_MIME_TYPES() {
      _init_properties_Asset_kt__hhbibm();
      return SUPPORTED_VIDEO_ASSET_MIME_TYPES;
    }
    var SUPPORTED_VIDEO_ASSET_MIME_TYPES;
    var properties_initialized_Asset_kt_fm578g;
    function _init_properties_Asset_kt__hhbibm() {
      if (!properties_initialized_Asset_kt_fm578g) {
        properties_initialized_Asset_kt_fm578g = true;
        SUPPORTED_IMAGE_ASSET_MIME_TYPES = setOf(['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        SUPPORTED_AUDIO_ASSET_MIME_TYPES = setOf([
          'audio/mp3',
          'audio/mp4',
          'audio/mpeg',
          'audio/ogg',
          'audio/wav',
          'audio/x-wav',
          'audio/x-pn-wav',
          'audio/x-m4a',
        ]);
        SUPPORTED_VIDEO_ASSET_MIME_TYPES = setOf(['video/mp4', 'video/webm', 'video/3gpp', 'video/mkv']);
      }
    }
    function _PlainId___init__impl__gjhl8(value) {
      return value;
    }
    function _PlainId___get_value__impl__923p0o($this) {
      return $this;
    }
    function Companion() {
      Companion_instance = this;
    }
    protoOf(Companion).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance();
    };
    var Companion_instance;
    function Companion_getInstance() {
      if (Companion_instance == null) new Companion();
      return Companion_instance;
    }
    function $serializer() {
      $serializer_instance = this;
      var tmp0_serialDesc = new InlineClassDescriptor('com.wire.kalium.logic.data.id.PlainId', this);
      tmp0_serialDesc.addElement_5pzumi_k$('value', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer).deserialize_n07psx_k$ = function (decoder) {
      return _PlainId___init__impl__gjhl8(decoder.decodeInline_ux3vza_k$(this.descriptor_1).decodeString_x3hxsx_k$());
    };
    protoOf($serializer).deserialize_sy6x50_k$ = function (decoder) {
      return new PlainId(this.deserialize_n07psx_k$(decoder));
    };
    protoOf($serializer).serialize_mzgvag_k$ = function (encoder, value) {
      var tmp0_inlineEncoder = encoder.encodeInline_wxp5pu_k$(this.descriptor_1);
      if (tmp0_inlineEncoder == null) null;
      else {
        tmp0_inlineEncoder.encodeString_424b5v_k$(_PlainId___get_value__impl__923p0o(value));
      }
    };
    protoOf($serializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_mzgvag_k$(encoder, value instanceof PlainId ? value.value_1 : THROW_CCE());
    };
    var $serializer_instance;
    function $serializer_getInstance() {
      if ($serializer_instance == null) new $serializer();
      return $serializer_instance;
    }
    function PlainId__toString_impl_olb7yc($this) {
      return 'PlainId(value=' + $this + ')';
    }
    function PlainId__hashCode_impl_oomx7x($this) {
      return getStringHashCode($this);
    }
    function PlainId__equals_impl_oxvws7($this, other) {
      if (!(other instanceof PlainId)) return false;
      if (!($this === (other instanceof PlainId ? other.value_1 : THROW_CCE()))) return false;
      return true;
    }
    function PlainId(value) {
      Companion_getInstance();
      this.value_1 = value;
    }
    protoOf(PlainId).toString = function () {
      return PlainId__toString_impl_olb7yc(this.value_1);
    };
    protoOf(PlainId).hashCode = function () {
      return PlainId__hashCode_impl_oomx7x(this.value_1);
    };
    protoOf(PlainId).equals = function (other) {
      return PlainId__equals_impl_oxvws7(this.value_1, other);
    };
    function get_FEDERATION_REGEX() {
      _init_properties_QualifiedId_kt__3dt19h();
      return FEDERATION_REGEX;
    }
    var FEDERATION_REGEX;
    function Companion_0() {
      Companion_instance_0 = this;
    }
    protoOf(Companion_0).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_0();
    };
    var Companion_instance_0;
    function Companion_getInstance_0() {
      if (Companion_instance_0 == null) new Companion_0();
      return Companion_instance_0;
    }
    function $serializer_0() {
      $serializer_instance_0 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('com.wire.kalium.logic.data.id.QualifiedID', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('domain', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_0).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_0).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), StringSerializer_getInstance()];
    };
    protoOf($serializer_0).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return QualifiedID_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_0).serialize_4ngydm_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.value_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.domain_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_0).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_4ngydm_k$(encoder, value instanceof QualifiedID ? value : THROW_CCE());
    };
    var $serializer_instance_0;
    function $serializer_getInstance_0() {
      if ($serializer_instance_0 == null) new $serializer_0();
      return $serializer_instance_0;
    }
    function QualifiedID_init_$Init$(seen1, value, domain, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_0().descriptor_1);
      }
      $this.value_1 = value;
      $this.domain_1 = domain;
      return $this;
    }
    function QualifiedID_init_$Create$(seen1, value, domain, serializationConstructorMarker) {
      return QualifiedID_init_$Init$(
        seen1,
        value,
        domain,
        serializationConstructorMarker,
        objectCreate(protoOf(QualifiedID)),
      );
    }
    function QualifiedID(value, domain) {
      Companion_getInstance_0();
      this.value_1 = value;
      this.domain_1 = domain;
    }
    protoOf(QualifiedID).get_value_j01efc_k$ = function () {
      return this.value_1;
    };
    protoOf(QualifiedID).get_domain_ch74y5_k$ = function () {
      return this.domain_1;
    };
    protoOf(QualifiedID).toString = function () {
      var tmp;
      // Inline function 'kotlin.text.isEmpty' call
      var this_0 = this.domain_1;
      if (charSequenceLength(this_0) === 0) {
        tmp = this.value_1;
      } else {
        tmp = this.value_1 + '@' + this.domain_1;
      }
      return tmp;
    };
    protoOf(QualifiedID).toLogString_lzxw6y_k$ = function () {
      var tmp;
      // Inline function 'kotlin.text.isEmpty' call
      var this_0 = this.domain_1;
      if (charSequenceLength(this_0) === 0) {
        tmp = obfuscateId(this.value_1);
      } else {
        tmp = obfuscateId(this.value_1) + '@' + obfuscateDomain(this.domain_1);
      }
      return tmp;
    };
    protoOf(QualifiedID).toPlainID_dua4p1_k$ = function () {
      return _PlainId___init__impl__gjhl8(this.value_1);
    };
    protoOf(QualifiedID).equalsIgnoringBlankDomain_ybqmlz_k$ = function (other) {
      if (isBlank(this.domain_1) ? true : isBlank(other.domain_1)) {
        return this.value_1 === other.value_1;
      }
      return this.equals(other);
    };
    protoOf(QualifiedID).component1_7eebsc_k$ = function () {
      return this.value_1;
    };
    protoOf(QualifiedID).component2_7eebsb_k$ = function () {
      return this.domain_1;
    };
    protoOf(QualifiedID).copy_plwnsl_k$ = function (value, domain) {
      return new QualifiedID(value, domain);
    };
    protoOf(QualifiedID).copy$default_55lt0w_k$ = function (value, domain, $super) {
      value = value === VOID ? this.value_1 : value;
      domain = domain === VOID ? this.domain_1 : domain;
      return $super === VOID ? this.copy_plwnsl_k$(value, domain) : $super.copy_plwnsl_k$.call(this, value, domain);
    };
    protoOf(QualifiedID).hashCode = function () {
      var result = getStringHashCode(this.value_1);
      result = (imul(result, 31) + getStringHashCode(this.domain_1)) | 0;
      return result;
    };
    protoOf(QualifiedID).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof QualifiedID)) return false;
      var tmp0_other_with_cast = other instanceof QualifiedID ? other : THROW_CCE();
      if (!(this.value_1 === tmp0_other_with_cast.value_1)) return false;
      if (!(this.domain_1 === tmp0_other_with_cast.domain_1)) return false;
      return true;
    };
    function get_VALUE_DOMAIN_SEPARATOR() {
      return VALUE_DOMAIN_SEPARATOR;
    }
    var VALUE_DOMAIN_SEPARATOR;
    var properties_initialized_QualifiedId_kt_utqeop;
    function _init_properties_QualifiedId_kt__3dt19h() {
      if (!properties_initialized_QualifiedId_kt_utqeop) {
        properties_initialized_QualifiedId_kt_utqeop = true;
        // Inline function 'kotlin.text.toRegex' call
        var this_0 = '[^@.]+@[^@.]+\\.[^@]+';
        FEDERATION_REGEX = Regex_init_$Create$(this_0);
      }
    }
    function get_webEventContentSerializationModule() {
      _init_properties_WebContentSerialization_kt__btek6x();
      return webEventContentSerializationModule;
    }
    var webEventContentSerializationModule;
    function webEventContentSerializationModule$lambda(it) {
      _init_properties_WebContentSerialization_kt__btek6x();
      return Unknown_getInstance().serializer_9w0wvi_k$();
    }
    var properties_initialized_WebContentSerialization_kt_ydns1n;
    function _init_properties_WebContentSerialization_kt__btek6x() {
      if (!properties_initialized_WebContentSerialization_kt_ydns1n) {
        properties_initialized_WebContentSerialization_kt_ydns1n = true;
        // Inline function 'kotlinx.serialization.modules.SerializersModule' call
        var builder = new SerializersModuleBuilder();
        // Inline function 'com.wire.kalium.logic.data.web.webEventContentSerializationModule.<anonymous>' call
        // Inline function 'kotlinx.serialization.modules.polymorphic' call
        var baseClass = getKClass(WebEventContent);
        var builder_0 = new PolymorphicModuleBuilder(baseClass, null);
        // Inline function 'com.wire.kalium.logic.data.web.webEventContentSerializationModule.<anonymous>.<anonymous>' call
        builder_0.defaultDeserializer_i4d5r7_k$(webEventContentSerializationModule$lambda);
        builder_0.buildTo_m1auds_k$(builder);
        webEventContentSerializationModule = builder.build_1k0s4u_k$();
      }
    }
    function Companion_1() {
      Companion_instance_1 = this;
    }
    protoOf(Companion_1).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_1();
    };
    var Companion_instance_1;
    function Companion_getInstance_1() {
      if (Companion_instance_1 == null) new Companion_1();
      return Companion_instance_1;
    }
    function $serializer_1() {
      $serializer_instance_1 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.group-creation', this, 5);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_1).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_1).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_0(),
        get_nullable($serializer_getInstance_0()),
        StringSerializer_getInstance(),
        $serializer_getInstance_5(),
        StringSerializer_getInstance(),
      ];
    };
    protoOf($serializer_1).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = null;
      var tmp8_local4 = null;
      var tmp9_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp9_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_0(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_0(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_5(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp9_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_0(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_0(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_5(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp9_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewGroup_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_1).serialize_efyvdh_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_0(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_0(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.from_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 3, $serializer_getInstance_5(), value.members_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.time_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_1).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_efyvdh_k$(encoder, value instanceof NewGroup ? value : THROW_CCE());
    };
    var $serializer_instance_1;
    function $serializer_getInstance_1() {
      if ($serializer_instance_1 == null) new $serializer_1();
      return $serializer_instance_1;
    }
    function NewGroup_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      members,
      time,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_1().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.from_1 = from;
      $this.members_1 = members;
      $this.time_1 = time;
      return $this;
    }
    function NewGroup_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      members,
      time,
      serializationConstructorMarker,
    ) {
      return NewGroup_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        from,
        members,
        time,
        serializationConstructorMarker,
        objectCreate(protoOf(NewGroup)),
      );
    }
    function _get_$childSerializers__r2zwns($this) {
      return $this.$childSerializers_1;
    }
    function Companion_2() {
      Companion_instance_2 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        new LinkedHashMapSerializer(StringSerializer_getInstance(), StringSerializer_getInstance()),
      ];
    }
    protoOf(Companion_2).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_2();
    };
    var Companion_instance_2;
    function Companion_getInstance_2() {
      if (Companion_instance_2 == null) new Companion_2();
      return Companion_instance_2;
    }
    function $serializer_2() {
      $serializer_instance_2 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.message-add', this, 8);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from_client_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('reactions', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_2).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_2).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_2().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_0(),
        get_nullable($serializer_getInstance_0()),
        StringSerializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        $serializer_getInstance_6(),
        get_nullable(tmp0_cached[7]),
      ];
    };
    protoOf($serializer_2).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = null;
      var tmp8_local4 = null;
      var tmp9_local5 = null;
      var tmp10_local6 = null;
      var tmp11_local7 = null;
      var tmp12_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp13_cached = Companion_getInstance_2().$childSerializers_1;
      if (tmp12_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp12_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_0(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_0(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 5);
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp12_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          6,
          $serializer_getInstance_6(),
          tmp10_local6,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
        tmp11_local7 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          7,
          tmp13_cached[7],
          tmp11_local7,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 128;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp12_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp12_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_0(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_0(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                3,
                StringSerializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 5);
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp12_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                6,
                $serializer_getInstance_6(),
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            case 7:
              tmp11_local7 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                7,
                tmp13_cached[7],
                tmp11_local7,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 128;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp12_input.endStructure_1xqz0n_k$(tmp0_desc);
      return TextMessage_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        tmp9_local5,
        tmp10_local6,
        tmp11_local7,
        null,
      );
    };
    protoOf($serializer_2).serialize_6682i8_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_2().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_0(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_0(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.from_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        3,
        StringSerializer_getInstance(),
        value.fromClientId_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.time_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 5, value.id_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 6, $serializer_getInstance_6(), value.data_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 7, tmp2_cached[7], value.reactions_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_2).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_6682i8_k$(encoder, value instanceof TextMessage ? value : THROW_CCE());
    };
    var $serializer_instance_2;
    function $serializer_getInstance_2() {
      if ($serializer_instance_2 == null) new $serializer_2();
      return $serializer_instance_2;
    }
    function TextMessage_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(255 === (255 & seen1))) {
        throwMissingFieldException(seen1, 255, $serializer_getInstance_2().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.from_1 = from;
      $this.fromClientId_1 = fromClientId;
      $this.time_1 = time;
      $this.id_1 = id;
      $this.data_1 = data;
      $this.reactions_1 = reactions;
      return $this;
    }
    function TextMessage_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
      serializationConstructorMarker,
    ) {
      return TextMessage_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        from,
        fromClientId,
        time,
        id,
        data,
        reactions,
        serializationConstructorMarker,
        objectCreate(protoOf(TextMessage)),
      );
    }
    function _get_$childSerializers__r2zwns_0($this) {
      return $this.$childSerializers_1;
    }
    function Companion_3() {
      Companion_instance_3 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        new LinkedHashMapSerializer(StringSerializer_getInstance(), StringSerializer_getInstance()),
      ];
    }
    protoOf(Companion_3).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_3();
    };
    var Companion_instance_3;
    function Companion_getInstance_3() {
      if (Companion_instance_3 == null) new Companion_3();
      return Companion_instance_3;
    }
    function $serializer_3() {
      $serializer_instance_3 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.asset-add', this, 8);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from_client_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('reactions', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_3).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_3).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_3().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_0(),
        get_nullable($serializer_getInstance_0()),
        StringSerializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        $serializer_getInstance_7(),
        get_nullable(tmp0_cached[7]),
      ];
    };
    protoOf($serializer_3).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = null;
      var tmp8_local4 = null;
      var tmp9_local5 = null;
      var tmp10_local6 = null;
      var tmp11_local7 = null;
      var tmp12_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp13_cached = Companion_getInstance_3().$childSerializers_1;
      if (tmp12_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp12_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_0(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_0(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 5);
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp12_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          6,
          $serializer_getInstance_7(),
          tmp10_local6,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
        tmp11_local7 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          7,
          tmp13_cached[7],
          tmp11_local7,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 128;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp12_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp12_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_0(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_0(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                3,
                StringSerializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 5);
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp12_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                6,
                $serializer_getInstance_7(),
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            case 7:
              tmp11_local7 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                7,
                tmp13_cached[7],
                tmp11_local7,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 128;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp12_input.endStructure_1xqz0n_k$(tmp0_desc);
      return AssetMessage_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        tmp9_local5,
        tmp10_local6,
        tmp11_local7,
        null,
      );
    };
    protoOf($serializer_3).serialize_aalcpp_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_3().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_0(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_0(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.from_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        3,
        StringSerializer_getInstance(),
        value.fromClientId_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.time_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 5, value.id_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 6, $serializer_getInstance_7(), value.data_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 7, tmp2_cached[7], value.reactions_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_3).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_aalcpp_k$(encoder, value instanceof AssetMessage ? value : THROW_CCE());
    };
    var $serializer_instance_3;
    function $serializer_getInstance_3() {
      if ($serializer_instance_3 == null) new $serializer_3();
      return $serializer_instance_3;
    }
    function AssetMessage_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(255 === (255 & seen1))) {
        throwMissingFieldException(seen1, 255, $serializer_getInstance_3().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.from_1 = from;
      $this.fromClientId_1 = fromClientId;
      $this.time_1 = time;
      $this.id_1 = id;
      $this.data_1 = data;
      $this.reactions_1 = reactions;
      return $this;
    }
    function AssetMessage_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
      serializationConstructorMarker,
    ) {
      return AssetMessage_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        from,
        fromClientId,
        time,
        id,
        data,
        reactions,
        serializationConstructorMarker,
        objectCreate(protoOf(AssetMessage)),
      );
    }
    function Companion_4() {
      Companion_instance_4 = this;
    }
    protoOf(Companion_4).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_4();
    };
    var Companion_instance_4;
    function Companion_getInstance_4() {
      if (Companion_instance_4 == null) new Companion_4();
      return Companion_instance_4;
    }
    function $serializer_4() {
      $serializer_instance_4 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.knock', this, 7);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from_client_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_4).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_4).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_0(),
        get_nullable($serializer_getInstance_0()),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        $serializer_getInstance_8(),
      ];
    };
    protoOf($serializer_4).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = null;
      var tmp8_local4 = null;
      var tmp9_local5 = null;
      var tmp10_local6 = null;
      var tmp11_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp11_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp11_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_0(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_0(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 5);
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp11_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          6,
          $serializer_getInstance_8(),
          tmp10_local6,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp11_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp11_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_0(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_0(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 5);
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp11_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                6,
                $serializer_getInstance_8(),
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp11_input.endStructure_1xqz0n_k$(tmp0_desc);
      return KnockMessage_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        tmp9_local5,
        tmp10_local6,
        null,
      );
    };
    protoOf($serializer_4).serialize_y9cnb3_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_0(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_0(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.from_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 3, value.fromClientId_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.time_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 5, value.id_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 6, $serializer_getInstance_8(), value.data_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_4).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_y9cnb3_k$(encoder, value instanceof KnockMessage ? value : THROW_CCE());
    };
    var $serializer_instance_4;
    function $serializer_getInstance_4() {
      if ($serializer_instance_4 == null) new $serializer_4();
      return $serializer_instance_4;
    }
    function KnockMessage_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(127 === (127 & seen1))) {
        throwMissingFieldException(seen1, 127, $serializer_getInstance_4().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.from_1 = from;
      $this.fromClientId_1 = fromClientId;
      $this.time_1 = time;
      $this.id_1 = id;
      $this.data_1 = data;
      return $this;
    }
    function KnockMessage_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      serializationConstructorMarker,
    ) {
      return KnockMessage_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        from,
        fromClientId,
        time,
        id,
        data,
        serializationConstructorMarker,
        objectCreate(protoOf(KnockMessage)),
      );
    }
    function _get_$cachedSerializer__te6jhj($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function WebEventContent$Conversation$Companion$_anonymous__trxmmz() {
      var tmp = getKClass(Conversation);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [getKClass(AssetMessage), getKClass(KnockMessage), getKClass(NewGroup), getKClass(TextMessage)];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [
        $serializer_getInstance_3(),
        $serializer_getInstance_4(),
        $serializer_getInstance_1(),
        $serializer_getInstance_2(),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.logic.data.web.WebEventContent.Conversation',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function NewGroup(qualifiedConversation, qualifiedFrom, from, members, time) {
      Companion_getInstance_1();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.from_1 = from;
      this.members_1 = members;
      this.time_1 = time;
    }
    protoOf(NewGroup).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewGroup).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewGroup).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(NewGroup).get_members_gyhru8_k$ = function () {
      return this.members_1;
    };
    protoOf(NewGroup).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(NewGroup).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewGroup).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewGroup).component3_7eebsa_k$ = function () {
      return this.from_1;
    };
    protoOf(NewGroup).component4_7eebs9_k$ = function () {
      return this.members_1;
    };
    protoOf(NewGroup).component5_7eebs8_k$ = function () {
      return this.time_1;
    };
    protoOf(NewGroup).copy_z0d4et_k$ = function (qualifiedConversation, qualifiedFrom, from, members, time) {
      return new NewGroup(qualifiedConversation, qualifiedFrom, from, members, time);
    };
    protoOf(NewGroup).copy$default_jj4tke_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      members,
      time,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      from = from === VOID ? this.from_1 : from;
      members = members === VOID ? this.members_1 : members;
      time = time === VOID ? this.time_1 : time;
      return $super === VOID
        ? this.copy_z0d4et_k$(qualifiedConversation, qualifiedFrom, from, members, time)
        : $super.copy_z0d4et_k$.call(this, qualifiedConversation, qualifiedFrom, from, members, time);
    };
    protoOf(NewGroup).toString = function () {
      return (
        'NewGroup(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', from=' +
        this.from_1 +
        ', members=' +
        this.members_1 +
        ', time=' +
        this.time_1 +
        ')'
      );
    };
    protoOf(NewGroup).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + (this.qualifiedFrom_1 == null ? 0 : this.qualifiedFrom_1.hashCode())) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + this.members_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      return result;
    };
    protoOf(NewGroup).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewGroup)) return false;
      var tmp0_other_with_cast = other instanceof NewGroup ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!equals(this.qualifiedFrom_1, tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!this.members_1.equals(tmp0_other_with_cast.members_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      return true;
    };
    function TextMessage(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data, reactions) {
      Companion_getInstance_2();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.from_1 = from;
      this.fromClientId_1 = fromClientId;
      this.time_1 = time;
      this.id_1 = id;
      this.data_1 = data;
      this.reactions_1 = reactions;
    }
    protoOf(TextMessage).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(TextMessage).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(TextMessage).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(TextMessage).get_fromClientId_kjdv3b_k$ = function () {
      return this.fromClientId_1;
    };
    protoOf(TextMessage).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(TextMessage).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(TextMessage).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(TextMessage).get_reactions_a22x4v_k$ = function () {
      return this.reactions_1;
    };
    protoOf(TextMessage).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(TextMessage).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(TextMessage).component3_7eebsa_k$ = function () {
      return this.from_1;
    };
    protoOf(TextMessage).component4_7eebs9_k$ = function () {
      return this.fromClientId_1;
    };
    protoOf(TextMessage).component5_7eebs8_k$ = function () {
      return this.time_1;
    };
    protoOf(TextMessage).component6_7eebs7_k$ = function () {
      return this.id_1;
    };
    protoOf(TextMessage).component7_7eebs6_k$ = function () {
      return this.data_1;
    };
    protoOf(TextMessage).component8_7eebs5_k$ = function () {
      return this.reactions_1;
    };
    protoOf(TextMessage).copy_m4os62_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
    ) {
      return new TextMessage(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data, reactions);
    };
    protoOf(TextMessage).copy$default_eb6jjf_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      from = from === VOID ? this.from_1 : from;
      fromClientId = fromClientId === VOID ? this.fromClientId_1 : fromClientId;
      time = time === VOID ? this.time_1 : time;
      id = id === VOID ? this.id_1 : id;
      data = data === VOID ? this.data_1 : data;
      reactions = reactions === VOID ? this.reactions_1 : reactions;
      return $super === VOID
        ? this.copy_m4os62_k$(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data, reactions)
        : $super.copy_m4os62_k$.call(
            this,
            qualifiedConversation,
            qualifiedFrom,
            from,
            fromClientId,
            time,
            id,
            data,
            reactions,
          );
    };
    protoOf(TextMessage).toString = function () {
      return (
        'TextMessage(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', from=' +
        this.from_1 +
        ', fromClientId=' +
        this.fromClientId_1 +
        ', time=' +
        this.time_1 +
        ', id=' +
        this.id_1 +
        ', data=' +
        this.data_1 +
        ', reactions=' +
        this.reactions_1 +
        ')'
      );
    };
    protoOf(TextMessage).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + (this.qualifiedFrom_1 == null ? 0 : this.qualifiedFrom_1.hashCode())) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + (this.fromClientId_1 == null ? 0 : getStringHashCode(this.fromClientId_1))) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.id_1)) | 0;
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.reactions_1 == null ? 0 : hashCode(this.reactions_1))) | 0;
      return result;
    };
    protoOf(TextMessage).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof TextMessage)) return false;
      var tmp0_other_with_cast = other instanceof TextMessage ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!equals(this.qualifiedFrom_1, tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!(this.fromClientId_1 == tmp0_other_with_cast.fromClientId_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!equals(this.reactions_1, tmp0_other_with_cast.reactions_1)) return false;
      return true;
    };
    function AssetMessage(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data, reactions) {
      Companion_getInstance_3();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.from_1 = from;
      this.fromClientId_1 = fromClientId;
      this.time_1 = time;
      this.id_1 = id;
      this.data_1 = data;
      this.reactions_1 = reactions;
    }
    protoOf(AssetMessage).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(AssetMessage).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(AssetMessage).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(AssetMessage).get_fromClientId_kjdv3b_k$ = function () {
      return this.fromClientId_1;
    };
    protoOf(AssetMessage).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(AssetMessage).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(AssetMessage).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(AssetMessage).get_reactions_a22x4v_k$ = function () {
      return this.reactions_1;
    };
    protoOf(AssetMessage).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(AssetMessage).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(AssetMessage).component3_7eebsa_k$ = function () {
      return this.from_1;
    };
    protoOf(AssetMessage).component4_7eebs9_k$ = function () {
      return this.fromClientId_1;
    };
    protoOf(AssetMessage).component5_7eebs8_k$ = function () {
      return this.time_1;
    };
    protoOf(AssetMessage).component6_7eebs7_k$ = function () {
      return this.id_1;
    };
    protoOf(AssetMessage).component7_7eebs6_k$ = function () {
      return this.data_1;
    };
    protoOf(AssetMessage).component8_7eebs5_k$ = function () {
      return this.reactions_1;
    };
    protoOf(AssetMessage).copy_f5to07_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
    ) {
      return new AssetMessage(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data, reactions);
    };
    protoOf(AssetMessage).copy$default_wpmvkj_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      reactions,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      from = from === VOID ? this.from_1 : from;
      fromClientId = fromClientId === VOID ? this.fromClientId_1 : fromClientId;
      time = time === VOID ? this.time_1 : time;
      id = id === VOID ? this.id_1 : id;
      data = data === VOID ? this.data_1 : data;
      reactions = reactions === VOID ? this.reactions_1 : reactions;
      return $super === VOID
        ? this.copy_f5to07_k$(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data, reactions)
        : $super.copy_f5to07_k$.call(
            this,
            qualifiedConversation,
            qualifiedFrom,
            from,
            fromClientId,
            time,
            id,
            data,
            reactions,
          );
    };
    protoOf(AssetMessage).toString = function () {
      return (
        'AssetMessage(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', from=' +
        this.from_1 +
        ', fromClientId=' +
        this.fromClientId_1 +
        ', time=' +
        this.time_1 +
        ', id=' +
        this.id_1 +
        ', data=' +
        this.data_1 +
        ', reactions=' +
        this.reactions_1 +
        ')'
      );
    };
    protoOf(AssetMessage).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + (this.qualifiedFrom_1 == null ? 0 : this.qualifiedFrom_1.hashCode())) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + (this.fromClientId_1 == null ? 0 : getStringHashCode(this.fromClientId_1))) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.id_1)) | 0;
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.reactions_1 == null ? 0 : hashCode(this.reactions_1))) | 0;
      return result;
    };
    protoOf(AssetMessage).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof AssetMessage)) return false;
      var tmp0_other_with_cast = other instanceof AssetMessage ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!equals(this.qualifiedFrom_1, tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!(this.fromClientId_1 == tmp0_other_with_cast.fromClientId_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!equals(this.reactions_1, tmp0_other_with_cast.reactions_1)) return false;
      return true;
    };
    function KnockMessage(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data) {
      Companion_getInstance_4();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.from_1 = from;
      this.fromClientId_1 = fromClientId;
      this.time_1 = time;
      this.id_1 = id;
      this.data_1 = data;
    }
    protoOf(KnockMessage).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(KnockMessage).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(KnockMessage).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(KnockMessage).get_fromClientId_kjdv3b_k$ = function () {
      return this.fromClientId_1;
    };
    protoOf(KnockMessage).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(KnockMessage).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(KnockMessage).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(KnockMessage).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(KnockMessage).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(KnockMessage).component3_7eebsa_k$ = function () {
      return this.from_1;
    };
    protoOf(KnockMessage).component4_7eebs9_k$ = function () {
      return this.fromClientId_1;
    };
    protoOf(KnockMessage).component5_7eebs8_k$ = function () {
      return this.time_1;
    };
    protoOf(KnockMessage).component6_7eebs7_k$ = function () {
      return this.id_1;
    };
    protoOf(KnockMessage).component7_7eebs6_k$ = function () {
      return this.data_1;
    };
    protoOf(KnockMessage).copy_hs0yzl_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
    ) {
      return new KnockMessage(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data);
    };
    protoOf(KnockMessage).copy$default_5limgk_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      from,
      fromClientId,
      time,
      id,
      data,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      from = from === VOID ? this.from_1 : from;
      fromClientId = fromClientId === VOID ? this.fromClientId_1 : fromClientId;
      time = time === VOID ? this.time_1 : time;
      id = id === VOID ? this.id_1 : id;
      data = data === VOID ? this.data_1 : data;
      return $super === VOID
        ? this.copy_hs0yzl_k$(qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data)
        : $super.copy_hs0yzl_k$.call(this, qualifiedConversation, qualifiedFrom, from, fromClientId, time, id, data);
    };
    protoOf(KnockMessage).toString = function () {
      return (
        'KnockMessage(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', from=' +
        this.from_1 +
        ', fromClientId=' +
        this.fromClientId_1 +
        ', time=' +
        this.time_1 +
        ', id=' +
        this.id_1 +
        ', data=' +
        this.data_1 +
        ')'
      );
    };
    protoOf(KnockMessage).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + (this.qualifiedFrom_1 == null ? 0 : this.qualifiedFrom_1.hashCode())) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.fromClientId_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.id_1)) | 0;
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      return result;
    };
    protoOf(KnockMessage).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof KnockMessage)) return false;
      var tmp0_other_with_cast = other instanceof KnockMessage ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!equals(this.qualifiedFrom_1, tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!(this.fromClientId_1 === tmp0_other_with_cast.fromClientId_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      return true;
    };
    function Companion_5() {
      Companion_instance_5 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, WebEventContent$Conversation$Companion$_anonymous__trxmmz);
    }
    protoOf(Companion_5).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj(this);
    };
    protoOf(Companion_5).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_5;
    function Companion_getInstance_5() {
      if (Companion_instance_5 == null) new Companion_5();
      return Companion_instance_5;
    }
    function Conversation_init_$Init$(seen1, serializationConstructorMarker, $this) {
      WebEventContent_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function Conversation_init_$Create$(seen1, serializationConstructorMarker) {
      return Conversation_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(Conversation)));
    }
    function _get_$cachedSerializer__te6jhj_0($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function WebEventContent$Unknown$_anonymous__vow65a() {
      var tmp = Unknown_getInstance();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$2 = [];
      return ObjectSerializer_init_$Create$('unknown', tmp, tmp$ret$2);
    }
    function _get_$cachedSerializer__te6jhj_1($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function WebEventContent$Companion$_anonymous__7jme4() {
      var tmp = getKClass(WebEventContent);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [
        getKClass(AssetMessage),
        getKClass(KnockMessage),
        getKClass(NewGroup),
        getKClass(TextMessage),
        getKClass(Unknown),
      ];
      // Inline function 'kotlin.arrayOf' call
      var tmp_1 = $serializer_getInstance_3();
      var tmp_2 = $serializer_getInstance_4();
      var tmp_3 = $serializer_getInstance_1();
      var tmp_4 = $serializer_getInstance_2();
      var tmp_5 = Unknown_getInstance();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [];
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_6 = [tmp_1, tmp_2, tmp_3, tmp_4, ObjectSerializer_init_$Create$('unknown', tmp_5, tmp$ret$5)];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$11 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.logic.data.web.WebEventContent',
        tmp,
        tmp_0,
        tmp_6,
        tmp$ret$11,
      );
    }
    function Conversation() {
      Companion_getInstance_5();
      WebEventContent.call(this);
    }
    function Unknown() {
      Unknown_instance = this;
      WebEventContent.call(this);
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, WebEventContent$Unknown$_anonymous__vow65a);
    }
    protoOf(Unknown).toString = function () {
      return 'Unknown';
    };
    protoOf(Unknown).hashCode = function () {
      return -1162690872;
    };
    protoOf(Unknown).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Unknown)) return false;
      other instanceof Unknown || THROW_CCE();
      return true;
    };
    protoOf(Unknown).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_0(this);
    };
    protoOf(Unknown).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Unknown_instance;
    function Unknown_getInstance() {
      if (Unknown_instance == null) new Unknown();
      return Unknown_instance;
    }
    function Companion_6() {
      Companion_instance_6 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, WebEventContent$Companion$_anonymous__7jme4);
    }
    protoOf(Companion_6).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_1(this);
    };
    protoOf(Companion_6).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_6;
    function Companion_getInstance_6() {
      if (Companion_instance_6 == null) new Companion_6();
      return Companion_instance_6;
    }
    function WebEventContent_init_$Init$(seen1, serializationConstructorMarker, $this) {
      return $this;
    }
    function WebEventContent_init_$Create$(seen1, serializationConstructorMarker) {
      return WebEventContent_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(WebEventContent)));
    }
    function WebEventContent() {
      Companion_getInstance_6();
    }
    function _get_$childSerializers__r2zwns_1($this) {
      return $this.$childSerializers_1;
    }
    function Companion_7() {
      Companion_instance_7 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, null, new ArrayListSerializer($serializer_getInstance_0())];
    }
    protoOf(Companion_7).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_5();
    };
    var Companion_instance_7;
    function Companion_getInstance_7() {
      if (Companion_instance_7 == null) new Companion_7();
      return Companion_instance_7;
    }
    function $serializer_5() {
      $serializer_instance_5 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.logic.data.web.WebGroupMembers',
        this,
        3,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('allTeamMembers', false);
      tmp0_serialDesc.addElement_5pzumi_k$('name', false);
      tmp0_serialDesc.addElement_5pzumi_k$('userIds', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_5).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_5).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_7().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [BooleanSerializer_getInstance(), StringSerializer_getInstance(), tmp0_cached[2]];
    };
    protoOf($serializer_5).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = false;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp8_cached = Companion_getInstance_7().$childSerializers_1;
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 2, tmp8_cached[2], tmp6_local2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp7_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp7_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 2, tmp8_cached[2], tmp6_local2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return WebGroupMembers_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_5).serialize_lz5b4q_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_7().$childSerializers_1;
      tmp1_output.encodeBooleanElement_ydht7q_k$(tmp0_desc, 0, value.allTeamMembers_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.name_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 2, tmp2_cached[2], value.userIds_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_5).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_lz5b4q_k$(encoder, value instanceof WebGroupMembers ? value : THROW_CCE());
    };
    var $serializer_instance_5;
    function $serializer_getInstance_5() {
      if ($serializer_instance_5 == null) new $serializer_5();
      return $serializer_instance_5;
    }
    function WebGroupMembers_init_$Init$(seen1, allTeamMembers, name, userIds, serializationConstructorMarker, $this) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_5().descriptor_1);
      }
      $this.allTeamMembers_1 = allTeamMembers;
      $this.name_1 = name;
      $this.userIds_1 = userIds;
      return $this;
    }
    function WebGroupMembers_init_$Create$(seen1, allTeamMembers, name, userIds, serializationConstructorMarker) {
      return WebGroupMembers_init_$Init$(
        seen1,
        allTeamMembers,
        name,
        userIds,
        serializationConstructorMarker,
        objectCreate(protoOf(WebGroupMembers)),
      );
    }
    function WebGroupMembers(allTeamMembers, name, userIds) {
      Companion_getInstance_7();
      this.allTeamMembers_1 = allTeamMembers;
      this.name_1 = name;
      this.userIds_1 = userIds;
    }
    protoOf(WebGroupMembers).get_allTeamMembers_c8et9g_k$ = function () {
      return this.allTeamMembers_1;
    };
    protoOf(WebGroupMembers).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(WebGroupMembers).get_userIds_1622v0_k$ = function () {
      return this.userIds_1;
    };
    protoOf(WebGroupMembers).component1_7eebsc_k$ = function () {
      return this.allTeamMembers_1;
    };
    protoOf(WebGroupMembers).component2_7eebsb_k$ = function () {
      return this.name_1;
    };
    protoOf(WebGroupMembers).component3_7eebsa_k$ = function () {
      return this.userIds_1;
    };
    protoOf(WebGroupMembers).copy_k3ba49_k$ = function (allTeamMembers, name, userIds) {
      return new WebGroupMembers(allTeamMembers, name, userIds);
    };
    protoOf(WebGroupMembers).copy$default_60j8fp_k$ = function (allTeamMembers, name, userIds, $super) {
      allTeamMembers = allTeamMembers === VOID ? this.allTeamMembers_1 : allTeamMembers;
      name = name === VOID ? this.name_1 : name;
      userIds = userIds === VOID ? this.userIds_1 : userIds;
      return $super === VOID
        ? this.copy_k3ba49_k$(allTeamMembers, name, userIds)
        : $super.copy_k3ba49_k$.call(this, allTeamMembers, name, userIds);
    };
    protoOf(WebGroupMembers).toString = function () {
      return (
        'WebGroupMembers(allTeamMembers=' +
        this.allTeamMembers_1 +
        ', name=' +
        this.name_1 +
        ', userIds=' +
        this.userIds_1 +
        ')'
      );
    };
    protoOf(WebGroupMembers).hashCode = function () {
      var result = getBooleanHashCode(this.allTeamMembers_1);
      result = (imul(result, 31) + getStringHashCode(this.name_1)) | 0;
      result = (imul(result, 31) + hashCode(this.userIds_1)) | 0;
      return result;
    };
    protoOf(WebGroupMembers).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof WebGroupMembers)) return false;
      var tmp0_other_with_cast = other instanceof WebGroupMembers ? other : THROW_CCE();
      if (!(this.allTeamMembers_1 === tmp0_other_with_cast.allTeamMembers_1)) return false;
      if (!(this.name_1 === tmp0_other_with_cast.name_1)) return false;
      if (!equals(this.userIds_1, tmp0_other_with_cast.userIds_1)) return false;
      return true;
    };
    function Companion_8() {
      Companion_instance_8 = this;
    }
    protoOf(Companion_8).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_6();
    };
    var Companion_instance_8;
    function Companion_getInstance_8() {
      if (Companion_instance_8 == null) new Companion_8();
      return Companion_instance_8;
    }
    function $serializer_6() {
      $serializer_instance_6 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('com.wire.kalium.logic.data.web.WebTextData', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('content', false);
      tmp0_serialDesc.addElement_5pzumi_k$('expects_read_confirmation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('legal_hold_status', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_6).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_6).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        StringSerializer_getInstance(),
        get_nullable(BooleanSerializer_getInstance()),
        get_nullable(IntSerializer_getInstance()),
      ];
    };
    protoOf($serializer_6).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          BooleanSerializer_getInstance(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          IntSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp7_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                BooleanSerializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                IntSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return WebTextData_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_6).serialize_y77v31_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.text_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        BooleanSerializer_getInstance(),
        value.expectsReadConfirmation_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        IntSerializer_getInstance(),
        value.legalHoldStatus_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_6).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_y77v31_k$(encoder, value instanceof WebTextData ? value : THROW_CCE());
    };
    var $serializer_instance_6;
    function $serializer_getInstance_6() {
      if ($serializer_instance_6 == null) new $serializer_6();
      return $serializer_instance_6;
    }
    function WebTextData_init_$Init$(
      seen1,
      text,
      expectsReadConfirmation,
      legalHoldStatus,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_6().descriptor_1);
      }
      $this.text_1 = text;
      $this.expectsReadConfirmation_1 = expectsReadConfirmation;
      $this.legalHoldStatus_1 = legalHoldStatus;
      return $this;
    }
    function WebTextData_init_$Create$(
      seen1,
      text,
      expectsReadConfirmation,
      legalHoldStatus,
      serializationConstructorMarker,
    ) {
      return WebTextData_init_$Init$(
        seen1,
        text,
        expectsReadConfirmation,
        legalHoldStatus,
        serializationConstructorMarker,
        objectCreate(protoOf(WebTextData)),
      );
    }
    function WebTextData(text, expectsReadConfirmation, legalHoldStatus) {
      Companion_getInstance_8();
      this.text_1 = text;
      this.expectsReadConfirmation_1 = expectsReadConfirmation;
      this.legalHoldStatus_1 = legalHoldStatus;
    }
    protoOf(WebTextData).get_text_wouvsm_k$ = function () {
      return this.text_1;
    };
    protoOf(WebTextData).get_expectsReadConfirmation_i6xil8_k$ = function () {
      return this.expectsReadConfirmation_1;
    };
    protoOf(WebTextData).get_legalHoldStatus_nngzep_k$ = function () {
      return this.legalHoldStatus_1;
    };
    protoOf(WebTextData).component1_7eebsc_k$ = function () {
      return this.text_1;
    };
    protoOf(WebTextData).component2_7eebsb_k$ = function () {
      return this.expectsReadConfirmation_1;
    };
    protoOf(WebTextData).component3_7eebsa_k$ = function () {
      return this.legalHoldStatus_1;
    };
    protoOf(WebTextData).copy_4ybqd2_k$ = function (text, expectsReadConfirmation, legalHoldStatus) {
      return new WebTextData(text, expectsReadConfirmation, legalHoldStatus);
    };
    protoOf(WebTextData).copy$default_u1jz8r_k$ = function (text, expectsReadConfirmation, legalHoldStatus, $super) {
      text = text === VOID ? this.text_1 : text;
      expectsReadConfirmation =
        expectsReadConfirmation === VOID ? this.expectsReadConfirmation_1 : expectsReadConfirmation;
      legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus_1 : legalHoldStatus;
      return $super === VOID
        ? this.copy_4ybqd2_k$(text, expectsReadConfirmation, legalHoldStatus)
        : $super.copy_4ybqd2_k$.call(this, text, expectsReadConfirmation, legalHoldStatus);
    };
    protoOf(WebTextData).toString = function () {
      return (
        'WebTextData(text=' +
        this.text_1 +
        ', expectsReadConfirmation=' +
        this.expectsReadConfirmation_1 +
        ', legalHoldStatus=' +
        this.legalHoldStatus_1 +
        ')'
      );
    };
    protoOf(WebTextData).hashCode = function () {
      var result = getStringHashCode(this.text_1);
      result =
        (imul(result, 31) +
          (this.expectsReadConfirmation_1 == null ? 0 : getBooleanHashCode(this.expectsReadConfirmation_1))) |
        0;
      result = (imul(result, 31) + (this.legalHoldStatus_1 == null ? 0 : this.legalHoldStatus_1)) | 0;
      return result;
    };
    protoOf(WebTextData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof WebTextData)) return false;
      var tmp0_other_with_cast = other instanceof WebTextData ? other : THROW_CCE();
      if (!(this.text_1 === tmp0_other_with_cast.text_1)) return false;
      if (!(this.expectsReadConfirmation_1 == tmp0_other_with_cast.expectsReadConfirmation_1)) return false;
      if (!(this.legalHoldStatus_1 == tmp0_other_with_cast.legalHoldStatus_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_2($this) {
      return $this.$childSerializers_1;
    }
    function Companion_9() {
      Companion_instance_9 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        new LinkedHashMapSerializer(StringSerializer_getInstance(), IntSerializer_getInstance()),
        new LinkedHashMapSerializer(StringSerializer_getInstance(), IntSerializer_getInstance()),
        null,
        null,
        null,
      ];
    }
    protoOf(Companion_9).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_7();
    };
    var Companion_instance_9;
    function Companion_getInstance_9() {
      if (Companion_instance_9 == null) new Companion_9();
      return Companion_instance_9;
    }
    function $serializer_7() {
      $serializer_instance_7 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.logic.data.web.WebAssetData',
        this,
        12,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('content_length', false);
      tmp0_serialDesc.addElement_5pzumi_k$('content_type', false);
      tmp0_serialDesc.addElement_5pzumi_k$('domain', false);
      tmp0_serialDesc.addElement_5pzumi_k$('expects_read_confirmation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('info', false);
      tmp0_serialDesc.addElement_5pzumi_k$('key', false);
      tmp0_serialDesc.addElement_5pzumi_k$('legal_hold_status', false);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_key', false);
      tmp0_serialDesc.addElement_5pzumi_k$('sha256', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.addElement_5pzumi_k$('token', false);
      tmp0_serialDesc.addElement_5pzumi_k$('meta', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_7).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_7).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_9().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(LongSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        BooleanSerializer_getInstance(),
        get_nullable($serializer_getInstance_9()),
        get_nullable(StringSerializer_getInstance()),
        IntSerializer_getInstance(),
        get_nullable(tmp0_cached[7]),
        get_nullable(tmp0_cached[8]),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable($serializer_getInstance_10()),
      ];
    };
    protoOf($serializer_7).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = false;
      var tmp8_local4 = null;
      var tmp9_local5 = null;
      var tmp10_local6 = 0;
      var tmp11_local7 = null;
      var tmp12_local8 = null;
      var tmp13_local9 = null;
      var tmp14_local10 = null;
      var tmp15_local11 = null;
      var tmp16_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp17_cached = Companion_getInstance_9().$childSerializers_1;
      if (tmp16_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          LongSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          StringSerializer_getInstance(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp16_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          $serializer_getInstance_9(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          5,
          StringSerializer_getInstance(),
          tmp9_local5,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp16_input.decodeIntElement_941u6a_k$(tmp0_desc, 6);
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
        tmp11_local7 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          7,
          tmp17_cached[7],
          tmp11_local7,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 128;
        tmp12_local8 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          8,
          tmp17_cached[8],
          tmp12_local8,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 256;
        tmp13_local9 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          9,
          StringSerializer_getInstance(),
          tmp13_local9,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 512;
        tmp14_local10 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          10,
          StringSerializer_getInstance(),
          tmp14_local10,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1024;
        tmp15_local11 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          11,
          $serializer_getInstance_10(),
          tmp15_local11,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2048;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp16_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                LongSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                StringSerializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp16_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                $serializer_getInstance_9(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                5,
                StringSerializer_getInstance(),
                tmp9_local5,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp16_input.decodeIntElement_941u6a_k$(tmp0_desc, 6);
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            case 7:
              tmp11_local7 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                7,
                tmp17_cached[7],
                tmp11_local7,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 128;
              break;
            case 8:
              tmp12_local8 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                8,
                tmp17_cached[8],
                tmp12_local8,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 256;
              break;
            case 9:
              tmp13_local9 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                9,
                StringSerializer_getInstance(),
                tmp13_local9,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 512;
              break;
            case 10:
              tmp14_local10 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                10,
                StringSerializer_getInstance(),
                tmp14_local10,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1024;
              break;
            case 11:
              tmp15_local11 = tmp16_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                11,
                $serializer_getInstance_10(),
                tmp15_local11,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2048;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp16_input.endStructure_1xqz0n_k$(tmp0_desc);
      return WebAssetData_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        tmp9_local5,
        tmp10_local6,
        tmp11_local7,
        tmp12_local8,
        tmp13_local9,
        tmp14_local10,
        tmp15_local11,
        null,
      );
    };
    protoOf($serializer_7).serialize_ec8xw8_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_9().$childSerializers_1;
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        LongSerializer_getInstance(),
        value.contentLength_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        StringSerializer_getInstance(),
        value.contentType_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        StringSerializer_getInstance(),
        value.domain_1,
      );
      tmp1_output.encodeBooleanElement_ydht7q_k$(tmp0_desc, 3, value.expectsReadConfirmation_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 4, $serializer_getInstance_9(), value.info_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        5,
        StringSerializer_getInstance(),
        value.key_1,
      );
      tmp1_output.encodeIntElement_krhhce_k$(tmp0_desc, 6, value.legalHoldStatus_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 7, tmp2_cached[7], value.otrKey_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 8, tmp2_cached[8], value.sha256__1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        9,
        StringSerializer_getInstance(),
        value.status_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        10,
        StringSerializer_getInstance(),
        value.token_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        11,
        $serializer_getInstance_10(),
        value.meta_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_7).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ec8xw8_k$(encoder, value instanceof WebAssetData ? value : THROW_CCE());
    };
    var $serializer_instance_7;
    function $serializer_getInstance_7() {
      if ($serializer_instance_7 == null) new $serializer_7();
      return $serializer_instance_7;
    }
    function WebAssetData_init_$Init$(
      seen1,
      contentLength,
      contentType,
      domain,
      expectsReadConfirmation,
      info,
      key,
      legalHoldStatus,
      otrKey,
      sha256,
      status,
      token,
      meta,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(4095 === (4095 & seen1))) {
        throwMissingFieldException(seen1, 4095, $serializer_getInstance_7().descriptor_1);
      }
      $this.contentLength_1 = contentLength;
      $this.contentType_1 = contentType;
      $this.domain_1 = domain;
      $this.expectsReadConfirmation_1 = expectsReadConfirmation;
      $this.info_1 = info;
      $this.key_1 = key;
      $this.legalHoldStatus_1 = legalHoldStatus;
      $this.otrKey_1 = otrKey;
      $this.sha256__1 = sha256;
      $this.status_1 = status;
      $this.token_1 = token;
      $this.meta_1 = meta;
      return $this;
    }
    function WebAssetData_init_$Create$(
      seen1,
      contentLength,
      contentType,
      domain,
      expectsReadConfirmation,
      info,
      key,
      legalHoldStatus,
      otrKey,
      sha256,
      status,
      token,
      meta,
      serializationConstructorMarker,
    ) {
      return WebAssetData_init_$Init$(
        seen1,
        contentLength,
        contentType,
        domain,
        expectsReadConfirmation,
        info,
        key,
        legalHoldStatus,
        otrKey,
        sha256,
        status,
        token,
        meta,
        serializationConstructorMarker,
        objectCreate(protoOf(WebAssetData)),
      );
    }
    function WebAssetData(
      contentLength,
      contentType,
      domain,
      expectsReadConfirmation,
      info,
      key,
      legalHoldStatus,
      otrKey,
      sha256,
      status,
      token,
      meta,
    ) {
      Companion_getInstance_9();
      this.contentLength_1 = contentLength;
      this.contentType_1 = contentType;
      this.domain_1 = domain;
      this.expectsReadConfirmation_1 = expectsReadConfirmation;
      this.info_1 = info;
      this.key_1 = key;
      this.legalHoldStatus_1 = legalHoldStatus;
      this.otrKey_1 = otrKey;
      this.sha256__1 = sha256;
      this.status_1 = status;
      this.token_1 = token;
      this.meta_1 = meta;
    }
    protoOf(WebAssetData).get_contentLength_a5o8yy_k$ = function () {
      return this.contentLength_1;
    };
    protoOf(WebAssetData).get_contentType_7git4a_k$ = function () {
      return this.contentType_1;
    };
    protoOf(WebAssetData).get_domain_ch74y5_k$ = function () {
      return this.domain_1;
    };
    protoOf(WebAssetData).get_expectsReadConfirmation_i6xil8_k$ = function () {
      return this.expectsReadConfirmation_1;
    };
    protoOf(WebAssetData).get_info_woo16f_k$ = function () {
      return this.info_1;
    };
    protoOf(WebAssetData).get_key_18j28a_k$ = function () {
      return this.key_1;
    };
    protoOf(WebAssetData).get_legalHoldStatus_nngzep_k$ = function () {
      return this.legalHoldStatus_1;
    };
    protoOf(WebAssetData).get_otrKey_hriosb_k$ = function () {
      return this.otrKey_1;
    };
    protoOf(WebAssetData).get_sha256_jgs8q8_k$ = function () {
      return this.sha256__1;
    };
    protoOf(WebAssetData).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(WebAssetData).get_token_iz6pxs_k$ = function () {
      return this.token_1;
    };
    protoOf(WebAssetData).get_meta_woqery_k$ = function () {
      return this.meta_1;
    };
    protoOf(WebAssetData).component1_7eebsc_k$ = function () {
      return this.contentLength_1;
    };
    protoOf(WebAssetData).component2_7eebsb_k$ = function () {
      return this.contentType_1;
    };
    protoOf(WebAssetData).component3_7eebsa_k$ = function () {
      return this.domain_1;
    };
    protoOf(WebAssetData).component4_7eebs9_k$ = function () {
      return this.expectsReadConfirmation_1;
    };
    protoOf(WebAssetData).component5_7eebs8_k$ = function () {
      return this.info_1;
    };
    protoOf(WebAssetData).component6_7eebs7_k$ = function () {
      return this.key_1;
    };
    protoOf(WebAssetData).component7_7eebs6_k$ = function () {
      return this.legalHoldStatus_1;
    };
    protoOf(WebAssetData).component8_7eebs5_k$ = function () {
      return this.otrKey_1;
    };
    protoOf(WebAssetData).component9_7eebs4_k$ = function () {
      return this.sha256__1;
    };
    protoOf(WebAssetData).component10_gazzfo_k$ = function () {
      return this.status_1;
    };
    protoOf(WebAssetData).component11_gazzfn_k$ = function () {
      return this.token_1;
    };
    protoOf(WebAssetData).component12_gazzfm_k$ = function () {
      return this.meta_1;
    };
    protoOf(WebAssetData).copy_2w66j3_k$ = function (
      contentLength,
      contentType,
      domain,
      expectsReadConfirmation,
      info,
      key,
      legalHoldStatus,
      otrKey,
      sha256,
      status,
      token,
      meta,
    ) {
      return new WebAssetData(
        contentLength,
        contentType,
        domain,
        expectsReadConfirmation,
        info,
        key,
        legalHoldStatus,
        otrKey,
        sha256,
        status,
        token,
        meta,
      );
    };
    protoOf(WebAssetData).copy$default_pdkmmi_k$ = function (
      contentLength,
      contentType,
      domain,
      expectsReadConfirmation,
      info,
      key,
      legalHoldStatus,
      otrKey,
      sha256,
      status,
      token,
      meta,
      $super,
    ) {
      contentLength = contentLength === VOID ? this.contentLength_1 : contentLength;
      contentType = contentType === VOID ? this.contentType_1 : contentType;
      domain = domain === VOID ? this.domain_1 : domain;
      expectsReadConfirmation =
        expectsReadConfirmation === VOID ? this.expectsReadConfirmation_1 : expectsReadConfirmation;
      info = info === VOID ? this.info_1 : info;
      key = key === VOID ? this.key_1 : key;
      legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus_1 : legalHoldStatus;
      otrKey = otrKey === VOID ? this.otrKey_1 : otrKey;
      sha256 = sha256 === VOID ? this.sha256__1 : sha256;
      status = status === VOID ? this.status_1 : status;
      token = token === VOID ? this.token_1 : token;
      meta = meta === VOID ? this.meta_1 : meta;
      return $super === VOID
        ? this.copy_2w66j3_k$(
            contentLength,
            contentType,
            domain,
            expectsReadConfirmation,
            info,
            key,
            legalHoldStatus,
            otrKey,
            sha256,
            status,
            token,
            meta,
          )
        : $super.copy_2w66j3_k$.call(
            this,
            contentLength,
            contentType,
            domain,
            expectsReadConfirmation,
            info,
            key,
            legalHoldStatus,
            otrKey,
            sha256,
            status,
            token,
            meta,
          );
    };
    protoOf(WebAssetData).toString = function () {
      return (
        'WebAssetData(contentLength=' +
        toString(this.contentLength_1) +
        ', contentType=' +
        this.contentType_1 +
        ', domain=' +
        this.domain_1 +
        ', expectsReadConfirmation=' +
        this.expectsReadConfirmation_1 +
        ', info=' +
        this.info_1 +
        ', key=' +
        this.key_1 +
        ', legalHoldStatus=' +
        this.legalHoldStatus_1 +
        ', otrKey=' +
        this.otrKey_1 +
        ', sha256=' +
        this.sha256__1 +
        ', status=' +
        this.status_1 +
        ', token=' +
        this.token_1 +
        ', meta=' +
        this.meta_1 +
        ')'
      );
    };
    protoOf(WebAssetData).hashCode = function () {
      var result = this.contentLength_1 == null ? 0 : this.contentLength_1.hashCode();
      result = (imul(result, 31) + (this.contentType_1 == null ? 0 : getStringHashCode(this.contentType_1))) | 0;
      result = (imul(result, 31) + (this.domain_1 == null ? 0 : getStringHashCode(this.domain_1))) | 0;
      result = (imul(result, 31) + getBooleanHashCode(this.expectsReadConfirmation_1)) | 0;
      result = (imul(result, 31) + (this.info_1 == null ? 0 : this.info_1.hashCode())) | 0;
      result = (imul(result, 31) + (this.key_1 == null ? 0 : getStringHashCode(this.key_1))) | 0;
      result = (imul(result, 31) + this.legalHoldStatus_1) | 0;
      result = (imul(result, 31) + (this.otrKey_1 == null ? 0 : hashCode(this.otrKey_1))) | 0;
      result = (imul(result, 31) + (this.sha256__1 == null ? 0 : hashCode(this.sha256__1))) | 0;
      result = (imul(result, 31) + (this.status_1 == null ? 0 : getStringHashCode(this.status_1))) | 0;
      result = (imul(result, 31) + (this.token_1 == null ? 0 : getStringHashCode(this.token_1))) | 0;
      result = (imul(result, 31) + (this.meta_1 == null ? 0 : this.meta_1.hashCode())) | 0;
      return result;
    };
    protoOf(WebAssetData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof WebAssetData)) return false;
      var tmp0_other_with_cast = other instanceof WebAssetData ? other : THROW_CCE();
      if (!equals(this.contentLength_1, tmp0_other_with_cast.contentLength_1)) return false;
      if (!(this.contentType_1 == tmp0_other_with_cast.contentType_1)) return false;
      if (!(this.domain_1 == tmp0_other_with_cast.domain_1)) return false;
      if (!(this.expectsReadConfirmation_1 === tmp0_other_with_cast.expectsReadConfirmation_1)) return false;
      if (!equals(this.info_1, tmp0_other_with_cast.info_1)) return false;
      if (!(this.key_1 == tmp0_other_with_cast.key_1)) return false;
      if (!(this.legalHoldStatus_1 === tmp0_other_with_cast.legalHoldStatus_1)) return false;
      if (!equals(this.otrKey_1, tmp0_other_with_cast.otrKey_1)) return false;
      if (!equals(this.sha256__1, tmp0_other_with_cast.sha256__1)) return false;
      if (!(this.status_1 == tmp0_other_with_cast.status_1)) return false;
      if (!(this.token_1 == tmp0_other_with_cast.token_1)) return false;
      if (!equals(this.meta_1, tmp0_other_with_cast.meta_1)) return false;
      return true;
    };
    function Companion_10() {
      Companion_instance_10 = this;
    }
    protoOf(Companion_10).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_8();
    };
    var Companion_instance_10;
    function Companion_getInstance_10() {
      if (Companion_instance_10 == null) new Companion_10();
      return Companion_instance_10;
    }
    function $serializer_8() {
      $serializer_instance_8 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('com.wire.kalium.logic.data.web.WebKnockData', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('expects_read_confirmation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('legal_hold_status', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_8).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_8).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [BooleanSerializer_getInstance(), IntSerializer_getInstance()];
    };
    protoOf($serializer_8).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = false;
      var tmp5_local1 = 0;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeIntElement_941u6a_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeIntElement_941u6a_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return WebKnockData_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_8).serialize_ke0qc_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeBooleanElement_ydht7q_k$(tmp0_desc, 0, value.expectsReadConfirmation_1);
      tmp1_output.encodeIntElement_krhhce_k$(tmp0_desc, 1, value.legalHoldStatus_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_8).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ke0qc_k$(encoder, value instanceof WebKnockData ? value : THROW_CCE());
    };
    var $serializer_instance_8;
    function $serializer_getInstance_8() {
      if ($serializer_instance_8 == null) new $serializer_8();
      return $serializer_instance_8;
    }
    function WebKnockData_init_$Init$(
      seen1,
      expectsReadConfirmation,
      legalHoldStatus,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_8().descriptor_1);
      }
      $this.expectsReadConfirmation_1 = expectsReadConfirmation;
      $this.legalHoldStatus_1 = legalHoldStatus;
      return $this;
    }
    function WebKnockData_init_$Create$(
      seen1,
      expectsReadConfirmation,
      legalHoldStatus,
      serializationConstructorMarker,
    ) {
      return WebKnockData_init_$Init$(
        seen1,
        expectsReadConfirmation,
        legalHoldStatus,
        serializationConstructorMarker,
        objectCreate(protoOf(WebKnockData)),
      );
    }
    function WebKnockData(expectsReadConfirmation, legalHoldStatus) {
      Companion_getInstance_10();
      this.expectsReadConfirmation_1 = expectsReadConfirmation;
      this.legalHoldStatus_1 = legalHoldStatus;
    }
    protoOf(WebKnockData).get_expectsReadConfirmation_i6xil8_k$ = function () {
      return this.expectsReadConfirmation_1;
    };
    protoOf(WebKnockData).get_legalHoldStatus_nngzep_k$ = function () {
      return this.legalHoldStatus_1;
    };
    protoOf(WebKnockData).component1_7eebsc_k$ = function () {
      return this.expectsReadConfirmation_1;
    };
    protoOf(WebKnockData).component2_7eebsb_k$ = function () {
      return this.legalHoldStatus_1;
    };
    protoOf(WebKnockData).copy_xajy4o_k$ = function (expectsReadConfirmation, legalHoldStatus) {
      return new WebKnockData(expectsReadConfirmation, legalHoldStatus);
    };
    protoOf(WebKnockData).copy$default_rtxsix_k$ = function (expectsReadConfirmation, legalHoldStatus, $super) {
      expectsReadConfirmation =
        expectsReadConfirmation === VOID ? this.expectsReadConfirmation_1 : expectsReadConfirmation;
      legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus_1 : legalHoldStatus;
      return $super === VOID
        ? this.copy_xajy4o_k$(expectsReadConfirmation, legalHoldStatus)
        : $super.copy_xajy4o_k$.call(this, expectsReadConfirmation, legalHoldStatus);
    };
    protoOf(WebKnockData).toString = function () {
      return (
        'WebKnockData(expectsReadConfirmation=' +
        this.expectsReadConfirmation_1 +
        ', legalHoldStatus=' +
        this.legalHoldStatus_1 +
        ')'
      );
    };
    protoOf(WebKnockData).hashCode = function () {
      var result = getBooleanHashCode(this.expectsReadConfirmation_1);
      result = (imul(result, 31) + this.legalHoldStatus_1) | 0;
      return result;
    };
    protoOf(WebKnockData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof WebKnockData)) return false;
      var tmp0_other_with_cast = other instanceof WebKnockData ? other : THROW_CCE();
      if (!(this.expectsReadConfirmation_1 === tmp0_other_with_cast.expectsReadConfirmation_1)) return false;
      if (!(this.legalHoldStatus_1 === tmp0_other_with_cast.legalHoldStatus_1)) return false;
      return true;
    };
    function Companion_11() {
      Companion_instance_11 = this;
    }
    protoOf(Companion_11).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_9();
    };
    var Companion_instance_11;
    function Companion_getInstance_11() {
      if (Companion_instance_11 == null) new Companion_11();
      return Companion_instance_11;
    }
    function $serializer_9() {
      $serializer_instance_9 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('com.wire.kalium.logic.data.web.WebAssetInfo', this, 4);
      tmp0_serialDesc.addElement_5pzumi_k$('height', false);
      tmp0_serialDesc.addElement_5pzumi_k$('name', false);
      tmp0_serialDesc.addElement_5pzumi_k$('tag', false);
      tmp0_serialDesc.addElement_5pzumi_k$('width', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_9).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_9).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
      ];
    };
    protoOf($serializer_9).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = null;
      var tmp8_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp8_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          StringSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          StringSerializer_getInstance(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp8_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                StringSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                StringSerializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                3,
                StringSerializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return WebAssetInfo_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_9).serialize_vm425o_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        StringSerializer_getInstance(),
        value.height_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        StringSerializer_getInstance(),
        value.name_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        StringSerializer_getInstance(),
        value.tag_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        3,
        StringSerializer_getInstance(),
        value.width_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_9).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_vm425o_k$(encoder, value instanceof WebAssetInfo ? value : THROW_CCE());
    };
    var $serializer_instance_9;
    function $serializer_getInstance_9() {
      if ($serializer_instance_9 == null) new $serializer_9();
      return $serializer_instance_9;
    }
    function WebAssetInfo_init_$Init$(seen1, height, name, tag, width, serializationConstructorMarker, $this) {
      if (!(15 === (15 & seen1))) {
        throwMissingFieldException(seen1, 15, $serializer_getInstance_9().descriptor_1);
      }
      $this.height_1 = height;
      $this.name_1 = name;
      $this.tag_1 = tag;
      $this.width_1 = width;
      return $this;
    }
    function WebAssetInfo_init_$Create$(seen1, height, name, tag, width, serializationConstructorMarker) {
      return WebAssetInfo_init_$Init$(
        seen1,
        height,
        name,
        tag,
        width,
        serializationConstructorMarker,
        objectCreate(protoOf(WebAssetInfo)),
      );
    }
    function WebAssetInfo(height, name, tag, width) {
      Companion_getInstance_11();
      this.height_1 = height;
      this.name_1 = name;
      this.tag_1 = tag;
      this.width_1 = width;
    }
    protoOf(WebAssetInfo).get_height_e7t92o_k$ = function () {
      return this.height_1;
    };
    protoOf(WebAssetInfo).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(WebAssetInfo).get_tag_18ivnz_k$ = function () {
      return this.tag_1;
    };
    protoOf(WebAssetInfo).get_width_j0q4yl_k$ = function () {
      return this.width_1;
    };
    protoOf(WebAssetInfo).component1_7eebsc_k$ = function () {
      return this.height_1;
    };
    protoOf(WebAssetInfo).component2_7eebsb_k$ = function () {
      return this.name_1;
    };
    protoOf(WebAssetInfo).component3_7eebsa_k$ = function () {
      return this.tag_1;
    };
    protoOf(WebAssetInfo).component4_7eebs9_k$ = function () {
      return this.width_1;
    };
    protoOf(WebAssetInfo).copy_a532cn_k$ = function (height, name, tag, width) {
      return new WebAssetInfo(height, name, tag, width);
    };
    protoOf(WebAssetInfo).copy$default_fqzuso_k$ = function (height, name, tag, width, $super) {
      height = height === VOID ? this.height_1 : height;
      name = name === VOID ? this.name_1 : name;
      tag = tag === VOID ? this.tag_1 : tag;
      width = width === VOID ? this.width_1 : width;
      return $super === VOID
        ? this.copy_a532cn_k$(height, name, tag, width)
        : $super.copy_a532cn_k$.call(this, height, name, tag, width);
    };
    protoOf(WebAssetInfo).toString = function () {
      return (
        'WebAssetInfo(height=' +
        this.height_1 +
        ', name=' +
        this.name_1 +
        ', tag=' +
        this.tag_1 +
        ', width=' +
        this.width_1 +
        ')'
      );
    };
    protoOf(WebAssetInfo).hashCode = function () {
      var result = this.height_1 == null ? 0 : getStringHashCode(this.height_1);
      result = (imul(result, 31) + (this.name_1 == null ? 0 : getStringHashCode(this.name_1))) | 0;
      result = (imul(result, 31) + (this.tag_1 == null ? 0 : getStringHashCode(this.tag_1))) | 0;
      result = (imul(result, 31) + (this.width_1 == null ? 0 : getStringHashCode(this.width_1))) | 0;
      return result;
    };
    protoOf(WebAssetInfo).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof WebAssetInfo)) return false;
      var tmp0_other_with_cast = other instanceof WebAssetInfo ? other : THROW_CCE();
      if (!(this.height_1 == tmp0_other_with_cast.height_1)) return false;
      if (!(this.name_1 == tmp0_other_with_cast.name_1)) return false;
      if (!(this.tag_1 == tmp0_other_with_cast.tag_1)) return false;
      if (!(this.width_1 == tmp0_other_with_cast.width_1)) return false;
      return true;
    };
    function Companion_12() {
      Companion_instance_12 = this;
    }
    protoOf(Companion_12).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_10();
    };
    var Companion_instance_12;
    function Companion_getInstance_12() {
      if (Companion_instance_12 == null) new Companion_12();
      return Companion_instance_12;
    }
    function $serializer_10() {
      $serializer_instance_10 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('com.wire.kalium.logic.data.web.WebAssetMeta', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('duration', false);
      tmp0_serialDesc.addElement_5pzumi_k$('loudness', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_10).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_10).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [get_nullable(LongSerializer_getInstance()), get_nullable(JsonObjectSerializer_getInstance())];
    };
    protoOf($serializer_10).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          LongSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          JsonObjectSerializer_getInstance(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                LongSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                JsonObjectSerializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return WebAssetMeta_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_10).serialize_3q7737_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        LongSerializer_getInstance(),
        value.duration_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        JsonObjectSerializer_getInstance(),
        value.loudness_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_10).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_3q7737_k$(encoder, value instanceof WebAssetMeta ? value : THROW_CCE());
    };
    var $serializer_instance_10;
    function $serializer_getInstance_10() {
      if ($serializer_instance_10 == null) new $serializer_10();
      return $serializer_instance_10;
    }
    function WebAssetMeta_init_$Init$(seen1, duration, loudness, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_10().descriptor_1);
      }
      $this.duration_1 = duration;
      $this.loudness_1 = loudness;
      return $this;
    }
    function WebAssetMeta_init_$Create$(seen1, duration, loudness, serializationConstructorMarker) {
      return WebAssetMeta_init_$Init$(
        seen1,
        duration,
        loudness,
        serializationConstructorMarker,
        objectCreate(protoOf(WebAssetMeta)),
      );
    }
    function WebAssetMeta(duration, loudness) {
      Companion_getInstance_12();
      this.duration_1 = duration;
      this.loudness_1 = loudness;
    }
    protoOf(WebAssetMeta).get_duration_6a6kpp_k$ = function () {
      return this.duration_1;
    };
    protoOf(WebAssetMeta).get_loudness_878w36_k$ = function () {
      return this.loudness_1;
    };
    protoOf(WebAssetMeta).component1_7eebsc_k$ = function () {
      return this.duration_1;
    };
    protoOf(WebAssetMeta).component2_7eebsb_k$ = function () {
      return this.loudness_1;
    };
    protoOf(WebAssetMeta).copy_967zql_k$ = function (duration, loudness) {
      return new WebAssetMeta(duration, loudness);
    };
    protoOf(WebAssetMeta).copy$default_7guel_k$ = function (duration, loudness, $super) {
      duration = duration === VOID ? this.duration_1 : duration;
      loudness = loudness === VOID ? this.loudness_1 : loudness;
      return $super === VOID
        ? this.copy_967zql_k$(duration, loudness)
        : $super.copy_967zql_k$.call(this, duration, loudness);
    };
    protoOf(WebAssetMeta).toString = function () {
      return 'WebAssetMeta(duration=' + toString(this.duration_1) + ', loudness=' + this.loudness_1 + ')';
    };
    protoOf(WebAssetMeta).hashCode = function () {
      var result = this.duration_1 == null ? 0 : this.duration_1.hashCode();
      result = (imul(result, 31) + (this.loudness_1 == null ? 0 : this.loudness_1.hashCode())) | 0;
      return result;
    };
    protoOf(WebAssetMeta).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof WebAssetMeta)) return false;
      var tmp0_other_with_cast = other instanceof WebAssetMeta ? other : THROW_CCE();
      if (!equals(this.duration_1, tmp0_other_with_cast.duration_1)) return false;
      if (!equals(this.loudness_1, tmp0_other_with_cast.loudness_1)) return false;
      return true;
    };
    //region block: post-declaration
    protoOf($serializer).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_0).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_1).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_2).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_3).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_4).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_5).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_6).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_7).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_8).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_9).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_10).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    //endregion
    //region block: init
    VALUE_DOMAIN_SEPARATOR = _Char___init__impl__6a9atx(64);
    //endregion
    return _;
  },
);

//# sourceMappingURL=kalium-data.js.map
