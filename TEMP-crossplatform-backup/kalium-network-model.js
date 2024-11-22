(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define([
      'exports',
      './kotlinx-serialization-kotlinx-serialization-json.js',
      './kotlinx-serialization-kotlinx-serialization-core.js',
      './kotlin-kotlin-stdlib.js',
      './Kotlin-DateTime-library-kotlinx-datetime.js',
      './kalium-util.js',
      './kalium-logger.js',
    ], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlinx-serialization-kotlinx-serialization-json.js'),
      require('./kotlinx-serialization-kotlinx-serialization-core.js'),
      require('./kotlin-kotlin-stdlib.js'),
      require('./Kotlin-DateTime-library-kotlinx-datetime.js'),
      require('./kalium-util.js'),
      require('./kalium-logger.js'),
    );
  else {
    if (typeof this['kotlinx-serialization-kotlinx-serialization-json'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-network-model'. Its dependency 'kotlinx-serialization-kotlinx-serialization-json' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-json' is loaded prior to 'kalium-network-model'.",
      );
    }
    if (typeof this['kotlinx-serialization-kotlinx-serialization-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-network-model'. Its dependency 'kotlinx-serialization-kotlinx-serialization-core' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-core' is loaded prior to 'kalium-network-model'.",
      );
    }
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-network-model'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'kalium-network-model'.",
      );
    }
    if (typeof this['Kotlin-DateTime-library-kotlinx-datetime'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-network-model'. Its dependency 'Kotlin-DateTime-library-kotlinx-datetime' was not found. Please, check whether 'Kotlin-DateTime-library-kotlinx-datetime' is loaded prior to 'kalium-network-model'.",
      );
    }
    if (typeof this['kalium-util'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-network-model'. Its dependency 'kalium-util' was not found. Please, check whether 'kalium-util' is loaded prior to 'kalium-network-model'.",
      );
    }
    if (typeof this['kalium-logger'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-network-model'. Its dependency 'kalium-logger' was not found. Please, check whether 'kalium-logger' is loaded prior to 'kalium-network-model'.",
      );
    }
    root['kalium-network-model'] = factory(
      typeof this['kalium-network-model'] === 'undefined' ? {} : this['kalium-network-model'],
      this['kotlinx-serialization-kotlinx-serialization-json'],
      this['kotlinx-serialization-kotlinx-serialization-core'],
      this['kotlin-kotlin-stdlib'],
      this['Kotlin-DateTime-library-kotlinx-datetime'],
      this['kalium-util'],
      this['kalium-logger'],
    );
  }
})(
  this,
  function (
    _,
    kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json,
    kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core,
    kotlin_kotlin,
    kotlin_org_jetbrains_kotlinx_kotlinx_datetime,
    kotlin_com_wire_util,
    kotlin_com_wire_logger,
  ) {
    'use strict';
    //region block: imports
    var imul = Math.imul;
    var JsonTransformingSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.r;
    var ListSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.u;
    var JsonObject = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.m;
    var SerializationException_init_$Create$ = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.d;
    var JsonArray = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.f;
    var ensureNotNull = kotlin_kotlin.$_$.hh;
    var protoOf = kotlin_kotlin.$_$.dc;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var StringSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.s;
    var LinkedHashMapSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.c2;
    var PluginGeneratedSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.g2;
    var get_nullable = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.w;
    var UnknownFieldException_init_$Create$ = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.e;
    var THROW_CCE = kotlin_kotlin.$_$.qg;
    var typeParametersSerializers = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.y1;
    var GeneratedSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.z1;
    var VOID = kotlin_kotlin.$_$.f;
    var throwMissingFieldException = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.k2;
    var objectCreate = kotlin_kotlin.$_$.bc;
    var getStringHashCode = kotlin_kotlin.$_$.eb;
    var hashCode = kotlin_kotlin.$_$.fb;
    var equals = kotlin_kotlin.$_$.xa;
    var classMeta = kotlin_kotlin.$_$.ta;
    var createAnnotatedEnumSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.i2;
    var LazyThreadSafetyMode_PUBLICATION_getInstance = kotlin_kotlin.$_$.j;
    var lazy = kotlin_kotlin.$_$.mh;
    var SerializerFactory = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.h2;
    var THROW_IAE = kotlin_kotlin.$_$.rg;
    var enumEntries = kotlin_kotlin.$_$.ia;
    var Unit_getInstance = kotlin_kotlin.$_$.k5;
    var Enum = kotlin_kotlin.$_$.eg;
    var InstantIso8601Serializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_datetime.$_$.a;
    var ArrayListSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.w1;
    var emptyList = kotlin_kotlin.$_$.j7;
    var IntSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.q;
    var BooleanSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.p;
    var getBooleanHashCode = kotlin_kotlin.$_$.bb;
    var NoSuchElementException_init_$Create$ = kotlin_kotlin.$_$.e2;
    var LinkedHashSetSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.d2;
    var ULongSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.t;
    var LongSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.r;
    var ULong = kotlin_kotlin.$_$.yg;
    var toString = kotlin_kotlin.$_$.wh;
    var ULong__hashCode_impl_6hv2lb = kotlin_kotlin.$_$.z3;
    var INT_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.g;
    var PrimitiveSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.e1;
    var KSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.s2;
    var get_nullable_0 = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.n1;
    var get_jsonObject = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.y;
    var toMutableMap = kotlin_kotlin.$_$.j9;
    var JsonPrimitive = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.q;
    var JsonNames = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.j;
    var JsonClassDiscriminator = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.g;
    var getKClass = kotlin_kotlin.$_$.d;
    var SealedClassSerializer_init_$Create$ = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.b;
    var listOf = kotlin_kotlin.$_$.f8;
    var Long = kotlin_kotlin.$_$.kg;
    var InlineClassDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.a2;
    var interfaceMeta = kotlin_kotlin.$_$.gb;
    var emptyMap = kotlin_kotlin.$_$.k7;
    var SEALED_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.f;
    var buildSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.l1;
    var isInterface = kotlin_kotlin.$_$.pb;
    var JsonDecoder = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.h;
    var getKClassFromExpression = kotlin_kotlin.$_$.c;
    var toString_0 = kotlin_kotlin.$_$.ic;
    var get_int = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_json.$_$.v;
    var toJsonElement = kotlin_com_wire_util.$_$.a;
    var Exception = kotlin_kotlin.$_$.gg;
    var arrayOf = kotlin_kotlin.$_$.eh;
    var createKType = kotlin_kotlin.$_$.a;
    var serializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.a3;
    var buildClassSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.k1;
    var IllegalStateException_init_$Create$ = kotlin_kotlin.$_$.w1;
    var Companion_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.o;
    var SerializersModuleBuilder = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.n2;
    var PolymorphicModuleBuilder = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.m2;
    var noWhenBranchMatchedException = kotlin_kotlin.$_$.oh;
    var get_lastIndex = kotlin_kotlin.$_$.a8;
    var setOf = kotlin_kotlin.$_$.w8;
    var Companion_getInstance_0 = kotlin_com_wire_logger.$_$.c;
    //endregion
    //region block: pre-declaration
    setMetadataFor(CapabilitiesDeserializer, 'CapabilitiesDeserializer', objectMeta, JsonTransformingSerializer);
    setMetadataFor(Companion, 'Companion', objectMeta);
    setMetadataFor($serializer, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ClientDTO, 'ClientDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance});
    setMetadataFor(Companion_0, 'Companion', objectMeta);
    setMetadataFor($serializer_0, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ClientIdDTO, 'ClientIdDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_0});
    setMetadataFor(Companion_1, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(ClientTypeDTO, 'ClientTypeDTO', classMeta, Enum, VOID, VOID, VOID, {0: Companion_getInstance_3});
    setMetadataFor(Companion_2, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(DeviceTypeDTO, 'DeviceTypeDTO', classMeta, Enum, VOID, VOID, VOID, {0: Companion_getInstance_4});
    setMetadataFor(ClientCapabilityDTO, 'ClientCapabilityDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_5,
    });
    setMetadataFor(
      ClientCapabilityDTO$LegalHoldImplicitConsent,
      'LegalHoldImplicitConsent',
      classMeta,
      ClientCapabilityDTO,
    );
    setMetadataFor(Companion_3, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_4, 'Companion', objectMeta);
    setMetadataFor($serializer_1, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConnectionDTO, 'ConnectionDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_1});
    setMetadataFor(Companion_5, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(ConnectionStateDTO, 'ConnectionStateDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_7,
    });
    setMetadataFor(Companion_6, 'Companion', objectMeta);
    setMetadataFor($serializer_2, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationNameUpdateEvent, 'ConversationNameUpdateEvent', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_2,
    });
    setMetadataFor(Companion_7, 'Companion', objectMeta);
    setMetadataFor($serializer_3, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationMembers, 'ConversationMembers', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_3,
    });
    setMetadataFor(Companion_8, 'Companion', objectMeta);
    setMetadataFor($serializer_4, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationMemberRemovedDTO, 'ConversationMemberRemovedDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_4,
    });
    setMetadataFor(Companion_9, 'Companion', objectMeta);
    setMetadataFor($serializer_5, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationRoleChange, 'ConversationRoleChange', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_5,
    });
    setMetadataFor(Companion_10, 'Companion', objectMeta);
    setMetadataFor(Type, 'Type', classMeta, Enum);
    setMetadataFor(Companion_11, 'Companion', objectMeta);
    setMetadataFor($serializer_6, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationResponse, 'ConversationResponse', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_6,
    });
    setMetadataFor(Companion_12, 'Companion', objectMeta);
    setMetadataFor($serializer_7, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationMembersResponse, 'ConversationMembersResponse', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_7,
    });
    setMetadataFor(
      ConversationTypeSerializer,
      'ConversationTypeSerializer',
      classMeta,
      VOID,
      [KSerializer],
      ConversationTypeSerializer,
    );
    setMetadataFor(Companion_13, 'Companion', objectMeta);
    setMetadataFor($serializer_8, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationResponseV6, 'ConversationResponseV6', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_8,
    });
    setMetadataFor(Companion_14, 'Companion', objectMeta);
    setMetadataFor($serializer_9, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_15, 'Companion', objectMeta);
    setMetadataFor($serializer_10, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationMemberDTO, 'ConversationMemberDTO', classMeta);
    setMetadataFor(Self, 'Self', classMeta, ConversationMemberDTO, VOID, VOID, VOID, {0: $serializer_getInstance_9});
    setMetadataFor(Other, 'Other', classMeta, ConversationMemberDTO, VOID, VOID, VOID, {0: $serializer_getInstance_10});
    setMetadataFor(Companion_16, 'Companion', objectMeta);
    setMetadataFor(Companion_17, 'Companion', objectMeta);
    setMetadataFor($serializer_11, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ServiceReferenceDTO, 'ServiceReferenceDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_11,
    });
    setMetadataFor(Companion_18, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(ConvProtocol, 'ConvProtocol', classMeta, Enum, VOID, VOID, VOID, {0: Companion_getInstance_20});
    setMetadataFor(Companion_19, 'Companion', objectMeta);
    setMetadataFor(MutedStatus, 'MutedStatus', classMeta, Enum);
    setMetadataFor(
      MutedStatusSerializer,
      'MutedStatusSerializer',
      classMeta,
      VOID,
      [KSerializer],
      MutedStatusSerializer,
    );
    setMetadataFor(ReceiptModeAsIntSerializer, 'ReceiptModeAsIntSerializer', objectMeta, VOID, [KSerializer]);
    setMetadataFor(Companion_20, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(ReceiptMode, 'ReceiptMode', classMeta, Enum, VOID, VOID, VOID, {0: Companion_getInstance_22});
    setMetadataFor(Companion_21, 'Companion', objectMeta);
    setMetadataFor($serializer_12, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(TypingIndicatorStatusDTO, 'TypingIndicatorStatusDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_12,
    });
    setMetadataFor(Companion_22, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(TypingIndicatorStatus, 'TypingIndicatorStatus', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_24,
    });
    setMetadataFor(Companion_23, 'Companion', objectMeta);
    setMetadataFor($serializer_13, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(
      ConversationInviteLinkResponse,
      'ConversationInviteLinkResponse',
      classMeta,
      VOID,
      VOID,
      VOID,
      VOID,
      {0: $serializer_getInstance_13},
    );
    setMetadataFor(Companion_24, 'Companion', objectMeta);
    setMetadataFor($serializer_14, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationMessageTimerDTO, 'ConversationMessageTimerDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_14,
    });
    setMetadataFor(Companion_25, 'Companion', objectMeta);
    setMetadataFor(ConversationAccessInfoDTO, 'ConversationAccessInfoDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: JsonCorrectingSerializer_getInstance,
    });
    setMetadataFor(JsonCorrectingSerializer, 'JsonCorrectingSerializer', objectMeta, JsonTransformingSerializer);
    setMetadataFor(ConversationAccessInfoDTOSerializer, 'ConversationAccessInfoDTOSerializer', objectMeta, VOID, [
      KSerializer,
    ]);
    setMetadataFor(Companion_26, 'Companion', objectMeta);
    setMetadataFor($serializer_15, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(
      ConversationAccessInfoDTOSurrogate,
      'ConversationAccessInfoDTOSurrogate',
      classMeta,
      VOID,
      VOID,
      VOID,
      VOID,
      {0: $serializer_getInstance_15},
    );
    setMetadataFor(Companion_27, 'Companion', objectMeta);
    setMetadataFor($serializer_16, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationProtocolDTO, 'ConversationProtocolDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_16,
    });
    setMetadataFor(Companion_28, 'Companion', objectMeta);
    setMetadataFor($serializer_17, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConversationReceiptModeDTO, 'ConversationReceiptModeDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_17,
    });
    setMetadataFor(Companion_29, 'Companion', objectMeta);
    setMetadataFor($serializer_18, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_30, 'Companion', objectMeta);
    setMetadataFor($serializer_19, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_31, 'Companion', objectMeta);
    setMetadataFor($serializer_20, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_32, 'Companion', objectMeta);
    setMetadataFor($serializer_21, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_33, 'Companion', objectMeta);
    setMetadataFor($serializer_22, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_34, 'Companion', objectMeta);
    setMetadataFor($serializer_23, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_35, 'Companion', objectMeta);
    setMetadataFor($serializer_24, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_36, 'Companion', objectMeta);
    setMetadataFor($serializer_25, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_37, 'Companion', objectMeta);
    setMetadataFor($serializer_26, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_38, 'Companion', objectMeta);
    setMetadataFor($serializer_27, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_39, 'Companion', objectMeta);
    setMetadataFor($serializer_28, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_40, 'Companion', objectMeta);
    setMetadataFor($serializer_29, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_41, 'Companion', objectMeta);
    setMetadataFor($serializer_30, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_42, 'Companion', objectMeta);
    setMetadataFor($serializer_31, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_43, 'Companion', objectMeta);
    setMetadataFor($serializer_32, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_44, 'Companion', objectMeta);
    setMetadataFor($serializer_33, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(FeatureConfigData, 'FeatureConfigData', classMeta, VOID, VOID, VOID, VOID, {
      0: Companion_getInstance_47,
    });
    setMetadataFor(Unknown, 'Unknown', classMeta, FeatureConfigData, VOID, VOID, VOID, {0: $serializer_getInstance_18});
    setMetadataFor(AppLock, 'AppLock', classMeta, FeatureConfigData, VOID, VOID, VOID, {0: $serializer_getInstance_19});
    setMetadataFor(ClassifiedDomains, 'ClassifiedDomains', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_20,
    });
    setMetadataFor(ConferenceCalling, 'ConferenceCalling', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_21,
    });
    setMetadataFor(ConversationGuestLinks, 'ConversationGuestLinks', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_22,
    });
    setMetadataFor(DigitalSignatures, 'DigitalSignatures', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_23,
    });
    setMetadataFor(FileSharing, 'FileSharing', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_24,
    });
    setMetadataFor(Legalhold, 'Legalhold', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_25,
    });
    setMetadataFor(SearchVisibility, 'SearchVisibility', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_26,
    });
    setMetadataFor(SelfDeletingMessages, 'SelfDeletingMessages', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_27,
    });
    setMetadataFor(
      SecondFactorPasswordChallenge,
      'SecondFactorPasswordChallenge',
      classMeta,
      FeatureConfigData,
      VOID,
      VOID,
      VOID,
      {0: $serializer_getInstance_28},
    );
    setMetadataFor(SSO, 'SSO', classMeta, FeatureConfigData, VOID, VOID, VOID, {0: $serializer_getInstance_29});
    setMetadataFor(ValidateSAMLEmails, 'ValidateSAMLEmails', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_30,
    });
    setMetadataFor(MLS, 'MLS', classMeta, FeatureConfigData, VOID, VOID, VOID, {0: $serializer_getInstance_31});
    setMetadataFor(E2EI, 'E2EI', classMeta, FeatureConfigData, VOID, VOID, VOID, {0: $serializer_getInstance_32});
    setMetadataFor(MLSMigration, 'MLSMigration', classMeta, FeatureConfigData, VOID, VOID, VOID, {
      0: $serializer_getInstance_33,
    });
    setMetadataFor(Companion_45, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_46, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(FeatureFlagStatusDTO, 'FeatureFlagStatusDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_48,
    });
    setMetadataFor(Companion_47, 'Companion', objectMeta);
    setMetadataFor($serializer_34, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(AppLockConfigDTO, 'AppLockConfigDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_34,
    });
    setMetadataFor(Companion_48, 'Companion', objectMeta);
    setMetadataFor($serializer_35, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ClassifiedDomainsConfigDTO, 'ClassifiedDomainsConfigDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_35,
    });
    setMetadataFor(Companion_49, 'Companion', objectMeta);
    setMetadataFor($serializer_36, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(ConferenceCallingConfigDTO, 'ConferenceCallingConfigDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_36,
    });
    setMetadataFor(Companion_50, 'Companion', objectMeta);
    setMetadataFor($serializer_37, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(SelfDeletingMessagesConfigDTO, 'SelfDeletingMessagesConfigDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_37,
    });
    setMetadataFor(Companion_51, 'Companion', objectMeta);
    setMetadataFor($serializer_38, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(MLSConfigDTO, 'MLSConfigDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_38});
    setMetadataFor(Companion_52, 'Companion', objectMeta);
    setMetadataFor($serializer_39, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(E2EIConfigDTO, 'E2EIConfigDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_39});
    setMetadataFor(Companion_53, 'Companion', objectMeta);
    setMetadataFor($serializer_40, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(MLSMigrationConfigDTO, 'MLSMigrationConfigDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_40,
    });
    setMetadataFor(Companion_54, 'Companion', objectMeta);
    setMetadataFor($serializer_41, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(LastPreKeyDTO, 'LastPreKeyDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_41});
    setMetadataFor(Companion_55, 'Companion', objectMeta);
    setMetadataFor($serializer_42, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_56, 'Companion', objectMeta);
    setMetadataFor($serializer_43, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_57, 'Companion', objectMeta);
    setMetadataFor($serializer_44, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_58, 'Companion', objectMeta);
    setMetadataFor($serializer_45, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_59, 'Companion', objectMeta);
    setMetadataFor($serializer_46, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_60, 'Companion', objectMeta);
    setMetadataFor($serializer_47, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_61, 'Companion', objectMeta);
    setMetadataFor($serializer_48, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_62, 'Companion', objectMeta);
    setMetadataFor($serializer_49, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_63, 'Companion', objectMeta);
    setMetadataFor($serializer_50, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_64, 'Companion', objectMeta);
    setMetadataFor($serializer_51, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_65, 'Companion', objectMeta);
    setMetadataFor($serializer_52, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_66, 'Companion', objectMeta);
    setMetadataFor($serializer_53, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_67, 'Companion', objectMeta);
    setMetadataFor($serializer_54, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_68, 'Companion', objectMeta);
    setMetadataFor($serializer_55, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_69, 'Companion', objectMeta);
    setMetadataFor($serializer_56, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_70, 'Companion', objectMeta);
    setMetadataFor($serializer_57, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(EventContentDTO, 'EventContentDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: Companion_getInstance_98,
    });
    setMetadataFor(Conversation, 'Conversation', classMeta, EventContentDTO, VOID, VOID, VOID, {
      0: Companion_getInstance_73,
    });
    setMetadataFor(NewConversationDTO, 'NewConversationDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_42,
    });
    setMetadataFor(DeletedConversationDTO, 'DeletedConversationDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_43,
    });
    setMetadataFor(ConversationRenameDTO, 'ConversationRenameDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_44,
    });
    setMetadataFor(MemberJoinDTO, 'MemberJoinDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_45,
    });
    setMetadataFor(MemberLeaveDTO, 'MemberLeaveDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_46,
    });
    setMetadataFor(MemberUpdateDTO, 'MemberUpdateDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_47,
    });
    setMetadataFor(ConversationTypingDTO, 'ConversationTypingDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_48,
    });
    setMetadataFor(NewMessageDTO, 'NewMessageDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_49,
    });
    setMetadataFor(AccessUpdate, 'AccessUpdate', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_50,
    });
    setMetadataFor(CodeUpdated, 'CodeUpdated', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_51,
    });
    setMetadataFor(CodeDeleted, 'CodeDeleted', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_52,
    });
    setMetadataFor(ReceiptModeUpdate, 'ReceiptModeUpdate', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_53,
    });
    setMetadataFor(MessageTimerUpdate, 'MessageTimerUpdate', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_54,
    });
    setMetadataFor(NewMLSMessageDTO, 'NewMLSMessageDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_55,
    });
    setMetadataFor(MLSWelcomeDTO, 'MLSWelcomeDTO', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_56,
    });
    setMetadataFor(ProtocolUpdate, 'ProtocolUpdate', classMeta, Conversation, VOID, VOID, VOID, {
      0: $serializer_getInstance_57,
    });
    setMetadataFor(Companion_71, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_72, 'Companion', objectMeta);
    setMetadataFor($serializer_58, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Team, 'Team', classMeta, EventContentDTO, VOID, VOID, VOID, {0: Companion_getInstance_75});
    setMetadataFor(MemberLeave, 'MemberLeave', classMeta, Team, VOID, VOID, VOID, {0: $serializer_getInstance_58});
    setMetadataFor(Companion_73, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_74, 'Companion', objectMeta);
    setMetadataFor($serializer_59, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_75, 'Companion', objectMeta);
    setMetadataFor($serializer_60, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_76, 'Companion', objectMeta);
    setMetadataFor($serializer_61, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_77, 'Companion', objectMeta);
    setMetadataFor($serializer_62, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_78, 'Companion', objectMeta);
    setMetadataFor($serializer_63, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_79, 'Companion', objectMeta);
    setMetadataFor($serializer_64, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_80, 'Companion', objectMeta);
    setMetadataFor($serializer_65, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_81, 'Companion', objectMeta);
    setMetadataFor($serializer_66, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(User, 'User', classMeta, EventContentDTO, VOID, VOID, VOID, {0: Companion_getInstance_84});
    setMetadataFor(NewClientDTO, 'NewClientDTO', classMeta, User, VOID, VOID, VOID, {0: $serializer_getInstance_59});
    setMetadataFor(ClientRemoveDTO, 'ClientRemoveDTO', classMeta, User, VOID, VOID, VOID, {
      0: $serializer_getInstance_60,
    });
    setMetadataFor(UpdateDTO, 'UpdateDTO', classMeta, User, VOID, VOID, VOID, {0: $serializer_getInstance_61});
    setMetadataFor(NewConnectionDTO, 'NewConnectionDTO', classMeta, User, VOID, VOID, VOID, {
      0: $serializer_getInstance_62,
    });
    setMetadataFor(NewLegalHoldRequestDTO, 'NewLegalHoldRequestDTO', classMeta, User, VOID, VOID, VOID, {
      0: $serializer_getInstance_63,
    });
    setMetadataFor(LegalHoldEnabledDTO, 'LegalHoldEnabledDTO', classMeta, User, VOID, VOID, VOID, {
      0: $serializer_getInstance_64,
    });
    setMetadataFor(LegalHoldDisabledDTO, 'LegalHoldDisabledDTO', classMeta, User, VOID, VOID, VOID, {
      0: $serializer_getInstance_65,
    });
    setMetadataFor(UserDeleteDTO, 'UserDeleteDTO', classMeta, User, VOID, VOID, VOID, {0: $serializer_getInstance_66});
    setMetadataFor(Companion_82, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_83, 'Companion', objectMeta);
    setMetadataFor($serializer_67, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_84, 'Companion', objectMeta);
    setMetadataFor($serializer_68, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Federation, 'Federation', classMeta, EventContentDTO, VOID, VOID, VOID, {
      0: Companion_getInstance_87,
    });
    setMetadataFor(FederationDeleteDTO, 'FederationDeleteDTO', classMeta, Federation, VOID, VOID, VOID, {
      0: $serializer_getInstance_67,
    });
    setMetadataFor(
      FederationConnectionRemovedDTO,
      'FederationConnectionRemovedDTO',
      classMeta,
      Federation,
      VOID,
      VOID,
      VOID,
      {0: $serializer_getInstance_68},
    );
    setMetadataFor(Companion_85, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_86, 'Companion', objectMeta);
    setMetadataFor(FeatureConfig, 'FeatureConfig', classMeta, EventContentDTO, VOID, VOID, VOID, {
      0: Companion_getInstance_89,
    });
    setMetadataFor(FeatureConfigUpdatedDTO, 'FeatureConfigUpdatedDTO', classMeta, FeatureConfig, VOID, VOID, VOID, {
      0: JsonCorrectingSerializer_getInstance_0,
    });
    setMetadataFor(Companion_87, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_88, 'Companion', objectMeta);
    setMetadataFor($serializer_69, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_89, 'Companion', objectMeta);
    setMetadataFor($serializer_70, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(UserProperty, 'UserProperty', classMeta, EventContentDTO, VOID, VOID, VOID, {
      0: Companion_getInstance_92,
    });
    setMetadataFor(PropertiesSetDTO, 'PropertiesSetDTO', classMeta, UserProperty, VOID, VOID, VOID, {
      0: $serializer_getInstance_69,
    });
    setMetadataFor(PropertiesDeleteDTO, 'PropertiesDeleteDTO', classMeta, UserProperty, VOID, VOID, VOID, {
      0: $serializer_getInstance_70,
    });
    setMetadataFor(Companion_90, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_91, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(Companion_92, 'Companion', objectMeta);
    setMetadataFor($serializer_71, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_93, 'Companion', objectMeta);
    setMetadataFor($serializer_72, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_94, 'Companion', objectMeta);
    setMetadataFor($serializer_73, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(Companion_95, 'Companion', objectMeta);
    setMetadataFor($serializer_74, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(FieldKeyValue, 'FieldKeyValue', interfaceMeta, VOID, VOID, VOID, VOID, {
      0: FieldKeyValueDeserializer_getInstance,
    });
    setMetadataFor(FieldKeyNumberValue, 'FieldKeyNumberValue', classMeta, VOID, [FieldKeyValue], VOID, VOID, {
      0: $serializer_getInstance_71,
    });
    setMetadataFor(FieldUnknownValue, 'FieldUnknownValue', classMeta, VOID, [FieldKeyValue], VOID, VOID, {
      0: $serializer_getInstance_72,
    });
    setMetadataFor(FieldLabelListValue, 'FieldLabelListValue', classMeta, VOID, [FieldKeyValue], VOID, VOID, {
      0: $serializer_getInstance_73,
    });
    setMetadataFor(Unknown_0, 'Unknown', classMeta, EventContentDTO, VOID, VOID, VOID, {0: $serializer_getInstance_74});
    setMetadataFor(Companion_96, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(JsonCorrectingSerializer_0, 'JsonCorrectingSerializer', objectMeta, JsonTransformingSerializer);
    setMetadataFor(FieldKeyValueDeserializer, 'FieldKeyValueDeserializer', objectMeta, VOID, [KSerializer]);
    setMetadataFor(FeatureConfigUpdatedDTOSerializer, 'FeatureConfigUpdatedDTOSerializer', objectMeta, VOID, [
      KSerializer,
    ]);
    setMetadataFor(Companion_97, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(MemberLeaveReasonDTO, 'MemberLeaveReasonDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_99,
    });
    setMetadataFor(Companion_98, 'Companion', objectMeta);
    setMetadataFor($serializer_75, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(MessageEventData, 'MessageEventData', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_75,
    });
    setMetadataFor(Companion_99, 'Companion', objectMeta);
    setMetadataFor($serializer_76, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(TeamMemberIdData, 'TeamMemberIdData', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_76,
    });
    setMetadataFor(Companion_100, 'Companion', objectMeta);
    setMetadataFor($serializer_77, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(RemoveClientEventData, 'RemoveClientEventData', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_77,
    });
    setMetadataFor(Companion_101, 'Companion', objectMeta);
    setMetadataFor($serializer_78, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(UserUpdateEventData, 'UserUpdateEventData', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_78,
    });
    setMetadataFor(Companion_102, 'Companion', objectMeta);
    setMetadataFor($serializer_79, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(LabelListResponseDTO, 'LabelListResponseDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_79,
    });
    setMetadataFor(Companion_103, 'Companion', objectMeta);
    setMetadataFor($serializer_80, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(LabelDTO, 'LabelDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_80});
    setMetadataFor(LabelTypeDTO, 'LabelTypeDTO', classMeta, Enum);
    setMetadataFor(LabelTypeSerializer, 'LabelTypeSerializer', objectMeta, VOID, [KSerializer]);
    setMetadataFor(Companion_104, 'Companion', objectMeta);
    setMetadataFor($serializer_81, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(MLSPublicKeysDTO, 'MLSPublicKeysDTO', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance_81,
    });
    setMetadataFor(Companion_105, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(ConversationAccessDTO, 'ConversationAccessDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_107,
    });
    setMetadataFor(Companion_106, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(ConversationAccessRoleDTO, 'ConversationAccessRoleDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_108,
    });
    setMetadataFor(Companion_107, 'Companion', objectMeta);
    setMetadataFor($serializer_82, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(QualifiedID, 'QualifiedID', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_82});
    setMetadataFor(Companion_108, 'Companion', objectMeta);
    setMetadataFor($serializer_83, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(UserAssetDTO, 'UserAssetDTO', classMeta, VOID, VOID, VOID, VOID, {0: $serializer_getInstance_83});
    setMetadataFor(Companion_109, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(AssetSizeDTO, 'AssetSizeDTO', classMeta, Enum, VOID, VOID, VOID, {0: Companion_getInstance_111});
    setMetadataFor(Companion_110, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(UserAssetTypeDTO, 'UserAssetTypeDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_112,
    });
    setMetadataFor(Companion_111, 'Companion', objectMeta, VOID, [SerializerFactory]);
    setMetadataFor(SupportedProtocolDTO, 'SupportedProtocolDTO', classMeta, Enum, VOID, VOID, VOID, {
      0: Companion_getInstance_113,
    });
    //endregion
    function CapabilitiesDeserializer() {
      CapabilitiesDeserializer_instance = this;
      JsonTransformingSerializer.call(this, ListSerializer(Companion_getInstance_5().serializer_9w0wvi_k$()));
    }
    protoOf(CapabilitiesDeserializer).transformDeserialize_isl1lf_k$ = function (element) {
      var tmp;
      var tmp_0;
      if (element instanceof JsonObject) {
        tmp_0 = element.containsKey_w445h6_k$('capabilities');
      } else {
        tmp_0 = false;
      }
      if (tmp_0) {
        tmp = ensureNotNull(element.get_6bo4tg_k$('capabilities'));
      } else {
        if (element instanceof JsonArray) {
          tmp = element;
        } else {
          throw SerializationException_init_$Create$('Unexpected JSON format for capabilities');
        }
      }
      return tmp;
    };
    var CapabilitiesDeserializer_instance;
    function CapabilitiesDeserializer_getInstance() {
      if (CapabilitiesDeserializer_instance == null) new CapabilitiesDeserializer();
      return CapabilitiesDeserializer_instance;
    }
    function _get_$childSerializers__r2zwns($this) {
      return $this.$childSerializers_1;
    }
    function Companion() {
      Companion_instance = this;
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
        Companion_getInstance_3().serializer_9w0wvi_k$(),
        Companion_getInstance_4().serializer_9w0wvi_k$(),
        null,
        null,
        new LinkedHashMapSerializer(StringSerializer_getInstance(), StringSerializer_getInstance()),
      ];
    }
    protoOf(Companion).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance();
    };
    var Companion_instance;
    function Companion_getInstance_1() {
      if (Companion_instance == null) new Companion();
      return Companion_instance;
    }
    function $serializer() {
      $serializer_instance = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.client.ClientDTO',
        this,
        10,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('cookie', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('last_active', false);
      tmp0_serialDesc.addElement_5pzumi_k$('model', false);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('type', false);
      tmp0_serialDesc.addElement_5pzumi_k$('class', true);
      tmp0_serialDesc.addElement_5pzumi_k$('capabilities', false);
      tmp0_serialDesc.addElement_5pzumi_k$('label', false);
      tmp0_serialDesc.addElement_5pzumi_k$('mls_public_keys', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_1().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(StringSerializer_getInstance()),
        StringSerializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        StringSerializer_getInstance(),
        tmp0_cached[5],
        tmp0_cached[6],
        CapabilitiesDeserializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(tmp0_cached[9]),
      ];
    };
    protoOf($serializer).deserialize_sy6x50_k$ = function (decoder) {
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
      var tmp12_local8 = null;
      var tmp13_local9 = null;
      var tmp14_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp15_cached = Companion_getInstance_1().$childSerializers_1;
      if (tmp14_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          StringSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp14_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp14_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp14_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 5, tmp15_cached[5], tmp9_local5);
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp14_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 6, tmp15_cached[6], tmp10_local6);
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
        tmp11_local7 = tmp14_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          7,
          CapabilitiesDeserializer_getInstance(),
          tmp11_local7,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 128;
        tmp12_local8 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          8,
          StringSerializer_getInstance(),
          tmp12_local8,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 256;
        tmp13_local9 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          9,
          tmp15_cached[9],
          tmp13_local9,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 512;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp14_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                StringSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp14_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                3,
                StringSerializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp14_input.decodeStringElement_3oenpg_k$(tmp0_desc, 4);
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp14_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 5, tmp15_cached[5], tmp9_local5);
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp14_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                6,
                tmp15_cached[6],
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            case 7:
              tmp11_local7 = tmp14_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                7,
                CapabilitiesDeserializer_getInstance(),
                tmp11_local7,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 128;
              break;
            case 8:
              tmp12_local8 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                8,
                StringSerializer_getInstance(),
                tmp12_local8,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 256;
              break;
            case 9:
              tmp13_local9 = tmp14_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                9,
                tmp15_cached[9],
                tmp13_local9,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 512;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp14_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ClientDTO_init_$Create$(
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
        null,
      );
    };
    protoOf($serializer).serialize_vkjddf_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_1().$childSerializers_1;
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        StringSerializer_getInstance(),
        value.cookie_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.registrationTime_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        StringSerializer_getInstance(),
        value.lastActive_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        3,
        StringSerializer_getInstance(),
        value.model_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.clientId_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 5, tmp2_cached[5], value.type_1);
      if (
        tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 6)
          ? true
          : !value.deviceType_1.equals(DeviceTypeDTO_Unknown_getInstance())
      ) {
        tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 6, tmp2_cached[6], value.deviceType_1);
      }
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        7,
        CapabilitiesDeserializer_getInstance(),
        value.capabilities_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        8,
        StringSerializer_getInstance(),
        value.label_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 9, tmp2_cached[9], value.mlsPublicKeys_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_vkjddf_k$(encoder, value instanceof ClientDTO ? value : THROW_CCE());
    };
    var $serializer_instance;
    function $serializer_getInstance() {
      if ($serializer_instance == null) new $serializer();
      return $serializer_instance;
    }
    function ClientDTO_init_$Init$(
      seen1,
      cookie,
      registrationTime,
      lastActive,
      model,
      clientId,
      type,
      deviceType,
      capabilities,
      label,
      mlsPublicKeys,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(959 === (959 & seen1))) {
        throwMissingFieldException(seen1, 959, $serializer_getInstance().descriptor_1);
      }
      $this.cookie_1 = cookie;
      $this.registrationTime_1 = registrationTime;
      $this.lastActive_1 = lastActive;
      $this.model_1 = model;
      $this.clientId_1 = clientId;
      $this.type_1 = type;
      if (0 === (seen1 & 64)) $this.deviceType_1 = DeviceTypeDTO_Unknown_getInstance();
      else $this.deviceType_1 = deviceType;
      $this.capabilities_1 = capabilities;
      $this.label_1 = label;
      $this.mlsPublicKeys_1 = mlsPublicKeys;
      return $this;
    }
    function ClientDTO_init_$Create$(
      seen1,
      cookie,
      registrationTime,
      lastActive,
      model,
      clientId,
      type,
      deviceType,
      capabilities,
      label,
      mlsPublicKeys,
      serializationConstructorMarker,
    ) {
      return ClientDTO_init_$Init$(
        seen1,
        cookie,
        registrationTime,
        lastActive,
        model,
        clientId,
        type,
        deviceType,
        capabilities,
        label,
        mlsPublicKeys,
        serializationConstructorMarker,
        objectCreate(protoOf(ClientDTO)),
      );
    }
    function ClientDTO(
      cookie,
      registrationTime,
      lastActive,
      model,
      clientId,
      type,
      deviceType,
      capabilities,
      label,
      mlsPublicKeys,
    ) {
      Companion_getInstance_1();
      deviceType = deviceType === VOID ? DeviceTypeDTO_Unknown_getInstance() : deviceType;
      this.cookie_1 = cookie;
      this.registrationTime_1 = registrationTime;
      this.lastActive_1 = lastActive;
      this.model_1 = model;
      this.clientId_1 = clientId;
      this.type_1 = type;
      this.deviceType_1 = deviceType;
      this.capabilities_1 = capabilities;
      this.label_1 = label;
      this.mlsPublicKeys_1 = mlsPublicKeys;
    }
    protoOf(ClientDTO).get_cookie_c06zxp_k$ = function () {
      return this.cookie_1;
    };
    protoOf(ClientDTO).get_registrationTime_pu7njj_k$ = function () {
      return this.registrationTime_1;
    };
    protoOf(ClientDTO).get_lastActive_34hvid_k$ = function () {
      return this.lastActive_1;
    };
    protoOf(ClientDTO).get_model_ivc0lc_k$ = function () {
      return this.model_1;
    };
    protoOf(ClientDTO).get_clientId_gs3e9d_k$ = function () {
      return this.clientId_1;
    };
    protoOf(ClientDTO).get_type_wovaf7_k$ = function () {
      return this.type_1;
    };
    protoOf(ClientDTO).get_deviceType_795fwn_k$ = function () {
      return this.deviceType_1;
    };
    protoOf(ClientDTO).get_capabilities_k242yp_k$ = function () {
      return this.capabilities_1;
    };
    protoOf(ClientDTO).get_label_iuj8p7_k$ = function () {
      return this.label_1;
    };
    protoOf(ClientDTO).get_mlsPublicKeys_u4oz14_k$ = function () {
      return this.mlsPublicKeys_1;
    };
    protoOf(ClientDTO).component1_7eebsc_k$ = function () {
      return this.cookie_1;
    };
    protoOf(ClientDTO).component2_7eebsb_k$ = function () {
      return this.registrationTime_1;
    };
    protoOf(ClientDTO).component3_7eebsa_k$ = function () {
      return this.lastActive_1;
    };
    protoOf(ClientDTO).component4_7eebs9_k$ = function () {
      return this.model_1;
    };
    protoOf(ClientDTO).component5_7eebs8_k$ = function () {
      return this.clientId_1;
    };
    protoOf(ClientDTO).component6_7eebs7_k$ = function () {
      return this.type_1;
    };
    protoOf(ClientDTO).component7_7eebs6_k$ = function () {
      return this.deviceType_1;
    };
    protoOf(ClientDTO).component8_7eebs5_k$ = function () {
      return this.capabilities_1;
    };
    protoOf(ClientDTO).component9_7eebs4_k$ = function () {
      return this.label_1;
    };
    protoOf(ClientDTO).component10_gazzfo_k$ = function () {
      return this.mlsPublicKeys_1;
    };
    protoOf(ClientDTO).copy_im9vry_k$ = function (
      cookie,
      registrationTime,
      lastActive,
      model,
      clientId,
      type,
      deviceType,
      capabilities,
      label,
      mlsPublicKeys,
    ) {
      return new ClientDTO(
        cookie,
        registrationTime,
        lastActive,
        model,
        clientId,
        type,
        deviceType,
        capabilities,
        label,
        mlsPublicKeys,
      );
    };
    protoOf(ClientDTO).copy$default_nc6siu_k$ = function (
      cookie,
      registrationTime,
      lastActive,
      model,
      clientId,
      type,
      deviceType,
      capabilities,
      label,
      mlsPublicKeys,
      $super,
    ) {
      cookie = cookie === VOID ? this.cookie_1 : cookie;
      registrationTime = registrationTime === VOID ? this.registrationTime_1 : registrationTime;
      lastActive = lastActive === VOID ? this.lastActive_1 : lastActive;
      model = model === VOID ? this.model_1 : model;
      clientId = clientId === VOID ? this.clientId_1 : clientId;
      type = type === VOID ? this.type_1 : type;
      deviceType = deviceType === VOID ? this.deviceType_1 : deviceType;
      capabilities = capabilities === VOID ? this.capabilities_1 : capabilities;
      label = label === VOID ? this.label_1 : label;
      mlsPublicKeys = mlsPublicKeys === VOID ? this.mlsPublicKeys_1 : mlsPublicKeys;
      return $super === VOID
        ? this.copy_im9vry_k$(
            cookie,
            registrationTime,
            lastActive,
            model,
            clientId,
            type,
            deviceType,
            capabilities,
            label,
            mlsPublicKeys,
          )
        : $super.copy_im9vry_k$.call(
            this,
            cookie,
            registrationTime,
            lastActive,
            model,
            clientId,
            type,
            deviceType,
            capabilities,
            label,
            mlsPublicKeys,
          );
    };
    protoOf(ClientDTO).toString = function () {
      return (
        'ClientDTO(cookie=' +
        this.cookie_1 +
        ', registrationTime=' +
        this.registrationTime_1 +
        ', lastActive=' +
        this.lastActive_1 +
        ', model=' +
        this.model_1 +
        ', clientId=' +
        this.clientId_1 +
        ', type=' +
        this.type_1 +
        ', deviceType=' +
        this.deviceType_1 +
        ', capabilities=' +
        this.capabilities_1 +
        ', label=' +
        this.label_1 +
        ', mlsPublicKeys=' +
        this.mlsPublicKeys_1 +
        ')'
      );
    };
    protoOf(ClientDTO).hashCode = function () {
      var result = this.cookie_1 == null ? 0 : getStringHashCode(this.cookie_1);
      result = (imul(result, 31) + getStringHashCode(this.registrationTime_1)) | 0;
      result = (imul(result, 31) + (this.lastActive_1 == null ? 0 : getStringHashCode(this.lastActive_1))) | 0;
      result = (imul(result, 31) + (this.model_1 == null ? 0 : getStringHashCode(this.model_1))) | 0;
      result = (imul(result, 31) + getStringHashCode(this.clientId_1)) | 0;
      result = (imul(result, 31) + this.type_1.hashCode()) | 0;
      result = (imul(result, 31) + this.deviceType_1.hashCode()) | 0;
      result = (imul(result, 31) + hashCode(this.capabilities_1)) | 0;
      result = (imul(result, 31) + (this.label_1 == null ? 0 : getStringHashCode(this.label_1))) | 0;
      result = (imul(result, 31) + (this.mlsPublicKeys_1 == null ? 0 : hashCode(this.mlsPublicKeys_1))) | 0;
      return result;
    };
    protoOf(ClientDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ClientDTO)) return false;
      var tmp0_other_with_cast = other instanceof ClientDTO ? other : THROW_CCE();
      if (!(this.cookie_1 == tmp0_other_with_cast.cookie_1)) return false;
      if (!(this.registrationTime_1 === tmp0_other_with_cast.registrationTime_1)) return false;
      if (!(this.lastActive_1 == tmp0_other_with_cast.lastActive_1)) return false;
      if (!(this.model_1 == tmp0_other_with_cast.model_1)) return false;
      if (!(this.clientId_1 === tmp0_other_with_cast.clientId_1)) return false;
      if (!this.type_1.equals(tmp0_other_with_cast.type_1)) return false;
      if (!this.deviceType_1.equals(tmp0_other_with_cast.deviceType_1)) return false;
      if (!equals(this.capabilities_1, tmp0_other_with_cast.capabilities_1)) return false;
      if (!(this.label_1 == tmp0_other_with_cast.label_1)) return false;
      if (!equals(this.mlsPublicKeys_1, tmp0_other_with_cast.mlsPublicKeys_1)) return false;
      return true;
    };
    function Companion_0() {
      Companion_instance_0 = this;
    }
    protoOf(Companion_0).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_0();
    };
    var Companion_instance_0;
    function Companion_getInstance_2() {
      if (Companion_instance_0 == null) new Companion_0();
      return Companion_instance_0;
    }
    function $serializer_0() {
      $serializer_instance_0 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.client.ClientIdDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_0).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_0).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_0).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ClientIdDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_0).serialize_jeda5q_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.clientId_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_0).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_jeda5q_k$(encoder, value instanceof ClientIdDTO ? value : THROW_CCE());
    };
    var $serializer_instance_0;
    function $serializer_getInstance_0() {
      if ($serializer_instance_0 == null) new $serializer_0();
      return $serializer_instance_0;
    }
    function ClientIdDTO_init_$Init$(seen1, clientId, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_0().descriptor_1);
      }
      $this.clientId_1 = clientId;
      return $this;
    }
    function ClientIdDTO_init_$Create$(seen1, clientId, serializationConstructorMarker) {
      return ClientIdDTO_init_$Init$(
        seen1,
        clientId,
        serializationConstructorMarker,
        objectCreate(protoOf(ClientIdDTO)),
      );
    }
    function ClientIdDTO(clientId) {
      Companion_getInstance_2();
      this.clientId_1 = clientId;
    }
    protoOf(ClientIdDTO).get_clientId_gs3e9d_k$ = function () {
      return this.clientId_1;
    };
    protoOf(ClientIdDTO).component1_7eebsc_k$ = function () {
      return this.clientId_1;
    };
    protoOf(ClientIdDTO).copy_a35qlh_k$ = function (clientId) {
      return new ClientIdDTO(clientId);
    };
    protoOf(ClientIdDTO).copy$default_rlijun_k$ = function (clientId, $super) {
      clientId = clientId === VOID ? this.clientId_1 : clientId;
      return $super === VOID ? this.copy_a35qlh_k$(clientId) : $super.copy_a35qlh_k$.call(this, clientId);
    };
    protoOf(ClientIdDTO).toString = function () {
      return 'ClientIdDTO(clientId=' + this.clientId_1 + ')';
    };
    protoOf(ClientIdDTO).hashCode = function () {
      return getStringHashCode(this.clientId_1);
    };
    protoOf(ClientIdDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ClientIdDTO)) return false;
      var tmp0_other_with_cast = other instanceof ClientIdDTO ? other : THROW_CCE();
      if (!(this.clientId_1 === tmp0_other_with_cast.clientId_1)) return false;
      return true;
    };
    function _get_$cachedSerializer__te6jhj($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ClientTypeDTO$Companion$_anonymous__3t28q3() {
      var tmp = values();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['temporary', 'permanent', 'legalhold'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.client.ClientTypeDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var ClientTypeDTO_Temporary_instance;
    var ClientTypeDTO_Permanent_instance;
    var ClientTypeDTO_LegalHold_instance;
    function Companion_1() {
      Companion_instance_1 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ClientTypeDTO$Companion$_anonymous__3t28q3);
    }
    protoOf(Companion_1).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj(this);
    };
    protoOf(Companion_1).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_1;
    function Companion_getInstance_3() {
      ClientTypeDTO_initEntries();
      if (Companion_instance_1 == null) new Companion_1();
      return Companion_instance_1;
    }
    function values() {
      return [
        ClientTypeDTO_Temporary_getInstance(),
        ClientTypeDTO_Permanent_getInstance(),
        ClientTypeDTO_LegalHold_getInstance(),
      ];
    }
    function valueOf(value) {
      switch (value) {
        case 'Temporary':
          return ClientTypeDTO_Temporary_getInstance();
        case 'Permanent':
          return ClientTypeDTO_Permanent_getInstance();
        case 'LegalHold':
          return ClientTypeDTO_LegalHold_getInstance();
        default:
          ClientTypeDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries() {
      if ($ENTRIES == null) $ENTRIES = enumEntries(values());
      return $ENTRIES;
    }
    var ClientTypeDTO_entriesInitialized;
    function ClientTypeDTO_initEntries() {
      if (ClientTypeDTO_entriesInitialized) return Unit_getInstance();
      ClientTypeDTO_entriesInitialized = true;
      ClientTypeDTO_Temporary_instance = new ClientTypeDTO('Temporary', 0);
      ClientTypeDTO_Permanent_instance = new ClientTypeDTO('Permanent', 1);
      ClientTypeDTO_LegalHold_instance = new ClientTypeDTO('LegalHold', 2);
      Companion_getInstance_3();
    }
    var $ENTRIES;
    function ClientTypeDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(ClientTypeDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function _get_$cachedSerializer__te6jhj_0($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function DeviceTypeDTO$Companion$_anonymous__pvu800() {
      var tmp = values_0();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['phone', 'tablet', 'desktop', 'legalhold', 'unknown'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.client.DeviceTypeDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var DeviceTypeDTO_Phone_instance;
    var DeviceTypeDTO_Tablet_instance;
    var DeviceTypeDTO_Desktop_instance;
    var DeviceTypeDTO_LegalHold_instance;
    var DeviceTypeDTO_Unknown_instance;
    function Companion_2() {
      Companion_instance_2 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, DeviceTypeDTO$Companion$_anonymous__pvu800);
    }
    protoOf(Companion_2).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_0(this);
    };
    protoOf(Companion_2).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_2;
    function Companion_getInstance_4() {
      DeviceTypeDTO_initEntries();
      if (Companion_instance_2 == null) new Companion_2();
      return Companion_instance_2;
    }
    function values_0() {
      return [
        DeviceTypeDTO_Phone_getInstance(),
        DeviceTypeDTO_Tablet_getInstance(),
        DeviceTypeDTO_Desktop_getInstance(),
        DeviceTypeDTO_LegalHold_getInstance(),
        DeviceTypeDTO_Unknown_getInstance(),
      ];
    }
    function valueOf_0(value) {
      switch (value) {
        case 'Phone':
          return DeviceTypeDTO_Phone_getInstance();
        case 'Tablet':
          return DeviceTypeDTO_Tablet_getInstance();
        case 'Desktop':
          return DeviceTypeDTO_Desktop_getInstance();
        case 'LegalHold':
          return DeviceTypeDTO_LegalHold_getInstance();
        case 'Unknown':
          return DeviceTypeDTO_Unknown_getInstance();
        default:
          DeviceTypeDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_0() {
      if ($ENTRIES_0 == null) $ENTRIES_0 = enumEntries(values_0());
      return $ENTRIES_0;
    }
    var DeviceTypeDTO_entriesInitialized;
    function DeviceTypeDTO_initEntries() {
      if (DeviceTypeDTO_entriesInitialized) return Unit_getInstance();
      DeviceTypeDTO_entriesInitialized = true;
      DeviceTypeDTO_Phone_instance = new DeviceTypeDTO('Phone', 0);
      DeviceTypeDTO_Tablet_instance = new DeviceTypeDTO('Tablet', 1);
      DeviceTypeDTO_Desktop_instance = new DeviceTypeDTO('Desktop', 2);
      DeviceTypeDTO_LegalHold_instance = new DeviceTypeDTO('LegalHold', 3);
      DeviceTypeDTO_Unknown_instance = new DeviceTypeDTO('Unknown', 4);
      Companion_getInstance_4();
    }
    var $ENTRIES_0;
    function DeviceTypeDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(DeviceTypeDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function _get_$cachedSerializer__te6jhj_1($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ClientCapabilityDTO$Companion$_anonymous__7t33kd() {
      var tmp = values_1();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['legalhold-implicit-consent'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.client.ClientCapabilityDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    function ClientCapabilityDTO$LegalHoldImplicitConsent() {
      ClientCapabilityDTO.call(this, 'LegalHoldImplicitConsent', 0);
      ClientCapabilityDTO_LegalHoldImplicitConsent_instance = this;
    }
    protoOf(ClientCapabilityDTO$LegalHoldImplicitConsent).toString = function () {
      return 'legalhold-implicit-consent';
    };
    var ClientCapabilityDTO_LegalHoldImplicitConsent_instance;
    function Companion_3() {
      Companion_instance_3 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ClientCapabilityDTO$Companion$_anonymous__7t33kd);
    }
    protoOf(Companion_3).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_1(this);
    };
    protoOf(Companion_3).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_3;
    function Companion_getInstance_5() {
      ClientCapabilityDTO_initEntries();
      if (Companion_instance_3 == null) new Companion_3();
      return Companion_instance_3;
    }
    function values_1() {
      return [ClientCapabilityDTO_LegalHoldImplicitConsent_getInstance()];
    }
    function valueOf_1(value) {
      if (value === 'LegalHoldImplicitConsent') return ClientCapabilityDTO_LegalHoldImplicitConsent_getInstance();
      else {
        ClientCapabilityDTO_initEntries();
        THROW_IAE('No enum constant value.');
      }
    }
    function get_entries_1() {
      if ($ENTRIES_1 == null) $ENTRIES_1 = enumEntries(values_1());
      return $ENTRIES_1;
    }
    var ClientCapabilityDTO_entriesInitialized;
    function ClientCapabilityDTO_initEntries() {
      if (ClientCapabilityDTO_entriesInitialized) return Unit_getInstance();
      ClientCapabilityDTO_entriesInitialized = true;
      ClientCapabilityDTO_LegalHoldImplicitConsent_instance = new ClientCapabilityDTO$LegalHoldImplicitConsent();
      Companion_getInstance_5();
    }
    var $ENTRIES_1;
    function ClientCapabilityDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function ClientTypeDTO_Temporary_getInstance() {
      ClientTypeDTO_initEntries();
      return ClientTypeDTO_Temporary_instance;
    }
    function ClientTypeDTO_Permanent_getInstance() {
      ClientTypeDTO_initEntries();
      return ClientTypeDTO_Permanent_instance;
    }
    function ClientTypeDTO_LegalHold_getInstance() {
      ClientTypeDTO_initEntries();
      return ClientTypeDTO_LegalHold_instance;
    }
    function DeviceTypeDTO_Phone_getInstance() {
      DeviceTypeDTO_initEntries();
      return DeviceTypeDTO_Phone_instance;
    }
    function DeviceTypeDTO_Tablet_getInstance() {
      DeviceTypeDTO_initEntries();
      return DeviceTypeDTO_Tablet_instance;
    }
    function DeviceTypeDTO_Desktop_getInstance() {
      DeviceTypeDTO_initEntries();
      return DeviceTypeDTO_Desktop_instance;
    }
    function DeviceTypeDTO_LegalHold_getInstance() {
      DeviceTypeDTO_initEntries();
      return DeviceTypeDTO_LegalHold_instance;
    }
    function DeviceTypeDTO_Unknown_getInstance() {
      DeviceTypeDTO_initEntries();
      return DeviceTypeDTO_Unknown_instance;
    }
    function ClientCapabilityDTO_LegalHoldImplicitConsent_getInstance() {
      ClientCapabilityDTO_initEntries();
      return ClientCapabilityDTO_LegalHoldImplicitConsent_instance;
    }
    function _get_$childSerializers__r2zwns_0($this) {
      return $this.$childSerializers_1;
    }
    function Companion_4() {
      Companion_instance_4 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, null, null, null, null, Companion_getInstance_7().serializer_9w0wvi_k$(), null];
    }
    protoOf(Companion_4).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_1();
    };
    var Companion_instance_4;
    function Companion_getInstance_6() {
      if (Companion_instance_4 == null) new Companion_4();
      return Companion_instance_4;
    }
    function $serializer_1() {
      $serializer_instance_1 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.connection.ConnectionDTO',
        this,
        7,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('last_update', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_to', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.addElement_5pzumi_k$('to', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_1).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_1).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_6().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        InstantIso8601Serializer_getInstance(),
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        tmp0_cached[5],
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
      var tmp9_local5 = null;
      var tmp10_local6 = null;
      var tmp11_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp12_cached = Companion_getInstance_6().$childSerializers_1;
      if (tmp11_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp11_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp11_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_82(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp11_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          4,
          $serializer_getInstance_82(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp11_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 5, tmp12_cached[5], tmp9_local5);
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 6);
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp11_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp11_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp11_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_82(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp11_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                4,
                $serializer_getInstance_82(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp11_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 5, tmp12_cached[5], tmp9_local5);
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 6);
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp11_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConnectionDTO_init_$Create$(
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
    protoOf($serializer_1).serialize_rc8fot_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_6().$childSerializers_1;
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.conversationId_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.from_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.lastUpdate_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        3,
        $serializer_getInstance_82(),
        value.qualifiedConversationId_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        4,
        $serializer_getInstance_82(),
        value.qualifiedToId_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 5, tmp2_cached[5], value.status_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 6, value.toId_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_1).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_rc8fot_k$(encoder, value instanceof ConnectionDTO ? value : THROW_CCE());
    };
    var $serializer_instance_1;
    function $serializer_getInstance_1() {
      if ($serializer_instance_1 == null) new $serializer_1();
      return $serializer_instance_1;
    }
    function ConnectionDTO_init_$Init$(
      seen1,
      conversationId,
      from,
      lastUpdate,
      qualifiedConversationId,
      qualifiedToId,
      status,
      toId,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(127 === (127 & seen1))) {
        throwMissingFieldException(seen1, 127, $serializer_getInstance_1().descriptor_1);
      }
      $this.conversationId_1 = conversationId;
      $this.from_1 = from;
      $this.lastUpdate_1 = lastUpdate;
      $this.qualifiedConversationId_1 = qualifiedConversationId;
      $this.qualifiedToId_1 = qualifiedToId;
      $this.status_1 = status;
      $this.toId_1 = toId;
      return $this;
    }
    function ConnectionDTO_init_$Create$(
      seen1,
      conversationId,
      from,
      lastUpdate,
      qualifiedConversationId,
      qualifiedToId,
      status,
      toId,
      serializationConstructorMarker,
    ) {
      return ConnectionDTO_init_$Init$(
        seen1,
        conversationId,
        from,
        lastUpdate,
        qualifiedConversationId,
        qualifiedToId,
        status,
        toId,
        serializationConstructorMarker,
        objectCreate(protoOf(ConnectionDTO)),
      );
    }
    function ConnectionDTO(conversationId, from, lastUpdate, qualifiedConversationId, qualifiedToId, status, toId) {
      Companion_getInstance_6();
      this.conversationId_1 = conversationId;
      this.from_1 = from;
      this.lastUpdate_1 = lastUpdate;
      this.qualifiedConversationId_1 = qualifiedConversationId;
      this.qualifiedToId_1 = qualifiedToId;
      this.status_1 = status;
      this.toId_1 = toId;
    }
    protoOf(ConnectionDTO).get_conversationId_5n2cxz_k$ = function () {
      return this.conversationId_1;
    };
    protoOf(ConnectionDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(ConnectionDTO).get_lastUpdate_cs99c8_k$ = function () {
      return this.lastUpdate_1;
    };
    protoOf(ConnectionDTO).get_qualifiedConversationId_bhb8wh_k$ = function () {
      return this.qualifiedConversationId_1;
    };
    protoOf(ConnectionDTO).get_qualifiedToId_aog8zb_k$ = function () {
      return this.qualifiedToId_1;
    };
    protoOf(ConnectionDTO).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(ConnectionDTO).get_toId_wov22n_k$ = function () {
      return this.toId_1;
    };
    protoOf(ConnectionDTO).component1_7eebsc_k$ = function () {
      return this.conversationId_1;
    };
    protoOf(ConnectionDTO).component2_7eebsb_k$ = function () {
      return this.from_1;
    };
    protoOf(ConnectionDTO).component3_7eebsa_k$ = function () {
      return this.lastUpdate_1;
    };
    protoOf(ConnectionDTO).component4_7eebs9_k$ = function () {
      return this.qualifiedConversationId_1;
    };
    protoOf(ConnectionDTO).component5_7eebs8_k$ = function () {
      return this.qualifiedToId_1;
    };
    protoOf(ConnectionDTO).component6_7eebs7_k$ = function () {
      return this.status_1;
    };
    protoOf(ConnectionDTO).component7_7eebs6_k$ = function () {
      return this.toId_1;
    };
    protoOf(ConnectionDTO).copy_4n58w6_k$ = function (
      conversationId,
      from,
      lastUpdate,
      qualifiedConversationId,
      qualifiedToId,
      status,
      toId,
    ) {
      return new ConnectionDTO(conversationId, from, lastUpdate, qualifiedConversationId, qualifiedToId, status, toId);
    };
    protoOf(ConnectionDTO).copy$default_yjvavt_k$ = function (
      conversationId,
      from,
      lastUpdate,
      qualifiedConversationId,
      qualifiedToId,
      status,
      toId,
      $super,
    ) {
      conversationId = conversationId === VOID ? this.conversationId_1 : conversationId;
      from = from === VOID ? this.from_1 : from;
      lastUpdate = lastUpdate === VOID ? this.lastUpdate_1 : lastUpdate;
      qualifiedConversationId =
        qualifiedConversationId === VOID ? this.qualifiedConversationId_1 : qualifiedConversationId;
      qualifiedToId = qualifiedToId === VOID ? this.qualifiedToId_1 : qualifiedToId;
      status = status === VOID ? this.status_1 : status;
      toId = toId === VOID ? this.toId_1 : toId;
      return $super === VOID
        ? this.copy_4n58w6_k$(conversationId, from, lastUpdate, qualifiedConversationId, qualifiedToId, status, toId)
        : $super.copy_4n58w6_k$.call(
            this,
            conversationId,
            from,
            lastUpdate,
            qualifiedConversationId,
            qualifiedToId,
            status,
            toId,
          );
    };
    protoOf(ConnectionDTO).toString = function () {
      return (
        'ConnectionDTO(conversationId=' +
        this.conversationId_1 +
        ', from=' +
        this.from_1 +
        ', lastUpdate=' +
        this.lastUpdate_1 +
        ', qualifiedConversationId=' +
        this.qualifiedConversationId_1 +
        ', qualifiedToId=' +
        this.qualifiedToId_1 +
        ', status=' +
        this.status_1 +
        ', toId=' +
        this.toId_1 +
        ')'
      );
    };
    protoOf(ConnectionDTO).hashCode = function () {
      var result = getStringHashCode(this.conversationId_1);
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + this.lastUpdate_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedConversationId_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedToId_1.hashCode()) | 0;
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.toId_1)) | 0;
      return result;
    };
    protoOf(ConnectionDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConnectionDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConnectionDTO ? other : THROW_CCE();
      if (!(this.conversationId_1 === tmp0_other_with_cast.conversationId_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!this.lastUpdate_1.equals(tmp0_other_with_cast.lastUpdate_1)) return false;
      if (!this.qualifiedConversationId_1.equals(tmp0_other_with_cast.qualifiedConversationId_1)) return false;
      if (!this.qualifiedToId_1.equals(tmp0_other_with_cast.qualifiedToId_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      if (!(this.toId_1 === tmp0_other_with_cast.toId_1)) return false;
      return true;
    };
    function _get_$cachedSerializer__te6jhj_2($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ConnectionStateDTO$Companion$_anonymous__r7wow3() {
      var tmp = values_2();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['pending', 'sent', 'blocked', 'ignored', 'cancelled', 'missing-legalhold-consent', 'accepted'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null, null, null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.connection.ConnectionStateDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var ConnectionStateDTO_PENDING_instance;
    var ConnectionStateDTO_SENT_instance;
    var ConnectionStateDTO_BLOCKED_instance;
    var ConnectionStateDTO_IGNORED_instance;
    var ConnectionStateDTO_CANCELLED_instance;
    var ConnectionStateDTO_MISSING_LEGALHOLD_CONSENT_instance;
    var ConnectionStateDTO_ACCEPTED_instance;
    function Companion_5() {
      Companion_instance_5 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ConnectionStateDTO$Companion$_anonymous__r7wow3);
    }
    protoOf(Companion_5).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_2(this);
    };
    protoOf(Companion_5).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_5;
    function Companion_getInstance_7() {
      ConnectionStateDTO_initEntries();
      if (Companion_instance_5 == null) new Companion_5();
      return Companion_instance_5;
    }
    function values_2() {
      return [
        ConnectionStateDTO_PENDING_getInstance(),
        ConnectionStateDTO_SENT_getInstance(),
        ConnectionStateDTO_BLOCKED_getInstance(),
        ConnectionStateDTO_IGNORED_getInstance(),
        ConnectionStateDTO_CANCELLED_getInstance(),
        ConnectionStateDTO_MISSING_LEGALHOLD_CONSENT_getInstance(),
        ConnectionStateDTO_ACCEPTED_getInstance(),
      ];
    }
    function valueOf_2(value) {
      switch (value) {
        case 'PENDING':
          return ConnectionStateDTO_PENDING_getInstance();
        case 'SENT':
          return ConnectionStateDTO_SENT_getInstance();
        case 'BLOCKED':
          return ConnectionStateDTO_BLOCKED_getInstance();
        case 'IGNORED':
          return ConnectionStateDTO_IGNORED_getInstance();
        case 'CANCELLED':
          return ConnectionStateDTO_CANCELLED_getInstance();
        case 'MISSING_LEGALHOLD_CONSENT':
          return ConnectionStateDTO_MISSING_LEGALHOLD_CONSENT_getInstance();
        case 'ACCEPTED':
          return ConnectionStateDTO_ACCEPTED_getInstance();
        default:
          ConnectionStateDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_2() {
      if ($ENTRIES_2 == null) $ENTRIES_2 = enumEntries(values_2());
      return $ENTRIES_2;
    }
    var ConnectionStateDTO_entriesInitialized;
    function ConnectionStateDTO_initEntries() {
      if (ConnectionStateDTO_entriesInitialized) return Unit_getInstance();
      ConnectionStateDTO_entriesInitialized = true;
      ConnectionStateDTO_PENDING_instance = new ConnectionStateDTO('PENDING', 0);
      ConnectionStateDTO_SENT_instance = new ConnectionStateDTO('SENT', 1);
      ConnectionStateDTO_BLOCKED_instance = new ConnectionStateDTO('BLOCKED', 2);
      ConnectionStateDTO_IGNORED_instance = new ConnectionStateDTO('IGNORED', 3);
      ConnectionStateDTO_CANCELLED_instance = new ConnectionStateDTO('CANCELLED', 4);
      ConnectionStateDTO_MISSING_LEGALHOLD_CONSENT_instance = new ConnectionStateDTO('MISSING_LEGALHOLD_CONSENT', 5);
      ConnectionStateDTO_ACCEPTED_instance = new ConnectionStateDTO('ACCEPTED', 6);
      Companion_getInstance_7();
    }
    var $ENTRIES_2;
    function ConnectionStateDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function ConnectionStateDTO_PENDING_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_PENDING_instance;
    }
    function ConnectionStateDTO_SENT_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_SENT_instance;
    }
    function ConnectionStateDTO_BLOCKED_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_BLOCKED_instance;
    }
    function ConnectionStateDTO_IGNORED_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_IGNORED_instance;
    }
    function ConnectionStateDTO_CANCELLED_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_CANCELLED_instance;
    }
    function ConnectionStateDTO_MISSING_LEGALHOLD_CONSENT_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_MISSING_LEGALHOLD_CONSENT_instance;
    }
    function ConnectionStateDTO_ACCEPTED_getInstance() {
      ConnectionStateDTO_initEntries();
      return ConnectionStateDTO_ACCEPTED_instance;
    }
    function Companion_6() {
      Companion_instance_6 = this;
    }
    protoOf(Companion_6).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_2();
    };
    var Companion_instance_6;
    function Companion_getInstance_8() {
      if (Companion_instance_6 == null) new Companion_6();
      return Companion_instance_6;
    }
    function $serializer_2() {
      $serializer_instance_2 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationNameUpdateEvent',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('name', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_2).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_2).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_2).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationNameUpdateEvent_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_2).serialize_j2xk5w_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.conversationName_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_2).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_j2xk5w_k$(encoder, value instanceof ConversationNameUpdateEvent ? value : THROW_CCE());
    };
    var $serializer_instance_2;
    function $serializer_getInstance_2() {
      if ($serializer_instance_2 == null) new $serializer_2();
      return $serializer_instance_2;
    }
    function ConversationNameUpdateEvent_init_$Init$(seen1, conversationName, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_2().descriptor_1);
      }
      $this.conversationName_1 = conversationName;
      return $this;
    }
    function ConversationNameUpdateEvent_init_$Create$(seen1, conversationName, serializationConstructorMarker) {
      return ConversationNameUpdateEvent_init_$Init$(
        seen1,
        conversationName,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationNameUpdateEvent)),
      );
    }
    function ConversationNameUpdateEvent(conversationName) {
      Companion_getInstance_8();
      this.conversationName_1 = conversationName;
    }
    protoOf(ConversationNameUpdateEvent).get_conversationName_mdik53_k$ = function () {
      return this.conversationName_1;
    };
    protoOf(ConversationNameUpdateEvent).component1_7eebsc_k$ = function () {
      return this.conversationName_1;
    };
    protoOf(ConversationNameUpdateEvent).copy_a35qlh_k$ = function (conversationName) {
      return new ConversationNameUpdateEvent(conversationName);
    };
    protoOf(ConversationNameUpdateEvent).copy$default_oax7i9_k$ = function (conversationName, $super) {
      conversationName = conversationName === VOID ? this.conversationName_1 : conversationName;
      return $super === VOID
        ? this.copy_a35qlh_k$(conversationName)
        : $super.copy_a35qlh_k$.call(this, conversationName);
    };
    protoOf(ConversationNameUpdateEvent).toString = function () {
      return 'ConversationNameUpdateEvent(conversationName=' + this.conversationName_1 + ')';
    };
    protoOf(ConversationNameUpdateEvent).hashCode = function () {
      return getStringHashCode(this.conversationName_1);
    };
    protoOf(ConversationNameUpdateEvent).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationNameUpdateEvent)) return false;
      var tmp0_other_with_cast = other instanceof ConversationNameUpdateEvent ? other : THROW_CCE();
      if (!(this.conversationName_1 === tmp0_other_with_cast.conversationName_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_1($this) {
      return $this.$childSerializers_1;
    }
    function Companion_7() {
      Companion_instance_7 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        new ArrayListSerializer(StringSerializer_getInstance()),
        new ArrayListSerializer($serializer_getInstance_10()),
      ];
    }
    protoOf(Companion_7).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_3();
    };
    var Companion_instance_7;
    function Companion_getInstance_9() {
      if (Companion_instance_7 == null) new Companion_7();
      return Companion_instance_7;
    }
    function $serializer_3() {
      $serializer_instance_3 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationMembers',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('user_ids', false);
      tmp0_serialDesc.addElement_5pzumi_k$('users', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_3).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_3).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_9().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [tmp0_cached[0], tmp0_cached[1]];
    };
    protoOf($serializer_3).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_9().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationMembers_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_3).serialize_4ag3nr_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_9().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.userIds_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.users_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_3).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_4ag3nr_k$(encoder, value instanceof ConversationMembers ? value : THROW_CCE());
    };
    var $serializer_instance_3;
    function $serializer_getInstance_3() {
      if ($serializer_instance_3 == null) new $serializer_3();
      return $serializer_instance_3;
    }
    function ConversationMembers_init_$Init$(seen1, userIds, users, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_3().descriptor_1);
      }
      $this.userIds_1 = userIds;
      if (0 === (seen1 & 2)) $this.users_1 = emptyList();
      else $this.users_1 = users;
      return $this;
    }
    function ConversationMembers_init_$Create$(seen1, userIds, users, serializationConstructorMarker) {
      return ConversationMembers_init_$Init$(
        seen1,
        userIds,
        users,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationMembers)),
      );
    }
    function ConversationMembers(userIds, users) {
      Companion_getInstance_9();
      users = users === VOID ? emptyList() : users;
      this.userIds_1 = userIds;
      this.users_1 = users;
    }
    protoOf(ConversationMembers).get_userIds_1622v0_k$ = function () {
      return this.userIds_1;
    };
    protoOf(ConversationMembers).get_users_izsycf_k$ = function () {
      return this.users_1;
    };
    protoOf(ConversationMembers).component1_7eebsc_k$ = function () {
      return this.userIds_1;
    };
    protoOf(ConversationMembers).component2_7eebsb_k$ = function () {
      return this.users_1;
    };
    protoOf(ConversationMembers).copy_5h0gb1_k$ = function (userIds, users) {
      return new ConversationMembers(userIds, users);
    };
    protoOf(ConversationMembers).copy$default_7bg2t9_k$ = function (userIds, users, $super) {
      userIds = userIds === VOID ? this.userIds_1 : userIds;
      users = users === VOID ? this.users_1 : users;
      return $super === VOID ? this.copy_5h0gb1_k$(userIds, users) : $super.copy_5h0gb1_k$.call(this, userIds, users);
    };
    protoOf(ConversationMembers).toString = function () {
      return 'ConversationMembers(userIds=' + this.userIds_1 + ', users=' + this.users_1 + ')';
    };
    protoOf(ConversationMembers).hashCode = function () {
      var result = hashCode(this.userIds_1);
      result = (imul(result, 31) + hashCode(this.users_1)) | 0;
      return result;
    };
    protoOf(ConversationMembers).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationMembers)) return false;
      var tmp0_other_with_cast = other instanceof ConversationMembers ? other : THROW_CCE();
      if (!equals(this.userIds_1, tmp0_other_with_cast.userIds_1)) return false;
      if (!equals(this.users_1, tmp0_other_with_cast.users_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_2($this) {
      return $this.$childSerializers_1;
    }
    function Companion_8() {
      Companion_instance_8 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        new ArrayListSerializer($serializer_getInstance_82()),
        Companion_getInstance_99().serializer_9w0wvi_k$(),
      ];
    }
    protoOf(Companion_8).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_4();
    };
    var Companion_instance_8;
    function Companion_getInstance_10() {
      if (Companion_instance_8 == null) new Companion_8();
      return Companion_instance_8;
    }
    function $serializer_4() {
      $serializer_instance_4 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationMemberRemovedDTO',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_user_ids', false);
      tmp0_serialDesc.addElement_5pzumi_k$('reason', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_4).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_4).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_10().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [tmp0_cached[0], tmp0_cached[1]];
    };
    protoOf($serializer_4).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_10().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationMemberRemovedDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_4).serialize_qtb86d_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_10().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.qualifiedUserIds_1);
      if (
        tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 1)
          ? true
          : !value.reason_1.equals(MemberLeaveReasonDTO_LEFT_getInstance())
      ) {
        tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.reason_1);
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_4).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_qtb86d_k$(encoder, value instanceof ConversationMemberRemovedDTO ? value : THROW_CCE());
    };
    var $serializer_instance_4;
    function $serializer_getInstance_4() {
      if ($serializer_instance_4 == null) new $serializer_4();
      return $serializer_instance_4;
    }
    function ConversationMemberRemovedDTO_init_$Init$(
      seen1,
      qualifiedUserIds,
      reason,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_4().descriptor_1);
      }
      $this.qualifiedUserIds_1 = qualifiedUserIds;
      if (0 === (seen1 & 2)) $this.reason_1 = MemberLeaveReasonDTO_LEFT_getInstance();
      else $this.reason_1 = reason;
      return $this;
    }
    function ConversationMemberRemovedDTO_init_$Create$(
      seen1,
      qualifiedUserIds,
      reason,
      serializationConstructorMarker,
    ) {
      return ConversationMemberRemovedDTO_init_$Init$(
        seen1,
        qualifiedUserIds,
        reason,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationMemberRemovedDTO)),
      );
    }
    function ConversationMemberRemovedDTO(qualifiedUserIds, reason) {
      Companion_getInstance_10();
      reason = reason === VOID ? MemberLeaveReasonDTO_LEFT_getInstance() : reason;
      this.qualifiedUserIds_1 = qualifiedUserIds;
      this.reason_1 = reason;
    }
    protoOf(ConversationMemberRemovedDTO).get_qualifiedUserIds_k8vhx6_k$ = function () {
      return this.qualifiedUserIds_1;
    };
    protoOf(ConversationMemberRemovedDTO).get_reason_iy4m6l_k$ = function () {
      return this.reason_1;
    };
    protoOf(ConversationMemberRemovedDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedUserIds_1;
    };
    protoOf(ConversationMemberRemovedDTO).component2_7eebsb_k$ = function () {
      return this.reason_1;
    };
    protoOf(ConversationMemberRemovedDTO).copy_yq7b6_k$ = function (qualifiedUserIds, reason) {
      return new ConversationMemberRemovedDTO(qualifiedUserIds, reason);
    };
    protoOf(ConversationMemberRemovedDTO).copy$default_yn2j8e_k$ = function (qualifiedUserIds, reason, $super) {
      qualifiedUserIds = qualifiedUserIds === VOID ? this.qualifiedUserIds_1 : qualifiedUserIds;
      reason = reason === VOID ? this.reason_1 : reason;
      return $super === VOID
        ? this.copy_yq7b6_k$(qualifiedUserIds, reason)
        : $super.copy_yq7b6_k$.call(this, qualifiedUserIds, reason);
    };
    protoOf(ConversationMemberRemovedDTO).toString = function () {
      return (
        'ConversationMemberRemovedDTO(qualifiedUserIds=' + this.qualifiedUserIds_1 + ', reason=' + this.reason_1 + ')'
      );
    };
    protoOf(ConversationMemberRemovedDTO).hashCode = function () {
      var result = hashCode(this.qualifiedUserIds_1);
      result = (imul(result, 31) + this.reason_1.hashCode()) | 0;
      return result;
    };
    protoOf(ConversationMemberRemovedDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationMemberRemovedDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationMemberRemovedDTO ? other : THROW_CCE();
      if (!equals(this.qualifiedUserIds_1, tmp0_other_with_cast.qualifiedUserIds_1)) return false;
      if (!this.reason_1.equals(tmp0_other_with_cast.reason_1)) return false;
      return true;
    };
    function Companion_9() {
      Companion_instance_9 = this;
    }
    protoOf(Companion_9).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_5();
    };
    var Companion_instance_9;
    function Companion_getInstance_11() {
      if (Companion_instance_9 == null) new Companion_9();
      return Companion_instance_9;
    }
    function $serializer_5() {
      $serializer_instance_5 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationRoleChange',
        this,
        7,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('target', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_target', false);
      tmp0_serialDesc.addElement_5pzumi_k$('conversation_role', false);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_muted_ref', false);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_muted_status', false);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_archived', false);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_archived_ref', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_5).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_5).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        StringSerializer_getInstance(),
        $serializer_getInstance_82(),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(IntSerializer_getInstance()),
        get_nullable(BooleanSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
      ];
    };
    protoOf($serializer_5).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp4_local0 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp11_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          IntSerializer_getInstance(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          5,
          BooleanSerializer_getInstance(),
          tmp9_local5,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          6,
          StringSerializer_getInstance(),
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
              tmp4_local0 = tmp11_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp11_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                3,
                StringSerializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                IntSerializer_getInstance(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                5,
                BooleanSerializer_getInstance(),
                tmp9_local5,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp11_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                6,
                StringSerializer_getInstance(),
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp11_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationRoleChange_init_$Create$(
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
    protoOf($serializer_5).serialize_e0vm1a_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.user_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedUserId_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        StringSerializer_getInstance(),
        value.role_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        3,
        StringSerializer_getInstance(),
        value.mutedRef_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        4,
        IntSerializer_getInstance(),
        value.mutedStatus_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        5,
        BooleanSerializer_getInstance(),
        value.isArchiving_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        6,
        StringSerializer_getInstance(),
        value.archivedRef_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_5).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_e0vm1a_k$(encoder, value instanceof ConversationRoleChange ? value : THROW_CCE());
    };
    var $serializer_instance_5;
    function $serializer_getInstance_5() {
      if ($serializer_instance_5 == null) new $serializer_5();
      return $serializer_instance_5;
    }
    function ConversationRoleChange_init_$Init$(
      seen1,
      user,
      qualifiedUserId,
      role,
      mutedRef,
      mutedStatus,
      isArchiving,
      archivedRef,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(127 === (127 & seen1))) {
        throwMissingFieldException(seen1, 127, $serializer_getInstance_5().descriptor_1);
      }
      $this.user_1 = user;
      $this.qualifiedUserId_1 = qualifiedUserId;
      $this.role_1 = role;
      $this.mutedRef_1 = mutedRef;
      $this.mutedStatus_1 = mutedStatus;
      $this.isArchiving_1 = isArchiving;
      $this.archivedRef_1 = archivedRef;
      return $this;
    }
    function ConversationRoleChange_init_$Create$(
      seen1,
      user,
      qualifiedUserId,
      role,
      mutedRef,
      mutedStatus,
      isArchiving,
      archivedRef,
      serializationConstructorMarker,
    ) {
      return ConversationRoleChange_init_$Init$(
        seen1,
        user,
        qualifiedUserId,
        role,
        mutedRef,
        mutedStatus,
        isArchiving,
        archivedRef,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationRoleChange)),
      );
    }
    function ConversationRoleChange(user, qualifiedUserId, role, mutedRef, mutedStatus, isArchiving, archivedRef) {
      Companion_getInstance_11();
      this.user_1 = user;
      this.qualifiedUserId_1 = qualifiedUserId;
      this.role_1 = role;
      this.mutedRef_1 = mutedRef;
      this.mutedStatus_1 = mutedStatus;
      this.isArchiving_1 = isArchiving;
      this.archivedRef_1 = archivedRef;
    }
    protoOf(ConversationRoleChange).get_user_wovspg_k$ = function () {
      return this.user_1;
    };
    protoOf(ConversationRoleChange).get_qualifiedUserId_xpstev_k$ = function () {
      return this.qualifiedUserId_1;
    };
    protoOf(ConversationRoleChange).get_role_wotsxr_k$ = function () {
      return this.role_1;
    };
    protoOf(ConversationRoleChange).get_mutedRef_hfnnkf_k$ = function () {
      return this.mutedRef_1;
    };
    protoOf(ConversationRoleChange).get_mutedStatus_oz0fn0_k$ = function () {
      return this.mutedStatus_1;
    };
    protoOf(ConversationRoleChange).get_isArchiving_5ty2rw_k$ = function () {
      return this.isArchiving_1;
    };
    protoOf(ConversationRoleChange).get_archivedRef_vbttk8_k$ = function () {
      return this.archivedRef_1;
    };
    protoOf(ConversationRoleChange).component1_7eebsc_k$ = function () {
      return this.user_1;
    };
    protoOf(ConversationRoleChange).component2_7eebsb_k$ = function () {
      return this.qualifiedUserId_1;
    };
    protoOf(ConversationRoleChange).component3_7eebsa_k$ = function () {
      return this.role_1;
    };
    protoOf(ConversationRoleChange).component4_7eebs9_k$ = function () {
      return this.mutedRef_1;
    };
    protoOf(ConversationRoleChange).component5_7eebs8_k$ = function () {
      return this.mutedStatus_1;
    };
    protoOf(ConversationRoleChange).component6_7eebs7_k$ = function () {
      return this.isArchiving_1;
    };
    protoOf(ConversationRoleChange).component7_7eebs6_k$ = function () {
      return this.archivedRef_1;
    };
    protoOf(ConversationRoleChange).copy_ha86vu_k$ = function (
      user,
      qualifiedUserId,
      role,
      mutedRef,
      mutedStatus,
      isArchiving,
      archivedRef,
    ) {
      return new ConversationRoleChange(user, qualifiedUserId, role, mutedRef, mutedStatus, isArchiving, archivedRef);
    };
    protoOf(ConversationRoleChange).copy$default_snhmly_k$ = function (
      user,
      qualifiedUserId,
      role,
      mutedRef,
      mutedStatus,
      isArchiving,
      archivedRef,
      $super,
    ) {
      user = user === VOID ? this.user_1 : user;
      qualifiedUserId = qualifiedUserId === VOID ? this.qualifiedUserId_1 : qualifiedUserId;
      role = role === VOID ? this.role_1 : role;
      mutedRef = mutedRef === VOID ? this.mutedRef_1 : mutedRef;
      mutedStatus = mutedStatus === VOID ? this.mutedStatus_1 : mutedStatus;
      isArchiving = isArchiving === VOID ? this.isArchiving_1 : isArchiving;
      archivedRef = archivedRef === VOID ? this.archivedRef_1 : archivedRef;
      return $super === VOID
        ? this.copy_ha86vu_k$(user, qualifiedUserId, role, mutedRef, mutedStatus, isArchiving, archivedRef)
        : $super.copy_ha86vu_k$.call(
            this,
            user,
            qualifiedUserId,
            role,
            mutedRef,
            mutedStatus,
            isArchiving,
            archivedRef,
          );
    };
    protoOf(ConversationRoleChange).toString = function () {
      return (
        'ConversationRoleChange(user=' +
        this.user_1 +
        ', qualifiedUserId=' +
        this.qualifiedUserId_1 +
        ', role=' +
        this.role_1 +
        ', mutedRef=' +
        this.mutedRef_1 +
        ', mutedStatus=' +
        this.mutedStatus_1 +
        ', isArchiving=' +
        this.isArchiving_1 +
        ', archivedRef=' +
        this.archivedRef_1 +
        ')'
      );
    };
    protoOf(ConversationRoleChange).hashCode = function () {
      var result = getStringHashCode(this.user_1);
      result = (imul(result, 31) + this.qualifiedUserId_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.role_1 == null ? 0 : getStringHashCode(this.role_1))) | 0;
      result = (imul(result, 31) + (this.mutedRef_1 == null ? 0 : getStringHashCode(this.mutedRef_1))) | 0;
      result = (imul(result, 31) + (this.mutedStatus_1 == null ? 0 : this.mutedStatus_1)) | 0;
      result = (imul(result, 31) + (this.isArchiving_1 == null ? 0 : getBooleanHashCode(this.isArchiving_1))) | 0;
      result = (imul(result, 31) + (this.archivedRef_1 == null ? 0 : getStringHashCode(this.archivedRef_1))) | 0;
      return result;
    };
    protoOf(ConversationRoleChange).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationRoleChange)) return false;
      var tmp0_other_with_cast = other instanceof ConversationRoleChange ? other : THROW_CCE();
      if (!(this.user_1 === tmp0_other_with_cast.user_1)) return false;
      if (!this.qualifiedUserId_1.equals(tmp0_other_with_cast.qualifiedUserId_1)) return false;
      if (!(this.role_1 == tmp0_other_with_cast.role_1)) return false;
      if (!(this.mutedRef_1 == tmp0_other_with_cast.mutedRef_1)) return false;
      if (!(this.mutedStatus_1 == tmp0_other_with_cast.mutedStatus_1)) return false;
      if (!(this.isArchiving_1 == tmp0_other_with_cast.isArchiving_1)) return false;
      if (!(this.archivedRef_1 == tmp0_other_with_cast.archivedRef_1)) return false;
      return true;
    };
    var Type_GROUP_instance;
    var Type_SELF_instance;
    var Type_ONE_TO_ONE_instance;
    var Type_WAIT_FOR_CONNECTION_instance;
    function Companion_10() {
      Companion_instance_10 = this;
    }
    protoOf(Companion_10).fromId_bmuxjn_k$ = function (id) {
      var tmp$ret$1;
      $l$block: {
        // Inline function 'kotlin.collections.first' call
        var indexedObject = values_3();
        var inductionVariable = 0;
        var last = indexedObject.length;
        while (inductionVariable < last) {
          var element = indexedObject[inductionVariable];
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'com.wire.kalium.network.api.authenticated.conversation.Companion.fromId.<anonymous>' call
          if (element.id_1 === id) {
            tmp$ret$1 = element;
            break $l$block;
          }
        }
        throw NoSuchElementException_init_$Create$('Array contains no element matching the predicate.');
      }
      return tmp$ret$1;
    };
    var Companion_instance_10;
    function Companion_getInstance_12() {
      Type_initEntries();
      if (Companion_instance_10 == null) new Companion_10();
      return Companion_instance_10;
    }
    function values_3() {
      return [
        Type_GROUP_getInstance(),
        Type_SELF_getInstance(),
        Type_ONE_TO_ONE_getInstance(),
        Type_WAIT_FOR_CONNECTION_getInstance(),
      ];
    }
    function valueOf_3(value) {
      switch (value) {
        case 'GROUP':
          return Type_GROUP_getInstance();
        case 'SELF':
          return Type_SELF_getInstance();
        case 'ONE_TO_ONE':
          return Type_ONE_TO_ONE_getInstance();
        case 'WAIT_FOR_CONNECTION':
          return Type_WAIT_FOR_CONNECTION_getInstance();
        default:
          Type_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_3() {
      if ($ENTRIES_3 == null) $ENTRIES_3 = enumEntries(values_3());
      return $ENTRIES_3;
    }
    var Type_entriesInitialized;
    function Type_initEntries() {
      if (Type_entriesInitialized) return Unit_getInstance();
      Type_entriesInitialized = true;
      Type_GROUP_instance = new Type('GROUP', 0, 0);
      Type_SELF_instance = new Type('SELF', 1, 1);
      Type_ONE_TO_ONE_instance = new Type('ONE_TO_ONE', 2, 2);
      Type_WAIT_FOR_CONNECTION_instance = new Type('WAIT_FOR_CONNECTION', 3, 3);
      Companion_getInstance_12();
    }
    var $ENTRIES_3;
    function _get_$childSerializers__r2zwns_3($this) {
      return $this.$childSerializers_1;
    }
    function Type(name, ordinal, id) {
      Enum.call(this, name, ordinal);
      this.id_1 = id;
    }
    protoOf(Type).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    function Companion_11() {
      Companion_instance_11 = this;
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
        new ConversationTypeSerializer(),
        null,
        null,
        Companion_getInstance_20().serializer_9w0wvi_k$(),
        null,
        null,
        new LinkedHashSetSerializer(Companion_getInstance_107().serializer_9w0wvi_k$()),
        new LinkedHashSetSerializer(Companion_getInstance_108().serializer_9w0wvi_k$()),
        null,
        null,
      ];
    }
    protoOf(Companion_11).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_6();
    };
    var Companion_instance_11;
    function Companion_getInstance_13() {
      if (Companion_instance_11 == null) new Companion_11();
      return Companion_instance_11;
    }
    function $serializer_6() {
      $serializer_instance_6 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationResponse',
        this,
        16,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('creator', false);
      tmp0_serialDesc.addElement_5pzumi_k$('members', false);
      tmp0_serialDesc.addElement_5pzumi_k$('name', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('group_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('epoch', false);
      tmp0_serialDesc.addElement_5pzumi_k$('type', false);
      tmp0_serialDesc.addElement_5pzumi_k$('message_timer', false);
      tmp0_serialDesc.addElement_5pzumi_k$('team', false);
      tmp0_serialDesc.addElement_5pzumi_k$('protocol', false);
      tmp0_serialDesc.addElement_5pzumi_k$('last_event_time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('cipher_suite', false);
      tmp0_serialDesc.addElement_5pzumi_k$('access', false);
      tmp0_serialDesc.addElement_5pzumi_k$('access_role_v2', false);
      tmp0_serialDesc.addElement_5pzumi_k$('receipt_mode', false);
      tmp0_serialDesc.addElement_5pzumi_k$('public_keys', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_6).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_6).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_13().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(StringSerializer_getInstance()),
        $serializer_getInstance_7(),
        get_nullable(StringSerializer_getInstance()),
        $serializer_getInstance_82(),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(ULongSerializer_getInstance()),
        tmp0_cached[6],
        get_nullable(LongSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        tmp0_cached[9],
        StringSerializer_getInstance(),
        get_nullable(IntSerializer_getInstance()),
        tmp0_cached[12],
        get_nullable(tmp0_cached[13]),
        ReceiptModeAsIntSerializer_getInstance(),
        get_nullable($serializer_getInstance_81()),
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
      var tmp7_local3 = null;
      var tmp8_local4 = null;
      var tmp9_local5 = null;
      var tmp10_local6 = null;
      var tmp11_local7 = null;
      var tmp12_local8 = null;
      var tmp13_local9 = null;
      var tmp14_local10 = null;
      var tmp15_local11 = null;
      var tmp16_local12 = null;
      var tmp17_local13 = null;
      var tmp18_local14 = null;
      var tmp19_local15 = null;
      var tmp20_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp21_cached = Companion_getInstance_13().$childSerializers_1;
      if (tmp20_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          StringSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp20_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_7(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp20_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_82(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        var tmp = ULongSerializer_getInstance();
        var tmp_0 = tmp9_local5;
        var tmp_1 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          5,
          tmp,
          tmp_0 == null ? null : new ULong(tmp_0),
        );
        tmp9_local5 = tmp_1 == null ? null : tmp_1.data_1;
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp20_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 6, tmp21_cached[6], tmp10_local6);
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
        tmp11_local7 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          7,
          LongSerializer_getInstance(),
          tmp11_local7,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 128;
        tmp12_local8 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          8,
          StringSerializer_getInstance(),
          tmp12_local8,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 256;
        tmp13_local9 = tmp20_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 9, tmp21_cached[9], tmp13_local9);
        tmp3_bitMask0 = tmp3_bitMask0 | 512;
        tmp14_local10 = tmp20_input.decodeStringElement_3oenpg_k$(tmp0_desc, 10);
        tmp3_bitMask0 = tmp3_bitMask0 | 1024;
        tmp15_local11 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          11,
          IntSerializer_getInstance(),
          tmp15_local11,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2048;
        tmp16_local12 = tmp20_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 12, tmp21_cached[12], tmp16_local12);
        tmp3_bitMask0 = tmp3_bitMask0 | 4096;
        tmp17_local13 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          13,
          tmp21_cached[13],
          tmp17_local13,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8192;
        tmp18_local14 = tmp20_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          14,
          ReceiptModeAsIntSerializer_getInstance(),
          tmp18_local14,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16384;
        tmp19_local15 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          15,
          $serializer_getInstance_81(),
          tmp19_local15,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 32768;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp20_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                StringSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp20_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_7(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp20_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_82(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                StringSerializer_getInstance(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              var tmp_2 = ULongSerializer_getInstance();
              var tmp_3 = tmp9_local5;
              var tmp_4 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                5,
                tmp_2,
                tmp_3 == null ? null : new ULong(tmp_3),
              );
              tmp9_local5 = tmp_4 == null ? null : tmp_4.data_1;
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp20_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                6,
                tmp21_cached[6],
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            case 7:
              tmp11_local7 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                7,
                LongSerializer_getInstance(),
                tmp11_local7,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 128;
              break;
            case 8:
              tmp12_local8 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                8,
                StringSerializer_getInstance(),
                tmp12_local8,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 256;
              break;
            case 9:
              tmp13_local9 = tmp20_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                9,
                tmp21_cached[9],
                tmp13_local9,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 512;
              break;
            case 10:
              tmp14_local10 = tmp20_input.decodeStringElement_3oenpg_k$(tmp0_desc, 10);
              tmp3_bitMask0 = tmp3_bitMask0 | 1024;
              break;
            case 11:
              tmp15_local11 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                11,
                IntSerializer_getInstance(),
                tmp15_local11,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2048;
              break;
            case 12:
              tmp16_local12 = tmp20_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                12,
                tmp21_cached[12],
                tmp16_local12,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4096;
              break;
            case 13:
              tmp17_local13 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                13,
                tmp21_cached[13],
                tmp17_local13,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8192;
              break;
            case 14:
              tmp18_local14 = tmp20_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                14,
                ReceiptModeAsIntSerializer_getInstance(),
                tmp18_local14,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16384;
              break;
            case 15:
              tmp19_local15 = tmp20_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                15,
                $serializer_getInstance_81(),
                tmp19_local15,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 32768;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp20_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationResponse_init_$Create$(
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
        tmp16_local12,
        tmp17_local13,
        tmp18_local14,
        tmp19_local15,
        null,
      );
    };
    protoOf($serializer_6).serialize_glnh71_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_13().$childSerializers_1;
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        StringSerializer_getInstance(),
        value.creator_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_7(), value.members_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        StringSerializer_getInstance(),
        value.name_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 3, $serializer_getInstance_82(), value.id_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        4,
        StringSerializer_getInstance(),
        value.groupId_1,
      );
      var tmp = ULongSerializer_getInstance();
      var tmp_0 = value.epoch_1;
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        5,
        tmp,
        tmp_0 == null ? null : new ULong(tmp_0),
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 6, tmp2_cached[6], value.type_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        7,
        LongSerializer_getInstance(),
        value.messageTimer_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        8,
        StringSerializer_getInstance(),
        value.teamId_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 9, tmp2_cached[9], value.protocol_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 10, value.lastEventTime_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        11,
        IntSerializer_getInstance(),
        value.mlsCipherSuiteTag_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 12, tmp2_cached[12], value.access_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 13, tmp2_cached[13], value.accessRole_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        14,
        ReceiptModeAsIntSerializer_getInstance(),
        value.receiptMode_1,
      );
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 15) ? true : !(value.publicKeys_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          15,
          $serializer_getInstance_81(),
          value.publicKeys_1,
        );
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_6).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_glnh71_k$(encoder, value instanceof ConversationResponse ? value : THROW_CCE());
    };
    var $serializer_instance_6;
    function $serializer_getInstance_6() {
      if ($serializer_instance_6 == null) new $serializer_6();
      return $serializer_instance_6;
    }
    function ConversationResponse_init_$Init$(
      seen1,
      creator,
      members,
      name,
      id,
      groupId,
      epoch,
      type,
      messageTimer,
      teamId,
      protocol,
      lastEventTime,
      mlsCipherSuiteTag,
      access,
      accessRole,
      receiptMode,
      publicKeys,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(32767 === (32767 & seen1))) {
        throwMissingFieldException(seen1, 32767, $serializer_getInstance_6().descriptor_1);
      }
      $this.creator_1 = creator;
      $this.members_1 = members;
      $this.name_1 = name;
      $this.id_1 = id;
      $this.groupId_1 = groupId;
      $this.epoch_1 = epoch;
      $this.type_1 = type;
      $this.messageTimer_1 = messageTimer;
      $this.teamId_1 = teamId;
      $this.protocol_1 = protocol;
      $this.lastEventTime_1 = lastEventTime;
      $this.mlsCipherSuiteTag_1 = mlsCipherSuiteTag;
      $this.access_1 = access;
      $this.accessRole_1 = accessRole;
      $this.receiptMode_1 = receiptMode;
      if (0 === (seen1 & 32768)) $this.publicKeys_1 = null;
      else $this.publicKeys_1 = publicKeys;
      return $this;
    }
    function ConversationResponse_init_$Create$(
      seen1,
      creator,
      members,
      name,
      id,
      groupId,
      epoch,
      type,
      messageTimer,
      teamId,
      protocol,
      lastEventTime,
      mlsCipherSuiteTag,
      access,
      accessRole,
      receiptMode,
      publicKeys,
      serializationConstructorMarker,
    ) {
      return ConversationResponse_init_$Init$(
        seen1,
        creator,
        members,
        name,
        id,
        groupId,
        epoch,
        type,
        messageTimer,
        teamId,
        protocol,
        lastEventTime,
        mlsCipherSuiteTag,
        access,
        accessRole,
        receiptMode,
        publicKeys,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationResponse)),
      );
    }
    function Type_GROUP_getInstance() {
      Type_initEntries();
      return Type_GROUP_instance;
    }
    function Type_SELF_getInstance() {
      Type_initEntries();
      return Type_SELF_instance;
    }
    function Type_ONE_TO_ONE_getInstance() {
      Type_initEntries();
      return Type_ONE_TO_ONE_instance;
    }
    function Type_WAIT_FOR_CONNECTION_getInstance() {
      Type_initEntries();
      return Type_WAIT_FOR_CONNECTION_instance;
    }
    function ConversationResponse(
      creator,
      members,
      name,
      id,
      groupId,
      epoch,
      type,
      messageTimer,
      teamId,
      protocol,
      lastEventTime,
      mlsCipherSuiteTag,
      access,
      accessRole,
      receiptMode,
      publicKeys,
    ) {
      Companion_getInstance_13();
      publicKeys = publicKeys === VOID ? null : publicKeys;
      this.creator_1 = creator;
      this.members_1 = members;
      this.name_1 = name;
      this.id_1 = id;
      this.groupId_1 = groupId;
      this.epoch_1 = epoch;
      this.type_1 = type;
      this.messageTimer_1 = messageTimer;
      this.teamId_1 = teamId;
      this.protocol_1 = protocol;
      this.lastEventTime_1 = lastEventTime;
      this.mlsCipherSuiteTag_1 = mlsCipherSuiteTag;
      this.access_1 = access;
      this.accessRole_1 = accessRole;
      this.receiptMode_1 = receiptMode;
      this.publicKeys_1 = publicKeys;
    }
    protoOf(ConversationResponse).get_creator_i9xg03_k$ = function () {
      return this.creator_1;
    };
    protoOf(ConversationResponse).get_members_gyhru8_k$ = function () {
      return this.members_1;
    };
    protoOf(ConversationResponse).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(ConversationResponse).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(ConversationResponse).get_groupId_6494pd_k$ = function () {
      return this.groupId_1;
    };
    protoOf(ConversationResponse).get_epoch_vdt1ye_k$ = function () {
      return this.epoch_1;
    };
    protoOf(ConversationResponse).get_type_wovaf7_k$ = function () {
      return this.type_1;
    };
    protoOf(ConversationResponse).get_messageTimer_gwdjy1_k$ = function () {
      return this.messageTimer_1;
    };
    protoOf(ConversationResponse).get_teamId_jw7plt_k$ = function () {
      return this.teamId_1;
    };
    protoOf(ConversationResponse).get_protocol_mv93kx_k$ = function () {
      return this.protocol_1;
    };
    protoOf(ConversationResponse).get_lastEventTime_udd40o_k$ = function () {
      return this.lastEventTime_1;
    };
    protoOf(ConversationResponse).get_mlsCipherSuiteTag_hhapco_k$ = function () {
      return this.mlsCipherSuiteTag_1;
    };
    protoOf(ConversationResponse).get_access_avafzh_k$ = function () {
      return this.access_1;
    };
    protoOf(ConversationResponse).get_accessRole_vywdxf_k$ = function () {
      return this.accessRole_1;
    };
    protoOf(ConversationResponse).get_receiptMode_ni9xf2_k$ = function () {
      return this.receiptMode_1;
    };
    protoOf(ConversationResponse).get_publicKeys_bbgsqu_k$ = function () {
      return this.publicKeys_1;
    };
    protoOf(ConversationResponse).toV6_24evv_k$ = function () {
      var tmp0_elvis_lhs = this.publicKeys_1;
      return new ConversationResponseV6(this, tmp0_elvis_lhs == null ? new MLSPublicKeysDTO(null) : tmp0_elvis_lhs);
    };
    protoOf(ConversationResponse).component1_7eebsc_k$ = function () {
      return this.creator_1;
    };
    protoOf(ConversationResponse).component2_7eebsb_k$ = function () {
      return this.members_1;
    };
    protoOf(ConversationResponse).component3_7eebsa_k$ = function () {
      return this.name_1;
    };
    protoOf(ConversationResponse).component4_7eebs9_k$ = function () {
      return this.id_1;
    };
    protoOf(ConversationResponse).component5_7eebs8_k$ = function () {
      return this.groupId_1;
    };
    protoOf(ConversationResponse).component6_f20xlf_k$ = function () {
      return this.epoch_1;
    };
    protoOf(ConversationResponse).component7_7eebs6_k$ = function () {
      return this.type_1;
    };
    protoOf(ConversationResponse).component8_7eebs5_k$ = function () {
      return this.messageTimer_1;
    };
    protoOf(ConversationResponse).component9_7eebs4_k$ = function () {
      return this.teamId_1;
    };
    protoOf(ConversationResponse).component10_gazzfo_k$ = function () {
      return this.protocol_1;
    };
    protoOf(ConversationResponse).component11_gazzfn_k$ = function () {
      return this.lastEventTime_1;
    };
    protoOf(ConversationResponse).component12_gazzfm_k$ = function () {
      return this.mlsCipherSuiteTag_1;
    };
    protoOf(ConversationResponse).component13_gazzfl_k$ = function () {
      return this.access_1;
    };
    protoOf(ConversationResponse).component14_gazzfk_k$ = function () {
      return this.accessRole_1;
    };
    protoOf(ConversationResponse).component15_gazzfj_k$ = function () {
      return this.receiptMode_1;
    };
    protoOf(ConversationResponse).component16_gazzfi_k$ = function () {
      return this.publicKeys_1;
    };
    protoOf(ConversationResponse).copy_40qlc9_k$ = function (
      creator,
      members,
      name,
      id,
      groupId,
      epoch,
      type,
      messageTimer,
      teamId,
      protocol,
      lastEventTime,
      mlsCipherSuiteTag,
      access,
      accessRole,
      receiptMode,
      publicKeys,
    ) {
      return new ConversationResponse(
        creator,
        members,
        name,
        id,
        groupId,
        epoch,
        type,
        messageTimer,
        teamId,
        protocol,
        lastEventTime,
        mlsCipherSuiteTag,
        access,
        accessRole,
        receiptMode,
        publicKeys,
      );
    };
    protoOf(ConversationResponse).copy$default_vcasxx_k$ = function (
      creator,
      members,
      name,
      id,
      groupId,
      epoch,
      type,
      messageTimer,
      teamId,
      protocol,
      lastEventTime,
      mlsCipherSuiteTag,
      access,
      accessRole,
      receiptMode,
      publicKeys,
      $super,
    ) {
      creator = creator === VOID ? this.creator_1 : creator;
      members = members === VOID ? this.members_1 : members;
      name = name === VOID ? this.name_1 : name;
      id = id === VOID ? this.id_1 : id;
      groupId = groupId === VOID ? this.groupId_1 : groupId;
      epoch = epoch === VOID ? this.epoch_1 : epoch;
      type = type === VOID ? this.type_1 : type;
      messageTimer = messageTimer === VOID ? this.messageTimer_1 : messageTimer;
      teamId = teamId === VOID ? this.teamId_1 : teamId;
      protocol = protocol === VOID ? this.protocol_1 : protocol;
      lastEventTime = lastEventTime === VOID ? this.lastEventTime_1 : lastEventTime;
      mlsCipherSuiteTag = mlsCipherSuiteTag === VOID ? this.mlsCipherSuiteTag_1 : mlsCipherSuiteTag;
      access = access === VOID ? this.access_1 : access;
      accessRole = accessRole === VOID ? this.accessRole_1 : accessRole;
      receiptMode = receiptMode === VOID ? this.receiptMode_1 : receiptMode;
      publicKeys = publicKeys === VOID ? this.publicKeys_1 : publicKeys;
      var tmp;
      if ($super === VOID) {
        tmp = this.copy_40qlc9_k$(
          creator,
          members,
          name,
          id,
          groupId,
          epoch,
          type,
          messageTimer,
          teamId,
          protocol,
          lastEventTime,
          mlsCipherSuiteTag,
          access,
          accessRole,
          receiptMode,
          publicKeys,
        );
      } else {
        var tmp_0 = $super.copy_40qlc9_k$;
        var tmp_1 = epoch;
        tmp = tmp_0.call(
          this,
          creator,
          members,
          name,
          id,
          groupId,
          tmp_1 == null ? null : new ULong(tmp_1),
          type,
          messageTimer,
          teamId,
          protocol,
          lastEventTime,
          mlsCipherSuiteTag,
          access,
          accessRole,
          receiptMode,
          publicKeys,
        );
      }
      return tmp;
    };
    protoOf(ConversationResponse).toString = function () {
      var tmp = this.epoch_1;
      return (
        'ConversationResponse(creator=' +
        this.creator_1 +
        ', members=' +
        this.members_1 +
        ', name=' +
        this.name_1 +
        ', id=' +
        this.id_1 +
        ', groupId=' +
        this.groupId_1 +
        ', epoch=' +
        (tmp == null ? null : new ULong(tmp)) +
        ', type=' +
        this.type_1 +
        ', messageTimer=' +
        toString(this.messageTimer_1) +
        ', teamId=' +
        this.teamId_1 +
        ', protocol=' +
        this.protocol_1 +
        ', lastEventTime=' +
        this.lastEventTime_1 +
        ', mlsCipherSuiteTag=' +
        this.mlsCipherSuiteTag_1 +
        ', access=' +
        this.access_1 +
        ', accessRole=' +
        this.accessRole_1 +
        ', receiptMode=' +
        this.receiptMode_1 +
        ', publicKeys=' +
        this.publicKeys_1 +
        ')'
      );
    };
    protoOf(ConversationResponse).hashCode = function () {
      var result = this.creator_1 == null ? 0 : getStringHashCode(this.creator_1);
      result = (imul(result, 31) + this.members_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.name_1 == null ? 0 : getStringHashCode(this.name_1))) | 0;
      result = (imul(result, 31) + this.id_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.groupId_1 == null ? 0 : getStringHashCode(this.groupId_1))) | 0;
      var tmp = imul(result, 31);
      var tmp_0;
      var tmp_1 = this.epoch_1;
      if ((tmp_1 == null ? null : new ULong(tmp_1)) == null) {
        tmp_0 = 0;
      } else {
        tmp_0 = ULong__hashCode_impl_6hv2lb(this.epoch_1);
      }
      result = (tmp + tmp_0) | 0;
      result = (imul(result, 31) + this.type_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.messageTimer_1 == null ? 0 : this.messageTimer_1.hashCode())) | 0;
      result = (imul(result, 31) + (this.teamId_1 == null ? 0 : getStringHashCode(this.teamId_1))) | 0;
      result = (imul(result, 31) + this.protocol_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.lastEventTime_1)) | 0;
      result = (imul(result, 31) + (this.mlsCipherSuiteTag_1 == null ? 0 : this.mlsCipherSuiteTag_1)) | 0;
      result = (imul(result, 31) + hashCode(this.access_1)) | 0;
      result = (imul(result, 31) + (this.accessRole_1 == null ? 0 : hashCode(this.accessRole_1))) | 0;
      result = (imul(result, 31) + this.receiptMode_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.publicKeys_1 == null ? 0 : this.publicKeys_1.hashCode())) | 0;
      return result;
    };
    protoOf(ConversationResponse).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationResponse)) return false;
      var tmp0_other_with_cast = other instanceof ConversationResponse ? other : THROW_CCE();
      if (!(this.creator_1 == tmp0_other_with_cast.creator_1)) return false;
      if (!this.members_1.equals(tmp0_other_with_cast.members_1)) return false;
      if (!(this.name_1 == tmp0_other_with_cast.name_1)) return false;
      if (!this.id_1.equals(tmp0_other_with_cast.id_1)) return false;
      if (!(this.groupId_1 == tmp0_other_with_cast.groupId_1)) return false;
      var tmp = this.epoch_1;
      var tmp_0 = tmp == null ? null : new ULong(tmp);
      var tmp_1 = tmp0_other_with_cast.epoch_1;
      if (!equals(tmp_0, tmp_1 == null ? null : new ULong(tmp_1))) return false;
      if (!this.type_1.equals(tmp0_other_with_cast.type_1)) return false;
      if (!equals(this.messageTimer_1, tmp0_other_with_cast.messageTimer_1)) return false;
      if (!(this.teamId_1 == tmp0_other_with_cast.teamId_1)) return false;
      if (!this.protocol_1.equals(tmp0_other_with_cast.protocol_1)) return false;
      if (!(this.lastEventTime_1 === tmp0_other_with_cast.lastEventTime_1)) return false;
      if (!(this.mlsCipherSuiteTag_1 == tmp0_other_with_cast.mlsCipherSuiteTag_1)) return false;
      if (!equals(this.access_1, tmp0_other_with_cast.access_1)) return false;
      if (!equals(this.accessRole_1, tmp0_other_with_cast.accessRole_1)) return false;
      if (!this.receiptMode_1.equals(tmp0_other_with_cast.receiptMode_1)) return false;
      if (!equals(this.publicKeys_1, tmp0_other_with_cast.publicKeys_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_4($this) {
      return $this.$childSerializers_1;
    }
    function Companion_12() {
      Companion_instance_12 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, new ArrayListSerializer($serializer_getInstance_10())];
    }
    protoOf(Companion_12).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_7();
    };
    var Companion_instance_12;
    function Companion_getInstance_14() {
      if (Companion_instance_12 == null) new Companion_12();
      return Companion_instance_12;
    }
    function $serializer_7() {
      $serializer_instance_7 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationMembersResponse',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('self', false);
      tmp0_serialDesc.addElement_5pzumi_k$('others', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_7).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_7).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_14().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_9(), tmp0_cached[1]];
    };
    protoOf($serializer_7).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_14().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_9(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_9(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationMembersResponse_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_7).serialize_7t1zm0_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_14().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_9(), value.self_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.otherMembers_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_7).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_7t1zm0_k$(encoder, value instanceof ConversationMembersResponse ? value : THROW_CCE());
    };
    var $serializer_instance_7;
    function $serializer_getInstance_7() {
      if ($serializer_instance_7 == null) new $serializer_7();
      return $serializer_instance_7;
    }
    function ConversationMembersResponse_init_$Init$(
      seen1,
      self_0,
      otherMembers,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_7().descriptor_1);
      }
      $this.self_1 = self_0;
      $this.otherMembers_1 = otherMembers;
      return $this;
    }
    function ConversationMembersResponse_init_$Create$(seen1, self_0, otherMembers, serializationConstructorMarker) {
      return ConversationMembersResponse_init_$Init$(
        seen1,
        self_0,
        otherMembers,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationMembersResponse)),
      );
    }
    function ConversationMembersResponse(self_0, otherMembers) {
      Companion_getInstance_14();
      this.self_1 = self_0;
      this.otherMembers_1 = otherMembers;
    }
    protoOf(ConversationMembersResponse).get_self_wou8id_k$ = function () {
      return this.self_1;
    };
    protoOf(ConversationMembersResponse).get_otherMembers_xjt1yq_k$ = function () {
      return this.otherMembers_1;
    };
    protoOf(ConversationMembersResponse).component1_7eebsc_k$ = function () {
      return this.self_1;
    };
    protoOf(ConversationMembersResponse).component2_7eebsb_k$ = function () {
      return this.otherMembers_1;
    };
    protoOf(ConversationMembersResponse).copy_gjn80s_k$ = function (self_0, otherMembers) {
      return new ConversationMembersResponse(self_0, otherMembers);
    };
    protoOf(ConversationMembersResponse).copy$default_2le44z_k$ = function (self_0, otherMembers, $super) {
      self_0 = self_0 === VOID ? this.self_1 : self_0;
      otherMembers = otherMembers === VOID ? this.otherMembers_1 : otherMembers;
      return $super === VOID
        ? this.copy_gjn80s_k$(self_0, otherMembers)
        : $super.copy_gjn80s_k$.call(this, self_0, otherMembers);
    };
    protoOf(ConversationMembersResponse).toString = function () {
      return 'ConversationMembersResponse(self=' + this.self_1 + ', otherMembers=' + this.otherMembers_1 + ')';
    };
    protoOf(ConversationMembersResponse).hashCode = function () {
      var result = this.self_1.hashCode();
      result = (imul(result, 31) + hashCode(this.otherMembers_1)) | 0;
      return result;
    };
    protoOf(ConversationMembersResponse).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationMembersResponse)) return false;
      var tmp0_other_with_cast = other instanceof ConversationMembersResponse ? other : THROW_CCE();
      if (!this.self_1.equals(tmp0_other_with_cast.self_1)) return false;
      if (!equals(this.otherMembers_1, tmp0_other_with_cast.otherMembers_1)) return false;
      return true;
    };
    function ConversationTypeSerializer() {
      this.descriptor_1 = PrimitiveSerialDescriptor('type', INT_getInstance());
    }
    protoOf(ConversationTypeSerializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(ConversationTypeSerializer).serialize_15gtg1_k$ = function (encoder, value) {
      return encoder.encodeInt_y5zi3z_k$(value.id_1);
    };
    protoOf(ConversationTypeSerializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_15gtg1_k$(encoder, value instanceof Type ? value : THROW_CCE());
    };
    protoOf(ConversationTypeSerializer).deserialize_sy6x50_k$ = function (decoder) {
      var rawValue = decoder.decodeInt_8iq8f5_k$();
      return Companion_getInstance_12().fromId_bmuxjn_k$(rawValue);
    };
    function Companion_13() {
      Companion_instance_13 = this;
    }
    protoOf(Companion_13).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_8();
    };
    var Companion_instance_13;
    function Companion_getInstance_15() {
      if (Companion_instance_13 == null) new Companion_13();
      return Companion_instance_13;
    }
    function $serializer_8() {
      $serializer_instance_8 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationResponseV6',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('public_keys', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_8).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_8).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_6(), $serializer_getInstance_81()];
    };
    protoOf($serializer_8).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_6(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_81(),
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
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_6(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_81(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationResponseV6_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_8).serialize_swqzdf_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_6(), value.conversation_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_81(), value.publicKeys_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_8).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_swqzdf_k$(encoder, value instanceof ConversationResponseV6 ? value : THROW_CCE());
    };
    var $serializer_instance_8;
    function $serializer_getInstance_8() {
      if ($serializer_instance_8 == null) new $serializer_8();
      return $serializer_instance_8;
    }
    function ConversationResponseV6_init_$Init$(
      seen1,
      conversation,
      publicKeys,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_8().descriptor_1);
      }
      $this.conversation_1 = conversation;
      $this.publicKeys_1 = publicKeys;
      return $this;
    }
    function ConversationResponseV6_init_$Create$(seen1, conversation, publicKeys, serializationConstructorMarker) {
      return ConversationResponseV6_init_$Init$(
        seen1,
        conversation,
        publicKeys,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationResponseV6)),
      );
    }
    function ConversationResponseV6(conversation, publicKeys) {
      Companion_getInstance_15();
      this.conversation_1 = conversation;
      this.publicKeys_1 = publicKeys;
    }
    protoOf(ConversationResponseV6).get_conversation_gs8dl8_k$ = function () {
      return this.conversation_1;
    };
    protoOf(ConversationResponseV6).get_publicKeys_bbgsqu_k$ = function () {
      return this.publicKeys_1;
    };
    protoOf(ConversationResponseV6).component1_7eebsc_k$ = function () {
      return this.conversation_1;
    };
    protoOf(ConversationResponseV6).component2_7eebsb_k$ = function () {
      return this.publicKeys_1;
    };
    protoOf(ConversationResponseV6).copy_koht55_k$ = function (conversation, publicKeys) {
      return new ConversationResponseV6(conversation, publicKeys);
    };
    protoOf(ConversationResponseV6).copy$default_1oq9uh_k$ = function (conversation, publicKeys, $super) {
      conversation = conversation === VOID ? this.conversation_1 : conversation;
      publicKeys = publicKeys === VOID ? this.publicKeys_1 : publicKeys;
      return $super === VOID
        ? this.copy_koht55_k$(conversation, publicKeys)
        : $super.copy_koht55_k$.call(this, conversation, publicKeys);
    };
    protoOf(ConversationResponseV6).toString = function () {
      return 'ConversationResponseV6(conversation=' + this.conversation_1 + ', publicKeys=' + this.publicKeys_1 + ')';
    };
    protoOf(ConversationResponseV6).hashCode = function () {
      var result = this.conversation_1.hashCode();
      result = (imul(result, 31) + this.publicKeys_1.hashCode()) | 0;
      return result;
    };
    protoOf(ConversationResponseV6).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationResponseV6)) return false;
      var tmp0_other_with_cast = other instanceof ConversationResponseV6 ? other : THROW_CCE();
      if (!this.conversation_1.equals(tmp0_other_with_cast.conversation_1)) return false;
      if (!this.publicKeys_1.equals(tmp0_other_with_cast.publicKeys_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_5($this) {
      return $this.$childSerializers_1;
    }
    function Companion_14() {
      Companion_instance_14 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, null, null, null, null, null, null, null, new MutedStatusSerializer()];
    }
    protoOf(Companion_14).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_9();
    };
    var Companion_instance_14;
    function Companion_getInstance_16() {
      if (Companion_instance_14 == null) new Companion_14();
      return Companion_instance_14;
    }
    function $serializer_9() {
      $serializer_instance_9 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationMemberDTO.Self',
        this,
        9,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('conversation_role', false);
      tmp0_serialDesc.addElement_5pzumi_k$('service', true);
      tmp0_serialDesc.addElement_5pzumi_k$('hidden', true);
      tmp0_serialDesc.addElement_5pzumi_k$('hidden_ref', true);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_archived', true);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_archived_ref', true);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_muted_ref', true);
      tmp0_serialDesc.addElement_5pzumi_k$('otr_muted_status', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_9).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_9).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_16().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        StringSerializer_getInstance(),
        get_nullable($serializer_getInstance_11()),
        get_nullable(BooleanSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(BooleanSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(tmp0_cached[8]),
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
      var tmp8_local4 = null;
      var tmp9_local5 = null;
      var tmp10_local6 = null;
      var tmp11_local7 = null;
      var tmp12_local8 = null;
      var tmp13_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp14_cached = Companion_getInstance_16().$childSerializers_1;
      if (tmp13_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp13_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp13_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_11(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          BooleanSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          5,
          BooleanSerializer_getInstance(),
          tmp9_local5,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          6,
          StringSerializer_getInstance(),
          tmp10_local6,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 64;
        tmp11_local7 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          7,
          StringSerializer_getInstance(),
          tmp11_local7,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 128;
        tmp12_local8 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          8,
          tmp14_cached[8],
          tmp12_local8,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 256;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp13_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp13_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp13_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_11(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                3,
                BooleanSerializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                StringSerializer_getInstance(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                5,
                BooleanSerializer_getInstance(),
                tmp9_local5,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                6,
                StringSerializer_getInstance(),
                tmp10_local6,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 64;
              break;
            case 7:
              tmp11_local7 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                7,
                StringSerializer_getInstance(),
                tmp11_local7,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 128;
              break;
            case 8:
              tmp12_local8 = tmp13_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                8,
                tmp14_cached[8],
                tmp12_local8,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 256;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp13_input.endStructure_1xqz0n_k$(tmp0_desc);
      return Self_init_$Create$(
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
        null,
      );
    };
    protoOf($serializer_9).serialize_br4p2k_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_16().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_82(), value.id_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.conversationRole_1);
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 2) ? true : !(value.service_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_11(),
          value.service_1,
        );
      }
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 3) ? true : !(value.hidden_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          3,
          BooleanSerializer_getInstance(),
          value.hidden_1,
        );
      }
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 4) ? true : !(value.hiddenRef_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          value.hiddenRef_1,
        );
      }
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 5) ? true : !(value.otrArchived_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          5,
          BooleanSerializer_getInstance(),
          value.otrArchived_1,
        );
      }
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 6) ? true : !(value.otrArchivedRef_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          6,
          StringSerializer_getInstance(),
          value.otrArchivedRef_1,
        );
      }
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 7) ? true : !(value.otrMutedRef_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          7,
          StringSerializer_getInstance(),
          value.otrMutedRef_1,
        );
      }
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 8) ? true : !(value.otrMutedStatus_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 8, tmp2_cached[8], value.otrMutedStatus_1);
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_9).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_br4p2k_k$(encoder, value instanceof Self ? value : THROW_CCE());
    };
    var $serializer_instance_9;
    function $serializer_getInstance_9() {
      if ($serializer_instance_9 == null) new $serializer_9();
      return $serializer_instance_9;
    }
    function Self_init_$Init$(
      seen1,
      id,
      conversationRole,
      service,
      hidden,
      hiddenRef,
      otrArchived,
      otrArchivedRef,
      otrMutedRef,
      otrMutedStatus,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_9().descriptor_1);
      }
      ConversationMemberDTO.call($this);
      $this.id_1 = id;
      $this.conversationRole_1 = conversationRole;
      if (0 === (seen1 & 4)) $this.service_1 = null;
      else $this.service_1 = service;
      if (0 === (seen1 & 8)) $this.hidden_1 = null;
      else $this.hidden_1 = hidden;
      if (0 === (seen1 & 16)) $this.hiddenRef_1 = null;
      else $this.hiddenRef_1 = hiddenRef;
      if (0 === (seen1 & 32)) $this.otrArchived_1 = null;
      else $this.otrArchived_1 = otrArchived;
      if (0 === (seen1 & 64)) $this.otrArchivedRef_1 = null;
      else $this.otrArchivedRef_1 = otrArchivedRef;
      if (0 === (seen1 & 128)) $this.otrMutedRef_1 = null;
      else $this.otrMutedRef_1 = otrMutedRef;
      if (0 === (seen1 & 256)) $this.otrMutedStatus_1 = null;
      else $this.otrMutedStatus_1 = otrMutedStatus;
      return $this;
    }
    function Self_init_$Create$(
      seen1,
      id,
      conversationRole,
      service,
      hidden,
      hiddenRef,
      otrArchived,
      otrArchivedRef,
      otrMutedRef,
      otrMutedStatus,
      serializationConstructorMarker,
    ) {
      return Self_init_$Init$(
        seen1,
        id,
        conversationRole,
        service,
        hidden,
        hiddenRef,
        otrArchived,
        otrArchivedRef,
        otrMutedRef,
        otrMutedStatus,
        serializationConstructorMarker,
        objectCreate(protoOf(Self)),
      );
    }
    function Companion_15() {
      Companion_instance_15 = this;
    }
    protoOf(Companion_15).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_10();
    };
    var Companion_instance_15;
    function Companion_getInstance_17() {
      if (Companion_instance_15 == null) new Companion_15();
      return Companion_instance_15;
    }
    function $serializer_10() {
      $serializer_instance_10 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ConversationMemberDTO.Other',
        this,
        3,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('conversation_role', false);
      tmp0_serialDesc.addElement_5pzumi_k$('service', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_10).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_10).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), StringSerializer_getInstance(), get_nullable($serializer_getInstance_11())];
    };
    protoOf($serializer_10).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_11(),
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
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_11(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return Other_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_10).serialize_bia868_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_82(), value.id_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.conversationRole_1);
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 2) ? true : !(value.service_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_11(),
          value.service_1,
        );
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_10).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_bia868_k$(encoder, value instanceof Other ? value : THROW_CCE());
    };
    var $serializer_instance_10;
    function $serializer_getInstance_10() {
      if ($serializer_instance_10 == null) new $serializer_10();
      return $serializer_instance_10;
    }
    function Other_init_$Init$(seen1, id, conversationRole, service, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_10().descriptor_1);
      }
      ConversationMemberDTO.call($this);
      $this.id_1 = id;
      $this.conversationRole_1 = conversationRole;
      if (0 === (seen1 & 4)) $this.service_1 = null;
      else $this.service_1 = service;
      return $this;
    }
    function Other_init_$Create$(seen1, id, conversationRole, service, serializationConstructorMarker) {
      return Other_init_$Init$(
        seen1,
        id,
        conversationRole,
        service,
        serializationConstructorMarker,
        objectCreate(protoOf(Other)),
      );
    }
    function Self(
      id,
      conversationRole,
      service,
      hidden,
      hiddenRef,
      otrArchived,
      otrArchivedRef,
      otrMutedRef,
      otrMutedStatus,
    ) {
      Companion_getInstance_16();
      service = service === VOID ? null : service;
      hidden = hidden === VOID ? null : hidden;
      hiddenRef = hiddenRef === VOID ? null : hiddenRef;
      otrArchived = otrArchived === VOID ? null : otrArchived;
      otrArchivedRef = otrArchivedRef === VOID ? null : otrArchivedRef;
      otrMutedRef = otrMutedRef === VOID ? null : otrMutedRef;
      otrMutedStatus = otrMutedStatus === VOID ? null : otrMutedStatus;
      ConversationMemberDTO.call(this);
      this.id_1 = id;
      this.conversationRole_1 = conversationRole;
      this.service_1 = service;
      this.hidden_1 = hidden;
      this.hiddenRef_1 = hiddenRef;
      this.otrArchived_1 = otrArchived;
      this.otrArchivedRef_1 = otrArchivedRef;
      this.otrMutedRef_1 = otrMutedRef;
      this.otrMutedStatus_1 = otrMutedStatus;
    }
    protoOf(Self).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(Self).get_conversationRole_mdleg2_k$ = function () {
      return this.conversationRole_1;
    };
    protoOf(Self).get_service_y2v8i4_k$ = function () {
      return this.service_1;
    };
    protoOf(Self).get_hidden_e9x67n_k$ = function () {
      return this.hidden_1;
    };
    protoOf(Self).get_hiddenRef_m8x0io_k$ = function () {
      return this.hiddenRef_1;
    };
    protoOf(Self).get_otrArchived_696wg6_k$ = function () {
      return this.otrArchived_1;
    };
    protoOf(Self).get_otrArchivedRef_wpfpjn_k$ = function () {
      return this.otrArchivedRef_1;
    };
    protoOf(Self).get_otrMutedRef_m0smpg_k$ = function () {
      return this.otrMutedRef_1;
    };
    protoOf(Self).get_otrMutedStatus_hz5wrr_k$ = function () {
      return this.otrMutedStatus_1;
    };
    protoOf(Self).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(Self).component2_7eebsb_k$ = function () {
      return this.conversationRole_1;
    };
    protoOf(Self).component3_7eebsa_k$ = function () {
      return this.service_1;
    };
    protoOf(Self).component4_7eebs9_k$ = function () {
      return this.hidden_1;
    };
    protoOf(Self).component5_7eebs8_k$ = function () {
      return this.hiddenRef_1;
    };
    protoOf(Self).component6_7eebs7_k$ = function () {
      return this.otrArchived_1;
    };
    protoOf(Self).component7_7eebs6_k$ = function () {
      return this.otrArchivedRef_1;
    };
    protoOf(Self).component8_7eebs5_k$ = function () {
      return this.otrMutedRef_1;
    };
    protoOf(Self).component9_7eebs4_k$ = function () {
      return this.otrMutedStatus_1;
    };
    protoOf(Self).copy_itxg6g_k$ = function (
      id,
      conversationRole,
      service,
      hidden,
      hiddenRef,
      otrArchived,
      otrArchivedRef,
      otrMutedRef,
      otrMutedStatus,
    ) {
      return new Self(
        id,
        conversationRole,
        service,
        hidden,
        hiddenRef,
        otrArchived,
        otrArchivedRef,
        otrMutedRef,
        otrMutedStatus,
      );
    };
    protoOf(Self).copy$default_x10vfk_k$ = function (
      id,
      conversationRole,
      service,
      hidden,
      hiddenRef,
      otrArchived,
      otrArchivedRef,
      otrMutedRef,
      otrMutedStatus,
      $super,
    ) {
      id = id === VOID ? this.id_1 : id;
      conversationRole = conversationRole === VOID ? this.conversationRole_1 : conversationRole;
      service = service === VOID ? this.service_1 : service;
      hidden = hidden === VOID ? this.hidden_1 : hidden;
      hiddenRef = hiddenRef === VOID ? this.hiddenRef_1 : hiddenRef;
      otrArchived = otrArchived === VOID ? this.otrArchived_1 : otrArchived;
      otrArchivedRef = otrArchivedRef === VOID ? this.otrArchivedRef_1 : otrArchivedRef;
      otrMutedRef = otrMutedRef === VOID ? this.otrMutedRef_1 : otrMutedRef;
      otrMutedStatus = otrMutedStatus === VOID ? this.otrMutedStatus_1 : otrMutedStatus;
      return $super === VOID
        ? this.copy_itxg6g_k$(
            id,
            conversationRole,
            service,
            hidden,
            hiddenRef,
            otrArchived,
            otrArchivedRef,
            otrMutedRef,
            otrMutedStatus,
          )
        : $super.copy_itxg6g_k$.call(
            this,
            id,
            conversationRole,
            service,
            hidden,
            hiddenRef,
            otrArchived,
            otrArchivedRef,
            otrMutedRef,
            otrMutedStatus,
          );
    };
    protoOf(Self).toString = function () {
      return (
        'Self(id=' +
        this.id_1 +
        ', conversationRole=' +
        this.conversationRole_1 +
        ', service=' +
        this.service_1 +
        ', hidden=' +
        this.hidden_1 +
        ', hiddenRef=' +
        this.hiddenRef_1 +
        ', otrArchived=' +
        this.otrArchived_1 +
        ', otrArchivedRef=' +
        this.otrArchivedRef_1 +
        ', otrMutedRef=' +
        this.otrMutedRef_1 +
        ', otrMutedStatus=' +
        this.otrMutedStatus_1 +
        ')'
      );
    };
    protoOf(Self).hashCode = function () {
      var result = this.id_1.hashCode();
      result = (imul(result, 31) + getStringHashCode(this.conversationRole_1)) | 0;
      result = (imul(result, 31) + (this.service_1 == null ? 0 : this.service_1.hashCode())) | 0;
      result = (imul(result, 31) + (this.hidden_1 == null ? 0 : getBooleanHashCode(this.hidden_1))) | 0;
      result = (imul(result, 31) + (this.hiddenRef_1 == null ? 0 : getStringHashCode(this.hiddenRef_1))) | 0;
      result = (imul(result, 31) + (this.otrArchived_1 == null ? 0 : getBooleanHashCode(this.otrArchived_1))) | 0;
      result = (imul(result, 31) + (this.otrArchivedRef_1 == null ? 0 : getStringHashCode(this.otrArchivedRef_1))) | 0;
      result = (imul(result, 31) + (this.otrMutedRef_1 == null ? 0 : getStringHashCode(this.otrMutedRef_1))) | 0;
      result = (imul(result, 31) + (this.otrMutedStatus_1 == null ? 0 : this.otrMutedStatus_1.hashCode())) | 0;
      return result;
    };
    protoOf(Self).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Self)) return false;
      var tmp0_other_with_cast = other instanceof Self ? other : THROW_CCE();
      if (!this.id_1.equals(tmp0_other_with_cast.id_1)) return false;
      if (!(this.conversationRole_1 === tmp0_other_with_cast.conversationRole_1)) return false;
      if (!equals(this.service_1, tmp0_other_with_cast.service_1)) return false;
      if (!(this.hidden_1 == tmp0_other_with_cast.hidden_1)) return false;
      if (!(this.hiddenRef_1 == tmp0_other_with_cast.hiddenRef_1)) return false;
      if (!(this.otrArchived_1 == tmp0_other_with_cast.otrArchived_1)) return false;
      if (!(this.otrArchivedRef_1 == tmp0_other_with_cast.otrArchivedRef_1)) return false;
      if (!(this.otrMutedRef_1 == tmp0_other_with_cast.otrMutedRef_1)) return false;
      if (!equals(this.otrMutedStatus_1, tmp0_other_with_cast.otrMutedStatus_1)) return false;
      return true;
    };
    function Other(id, conversationRole, service) {
      Companion_getInstance_17();
      service = service === VOID ? null : service;
      ConversationMemberDTO.call(this);
      this.id_1 = id;
      this.conversationRole_1 = conversationRole;
      this.service_1 = service;
    }
    protoOf(Other).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(Other).get_conversationRole_mdleg2_k$ = function () {
      return this.conversationRole_1;
    };
    protoOf(Other).get_service_y2v8i4_k$ = function () {
      return this.service_1;
    };
    protoOf(Other).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(Other).component2_7eebsb_k$ = function () {
      return this.conversationRole_1;
    };
    protoOf(Other).component3_7eebsa_k$ = function () {
      return this.service_1;
    };
    protoOf(Other).copy_c5yajm_k$ = function (id, conversationRole, service) {
      return new Other(id, conversationRole, service);
    };
    protoOf(Other).copy$default_350fju_k$ = function (id, conversationRole, service, $super) {
      id = id === VOID ? this.id_1 : id;
      conversationRole = conversationRole === VOID ? this.conversationRole_1 : conversationRole;
      service = service === VOID ? this.service_1 : service;
      return $super === VOID
        ? this.copy_c5yajm_k$(id, conversationRole, service)
        : $super.copy_c5yajm_k$.call(this, id, conversationRole, service);
    };
    protoOf(Other).toString = function () {
      return (
        'Other(id=' + this.id_1 + ', conversationRole=' + this.conversationRole_1 + ', service=' + this.service_1 + ')'
      );
    };
    protoOf(Other).hashCode = function () {
      var result = this.id_1.hashCode();
      result = (imul(result, 31) + getStringHashCode(this.conversationRole_1)) | 0;
      result = (imul(result, 31) + (this.service_1 == null ? 0 : this.service_1.hashCode())) | 0;
      return result;
    };
    protoOf(Other).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Other)) return false;
      var tmp0_other_with_cast = other instanceof Other ? other : THROW_CCE();
      if (!this.id_1.equals(tmp0_other_with_cast.id_1)) return false;
      if (!(this.conversationRole_1 === tmp0_other_with_cast.conversationRole_1)) return false;
      if (!equals(this.service_1, tmp0_other_with_cast.service_1)) return false;
      return true;
    };
    function Companion_16() {
      Companion_instance_16 = this;
      this.ID_SERIAL_NAME_1 = 'qualified_id';
      this.CONV_ROLE_SERIAL_NAME_1 = 'conversation_role';
      this.SERVICE_SERIAL_NAME_1 = 'service';
    }
    protoOf(Companion_16).get_ID_SERIAL_NAME_jn5cd7_k$ = function () {
      return this.ID_SERIAL_NAME_1;
    };
    protoOf(Companion_16).get_CONV_ROLE_SERIAL_NAME_57x87l_k$ = function () {
      return this.CONV_ROLE_SERIAL_NAME_1;
    };
    protoOf(Companion_16).get_SERVICE_SERIAL_NAME_4ktgyl_k$ = function () {
      return this.SERVICE_SERIAL_NAME_1;
    };
    var Companion_instance_16;
    function Companion_getInstance_18() {
      if (Companion_instance_16 == null) new Companion_16();
      return Companion_instance_16;
    }
    function ConversationMemberDTO() {
      Companion_getInstance_18();
    }
    function Companion_17() {
      Companion_instance_17 = this;
    }
    protoOf(Companion_17).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_11();
    };
    var Companion_instance_17;
    function Companion_getInstance_19() {
      if (Companion_instance_17 == null) new Companion_17();
      return Companion_instance_17;
    }
    function $serializer_11() {
      $serializer_instance_11 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.ServiceReferenceDTO',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('provider', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_11).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_11).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), StringSerializer_getInstance()];
    };
    protoOf($serializer_11).deserialize_sy6x50_k$ = function (decoder) {
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
      return ServiceReferenceDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_11).serialize_knfgli_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.id_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.provider_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_11).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_knfgli_k$(encoder, value instanceof ServiceReferenceDTO ? value : THROW_CCE());
    };
    var $serializer_instance_11;
    function $serializer_getInstance_11() {
      if ($serializer_instance_11 == null) new $serializer_11();
      return $serializer_instance_11;
    }
    function ServiceReferenceDTO_init_$Init$(seen1, id, provider, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_11().descriptor_1);
      }
      $this.id_1 = id;
      $this.provider_1 = provider;
      return $this;
    }
    function ServiceReferenceDTO_init_$Create$(seen1, id, provider, serializationConstructorMarker) {
      return ServiceReferenceDTO_init_$Init$(
        seen1,
        id,
        provider,
        serializationConstructorMarker,
        objectCreate(protoOf(ServiceReferenceDTO)),
      );
    }
    function ServiceReferenceDTO(id, provider) {
      Companion_getInstance_19();
      this.id_1 = id;
      this.provider_1 = provider;
    }
    protoOf(ServiceReferenceDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(ServiceReferenceDTO).get_provider_mw8vcq_k$ = function () {
      return this.provider_1;
    };
    protoOf(ServiceReferenceDTO).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(ServiceReferenceDTO).component2_7eebsb_k$ = function () {
      return this.provider_1;
    };
    protoOf(ServiceReferenceDTO).copy_plwnsl_k$ = function (id, provider) {
      return new ServiceReferenceDTO(id, provider);
    };
    protoOf(ServiceReferenceDTO).copy$default_yi8t36_k$ = function (id, provider, $super) {
      id = id === VOID ? this.id_1 : id;
      provider = provider === VOID ? this.provider_1 : provider;
      return $super === VOID ? this.copy_plwnsl_k$(id, provider) : $super.copy_plwnsl_k$.call(this, id, provider);
    };
    protoOf(ServiceReferenceDTO).toString = function () {
      return 'ServiceReferenceDTO(id=' + this.id_1 + ', provider=' + this.provider_1 + ')';
    };
    protoOf(ServiceReferenceDTO).hashCode = function () {
      var result = getStringHashCode(this.id_1);
      result = (imul(result, 31) + getStringHashCode(this.provider_1)) | 0;
      return result;
    };
    protoOf(ServiceReferenceDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ServiceReferenceDTO)) return false;
      var tmp0_other_with_cast = other instanceof ServiceReferenceDTO ? other : THROW_CCE();
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!(this.provider_1 === tmp0_other_with_cast.provider_1)) return false;
      return true;
    };
    function _get_$cachedSerializer__te6jhj_3($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ConvProtocol$Companion$_anonymous__2k9lct() {
      var tmp = values_4();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['proteus', 'mls', 'mixed'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.conversation.ConvProtocol',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var ConvProtocol_PROTEUS_instance;
    var ConvProtocol_MLS_instance;
    var ConvProtocol_MIXED_instance;
    function Companion_18() {
      Companion_instance_18 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ConvProtocol$Companion$_anonymous__2k9lct);
    }
    protoOf(Companion_18).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_3(this);
    };
    protoOf(Companion_18).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_18;
    function Companion_getInstance_20() {
      ConvProtocol_initEntries();
      if (Companion_instance_18 == null) new Companion_18();
      return Companion_instance_18;
    }
    function values_4() {
      return [ConvProtocol_PROTEUS_getInstance(), ConvProtocol_MLS_getInstance(), ConvProtocol_MIXED_getInstance()];
    }
    function valueOf_4(value) {
      switch (value) {
        case 'PROTEUS':
          return ConvProtocol_PROTEUS_getInstance();
        case 'MLS':
          return ConvProtocol_MLS_getInstance();
        case 'MIXED':
          return ConvProtocol_MIXED_getInstance();
        default:
          ConvProtocol_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_4() {
      if ($ENTRIES_4 == null) $ENTRIES_4 = enumEntries(values_4());
      return $ENTRIES_4;
    }
    var ConvProtocol_entriesInitialized;
    function ConvProtocol_initEntries() {
      if (ConvProtocol_entriesInitialized) return Unit_getInstance();
      ConvProtocol_entriesInitialized = true;
      ConvProtocol_PROTEUS_instance = new ConvProtocol('PROTEUS', 0);
      ConvProtocol_MLS_instance = new ConvProtocol('MLS', 1);
      ConvProtocol_MIXED_instance = new ConvProtocol('MIXED', 2);
      Companion_getInstance_20();
    }
    var $ENTRIES_4;
    function ConvProtocol(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(ConvProtocol).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function ConvProtocol_PROTEUS_getInstance() {
      ConvProtocol_initEntries();
      return ConvProtocol_PROTEUS_instance;
    }
    function ConvProtocol_MLS_getInstance() {
      ConvProtocol_initEntries();
      return ConvProtocol_MLS_instance;
    }
    function ConvProtocol_MIXED_getInstance() {
      ConvProtocol_initEntries();
      return ConvProtocol_MIXED_instance;
    }
    var MutedStatus_ALL_ALLOWED_instance;
    var MutedStatus_ONLY_MENTIONS_ALLOWED_instance;
    var MutedStatus_MENTIONS_MUTED_instance;
    var MutedStatus_ALL_MUTED_instance;
    function Companion_19() {
      Companion_instance_19 = this;
    }
    protoOf(Companion_19).fromOrdinal_xlum1d_k$ = function (ordinal) {
      var tmp$ret$1;
      $l$block: {
        // Inline function 'kotlin.collections.firstOrNull' call
        var indexedObject = values_5();
        var inductionVariable = 0;
        var last = indexedObject.length;
        while (inductionVariable < last) {
          var element = indexedObject[inductionVariable];
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'com.wire.kalium.network.api.authenticated.conversation.Companion.fromOrdinal.<anonymous>' call
          if (ordinal === element.get_ordinal_ip24qg_k$()) {
            tmp$ret$1 = element;
            break $l$block;
          }
        }
        tmp$ret$1 = null;
      }
      return tmp$ret$1;
    };
    var Companion_instance_19;
    function Companion_getInstance_21() {
      MutedStatus_initEntries();
      if (Companion_instance_19 == null) new Companion_19();
      return Companion_instance_19;
    }
    function values_5() {
      return [
        MutedStatus_ALL_ALLOWED_getInstance(),
        MutedStatus_ONLY_MENTIONS_ALLOWED_getInstance(),
        MutedStatus_MENTIONS_MUTED_getInstance(),
        MutedStatus_ALL_MUTED_getInstance(),
      ];
    }
    function valueOf_5(value) {
      switch (value) {
        case 'ALL_ALLOWED':
          return MutedStatus_ALL_ALLOWED_getInstance();
        case 'ONLY_MENTIONS_ALLOWED':
          return MutedStatus_ONLY_MENTIONS_ALLOWED_getInstance();
        case 'MENTIONS_MUTED':
          return MutedStatus_MENTIONS_MUTED_getInstance();
        case 'ALL_MUTED':
          return MutedStatus_ALL_MUTED_getInstance();
        default:
          MutedStatus_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_5() {
      if ($ENTRIES_5 == null) $ENTRIES_5 = enumEntries(values_5());
      return $ENTRIES_5;
    }
    var MutedStatus_entriesInitialized;
    function MutedStatus_initEntries() {
      if (MutedStatus_entriesInitialized) return Unit_getInstance();
      MutedStatus_entriesInitialized = true;
      MutedStatus_ALL_ALLOWED_instance = new MutedStatus('ALL_ALLOWED', 0);
      MutedStatus_ONLY_MENTIONS_ALLOWED_instance = new MutedStatus('ONLY_MENTIONS_ALLOWED', 1);
      MutedStatus_MENTIONS_MUTED_instance = new MutedStatus('MENTIONS_MUTED', 2);
      MutedStatus_ALL_MUTED_instance = new MutedStatus('ALL_MUTED', 3);
      Companion_getInstance_21();
    }
    var $ENTRIES_5;
    function MutedStatus(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function MutedStatus_ALL_ALLOWED_getInstance() {
      MutedStatus_initEntries();
      return MutedStatus_ALL_ALLOWED_instance;
    }
    function MutedStatus_ONLY_MENTIONS_ALLOWED_getInstance() {
      MutedStatus_initEntries();
      return MutedStatus_ONLY_MENTIONS_ALLOWED_instance;
    }
    function MutedStatus_MENTIONS_MUTED_getInstance() {
      MutedStatus_initEntries();
      return MutedStatus_MENTIONS_MUTED_instance;
    }
    function MutedStatus_ALL_MUTED_getInstance() {
      MutedStatus_initEntries();
      return MutedStatus_ALL_MUTED_instance;
    }
    function MutedStatusSerializer() {
      this.descriptor_1 = PrimitiveSerialDescriptor('otr_muted_status', INT_getInstance());
    }
    protoOf(MutedStatusSerializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(MutedStatusSerializer).serialize_ob5a0c_k$ = function (encoder, value) {
      if (value == null) {
        encoder.encodeNull_ejiosz_k$();
      } else {
        encoder.encodeInt_y5zi3z_k$(value.get_ordinal_ip24qg_k$());
      }
    };
    protoOf(MutedStatusSerializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ob5a0c_k$(
        encoder,
        (value == null ? true : value instanceof MutedStatus) ? value : THROW_CCE(),
      );
    };
    protoOf(MutedStatusSerializer).deserialize_sy6x50_k$ = function (decoder) {
      var rawValue = decoder.decodeInt_8iq8f5_k$();
      return Companion_getInstance_21().fromOrdinal_xlum1d_k$(rawValue);
    };
    function _get_$cachedSerializer__te6jhj_4($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ReceiptMode$Companion$_anonymous__5qdn8s() {
      return ReceiptModeAsIntSerializer_getInstance();
    }
    var ReceiptMode_DISABLED_instance;
    var ReceiptMode_ENABLED_instance;
    function ReceiptModeAsIntSerializer() {
      ReceiptModeAsIntSerializer_instance = this;
      this.descriptor_1 = get_nullable_0(PrimitiveSerialDescriptor('ReceiptMode', INT_getInstance()));
    }
    protoOf(ReceiptModeAsIntSerializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(ReceiptModeAsIntSerializer).serialize_wfaf01_k$ = function (encoder, value) {
      encoder.encodeInt_y5zi3z_k$(value.value_1);
    };
    protoOf(ReceiptModeAsIntSerializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_wfaf01_k$(encoder, value instanceof ReceiptMode ? value : THROW_CCE());
    };
    protoOf(ReceiptModeAsIntSerializer).deserialize_sy6x50_k$ = function (decoder) {
      var value = decoder.decodeNotNullMark_us4ba1_k$() ? decoder.decodeInt_8iq8f5_k$() : 0;
      return value > 0 ? ReceiptMode_ENABLED_getInstance() : ReceiptMode_DISABLED_getInstance();
    };
    protoOf(ReceiptModeAsIntSerializer).toString = function () {
      return 'ReceiptModeAsIntSerializer';
    };
    protoOf(ReceiptModeAsIntSerializer).hashCode = function () {
      return -2069083272;
    };
    protoOf(ReceiptModeAsIntSerializer).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ReceiptModeAsIntSerializer)) return false;
      other instanceof ReceiptModeAsIntSerializer || THROW_CCE();
      return true;
    };
    var ReceiptModeAsIntSerializer_instance;
    function ReceiptModeAsIntSerializer_getInstance() {
      ReceiptMode_initEntries();
      if (ReceiptModeAsIntSerializer_instance == null) new ReceiptModeAsIntSerializer();
      return ReceiptModeAsIntSerializer_instance;
    }
    function Companion_20() {
      Companion_instance_20 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ReceiptMode$Companion$_anonymous__5qdn8s);
    }
    protoOf(Companion_20).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_4(this);
    };
    protoOf(Companion_20).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_20;
    function Companion_getInstance_22() {
      ReceiptMode_initEntries();
      if (Companion_instance_20 == null) new Companion_20();
      return Companion_instance_20;
    }
    function values_6() {
      return [ReceiptMode_DISABLED_getInstance(), ReceiptMode_ENABLED_getInstance()];
    }
    function valueOf_6(value) {
      switch (value) {
        case 'DISABLED':
          return ReceiptMode_DISABLED_getInstance();
        case 'ENABLED':
          return ReceiptMode_ENABLED_getInstance();
        default:
          ReceiptMode_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_6() {
      if ($ENTRIES_6 == null) $ENTRIES_6 = enumEntries(values_6());
      return $ENTRIES_6;
    }
    var ReceiptMode_entriesInitialized;
    function ReceiptMode_initEntries() {
      if (ReceiptMode_entriesInitialized) return Unit_getInstance();
      ReceiptMode_entriesInitialized = true;
      ReceiptMode_DISABLED_instance = new ReceiptMode('DISABLED', 0, 0);
      ReceiptMode_ENABLED_instance = new ReceiptMode('ENABLED', 1, 1);
      Companion_getInstance_22();
    }
    var $ENTRIES_6;
    function ReceiptMode(name, ordinal, value) {
      Enum.call(this, name, ordinal);
      this.value_1 = value;
    }
    protoOf(ReceiptMode).get_value_j01efc_k$ = function () {
      return this.value_1;
    };
    function ReceiptMode_DISABLED_getInstance() {
      ReceiptMode_initEntries();
      return ReceiptMode_DISABLED_instance;
    }
    function ReceiptMode_ENABLED_getInstance() {
      ReceiptMode_initEntries();
      return ReceiptMode_ENABLED_instance;
    }
    function _get_$childSerializers__r2zwns_6($this) {
      return $this.$childSerializers_1;
    }
    function Companion_21() {
      Companion_instance_21 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_24().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_21).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_12();
    };
    var Companion_instance_21;
    function Companion_getInstance_23() {
      if (Companion_instance_21 == null) new Companion_21();
      return Companion_instance_21;
    }
    function $serializer_12() {
      $serializer_instance_12 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.TypingIndicatorStatusDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_12).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_12).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_23().$childSerializers_1[0]];
    };
    protoOf($serializer_12).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_23().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return TypingIndicatorStatusDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_12).serialize_gqhkki_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_23().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_12).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_gqhkki_k$(encoder, value instanceof TypingIndicatorStatusDTO ? value : THROW_CCE());
    };
    var $serializer_instance_12;
    function $serializer_getInstance_12() {
      if ($serializer_instance_12 == null) new $serializer_12();
      return $serializer_instance_12;
    }
    function TypingIndicatorStatusDTO_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_12().descriptor_1);
      }
      $this.status_1 = status;
      return $this;
    }
    function TypingIndicatorStatusDTO_init_$Create$(seen1, status, serializationConstructorMarker) {
      return TypingIndicatorStatusDTO_init_$Init$(
        seen1,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(TypingIndicatorStatusDTO)),
      );
    }
    function TypingIndicatorStatusDTO(status) {
      Companion_getInstance_23();
      this.status_1 = status;
    }
    protoOf(TypingIndicatorStatusDTO).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(TypingIndicatorStatusDTO).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(TypingIndicatorStatusDTO).copy_j8ve6v_k$ = function (status) {
      return new TypingIndicatorStatusDTO(status);
    };
    protoOf(TypingIndicatorStatusDTO).copy$default_1lif6b_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_j8ve6v_k$(status) : $super.copy_j8ve6v_k$.call(this, status);
    };
    protoOf(TypingIndicatorStatusDTO).toString = function () {
      return 'TypingIndicatorStatusDTO(status=' + this.status_1 + ')';
    };
    protoOf(TypingIndicatorStatusDTO).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(TypingIndicatorStatusDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof TypingIndicatorStatusDTO)) return false;
      var tmp0_other_with_cast = other instanceof TypingIndicatorStatusDTO ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function _get_$cachedSerializer__te6jhj_5($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function TypingIndicatorStatus$Companion$_anonymous__k5tjad() {
      var tmp = values_7();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['started', 'stopped'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.conversation.TypingIndicatorStatus',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var TypingIndicatorStatus_STARTED_instance;
    var TypingIndicatorStatus_STOPPED_instance;
    function Companion_22() {
      Companion_instance_22 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, TypingIndicatorStatus$Companion$_anonymous__k5tjad);
    }
    protoOf(Companion_22).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_5(this);
    };
    protoOf(Companion_22).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_22;
    function Companion_getInstance_24() {
      TypingIndicatorStatus_initEntries();
      if (Companion_instance_22 == null) new Companion_22();
      return Companion_instance_22;
    }
    function values_7() {
      return [TypingIndicatorStatus_STARTED_getInstance(), TypingIndicatorStatus_STOPPED_getInstance()];
    }
    function valueOf_7(value) {
      switch (value) {
        case 'STARTED':
          return TypingIndicatorStatus_STARTED_getInstance();
        case 'STOPPED':
          return TypingIndicatorStatus_STOPPED_getInstance();
        default:
          TypingIndicatorStatus_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_7() {
      if ($ENTRIES_7 == null) $ENTRIES_7 = enumEntries(values_7());
      return $ENTRIES_7;
    }
    var TypingIndicatorStatus_entriesInitialized;
    function TypingIndicatorStatus_initEntries() {
      if (TypingIndicatorStatus_entriesInitialized) return Unit_getInstance();
      TypingIndicatorStatus_entriesInitialized = true;
      TypingIndicatorStatus_STARTED_instance = new TypingIndicatorStatus('STARTED', 0, 'started');
      TypingIndicatorStatus_STOPPED_instance = new TypingIndicatorStatus('STOPPED', 1, 'stopped');
      Companion_getInstance_24();
    }
    var $ENTRIES_7;
    function TypingIndicatorStatus(name, ordinal, value) {
      Enum.call(this, name, ordinal);
      this.value_1 = value;
    }
    protoOf(TypingIndicatorStatus).get_value_j01efc_k$ = function () {
      return this.value_1;
    };
    function TypingIndicatorStatus_STARTED_getInstance() {
      TypingIndicatorStatus_initEntries();
      return TypingIndicatorStatus_STARTED_instance;
    }
    function TypingIndicatorStatus_STOPPED_getInstance() {
      TypingIndicatorStatus_initEntries();
      return TypingIndicatorStatus_STOPPED_instance;
    }
    function Companion_23() {
      Companion_instance_23 = this;
    }
    protoOf(Companion_23).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_13();
    };
    var Companion_instance_23;
    function Companion_getInstance_25() {
      if (Companion_instance_23 == null) new Companion_23();
      return Companion_instance_23;
    }
    function $serializer_13() {
      $serializer_instance_13 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.guestroomlink.ConversationInviteLinkResponse',
        this,
        4,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('uri', false);
      tmp0_serialDesc.addElement_5pzumi_k$('key', false);
      tmp0_serialDesc.addElement_5pzumi_k$('code', false);
      tmp0_serialDesc.addElement_5pzumi_k$('has_password', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_13).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_13).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(StringSerializer_getInstance()),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        BooleanSerializer_getInstance(),
      ];
    };
    protoOf($serializer_13).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = false;
      var tmp8_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp8_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp8_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          StringSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 3);
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
              tmp5_local1 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationInviteLinkResponse_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        null,
      );
    };
    protoOf($serializer_13).serialize_aen17y_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        StringSerializer_getInstance(),
        value.uri_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.key_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.code_1);
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 3) ? true : !(value.hasPassword_1 === false)) {
        tmp1_output.encodeBooleanElement_ydht7q_k$(tmp0_desc, 3, value.hasPassword_1);
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_13).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_aen17y_k$(encoder, value instanceof ConversationInviteLinkResponse ? value : THROW_CCE());
    };
    var $serializer_instance_13;
    function $serializer_getInstance_13() {
      if ($serializer_instance_13 == null) new $serializer_13();
      return $serializer_instance_13;
    }
    function ConversationInviteLinkResponse_init_$Init$(
      seen1,
      uri,
      key,
      code,
      hasPassword,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_13().descriptor_1);
      }
      $this.uri_1 = uri;
      $this.key_1 = key;
      $this.code_1 = code;
      if (0 === (seen1 & 8)) $this.hasPassword_1 = false;
      else $this.hasPassword_1 = hasPassword;
      return $this;
    }
    function ConversationInviteLinkResponse_init_$Create$(
      seen1,
      uri,
      key,
      code,
      hasPassword,
      serializationConstructorMarker,
    ) {
      return ConversationInviteLinkResponse_init_$Init$(
        seen1,
        uri,
        key,
        code,
        hasPassword,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationInviteLinkResponse)),
      );
    }
    function ConversationInviteLinkResponse(uri, key, code, hasPassword) {
      Companion_getInstance_25();
      hasPassword = hasPassword === VOID ? false : hasPassword;
      this.uri_1 = uri;
      this.key_1 = key;
      this.code_1 = code;
      this.hasPassword_1 = hasPassword;
    }
    protoOf(ConversationInviteLinkResponse).get_uri_18iuil_k$ = function () {
      return this.uri_1;
    };
    protoOf(ConversationInviteLinkResponse).get_key_18j28a_k$ = function () {
      return this.key_1;
    };
    protoOf(ConversationInviteLinkResponse).get_code_wok7xy_k$ = function () {
      return this.code_1;
    };
    protoOf(ConversationInviteLinkResponse).get_hasPassword_aj10j0_k$ = function () {
      return this.hasPassword_1;
    };
    protoOf(ConversationInviteLinkResponse).component1_7eebsc_k$ = function () {
      return this.uri_1;
    };
    protoOf(ConversationInviteLinkResponse).component2_7eebsb_k$ = function () {
      return this.key_1;
    };
    protoOf(ConversationInviteLinkResponse).component3_7eebsa_k$ = function () {
      return this.code_1;
    };
    protoOf(ConversationInviteLinkResponse).component4_7eebs9_k$ = function () {
      return this.hasPassword_1;
    };
    protoOf(ConversationInviteLinkResponse).copy_lnutzd_k$ = function (uri, key, code, hasPassword) {
      return new ConversationInviteLinkResponse(uri, key, code, hasPassword);
    };
    protoOf(ConversationInviteLinkResponse).copy$default_kvsze4_k$ = function (uri, key, code, hasPassword, $super) {
      uri = uri === VOID ? this.uri_1 : uri;
      key = key === VOID ? this.key_1 : key;
      code = code === VOID ? this.code_1 : code;
      hasPassword = hasPassword === VOID ? this.hasPassword_1 : hasPassword;
      return $super === VOID
        ? this.copy_lnutzd_k$(uri, key, code, hasPassword)
        : $super.copy_lnutzd_k$.call(this, uri, key, code, hasPassword);
    };
    protoOf(ConversationInviteLinkResponse).toString = function () {
      return (
        'ConversationInviteLinkResponse(uri=' +
        this.uri_1 +
        ', key=' +
        this.key_1 +
        ', code=' +
        this.code_1 +
        ', hasPassword=' +
        this.hasPassword_1 +
        ')'
      );
    };
    protoOf(ConversationInviteLinkResponse).hashCode = function () {
      var result = this.uri_1 == null ? 0 : getStringHashCode(this.uri_1);
      result = (imul(result, 31) + getStringHashCode(this.key_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.code_1)) | 0;
      result = (imul(result, 31) + getBooleanHashCode(this.hasPassword_1)) | 0;
      return result;
    };
    protoOf(ConversationInviteLinkResponse).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationInviteLinkResponse)) return false;
      var tmp0_other_with_cast = other instanceof ConversationInviteLinkResponse ? other : THROW_CCE();
      if (!(this.uri_1 == tmp0_other_with_cast.uri_1)) return false;
      if (!(this.key_1 === tmp0_other_with_cast.key_1)) return false;
      if (!(this.code_1 === tmp0_other_with_cast.code_1)) return false;
      if (!(this.hasPassword_1 === tmp0_other_with_cast.hasPassword_1)) return false;
      return true;
    };
    function Companion_24() {
      Companion_instance_24 = this;
    }
    protoOf(Companion_24).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_14();
    };
    var Companion_instance_24;
    function Companion_getInstance_26() {
      if (Companion_instance_24 == null) new Companion_24();
      return Companion_instance_24;
    }
    function $serializer_14() {
      $serializer_instance_14 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.messagetimer.ConversationMessageTimerDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('message_timer', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_14).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_14).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [get_nullable(LongSerializer_getInstance())];
    };
    protoOf($serializer_14).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          LongSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                LongSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationMessageTimerDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_14).serialize_nxh3h2_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        LongSerializer_getInstance(),
        value.messageTimer_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_14).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_nxh3h2_k$(encoder, value instanceof ConversationMessageTimerDTO ? value : THROW_CCE());
    };
    var $serializer_instance_14;
    function $serializer_getInstance_14() {
      if ($serializer_instance_14 == null) new $serializer_14();
      return $serializer_instance_14;
    }
    function ConversationMessageTimerDTO_init_$Init$(seen1, messageTimer, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_14().descriptor_1);
      }
      $this.messageTimer_1 = messageTimer;
      return $this;
    }
    function ConversationMessageTimerDTO_init_$Create$(seen1, messageTimer, serializationConstructorMarker) {
      return ConversationMessageTimerDTO_init_$Init$(
        seen1,
        messageTimer,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationMessageTimerDTO)),
      );
    }
    function ConversationMessageTimerDTO(messageTimer) {
      Companion_getInstance_26();
      this.messageTimer_1 = messageTimer;
    }
    protoOf(ConversationMessageTimerDTO).get_messageTimer_gwdjy1_k$ = function () {
      return this.messageTimer_1;
    };
    protoOf(ConversationMessageTimerDTO).component1_7eebsc_k$ = function () {
      return this.messageTimer_1;
    };
    protoOf(ConversationMessageTimerDTO).copy_au4gau_k$ = function (messageTimer) {
      return new ConversationMessageTimerDTO(messageTimer);
    };
    protoOf(ConversationMessageTimerDTO).copy$default_qpo5mg_k$ = function (messageTimer, $super) {
      messageTimer = messageTimer === VOID ? this.messageTimer_1 : messageTimer;
      return $super === VOID ? this.copy_au4gau_k$(messageTimer) : $super.copy_au4gau_k$.call(this, messageTimer);
    };
    protoOf(ConversationMessageTimerDTO).toString = function () {
      return 'ConversationMessageTimerDTO(messageTimer=' + toString(this.messageTimer_1) + ')';
    };
    protoOf(ConversationMessageTimerDTO).hashCode = function () {
      return this.messageTimer_1 == null ? 0 : this.messageTimer_1.hashCode();
    };
    protoOf(ConversationMessageTimerDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationMessageTimerDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationMessageTimerDTO ? other : THROW_CCE();
      if (!equals(this.messageTimer_1, tmp0_other_with_cast.messageTimer_1)) return false;
      return true;
    };
    function Companion_25() {
      Companion_instance_25 = this;
    }
    protoOf(Companion_25).serializer_9w0wvi_k$ = function () {
      return JsonCorrectingSerializer_getInstance();
    };
    var Companion_instance_25;
    function Companion_getInstance_27() {
      if (Companion_instance_25 == null) new Companion_25();
      return Companion_instance_25;
    }
    function ConversationAccessInfoDTO(access, accessRole) {
      Companion_getInstance_27();
      accessRole =
        accessRole === VOID ? Companion_getInstance_108().get_DEFAULT_VALUE_WHEN_NULL_nr9gc7_k$() : accessRole;
      this.access_1 = access;
      this.accessRole_1 = accessRole;
    }
    protoOf(ConversationAccessInfoDTO).get_access_avafzh_k$ = function () {
      return this.access_1;
    };
    protoOf(ConversationAccessInfoDTO).get_accessRole_vywdxf_k$ = function () {
      return this.accessRole_1;
    };
    protoOf(ConversationAccessInfoDTO).component1_7eebsc_k$ = function () {
      return this.access_1;
    };
    protoOf(ConversationAccessInfoDTO).component2_7eebsb_k$ = function () {
      return this.accessRole_1;
    };
    protoOf(ConversationAccessInfoDTO).copy_tfy2e7_k$ = function (access, accessRole) {
      return new ConversationAccessInfoDTO(access, accessRole);
    };
    protoOf(ConversationAccessInfoDTO).copy$default_lck43j_k$ = function (access, accessRole, $super) {
      access = access === VOID ? this.access_1 : access;
      accessRole = accessRole === VOID ? this.accessRole_1 : accessRole;
      return $super === VOID
        ? this.copy_tfy2e7_k$(access, accessRole)
        : $super.copy_tfy2e7_k$.call(this, access, accessRole);
    };
    protoOf(ConversationAccessInfoDTO).toString = function () {
      return 'ConversationAccessInfoDTO(access=' + this.access_1 + ', accessRole=' + this.accessRole_1 + ')';
    };
    protoOf(ConversationAccessInfoDTO).hashCode = function () {
      var result = hashCode(this.access_1);
      result = (imul(result, 31) + hashCode(this.accessRole_1)) | 0;
      return result;
    };
    protoOf(ConversationAccessInfoDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationAccessInfoDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationAccessInfoDTO ? other : THROW_CCE();
      if (!equals(this.access_1, tmp0_other_with_cast.access_1)) return false;
      if (!equals(this.accessRole_1, tmp0_other_with_cast.accessRole_1)) return false;
      return true;
    };
    function JsonCorrectingSerializer() {
      JsonCorrectingSerializer_instance = this;
      JsonTransformingSerializer.call(this, ConversationAccessInfoDTOSerializer_getInstance());
    }
    protoOf(JsonCorrectingSerializer).transformDeserialize_isl1lf_k$ = function (element) {
      // Inline function 'kotlin.apply' call
      var this_0 = toMutableMap(get_jsonObject(element));
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.network.api.authenticated.conversation.model.JsonCorrectingSerializer.transformDeserialize.<anonymous>' call
      var accessRole = this_0.get_wei43m_k$('access_role');
      var tmp;
      if (accessRole instanceof JsonPrimitive) {
        tmp = accessRole.get_isString_zep7bw_k$();
      } else {
        tmp = false;
      }
      if (tmp) {
        this_0.remove_gppy8k_k$('access_role');
      }
      return new JsonObject(this_0);
    };
    var JsonCorrectingSerializer_instance;
    function JsonCorrectingSerializer_getInstance() {
      if (JsonCorrectingSerializer_instance == null) new JsonCorrectingSerializer();
      return JsonCorrectingSerializer_instance;
    }
    function ConversationAccessInfoDTOSerializer() {
      ConversationAccessInfoDTOSerializer_instance = this;
      this.descriptor_1 = Companion_getInstance_28().serializer_9w0wvi_k$().get_descriptor_wjt6a0_k$();
    }
    protoOf(ConversationAccessInfoDTOSerializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(ConversationAccessInfoDTOSerializer).deserialize_sy6x50_k$ = function (decoder) {
      var surrogate = decoder.decodeSerializableValue_xpnpad_k$(Companion_getInstance_28().serializer_9w0wvi_k$());
      return new ConversationAccessInfoDTO(surrogate.access_1, surrogate.accessRole_1);
    };
    protoOf(ConversationAccessInfoDTOSerializer).serialize_telgvf_k$ = function (encoder, value) {
      var surrogate = new ConversationAccessInfoDTOSurrogate(value.access_1, value.accessRole_1);
      encoder.encodeSerializableValue_3uuzip_k$(Companion_getInstance_28().serializer_9w0wvi_k$(), surrogate);
    };
    protoOf(ConversationAccessInfoDTOSerializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_telgvf_k$(encoder, value instanceof ConversationAccessInfoDTO ? value : THROW_CCE());
    };
    var ConversationAccessInfoDTOSerializer_instance;
    function ConversationAccessInfoDTOSerializer_getInstance() {
      if (ConversationAccessInfoDTOSerializer_instance == null) new ConversationAccessInfoDTOSerializer();
      return ConversationAccessInfoDTOSerializer_instance;
    }
    function _get_$childSerializers__r2zwns_7($this) {
      return $this.$childSerializers_1;
    }
    function Companion_26() {
      Companion_instance_26 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        new LinkedHashSetSerializer(Companion_getInstance_107().serializer_9w0wvi_k$()),
        new LinkedHashSetSerializer(Companion_getInstance_108().serializer_9w0wvi_k$()),
      ];
    }
    protoOf(Companion_26).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_15();
    };
    var Companion_instance_26;
    function Companion_getInstance_28() {
      if (Companion_instance_26 == null) new Companion_26();
      return Companion_instance_26;
    }
    function $serializer_15() {
      $serializer_instance_15 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('ConversationAccessInfoDTO', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('access', false);
      tmp0_serialDesc.addElement_5pzumi_k$('access_role_v2', true);
      tmp0_serialDesc.pushAnnotation_fm15ho_k$(new JsonNames(['access_role']));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_15).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_15).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_28().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [tmp0_cached[0], tmp0_cached[1]];
    };
    protoOf($serializer_15).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_28().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationAccessInfoDTOSurrogate_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_15).serialize_lzr2f7_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_28().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.access_1);
      if (
        tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 1)
          ? true
          : !equals(value.accessRole_1, Companion_getInstance_108().get_DEFAULT_VALUE_WHEN_NULL_nr9gc7_k$())
      ) {
        tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.accessRole_1);
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_15).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_lzr2f7_k$(
        encoder,
        value instanceof ConversationAccessInfoDTOSurrogate ? value : THROW_CCE(),
      );
    };
    var $serializer_instance_15;
    function $serializer_getInstance_15() {
      if ($serializer_instance_15 == null) new $serializer_15();
      return $serializer_instance_15;
    }
    function ConversationAccessInfoDTOSurrogate_init_$Init$(
      seen1,
      access,
      accessRole,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_15().descriptor_1);
      }
      $this.access_1 = access;
      if (0 === (seen1 & 2)) $this.accessRole_1 = Companion_getInstance_108().get_DEFAULT_VALUE_WHEN_NULL_nr9gc7_k$();
      else $this.accessRole_1 = accessRole;
      return $this;
    }
    function ConversationAccessInfoDTOSurrogate_init_$Create$(
      seen1,
      access,
      accessRole,
      serializationConstructorMarker,
    ) {
      return ConversationAccessInfoDTOSurrogate_init_$Init$(
        seen1,
        access,
        accessRole,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationAccessInfoDTOSurrogate)),
      );
    }
    function ConversationAccessInfoDTOSurrogate(access, accessRole) {
      Companion_getInstance_28();
      accessRole =
        accessRole === VOID ? Companion_getInstance_108().get_DEFAULT_VALUE_WHEN_NULL_nr9gc7_k$() : accessRole;
      this.access_1 = access;
      this.accessRole_1 = accessRole;
    }
    protoOf(ConversationAccessInfoDTOSurrogate).get_access_avafzh_k$ = function () {
      return this.access_1;
    };
    protoOf(ConversationAccessInfoDTOSurrogate).get_accessRole_vywdxf_k$ = function () {
      return this.accessRole_1;
    };
    protoOf(ConversationAccessInfoDTOSurrogate).component1_7eebsc_k$ = function () {
      return this.access_1;
    };
    protoOf(ConversationAccessInfoDTOSurrogate).component2_7eebsb_k$ = function () {
      return this.accessRole_1;
    };
    protoOf(ConversationAccessInfoDTOSurrogate).copy_tfy2e7_k$ = function (access, accessRole) {
      return new ConversationAccessInfoDTOSurrogate(access, accessRole);
    };
    protoOf(ConversationAccessInfoDTOSurrogate).copy$default_5wbyu9_k$ = function (access, accessRole, $super) {
      access = access === VOID ? this.access_1 : access;
      accessRole = accessRole === VOID ? this.accessRole_1 : accessRole;
      return $super === VOID
        ? this.copy_tfy2e7_k$(access, accessRole)
        : $super.copy_tfy2e7_k$.call(this, access, accessRole);
    };
    protoOf(ConversationAccessInfoDTOSurrogate).toString = function () {
      return 'ConversationAccessInfoDTOSurrogate(access=' + this.access_1 + ', accessRole=' + this.accessRole_1 + ')';
    };
    protoOf(ConversationAccessInfoDTOSurrogate).hashCode = function () {
      var result = hashCode(this.access_1);
      result = (imul(result, 31) + hashCode(this.accessRole_1)) | 0;
      return result;
    };
    protoOf(ConversationAccessInfoDTOSurrogate).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationAccessInfoDTOSurrogate)) return false;
      var tmp0_other_with_cast = other instanceof ConversationAccessInfoDTOSurrogate ? other : THROW_CCE();
      if (!equals(this.access_1, tmp0_other_with_cast.access_1)) return false;
      if (!equals(this.accessRole_1, tmp0_other_with_cast.accessRole_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_8($this) {
      return $this.$childSerializers_1;
    }
    function Companion_27() {
      Companion_instance_27 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_20().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_27).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_16();
    };
    var Companion_instance_27;
    function Companion_getInstance_29() {
      if (Companion_instance_27 == null) new Companion_27();
      return Companion_instance_27;
    }
    function $serializer_16() {
      $serializer_instance_16 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.model.ConversationProtocolDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('protocol', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_16).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_16).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_29().$childSerializers_1[0]];
    };
    protoOf($serializer_16).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_29().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationProtocolDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_16).serialize_7d2fjj_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_29().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.protocol_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_16).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_7d2fjj_k$(encoder, value instanceof ConversationProtocolDTO ? value : THROW_CCE());
    };
    var $serializer_instance_16;
    function $serializer_getInstance_16() {
      if ($serializer_instance_16 == null) new $serializer_16();
      return $serializer_instance_16;
    }
    function ConversationProtocolDTO_init_$Init$(seen1, protocol, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_16().descriptor_1);
      }
      $this.protocol_1 = protocol;
      return $this;
    }
    function ConversationProtocolDTO_init_$Create$(seen1, protocol, serializationConstructorMarker) {
      return ConversationProtocolDTO_init_$Init$(
        seen1,
        protocol,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationProtocolDTO)),
      );
    }
    function ConversationProtocolDTO(protocol) {
      Companion_getInstance_29();
      this.protocol_1 = protocol;
    }
    protoOf(ConversationProtocolDTO).get_protocol_mv93kx_k$ = function () {
      return this.protocol_1;
    };
    protoOf(ConversationProtocolDTO).component1_7eebsc_k$ = function () {
      return this.protocol_1;
    };
    protoOf(ConversationProtocolDTO).copy_5h2orf_k$ = function (protocol) {
      return new ConversationProtocolDTO(protocol);
    };
    protoOf(ConversationProtocolDTO).copy$default_ijbw70_k$ = function (protocol, $super) {
      protocol = protocol === VOID ? this.protocol_1 : protocol;
      return $super === VOID ? this.copy_5h2orf_k$(protocol) : $super.copy_5h2orf_k$.call(this, protocol);
    };
    protoOf(ConversationProtocolDTO).toString = function () {
      return 'ConversationProtocolDTO(protocol=' + this.protocol_1 + ')';
    };
    protoOf(ConversationProtocolDTO).hashCode = function () {
      return this.protocol_1.hashCode();
    };
    protoOf(ConversationProtocolDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationProtocolDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationProtocolDTO ? other : THROW_CCE();
      if (!this.protocol_1.equals(tmp0_other_with_cast.protocol_1)) return false;
      return true;
    };
    function Companion_28() {
      Companion_instance_28 = this;
    }
    protoOf(Companion_28).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_17();
    };
    var Companion_instance_28;
    function Companion_getInstance_30() {
      if (Companion_instance_28 == null) new Companion_28();
      return Companion_instance_28;
    }
    function $serializer_17() {
      $serializer_instance_17 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.conversation.model.ConversationReceiptModeDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('receipt_mode', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_17).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_17).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [ReceiptModeAsIntSerializer_getInstance()];
    };
    protoOf($serializer_17).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          ReceiptModeAsIntSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                ReceiptModeAsIntSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationReceiptModeDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_17).serialize_8ebcs6_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        ReceiptModeAsIntSerializer_getInstance(),
        value.receiptMode_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_17).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_8ebcs6_k$(encoder, value instanceof ConversationReceiptModeDTO ? value : THROW_CCE());
    };
    var $serializer_instance_17;
    function $serializer_getInstance_17() {
      if ($serializer_instance_17 == null) new $serializer_17();
      return $serializer_instance_17;
    }
    function ConversationReceiptModeDTO_init_$Init$(seen1, receiptMode, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_17().descriptor_1);
      }
      $this.receiptMode_1 = receiptMode;
      return $this;
    }
    function ConversationReceiptModeDTO_init_$Create$(seen1, receiptMode, serializationConstructorMarker) {
      return ConversationReceiptModeDTO_init_$Init$(
        seen1,
        receiptMode,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationReceiptModeDTO)),
      );
    }
    function ConversationReceiptModeDTO(receiptMode) {
      Companion_getInstance_30();
      this.receiptMode_1 = receiptMode;
    }
    protoOf(ConversationReceiptModeDTO).get_receiptMode_ni9xf2_k$ = function () {
      return this.receiptMode_1;
    };
    protoOf(ConversationReceiptModeDTO).component1_7eebsc_k$ = function () {
      return this.receiptMode_1;
    };
    protoOf(ConversationReceiptModeDTO).copy_j0c39l_k$ = function (receiptMode) {
      return new ConversationReceiptModeDTO(receiptMode);
    };
    protoOf(ConversationReceiptModeDTO).copy$default_rajrh7_k$ = function (receiptMode, $super) {
      receiptMode = receiptMode === VOID ? this.receiptMode_1 : receiptMode;
      return $super === VOID ? this.copy_j0c39l_k$(receiptMode) : $super.copy_j0c39l_k$.call(this, receiptMode);
    };
    protoOf(ConversationReceiptModeDTO).toString = function () {
      return 'ConversationReceiptModeDTO(receiptMode=' + this.receiptMode_1 + ')';
    };
    protoOf(ConversationReceiptModeDTO).hashCode = function () {
      return this.receiptMode_1.hashCode();
    };
    protoOf(ConversationReceiptModeDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationReceiptModeDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationReceiptModeDTO ? other : THROW_CCE();
      if (!this.receiptMode_1.equals(tmp0_other_with_cast.receiptMode_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_9($this) {
      return $this.$childSerializers_1;
    }
    function Companion_29() {
      Companion_instance_29 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_29).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_18();
    };
    var Companion_instance_29;
    function Companion_getInstance_31() {
      if (Companion_instance_29 == null) new Companion_29();
      return Companion_instance_29;
    }
    function $serializer_18() {
      $serializer_instance_18 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.FeatureConfigData.Unknown',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_18).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_18).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_31().$childSerializers_1[0]];
    };
    protoOf($serializer_18).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_31().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return Unknown_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_18).serialize_d457mu_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_31().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_18).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_d457mu_k$(encoder, value instanceof Unknown ? value : THROW_CCE());
    };
    var $serializer_instance_18;
    function $serializer_getInstance_18() {
      if ($serializer_instance_18 == null) new $serializer_18();
      return $serializer_instance_18;
    }
    function Unknown_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_18().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function Unknown_init_$Create$(seen1, status, serializationConstructorMarker) {
      return Unknown_init_$Init$(seen1, status, serializationConstructorMarker, objectCreate(protoOf(Unknown)));
    }
    function _get_$childSerializers__r2zwns_10($this) {
      return $this.$childSerializers_1;
    }
    function Companion_30() {
      Companion_instance_30 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_30).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_19();
    };
    var Companion_instance_30;
    function Companion_getInstance_32() {
      if (Companion_instance_30 == null) new Companion_30();
      return Companion_instance_30;
    }
    function $serializer_19() {
      $serializer_instance_19 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('appLock', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_19).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_19).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_32().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_34(), tmp0_cached[1]];
    };
    protoOf($serializer_19).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_32().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_34(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_34(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return AppLock_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_19).serialize_71ek1w_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_32().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_34(), value.config_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_19).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_71ek1w_k$(encoder, value instanceof AppLock ? value : THROW_CCE());
    };
    var $serializer_instance_19;
    function $serializer_getInstance_19() {
      if ($serializer_instance_19 == null) new $serializer_19();
      return $serializer_instance_19;
    }
    function AppLock_init_$Init$(seen1, config, status, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_19().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.config_1 = config;
      $this.status_1 = status;
      return $this;
    }
    function AppLock_init_$Create$(seen1, config, status, serializationConstructorMarker) {
      return AppLock_init_$Init$(seen1, config, status, serializationConstructorMarker, objectCreate(protoOf(AppLock)));
    }
    function _get_$childSerializers__r2zwns_11($this) {
      return $this.$childSerializers_1;
    }
    function Companion_31() {
      Companion_instance_31 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_31).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_20();
    };
    var Companion_instance_31;
    function Companion_getInstance_33() {
      if (Companion_instance_31 == null) new Companion_31();
      return Companion_instance_31;
    }
    function $serializer_20() {
      $serializer_instance_20 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('classifiedDomains', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_20).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_20).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_33().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_35(), tmp0_cached[1]];
    };
    protoOf($serializer_20).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_33().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_35(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_35(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ClassifiedDomains_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_20).serialize_mcfmms_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_33().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_35(), value.config_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_20).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_mcfmms_k$(encoder, value instanceof ClassifiedDomains ? value : THROW_CCE());
    };
    var $serializer_instance_20;
    function $serializer_getInstance_20() {
      if ($serializer_instance_20 == null) new $serializer_20();
      return $serializer_instance_20;
    }
    function ClassifiedDomains_init_$Init$(seen1, config, status, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_20().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.config_1 = config;
      $this.status_1 = status;
      return $this;
    }
    function ClassifiedDomains_init_$Create$(seen1, config, status, serializationConstructorMarker) {
      return ClassifiedDomains_init_$Init$(
        seen1,
        config,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(ClassifiedDomains)),
      );
    }
    function _get_$childSerializers__r2zwns_12($this) {
      return $this.$childSerializers_1;
    }
    function Companion_32() {
      Companion_instance_32 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$(), null];
    }
    protoOf(Companion_32).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_21();
    };
    var Companion_instance_32;
    function Companion_getInstance_34() {
      if (Companion_instance_32 == null) new Companion_32();
      return Companion_instance_32;
    }
    function $serializer_21() {
      $serializer_instance_21 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conferenceCalling', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_21).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_21).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_34().$childSerializers_1[0], get_nullable($serializer_getInstance_36())];
    };
    protoOf($serializer_21).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_34().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_36(),
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
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp7_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_36(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConferenceCalling_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_21).serialize_m15mzc_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_34().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_36(),
        value.config_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_21).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_m15mzc_k$(encoder, value instanceof ConferenceCalling ? value : THROW_CCE());
    };
    var $serializer_instance_21;
    function $serializer_getInstance_21() {
      if ($serializer_instance_21 == null) new $serializer_21();
      return $serializer_instance_21;
    }
    function ConferenceCalling_init_$Init$(seen1, status, config, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_21().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      $this.config_1 = config;
      return $this;
    }
    function ConferenceCalling_init_$Create$(seen1, status, config, serializationConstructorMarker) {
      return ConferenceCalling_init_$Init$(
        seen1,
        status,
        config,
        serializationConstructorMarker,
        objectCreate(protoOf(ConferenceCalling)),
      );
    }
    function _get_$childSerializers__r2zwns_13($this) {
      return $this.$childSerializers_1;
    }
    function Companion_33() {
      Companion_instance_33 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_33).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_22();
    };
    var Companion_instance_33;
    function Companion_getInstance_35() {
      if (Companion_instance_33 == null) new Companion_33();
      return Companion_instance_33;
    }
    function $serializer_22() {
      $serializer_instance_22 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversationGuestLinks', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_22).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_22).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_35().$childSerializers_1[0]];
    };
    protoOf($serializer_22).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_35().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationGuestLinks_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_22).serialize_jpqlxw_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_35().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_22).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_jpqlxw_k$(encoder, value instanceof ConversationGuestLinks ? value : THROW_CCE());
    };
    var $serializer_instance_22;
    function $serializer_getInstance_22() {
      if ($serializer_instance_22 == null) new $serializer_22();
      return $serializer_instance_22;
    }
    function ConversationGuestLinks_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_22().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function ConversationGuestLinks_init_$Create$(seen1, status, serializationConstructorMarker) {
      return ConversationGuestLinks_init_$Init$(
        seen1,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationGuestLinks)),
      );
    }
    function _get_$childSerializers__r2zwns_14($this) {
      return $this.$childSerializers_1;
    }
    function Companion_34() {
      Companion_instance_34 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_34).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_23();
    };
    var Companion_instance_34;
    function Companion_getInstance_36() {
      if (Companion_instance_34 == null) new Companion_34();
      return Companion_instance_34;
    }
    function $serializer_23() {
      $serializer_instance_23 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('digitalSignatures', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_23).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_23).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_36().$childSerializers_1[0]];
    };
    protoOf($serializer_23).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_36().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return DigitalSignatures_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_23).serialize_m90n6r_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_36().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_23).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_m90n6r_k$(encoder, value instanceof DigitalSignatures ? value : THROW_CCE());
    };
    var $serializer_instance_23;
    function $serializer_getInstance_23() {
      if ($serializer_instance_23 == null) new $serializer_23();
      return $serializer_instance_23;
    }
    function DigitalSignatures_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_23().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function DigitalSignatures_init_$Create$(seen1, status, serializationConstructorMarker) {
      return DigitalSignatures_init_$Init$(
        seen1,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(DigitalSignatures)),
      );
    }
    function _get_$childSerializers__r2zwns_15($this) {
      return $this.$childSerializers_1;
    }
    function Companion_35() {
      Companion_instance_35 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_35).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_24();
    };
    var Companion_instance_35;
    function Companion_getInstance_37() {
      if (Companion_instance_35 == null) new Companion_35();
      return Companion_instance_35;
    }
    function $serializer_24() {
      $serializer_instance_24 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('fileSharing', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_24).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_24).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_37().$childSerializers_1[0]];
    };
    protoOf($serializer_24).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_37().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return FileSharing_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_24).serialize_4sf99s_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_37().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_24).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_4sf99s_k$(encoder, value instanceof FileSharing ? value : THROW_CCE());
    };
    var $serializer_instance_24;
    function $serializer_getInstance_24() {
      if ($serializer_instance_24 == null) new $serializer_24();
      return $serializer_instance_24;
    }
    function FileSharing_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_24().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function FileSharing_init_$Create$(seen1, status, serializationConstructorMarker) {
      return FileSharing_init_$Init$(seen1, status, serializationConstructorMarker, objectCreate(protoOf(FileSharing)));
    }
    function _get_$childSerializers__r2zwns_16($this) {
      return $this.$childSerializers_1;
    }
    function Companion_36() {
      Companion_instance_36 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_36).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_25();
    };
    var Companion_instance_36;
    function Companion_getInstance_38() {
      if (Companion_instance_36 == null) new Companion_36();
      return Companion_instance_36;
    }
    function $serializer_25() {
      $serializer_instance_25 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('legalhold', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_25).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_25).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_38().$childSerializers_1[0]];
    };
    protoOf($serializer_25).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_38().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return Legalhold_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_25).serialize_mw70o_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_38().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_25).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_mw70o_k$(encoder, value instanceof Legalhold ? value : THROW_CCE());
    };
    var $serializer_instance_25;
    function $serializer_getInstance_25() {
      if ($serializer_instance_25 == null) new $serializer_25();
      return $serializer_instance_25;
    }
    function Legalhold_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_25().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function Legalhold_init_$Create$(seen1, status, serializationConstructorMarker) {
      return Legalhold_init_$Init$(seen1, status, serializationConstructorMarker, objectCreate(protoOf(Legalhold)));
    }
    function _get_$childSerializers__r2zwns_17($this) {
      return $this.$childSerializers_1;
    }
    function Companion_37() {
      Companion_instance_37 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_37).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_26();
    };
    var Companion_instance_37;
    function Companion_getInstance_39() {
      if (Companion_instance_37 == null) new Companion_37();
      return Companion_instance_37;
    }
    function $serializer_26() {
      $serializer_instance_26 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('searchVisibility', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_26).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_26).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_39().$childSerializers_1[0]];
    };
    protoOf($serializer_26).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_39().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return SearchVisibility_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_26).serialize_vph5di_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_39().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_26).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_vph5di_k$(encoder, value instanceof SearchVisibility ? value : THROW_CCE());
    };
    var $serializer_instance_26;
    function $serializer_getInstance_26() {
      if ($serializer_instance_26 == null) new $serializer_26();
      return $serializer_instance_26;
    }
    function SearchVisibility_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_26().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function SearchVisibility_init_$Create$(seen1, status, serializationConstructorMarker) {
      return SearchVisibility_init_$Init$(
        seen1,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(SearchVisibility)),
      );
    }
    function _get_$childSerializers__r2zwns_18($this) {
      return $this.$childSerializers_1;
    }
    function Companion_38() {
      Companion_instance_38 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_38).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_27();
    };
    var Companion_instance_38;
    function Companion_getInstance_40() {
      if (Companion_instance_38 == null) new Companion_38();
      return Companion_instance_38;
    }
    function $serializer_27() {
      $serializer_instance_27 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('selfDeletingMessages', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_27).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_27).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_40().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_37(), tmp0_cached[1]];
    };
    protoOf($serializer_27).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_40().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_37(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_37(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return SelfDeletingMessages_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_27).serialize_zhn3lc_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_40().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_37(), value.config_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_27).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_zhn3lc_k$(encoder, value instanceof SelfDeletingMessages ? value : THROW_CCE());
    };
    var $serializer_instance_27;
    function $serializer_getInstance_27() {
      if ($serializer_instance_27 == null) new $serializer_27();
      return $serializer_instance_27;
    }
    function SelfDeletingMessages_init_$Init$(seen1, config, status, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_27().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.config_1 = config;
      $this.status_1 = status;
      return $this;
    }
    function SelfDeletingMessages_init_$Create$(seen1, config, status, serializationConstructorMarker) {
      return SelfDeletingMessages_init_$Init$(
        seen1,
        config,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(SelfDeletingMessages)),
      );
    }
    function _get_$childSerializers__r2zwns_19($this) {
      return $this.$childSerializers_1;
    }
    function Companion_39() {
      Companion_instance_39 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_39).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_28();
    };
    var Companion_instance_39;
    function Companion_getInstance_41() {
      if (Companion_instance_39 == null) new Companion_39();
      return Companion_instance_39;
    }
    function $serializer_28() {
      $serializer_instance_28 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('sndFactorPasswordChallenge', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_28).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_28).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_41().$childSerializers_1[0]];
    };
    protoOf($serializer_28).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_41().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return SecondFactorPasswordChallenge_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_28).serialize_40638r_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_41().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_28).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_40638r_k$(encoder, value instanceof SecondFactorPasswordChallenge ? value : THROW_CCE());
    };
    var $serializer_instance_28;
    function $serializer_getInstance_28() {
      if ($serializer_instance_28 == null) new $serializer_28();
      return $serializer_instance_28;
    }
    function SecondFactorPasswordChallenge_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_28().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function SecondFactorPasswordChallenge_init_$Create$(seen1, status, serializationConstructorMarker) {
      return SecondFactorPasswordChallenge_init_$Init$(
        seen1,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(SecondFactorPasswordChallenge)),
      );
    }
    function _get_$childSerializers__r2zwns_20($this) {
      return $this.$childSerializers_1;
    }
    function Companion_40() {
      Companion_instance_40 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_40).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_29();
    };
    var Companion_instance_40;
    function Companion_getInstance_42() {
      if (Companion_instance_40 == null) new Companion_40();
      return Companion_instance_40;
    }
    function $serializer_29() {
      $serializer_instance_29 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('sso', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_29).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_29).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_42().$childSerializers_1[0]];
    };
    protoOf($serializer_29).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_42().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return SSO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_29).serialize_pgu70f_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_42().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_29).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_pgu70f_k$(encoder, value instanceof SSO ? value : THROW_CCE());
    };
    var $serializer_instance_29;
    function $serializer_getInstance_29() {
      if ($serializer_instance_29 == null) new $serializer_29();
      return $serializer_instance_29;
    }
    function SSO_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_29().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function SSO_init_$Create$(seen1, status, serializationConstructorMarker) {
      return SSO_init_$Init$(seen1, status, serializationConstructorMarker, objectCreate(protoOf(SSO)));
    }
    function _get_$childSerializers__r2zwns_21($this) {
      return $this.$childSerializers_1;
    }
    function Companion_41() {
      Companion_instance_41 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_41).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_30();
    };
    var Companion_instance_41;
    function Companion_getInstance_43() {
      if (Companion_instance_41 == null) new Companion_41();
      return Companion_instance_41;
    }
    function $serializer_30() {
      $serializer_instance_30 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('validateSAMLemails', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_30).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_30).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_43().$childSerializers_1[0]];
    };
    protoOf($serializer_30).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_43().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ValidateSAMLEmails_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_30).serialize_70ah06_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_43().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_30).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_70ah06_k$(encoder, value instanceof ValidateSAMLEmails ? value : THROW_CCE());
    };
    var $serializer_instance_30;
    function $serializer_getInstance_30() {
      if ($serializer_instance_30 == null) new $serializer_30();
      return $serializer_instance_30;
    }
    function ValidateSAMLEmails_init_$Init$(seen1, status, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_30().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.status_1 = status;
      return $this;
    }
    function ValidateSAMLEmails_init_$Create$(seen1, status, serializationConstructorMarker) {
      return ValidateSAMLEmails_init_$Init$(
        seen1,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(ValidateSAMLEmails)),
      );
    }
    function _get_$childSerializers__r2zwns_22($this) {
      return $this.$childSerializers_1;
    }
    function Companion_42() {
      Companion_instance_42 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_42).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_31();
    };
    var Companion_instance_42;
    function Companion_getInstance_44() {
      if (Companion_instance_42 == null) new Companion_42();
      return Companion_instance_42;
    }
    function $serializer_31() {
      $serializer_instance_31 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('mls', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_31).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_31).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_44().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_38(), tmp0_cached[1]];
    };
    protoOf($serializer_31).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_44().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_38(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_38(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MLS_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_31).serialize_y0v3uk_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_44().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_38(), value.config_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_31).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_y0v3uk_k$(encoder, value instanceof MLS ? value : THROW_CCE());
    };
    var $serializer_instance_31;
    function $serializer_getInstance_31() {
      if ($serializer_instance_31 == null) new $serializer_31();
      return $serializer_instance_31;
    }
    function MLS_init_$Init$(seen1, config, status, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_31().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.config_1 = config;
      $this.status_1 = status;
      return $this;
    }
    function MLS_init_$Create$(seen1, config, status, serializationConstructorMarker) {
      return MLS_init_$Init$(seen1, config, status, serializationConstructorMarker, objectCreate(protoOf(MLS)));
    }
    function _get_$childSerializers__r2zwns_23($this) {
      return $this.$childSerializers_1;
    }
    function Companion_43() {
      Companion_instance_43 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_43).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_32();
    };
    var Companion_instance_43;
    function Companion_getInstance_45() {
      if (Companion_instance_43 == null) new Companion_43();
      return Companion_instance_43;
    }
    function $serializer_32() {
      $serializer_instance_32 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('mlsE2EId', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_32).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_32).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_45().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_39(), tmp0_cached[1]];
    };
    protoOf($serializer_32).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_45().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_39(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_39(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return E2EI_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_32).serialize_cmqbj5_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_45().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_39(), value.config_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_32).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_cmqbj5_k$(encoder, value instanceof E2EI ? value : THROW_CCE());
    };
    var $serializer_instance_32;
    function $serializer_getInstance_32() {
      if ($serializer_instance_32 == null) new $serializer_32();
      return $serializer_instance_32;
    }
    function E2EI_init_$Init$(seen1, config, status, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_32().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.config_1 = config;
      $this.status_1 = status;
      return $this;
    }
    function E2EI_init_$Create$(seen1, config, status, serializationConstructorMarker) {
      return E2EI_init_$Init$(seen1, config, status, serializationConstructorMarker, objectCreate(protoOf(E2EI)));
    }
    function _get_$childSerializers__r2zwns_24($this) {
      return $this.$childSerializers_1;
    }
    function Companion_44() {
      Companion_instance_44 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [null, Companion_getInstance_48().serializer_9w0wvi_k$()];
    }
    protoOf(Companion_44).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_33();
    };
    var Companion_instance_44;
    function Companion_getInstance_46() {
      if (Companion_instance_44 == null) new Companion_44();
      return Companion_instance_44;
    }
    function $serializer_33() {
      $serializer_instance_33 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('mlsMigration', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('config', false);
      tmp0_serialDesc.addElement_5pzumi_k$('status', false);
      tmp0_serialDesc.pushClassAnnotation_xtmllk_k$(new JsonClassDiscriminator('name'));
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_33).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_33).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_46().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_40(), tmp0_cached[1]];
    };
    protoOf($serializer_33).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp7_cached = Companion_getInstance_46().$childSerializers_1;
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_40(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp6_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_40(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp7_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MLSMigration_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_33).serialize_1gu23u_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_46().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_40(), value.config_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_33).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_1gu23u_k$(encoder, value instanceof MLSMigration ? value : THROW_CCE());
    };
    var $serializer_instance_33;
    function $serializer_getInstance_33() {
      if ($serializer_instance_33 == null) new $serializer_33();
      return $serializer_instance_33;
    }
    function MLSMigration_init_$Init$(seen1, config, status, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_33().descriptor_1);
      }
      FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.config_1 = config;
      $this.status_1 = status;
      return $this;
    }
    function MLSMigration_init_$Create$(seen1, config, status, serializationConstructorMarker) {
      return MLSMigration_init_$Init$(
        seen1,
        config,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(MLSMigration)),
      );
    }
    function _get_$cachedSerializer__te6jhj_6($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function FeatureConfigData$Companion$_anonymous__ph5vf7() {
      var tmp = getKClass(FeatureConfigData);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [
        getKClass(AppLock),
        getKClass(ClassifiedDomains),
        getKClass(ConferenceCalling),
        getKClass(ConversationGuestLinks),
        getKClass(DigitalSignatures),
        getKClass(E2EI),
        getKClass(FileSharing),
        getKClass(Legalhold),
        getKClass(MLS),
        getKClass(MLSMigration),
        getKClass(SSO),
        getKClass(SearchVisibility),
        getKClass(SecondFactorPasswordChallenge),
        getKClass(SelfDeletingMessages),
        getKClass(Unknown),
        getKClass(ValidateSAMLEmails),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [
        $serializer_getInstance_19(),
        $serializer_getInstance_20(),
        $serializer_getInstance_21(),
        $serializer_getInstance_22(),
        $serializer_getInstance_23(),
        $serializer_getInstance_32(),
        $serializer_getInstance_24(),
        $serializer_getInstance_25(),
        $serializer_getInstance_31(),
        $serializer_getInstance_33(),
        $serializer_getInstance_29(),
        $serializer_getInstance_26(),
        $serializer_getInstance_28(),
        $serializer_getInstance_27(),
        $serializer_getInstance_18(),
        $serializer_getInstance_30(),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [new JsonClassDiscriminator('name')];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.featureConfigs.FeatureConfigData',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function Unknown(status) {
      Companion_getInstance_31();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(Unknown).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(Unknown).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(Unknown).copy_ctsg2x_k$ = function (status) {
      return new Unknown(status);
    };
    protoOf(Unknown).copy$default_30kk0d_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(Unknown).toString = function () {
      return 'Unknown(status=' + this.status_1 + ')';
    };
    protoOf(Unknown).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(Unknown).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Unknown)) return false;
      var tmp0_other_with_cast = other instanceof Unknown ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function AppLock(config, status) {
      Companion_getInstance_32();
      FeatureConfigData.call(this);
      this.config_1 = config;
      this.status_1 = status;
    }
    protoOf(AppLock).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(AppLock).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(AppLock).component1_7eebsc_k$ = function () {
      return this.config_1;
    };
    protoOf(AppLock).component2_7eebsb_k$ = function () {
      return this.status_1;
    };
    protoOf(AppLock).copy_jx7kdi_k$ = function (config, status) {
      return new AppLock(config, status);
    };
    protoOf(AppLock).copy$default_lp2yzz_k$ = function (config, status, $super) {
      config = config === VOID ? this.config_1 : config;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_jx7kdi_k$(config, status) : $super.copy_jx7kdi_k$.call(this, config, status);
    };
    protoOf(AppLock).toString = function () {
      return 'AppLock(config=' + this.config_1 + ', status=' + this.status_1 + ')';
    };
    protoOf(AppLock).hashCode = function () {
      var result = this.config_1.hashCode();
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(AppLock).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof AppLock)) return false;
      var tmp0_other_with_cast = other instanceof AppLock ? other : THROW_CCE();
      if (!this.config_1.equals(tmp0_other_with_cast.config_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function ClassifiedDomains(config, status) {
      Companion_getInstance_33();
      FeatureConfigData.call(this);
      this.config_1 = config;
      this.status_1 = status;
    }
    protoOf(ClassifiedDomains).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(ClassifiedDomains).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(ClassifiedDomains).component1_7eebsc_k$ = function () {
      return this.config_1;
    };
    protoOf(ClassifiedDomains).component2_7eebsb_k$ = function () {
      return this.status_1;
    };
    protoOf(ClassifiedDomains).copy_qyzsga_k$ = function (config, status) {
      return new ClassifiedDomains(config, status);
    };
    protoOf(ClassifiedDomains).copy$default_qssbgv_k$ = function (config, status, $super) {
      config = config === VOID ? this.config_1 : config;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_qyzsga_k$(config, status) : $super.copy_qyzsga_k$.call(this, config, status);
    };
    protoOf(ClassifiedDomains).toString = function () {
      return 'ClassifiedDomains(config=' + this.config_1 + ', status=' + this.status_1 + ')';
    };
    protoOf(ClassifiedDomains).hashCode = function () {
      var result = this.config_1.hashCode();
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(ClassifiedDomains).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ClassifiedDomains)) return false;
      var tmp0_other_with_cast = other instanceof ClassifiedDomains ? other : THROW_CCE();
      if (!this.config_1.equals(tmp0_other_with_cast.config_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function ConferenceCalling(status, config) {
      Companion_getInstance_34();
      FeatureConfigData.call(this);
      this.status_1 = status;
      this.config_1 = config;
    }
    protoOf(ConferenceCalling).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(ConferenceCalling).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(ConferenceCalling).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(ConferenceCalling).component2_7eebsb_k$ = function () {
      return this.config_1;
    };
    protoOf(ConferenceCalling).copy_qsk1zb_k$ = function (status, config) {
      return new ConferenceCalling(status, config);
    };
    protoOf(ConferenceCalling).copy$default_gn0y24_k$ = function (status, config, $super) {
      status = status === VOID ? this.status_1 : status;
      config = config === VOID ? this.config_1 : config;
      return $super === VOID ? this.copy_qsk1zb_k$(status, config) : $super.copy_qsk1zb_k$.call(this, status, config);
    };
    protoOf(ConferenceCalling).toString = function () {
      return 'ConferenceCalling(status=' + this.status_1 + ', config=' + this.config_1 + ')';
    };
    protoOf(ConferenceCalling).hashCode = function () {
      var result = this.status_1.hashCode();
      result = (imul(result, 31) + (this.config_1 == null ? 0 : this.config_1.hashCode())) | 0;
      return result;
    };
    protoOf(ConferenceCalling).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConferenceCalling)) return false;
      var tmp0_other_with_cast = other instanceof ConferenceCalling ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      if (!equals(this.config_1, tmp0_other_with_cast.config_1)) return false;
      return true;
    };
    function ConversationGuestLinks(status) {
      Companion_getInstance_35();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(ConversationGuestLinks).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(ConversationGuestLinks).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(ConversationGuestLinks).copy_ctsg2x_k$ = function (status) {
      return new ConversationGuestLinks(status);
    };
    protoOf(ConversationGuestLinks).copy$default_d8inq5_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(ConversationGuestLinks).toString = function () {
      return 'ConversationGuestLinks(status=' + this.status_1 + ')';
    };
    protoOf(ConversationGuestLinks).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(ConversationGuestLinks).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationGuestLinks)) return false;
      var tmp0_other_with_cast = other instanceof ConversationGuestLinks ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function DigitalSignatures(status) {
      Companion_getInstance_36();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(DigitalSignatures).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(DigitalSignatures).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(DigitalSignatures).copy_ctsg2x_k$ = function (status) {
      return new DigitalSignatures(status);
    };
    protoOf(DigitalSignatures).copy$default_xd9zh8_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(DigitalSignatures).toString = function () {
      return 'DigitalSignatures(status=' + this.status_1 + ')';
    };
    protoOf(DigitalSignatures).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(DigitalSignatures).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof DigitalSignatures)) return false;
      var tmp0_other_with_cast = other instanceof DigitalSignatures ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function FileSharing(status) {
      Companion_getInstance_37();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(FileSharing).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(FileSharing).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(FileSharing).copy_ctsg2x_k$ = function (status) {
      return new FileSharing(status);
    };
    protoOf(FileSharing).copy$default_luidrd_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(FileSharing).toString = function () {
      return 'FileSharing(status=' + this.status_1 + ')';
    };
    protoOf(FileSharing).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(FileSharing).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof FileSharing)) return false;
      var tmp0_other_with_cast = other instanceof FileSharing ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function Legalhold(status) {
      Companion_getInstance_38();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(Legalhold).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(Legalhold).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(Legalhold).copy_ctsg2x_k$ = function (status) {
      return new Legalhold(status);
    };
    protoOf(Legalhold).copy$default_dptzdt_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(Legalhold).toString = function () {
      return 'Legalhold(status=' + this.status_1 + ')';
    };
    protoOf(Legalhold).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(Legalhold).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Legalhold)) return false;
      var tmp0_other_with_cast = other instanceof Legalhold ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function SearchVisibility(status) {
      Companion_getInstance_39();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(SearchVisibility).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(SearchVisibility).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(SearchVisibility).copy_ctsg2x_k$ = function (status) {
      return new SearchVisibility(status);
    };
    protoOf(SearchVisibility).copy$default_qftfzh_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(SearchVisibility).toString = function () {
      return 'SearchVisibility(status=' + this.status_1 + ')';
    };
    protoOf(SearchVisibility).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(SearchVisibility).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof SearchVisibility)) return false;
      var tmp0_other_with_cast = other instanceof SearchVisibility ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function SelfDeletingMessages(config, status) {
      Companion_getInstance_40();
      FeatureConfigData.call(this);
      this.config_1 = config;
      this.status_1 = status;
    }
    protoOf(SelfDeletingMessages).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(SelfDeletingMessages).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(SelfDeletingMessages).component1_7eebsc_k$ = function () {
      return this.config_1;
    };
    protoOf(SelfDeletingMessages).component2_7eebsb_k$ = function () {
      return this.status_1;
    };
    protoOf(SelfDeletingMessages).copy_ib13lm_k$ = function (config, status) {
      return new SelfDeletingMessages(config, status);
    };
    protoOf(SelfDeletingMessages).copy$default_cee1rr_k$ = function (config, status, $super) {
      config = config === VOID ? this.config_1 : config;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ib13lm_k$(config, status) : $super.copy_ib13lm_k$.call(this, config, status);
    };
    protoOf(SelfDeletingMessages).toString = function () {
      return 'SelfDeletingMessages(config=' + this.config_1 + ', status=' + this.status_1 + ')';
    };
    protoOf(SelfDeletingMessages).hashCode = function () {
      var result = this.config_1.hashCode();
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(SelfDeletingMessages).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof SelfDeletingMessages)) return false;
      var tmp0_other_with_cast = other instanceof SelfDeletingMessages ? other : THROW_CCE();
      if (!this.config_1.equals(tmp0_other_with_cast.config_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function SecondFactorPasswordChallenge(status) {
      Companion_getInstance_41();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(SecondFactorPasswordChallenge).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(SecondFactorPasswordChallenge).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(SecondFactorPasswordChallenge).copy_ctsg2x_k$ = function (status) {
      return new SecondFactorPasswordChallenge(status);
    };
    protoOf(SecondFactorPasswordChallenge).copy$default_oc869e_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(SecondFactorPasswordChallenge).toString = function () {
      return 'SecondFactorPasswordChallenge(status=' + this.status_1 + ')';
    };
    protoOf(SecondFactorPasswordChallenge).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(SecondFactorPasswordChallenge).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof SecondFactorPasswordChallenge)) return false;
      var tmp0_other_with_cast = other instanceof SecondFactorPasswordChallenge ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function SSO(status) {
      Companion_getInstance_42();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(SSO).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(SSO).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(SSO).copy_ctsg2x_k$ = function (status) {
      return new SSO(status);
    };
    protoOf(SSO).copy$default_fzeako_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(SSO).toString = function () {
      return 'SSO(status=' + this.status_1 + ')';
    };
    protoOf(SSO).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(SSO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof SSO)) return false;
      var tmp0_other_with_cast = other instanceof SSO ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function ValidateSAMLEmails(status) {
      Companion_getInstance_43();
      FeatureConfigData.call(this);
      this.status_1 = status;
    }
    protoOf(ValidateSAMLEmails).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(ValidateSAMLEmails).component1_7eebsc_k$ = function () {
      return this.status_1;
    };
    protoOf(ValidateSAMLEmails).copy_ctsg2x_k$ = function (status) {
      return new ValidateSAMLEmails(status);
    };
    protoOf(ValidateSAMLEmails).copy$default_uj34nh_k$ = function (status, $super) {
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_ctsg2x_k$(status) : $super.copy_ctsg2x_k$.call(this, status);
    };
    protoOf(ValidateSAMLEmails).toString = function () {
      return 'ValidateSAMLEmails(status=' + this.status_1 + ')';
    };
    protoOf(ValidateSAMLEmails).hashCode = function () {
      return this.status_1.hashCode();
    };
    protoOf(ValidateSAMLEmails).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ValidateSAMLEmails)) return false;
      var tmp0_other_with_cast = other instanceof ValidateSAMLEmails ? other : THROW_CCE();
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function MLS(config, status) {
      Companion_getInstance_44();
      FeatureConfigData.call(this);
      this.config_1 = config;
      this.status_1 = status;
    }
    protoOf(MLS).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(MLS).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(MLS).component1_7eebsc_k$ = function () {
      return this.config_1;
    };
    protoOf(MLS).component2_7eebsb_k$ = function () {
      return this.status_1;
    };
    protoOf(MLS).copy_pzqr6m_k$ = function (config, status) {
      return new MLS(config, status);
    };
    protoOf(MLS).copy$default_t5xi8v_k$ = function (config, status, $super) {
      config = config === VOID ? this.config_1 : config;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_pzqr6m_k$(config, status) : $super.copy_pzqr6m_k$.call(this, config, status);
    };
    protoOf(MLS).toString = function () {
      return 'MLS(config=' + this.config_1 + ', status=' + this.status_1 + ')';
    };
    protoOf(MLS).hashCode = function () {
      var result = this.config_1.hashCode();
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(MLS).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MLS)) return false;
      var tmp0_other_with_cast = other instanceof MLS ? other : THROW_CCE();
      if (!this.config_1.equals(tmp0_other_with_cast.config_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function E2EI(config, status) {
      Companion_getInstance_45();
      FeatureConfigData.call(this);
      this.config_1 = config;
      this.status_1 = status;
    }
    protoOf(E2EI).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(E2EI).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(E2EI).component1_7eebsc_k$ = function () {
      return this.config_1;
    };
    protoOf(E2EI).component2_7eebsb_k$ = function () {
      return this.status_1;
    };
    protoOf(E2EI).copy_743r5j_k$ = function (config, status) {
      return new E2EI(config, status);
    };
    protoOf(E2EI).copy$default_3k117b_k$ = function (config, status, $super) {
      config = config === VOID ? this.config_1 : config;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_743r5j_k$(config, status) : $super.copy_743r5j_k$.call(this, config, status);
    };
    protoOf(E2EI).toString = function () {
      return 'E2EI(config=' + this.config_1 + ', status=' + this.status_1 + ')';
    };
    protoOf(E2EI).hashCode = function () {
      var result = this.config_1.hashCode();
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(E2EI).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof E2EI)) return false;
      var tmp0_other_with_cast = other instanceof E2EI ? other : THROW_CCE();
      if (!this.config_1.equals(tmp0_other_with_cast.config_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function MLSMigration(config, status) {
      Companion_getInstance_46();
      FeatureConfigData.call(this);
      this.config_1 = config;
      this.status_1 = status;
    }
    protoOf(MLSMigration).get_config_c0698r_k$ = function () {
      return this.config_1;
    };
    protoOf(MLSMigration).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(MLSMigration).component1_7eebsc_k$ = function () {
      return this.config_1;
    };
    protoOf(MLSMigration).component2_7eebsb_k$ = function () {
      return this.status_1;
    };
    protoOf(MLSMigration).copy_zzp6o_k$ = function (config, status) {
      return new MLSMigration(config, status);
    };
    protoOf(MLSMigration).copy$default_t7j393_k$ = function (config, status, $super) {
      config = config === VOID ? this.config_1 : config;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID ? this.copy_zzp6o_k$(config, status) : $super.copy_zzp6o_k$.call(this, config, status);
    };
    protoOf(MLSMigration).toString = function () {
      return 'MLSMigration(config=' + this.config_1 + ', status=' + this.status_1 + ')';
    };
    protoOf(MLSMigration).hashCode = function () {
      var result = this.config_1.hashCode();
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(MLSMigration).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MLSMigration)) return false;
      var tmp0_other_with_cast = other instanceof MLSMigration ? other : THROW_CCE();
      if (!this.config_1.equals(tmp0_other_with_cast.config_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function Companion_45() {
      Companion_instance_45 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, FeatureConfigData$Companion$_anonymous__ph5vf7);
    }
    protoOf(Companion_45).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_6(this);
    };
    protoOf(Companion_45).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_45;
    function Companion_getInstance_47() {
      if (Companion_instance_45 == null) new Companion_45();
      return Companion_instance_45;
    }
    function FeatureConfigData_init_$Init$(seen1, serializationConstructorMarker, $this) {
      return $this;
    }
    function FeatureConfigData_init_$Create$(seen1, serializationConstructorMarker) {
      return FeatureConfigData_init_$Init$(
        seen1,
        serializationConstructorMarker,
        objectCreate(protoOf(FeatureConfigData)),
      );
    }
    function FeatureConfigData() {
      Companion_getInstance_47();
    }
    function _get_$cachedSerializer__te6jhj_7($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function FeatureFlagStatusDTO$Companion$_anonymous__ynadzw() {
      var tmp = values_8();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['enabled', 'disabled'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.featureConfigs.FeatureFlagStatusDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var FeatureFlagStatusDTO_ENABLED_instance;
    var FeatureFlagStatusDTO_DISABLED_instance;
    function Companion_46() {
      Companion_instance_46 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, FeatureFlagStatusDTO$Companion$_anonymous__ynadzw);
    }
    protoOf(Companion_46).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_7(this);
    };
    protoOf(Companion_46).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_46;
    function Companion_getInstance_48() {
      FeatureFlagStatusDTO_initEntries();
      if (Companion_instance_46 == null) new Companion_46();
      return Companion_instance_46;
    }
    function values_8() {
      return [FeatureFlagStatusDTO_ENABLED_getInstance(), FeatureFlagStatusDTO_DISABLED_getInstance()];
    }
    function valueOf_8(value) {
      switch (value) {
        case 'ENABLED':
          return FeatureFlagStatusDTO_ENABLED_getInstance();
        case 'DISABLED':
          return FeatureFlagStatusDTO_DISABLED_getInstance();
        default:
          FeatureFlagStatusDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_8() {
      if ($ENTRIES_8 == null) $ENTRIES_8 = enumEntries(values_8());
      return $ENTRIES_8;
    }
    var FeatureFlagStatusDTO_entriesInitialized;
    function FeatureFlagStatusDTO_initEntries() {
      if (FeatureFlagStatusDTO_entriesInitialized) return Unit_getInstance();
      FeatureFlagStatusDTO_entriesInitialized = true;
      FeatureFlagStatusDTO_ENABLED_instance = new FeatureFlagStatusDTO('ENABLED', 0);
      FeatureFlagStatusDTO_DISABLED_instance = new FeatureFlagStatusDTO('DISABLED', 1);
      Companion_getInstance_48();
    }
    var $ENTRIES_8;
    function FeatureFlagStatusDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function Companion_47() {
      Companion_instance_47 = this;
    }
    protoOf(Companion_47).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_34();
    };
    var Companion_instance_47;
    function Companion_getInstance_49() {
      if (Companion_instance_47 == null) new Companion_47();
      return Companion_instance_47;
    }
    function $serializer_34() {
      $serializer_instance_34 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.AppLockConfigDTO',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('enforceAppLock', false);
      tmp0_serialDesc.addElement_5pzumi_k$('inactivityTimeoutSecs', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_34).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_34).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [BooleanSerializer_getInstance(), IntSerializer_getInstance()];
    };
    protoOf($serializer_34).deserialize_sy6x50_k$ = function (decoder) {
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
      return AppLockConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_34).serialize_rj31cy_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeBooleanElement_ydht7q_k$(tmp0_desc, 0, value.enforceAppLock_1);
      tmp1_output.encodeIntElement_krhhce_k$(tmp0_desc, 1, value.inactivityTimeoutSecs_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_34).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_rj31cy_k$(encoder, value instanceof AppLockConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_34;
    function $serializer_getInstance_34() {
      if ($serializer_instance_34 == null) new $serializer_34();
      return $serializer_instance_34;
    }
    function AppLockConfigDTO_init_$Init$(
      seen1,
      enforceAppLock,
      inactivityTimeoutSecs,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_34().descriptor_1);
      }
      $this.enforceAppLock_1 = enforceAppLock;
      $this.inactivityTimeoutSecs_1 = inactivityTimeoutSecs;
      return $this;
    }
    function AppLockConfigDTO_init_$Create$(
      seen1,
      enforceAppLock,
      inactivityTimeoutSecs,
      serializationConstructorMarker,
    ) {
      return AppLockConfigDTO_init_$Init$(
        seen1,
        enforceAppLock,
        inactivityTimeoutSecs,
        serializationConstructorMarker,
        objectCreate(protoOf(AppLockConfigDTO)),
      );
    }
    function AppLockConfigDTO(enforceAppLock, inactivityTimeoutSecs) {
      Companion_getInstance_49();
      this.enforceAppLock_1 = enforceAppLock;
      this.inactivityTimeoutSecs_1 = inactivityTimeoutSecs;
    }
    protoOf(AppLockConfigDTO).get_enforceAppLock_1ax59_k$ = function () {
      return this.enforceAppLock_1;
    };
    protoOf(AppLockConfigDTO).get_inactivityTimeoutSecs_wsonga_k$ = function () {
      return this.inactivityTimeoutSecs_1;
    };
    protoOf(AppLockConfigDTO).component1_7eebsc_k$ = function () {
      return this.enforceAppLock_1;
    };
    protoOf(AppLockConfigDTO).component2_7eebsb_k$ = function () {
      return this.inactivityTimeoutSecs_1;
    };
    protoOf(AppLockConfigDTO).copy_xajy4o_k$ = function (enforceAppLock, inactivityTimeoutSecs) {
      return new AppLockConfigDTO(enforceAppLock, inactivityTimeoutSecs);
    };
    protoOf(AppLockConfigDTO).copy$default_uc1pa7_k$ = function (enforceAppLock, inactivityTimeoutSecs, $super) {
      enforceAppLock = enforceAppLock === VOID ? this.enforceAppLock_1 : enforceAppLock;
      inactivityTimeoutSecs = inactivityTimeoutSecs === VOID ? this.inactivityTimeoutSecs_1 : inactivityTimeoutSecs;
      return $super === VOID
        ? this.copy_xajy4o_k$(enforceAppLock, inactivityTimeoutSecs)
        : $super.copy_xajy4o_k$.call(this, enforceAppLock, inactivityTimeoutSecs);
    };
    protoOf(AppLockConfigDTO).toString = function () {
      return (
        'AppLockConfigDTO(enforceAppLock=' +
        this.enforceAppLock_1 +
        ', inactivityTimeoutSecs=' +
        this.inactivityTimeoutSecs_1 +
        ')'
      );
    };
    protoOf(AppLockConfigDTO).hashCode = function () {
      var result = getBooleanHashCode(this.enforceAppLock_1);
      result = (imul(result, 31) + this.inactivityTimeoutSecs_1) | 0;
      return result;
    };
    protoOf(AppLockConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof AppLockConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof AppLockConfigDTO ? other : THROW_CCE();
      if (!(this.enforceAppLock_1 === tmp0_other_with_cast.enforceAppLock_1)) return false;
      if (!(this.inactivityTimeoutSecs_1 === tmp0_other_with_cast.inactivityTimeoutSecs_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_25($this) {
      return $this.$childSerializers_1;
    }
    function Companion_48() {
      Companion_instance_48 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [new ArrayListSerializer(StringSerializer_getInstance())];
    }
    protoOf(Companion_48).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_35();
    };
    var Companion_instance_48;
    function Companion_getInstance_50() {
      if (Companion_instance_48 == null) new Companion_48();
      return Companion_instance_48;
    }
    function $serializer_35() {
      $serializer_instance_35 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.ClassifiedDomainsConfigDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('domains', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_35).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_35).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_50().$childSerializers_1[0]];
    };
    protoOf($serializer_35).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_50().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ClassifiedDomainsConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_35).serialize_sfxsz6_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_50().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.domains_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_35).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_sfxsz6_k$(encoder, value instanceof ClassifiedDomainsConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_35;
    function $serializer_getInstance_35() {
      if ($serializer_instance_35 == null) new $serializer_35();
      return $serializer_instance_35;
    }
    function ClassifiedDomainsConfigDTO_init_$Init$(seen1, domains, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_35().descriptor_1);
      }
      $this.domains_1 = domains;
      return $this;
    }
    function ClassifiedDomainsConfigDTO_init_$Create$(seen1, domains, serializationConstructorMarker) {
      return ClassifiedDomainsConfigDTO_init_$Init$(
        seen1,
        domains,
        serializationConstructorMarker,
        objectCreate(protoOf(ClassifiedDomainsConfigDTO)),
      );
    }
    function ClassifiedDomainsConfigDTO(domains) {
      Companion_getInstance_50();
      this.domains_1 = domains;
    }
    protoOf(ClassifiedDomainsConfigDTO).get_domains_vnkzly_k$ = function () {
      return this.domains_1;
    };
    protoOf(ClassifiedDomainsConfigDTO).component1_7eebsc_k$ = function () {
      return this.domains_1;
    };
    protoOf(ClassifiedDomainsConfigDTO).copy_is4t59_k$ = function (domains) {
      return new ClassifiedDomainsConfigDTO(domains);
    };
    protoOf(ClassifiedDomainsConfigDTO).copy$default_8xo22z_k$ = function (domains, $super) {
      domains = domains === VOID ? this.domains_1 : domains;
      return $super === VOID ? this.copy_is4t59_k$(domains) : $super.copy_is4t59_k$.call(this, domains);
    };
    protoOf(ClassifiedDomainsConfigDTO).toString = function () {
      return 'ClassifiedDomainsConfigDTO(domains=' + this.domains_1 + ')';
    };
    protoOf(ClassifiedDomainsConfigDTO).hashCode = function () {
      return hashCode(this.domains_1);
    };
    protoOf(ClassifiedDomainsConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ClassifiedDomainsConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof ClassifiedDomainsConfigDTO ? other : THROW_CCE();
      if (!equals(this.domains_1, tmp0_other_with_cast.domains_1)) return false;
      return true;
    };
    function Companion_49() {
      Companion_instance_49 = this;
    }
    protoOf(Companion_49).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_36();
    };
    var Companion_instance_49;
    function Companion_getInstance_51() {
      if (Companion_instance_49 == null) new Companion_49();
      return Companion_instance_49;
    }
    function $serializer_36() {
      $serializer_instance_36 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.ConferenceCallingConfigDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('useSFTForOneToOneCalls', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_36).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_36).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [BooleanSerializer_getInstance()];
    };
    protoOf($serializer_36).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = false;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeBooleanElement_vuyhtj_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConferenceCallingConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_36).serialize_2xxvne_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeBooleanElement_ydht7q_k$(tmp0_desc, 0, value.useSFTForOneToOneCalls_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_36).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_2xxvne_k$(encoder, value instanceof ConferenceCallingConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_36;
    function $serializer_getInstance_36() {
      if ($serializer_instance_36 == null) new $serializer_36();
      return $serializer_instance_36;
    }
    function ConferenceCallingConfigDTO_init_$Init$(
      seen1,
      useSFTForOneToOneCalls,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_36().descriptor_1);
      }
      $this.useSFTForOneToOneCalls_1 = useSFTForOneToOneCalls;
      return $this;
    }
    function ConferenceCallingConfigDTO_init_$Create$(seen1, useSFTForOneToOneCalls, serializationConstructorMarker) {
      return ConferenceCallingConfigDTO_init_$Init$(
        seen1,
        useSFTForOneToOneCalls,
        serializationConstructorMarker,
        objectCreate(protoOf(ConferenceCallingConfigDTO)),
      );
    }
    function ConferenceCallingConfigDTO(useSFTForOneToOneCalls) {
      Companion_getInstance_51();
      this.useSFTForOneToOneCalls_1 = useSFTForOneToOneCalls;
    }
    protoOf(ConferenceCallingConfigDTO).get_useSFTForOneToOneCalls_bk4s8m_k$ = function () {
      return this.useSFTForOneToOneCalls_1;
    };
    protoOf(ConferenceCallingConfigDTO).component1_7eebsc_k$ = function () {
      return this.useSFTForOneToOneCalls_1;
    };
    protoOf(ConferenceCallingConfigDTO).copy_o18wmo_k$ = function (useSFTForOneToOneCalls) {
      return new ConferenceCallingConfigDTO(useSFTForOneToOneCalls);
    };
    protoOf(ConferenceCallingConfigDTO).copy$default_l0db98_k$ = function (useSFTForOneToOneCalls, $super) {
      useSFTForOneToOneCalls = useSFTForOneToOneCalls === VOID ? this.useSFTForOneToOneCalls_1 : useSFTForOneToOneCalls;
      return $super === VOID
        ? this.copy_o18wmo_k$(useSFTForOneToOneCalls)
        : $super.copy_o18wmo_k$.call(this, useSFTForOneToOneCalls);
    };
    protoOf(ConferenceCallingConfigDTO).toString = function () {
      return 'ConferenceCallingConfigDTO(useSFTForOneToOneCalls=' + this.useSFTForOneToOneCalls_1 + ')';
    };
    protoOf(ConferenceCallingConfigDTO).hashCode = function () {
      return getBooleanHashCode(this.useSFTForOneToOneCalls_1);
    };
    protoOf(ConferenceCallingConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConferenceCallingConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConferenceCallingConfigDTO ? other : THROW_CCE();
      if (!(this.useSFTForOneToOneCalls_1 === tmp0_other_with_cast.useSFTForOneToOneCalls_1)) return false;
      return true;
    };
    function Companion_50() {
      Companion_instance_50 = this;
    }
    protoOf(Companion_50).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_37();
    };
    var Companion_instance_50;
    function Companion_getInstance_52() {
      if (Companion_instance_50 == null) new Companion_50();
      return Companion_instance_50;
    }
    function $serializer_37() {
      $serializer_instance_37 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.SelfDeletingMessagesConfigDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('enforcedTimeoutSeconds', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_37).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_37).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [get_nullable(LongSerializer_getInstance())];
    };
    protoOf($serializer_37).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          0,
          LongSerializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                LongSerializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return SelfDeletingMessagesConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_37).serialize_cdo4my_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        LongSerializer_getInstance(),
        value.enforcedTimeoutSeconds_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_37).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_cdo4my_k$(encoder, value instanceof SelfDeletingMessagesConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_37;
    function $serializer_getInstance_37() {
      if ($serializer_instance_37 == null) new $serializer_37();
      return $serializer_instance_37;
    }
    function SelfDeletingMessagesConfigDTO_init_$Init$(
      seen1,
      enforcedTimeoutSeconds,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_37().descriptor_1);
      }
      $this.enforcedTimeoutSeconds_1 = enforcedTimeoutSeconds;
      return $this;
    }
    function SelfDeletingMessagesConfigDTO_init_$Create$(
      seen1,
      enforcedTimeoutSeconds,
      serializationConstructorMarker,
    ) {
      return SelfDeletingMessagesConfigDTO_init_$Init$(
        seen1,
        enforcedTimeoutSeconds,
        serializationConstructorMarker,
        objectCreate(protoOf(SelfDeletingMessagesConfigDTO)),
      );
    }
    function SelfDeletingMessagesConfigDTO(enforcedTimeoutSeconds) {
      Companion_getInstance_52();
      this.enforcedTimeoutSeconds_1 = enforcedTimeoutSeconds;
    }
    protoOf(SelfDeletingMessagesConfigDTO).get_enforcedTimeoutSeconds_36ewfr_k$ = function () {
      return this.enforcedTimeoutSeconds_1;
    };
    protoOf(SelfDeletingMessagesConfigDTO).component1_7eebsc_k$ = function () {
      return this.enforcedTimeoutSeconds_1;
    };
    protoOf(SelfDeletingMessagesConfigDTO).copy_au4gau_k$ = function (enforcedTimeoutSeconds) {
      return new SelfDeletingMessagesConfigDTO(enforcedTimeoutSeconds);
    };
    protoOf(SelfDeletingMessagesConfigDTO).copy$default_xaga72_k$ = function (enforcedTimeoutSeconds, $super) {
      enforcedTimeoutSeconds = enforcedTimeoutSeconds === VOID ? this.enforcedTimeoutSeconds_1 : enforcedTimeoutSeconds;
      return $super === VOID
        ? this.copy_au4gau_k$(enforcedTimeoutSeconds)
        : $super.copy_au4gau_k$.call(this, enforcedTimeoutSeconds);
    };
    protoOf(SelfDeletingMessagesConfigDTO).toString = function () {
      return 'SelfDeletingMessagesConfigDTO(enforcedTimeoutSeconds=' + toString(this.enforcedTimeoutSeconds_1) + ')';
    };
    protoOf(SelfDeletingMessagesConfigDTO).hashCode = function () {
      return this.enforcedTimeoutSeconds_1 == null ? 0 : this.enforcedTimeoutSeconds_1.hashCode();
    };
    protoOf(SelfDeletingMessagesConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof SelfDeletingMessagesConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof SelfDeletingMessagesConfigDTO ? other : THROW_CCE();
      if (!equals(this.enforcedTimeoutSeconds_1, tmp0_other_with_cast.enforcedTimeoutSeconds_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_26($this) {
      return $this.$childSerializers_1;
    }
    function Companion_51() {
      Companion_instance_51 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        Companion_getInstance_113().serializer_9w0wvi_k$(),
        new ArrayListSerializer(Companion_getInstance_113().serializer_9w0wvi_k$()),
        new ArrayListSerializer(IntSerializer_getInstance()),
        null,
      ];
    }
    protoOf(Companion_51).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_38();
    };
    var Companion_instance_51;
    function Companion_getInstance_53() {
      if (Companion_instance_51 == null) new Companion_51();
      return Companion_instance_51;
    }
    function $serializer_38() {
      $serializer_instance_38 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.MLSConfigDTO',
        this,
        4,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('defaultProtocol', false);
      tmp0_serialDesc.addElement_5pzumi_k$('supportedProtocols', true);
      tmp0_serialDesc.addElement_5pzumi_k$('allowedCipherSuites', false);
      tmp0_serialDesc.addElement_5pzumi_k$('defaultCipherSuite', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_38).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_38).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_53().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [tmp0_cached[0], tmp0_cached[1], tmp0_cached[2], IntSerializer_getInstance()];
    };
    protoOf($serializer_38).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = 0;
      var tmp8_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp9_cached = Companion_getInstance_53().$childSerializers_1;
      if (tmp8_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp9_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp9_cached[1], tmp5_local1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 2, tmp9_cached[2], tmp6_local2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeIntElement_941u6a_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp8_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp9_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 1, tmp9_cached[1], tmp5_local1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 2, tmp9_cached[2], tmp6_local2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeIntElement_941u6a_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MLSConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_38).serialize_81od2e_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_53().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.defaultProtocol_1);
      if (
        tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 1)
          ? true
          : !equals(value.supportedProtocols_1, listOf(SupportedProtocolDTO_PROTEUS_getInstance()))
      ) {
        tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, tmp2_cached[1], value.supportedProtocols_1);
      }
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 2, tmp2_cached[2], value.allowedCipherSuites_1);
      tmp1_output.encodeIntElement_krhhce_k$(tmp0_desc, 3, value.defaultCipherSuite_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_38).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_81od2e_k$(encoder, value instanceof MLSConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_38;
    function $serializer_getInstance_38() {
      if ($serializer_instance_38 == null) new $serializer_38();
      return $serializer_instance_38;
    }
    function MLSConfigDTO_init_$Init$(
      seen1,
      defaultProtocol,
      supportedProtocols,
      allowedCipherSuites,
      defaultCipherSuite,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(13 === (13 & seen1))) {
        throwMissingFieldException(seen1, 13, $serializer_getInstance_38().descriptor_1);
      }
      $this.defaultProtocol_1 = defaultProtocol;
      if (0 === (seen1 & 2)) $this.supportedProtocols_1 = listOf(SupportedProtocolDTO_PROTEUS_getInstance());
      else $this.supportedProtocols_1 = supportedProtocols;
      $this.allowedCipherSuites_1 = allowedCipherSuites;
      $this.defaultCipherSuite_1 = defaultCipherSuite;
      return $this;
    }
    function MLSConfigDTO_init_$Create$(
      seen1,
      defaultProtocol,
      supportedProtocols,
      allowedCipherSuites,
      defaultCipherSuite,
      serializationConstructorMarker,
    ) {
      return MLSConfigDTO_init_$Init$(
        seen1,
        defaultProtocol,
        supportedProtocols,
        allowedCipherSuites,
        defaultCipherSuite,
        serializationConstructorMarker,
        objectCreate(protoOf(MLSConfigDTO)),
      );
    }
    function MLSConfigDTO(defaultProtocol, supportedProtocols, allowedCipherSuites, defaultCipherSuite) {
      Companion_getInstance_53();
      supportedProtocols =
        supportedProtocols === VOID ? listOf(SupportedProtocolDTO_PROTEUS_getInstance()) : supportedProtocols;
      this.defaultProtocol_1 = defaultProtocol;
      this.supportedProtocols_1 = supportedProtocols;
      this.allowedCipherSuites_1 = allowedCipherSuites;
      this.defaultCipherSuite_1 = defaultCipherSuite;
    }
    protoOf(MLSConfigDTO).get_defaultProtocol_ely8z4_k$ = function () {
      return this.defaultProtocol_1;
    };
    protoOf(MLSConfigDTO).get_supportedProtocols_nhmuga_k$ = function () {
      return this.supportedProtocols_1;
    };
    protoOf(MLSConfigDTO).get_allowedCipherSuites_pcno6z_k$ = function () {
      return this.allowedCipherSuites_1;
    };
    protoOf(MLSConfigDTO).get_defaultCipherSuite_8s5yk5_k$ = function () {
      return this.defaultCipherSuite_1;
    };
    protoOf(MLSConfigDTO).component1_7eebsc_k$ = function () {
      return this.defaultProtocol_1;
    };
    protoOf(MLSConfigDTO).component2_7eebsb_k$ = function () {
      return this.supportedProtocols_1;
    };
    protoOf(MLSConfigDTO).component3_7eebsa_k$ = function () {
      return this.allowedCipherSuites_1;
    };
    protoOf(MLSConfigDTO).component4_7eebs9_k$ = function () {
      return this.defaultCipherSuite_1;
    };
    protoOf(MLSConfigDTO).copy_260vk4_k$ = function (
      defaultProtocol,
      supportedProtocols,
      allowedCipherSuites,
      defaultCipherSuite,
    ) {
      return new MLSConfigDTO(defaultProtocol, supportedProtocols, allowedCipherSuites, defaultCipherSuite);
    };
    protoOf(MLSConfigDTO).copy$default_xk3sl7_k$ = function (
      defaultProtocol,
      supportedProtocols,
      allowedCipherSuites,
      defaultCipherSuite,
      $super,
    ) {
      defaultProtocol = defaultProtocol === VOID ? this.defaultProtocol_1 : defaultProtocol;
      supportedProtocols = supportedProtocols === VOID ? this.supportedProtocols_1 : supportedProtocols;
      allowedCipherSuites = allowedCipherSuites === VOID ? this.allowedCipherSuites_1 : allowedCipherSuites;
      defaultCipherSuite = defaultCipherSuite === VOID ? this.defaultCipherSuite_1 : defaultCipherSuite;
      return $super === VOID
        ? this.copy_260vk4_k$(defaultProtocol, supportedProtocols, allowedCipherSuites, defaultCipherSuite)
        : $super.copy_260vk4_k$.call(
            this,
            defaultProtocol,
            supportedProtocols,
            allowedCipherSuites,
            defaultCipherSuite,
          );
    };
    protoOf(MLSConfigDTO).toString = function () {
      return (
        'MLSConfigDTO(defaultProtocol=' +
        this.defaultProtocol_1 +
        ', supportedProtocols=' +
        this.supportedProtocols_1 +
        ', allowedCipherSuites=' +
        this.allowedCipherSuites_1 +
        ', defaultCipherSuite=' +
        this.defaultCipherSuite_1 +
        ')'
      );
    };
    protoOf(MLSConfigDTO).hashCode = function () {
      var result = this.defaultProtocol_1.hashCode();
      result = (imul(result, 31) + hashCode(this.supportedProtocols_1)) | 0;
      result = (imul(result, 31) + hashCode(this.allowedCipherSuites_1)) | 0;
      result = (imul(result, 31) + this.defaultCipherSuite_1) | 0;
      return result;
    };
    protoOf(MLSConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MLSConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof MLSConfigDTO ? other : THROW_CCE();
      if (!this.defaultProtocol_1.equals(tmp0_other_with_cast.defaultProtocol_1)) return false;
      if (!equals(this.supportedProtocols_1, tmp0_other_with_cast.supportedProtocols_1)) return false;
      if (!equals(this.allowedCipherSuites_1, tmp0_other_with_cast.allowedCipherSuites_1)) return false;
      if (!(this.defaultCipherSuite_1 === tmp0_other_with_cast.defaultCipherSuite_1)) return false;
      return true;
    };
    function Companion_52() {
      Companion_instance_52 = this;
    }
    protoOf(Companion_52).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_39();
    };
    var Companion_instance_52;
    function Companion_getInstance_54() {
      if (Companion_instance_52 == null) new Companion_52();
      return Companion_instance_52;
    }
    function $serializer_39() {
      $serializer_instance_39 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.E2EIConfigDTO',
        this,
        4,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('acmeDiscoveryUrl', false);
      tmp0_serialDesc.addElement_5pzumi_k$('crlProxy', false);
      tmp0_serialDesc.addElement_5pzumi_k$('useProxyOnMobile', false);
      tmp0_serialDesc.addElement_5pzumi_k$('verificationExpiration', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_39).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_39).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(BooleanSerializer_getInstance()),
        LongSerializer_getInstance(),
      ];
    };
    protoOf($serializer_39).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_local3 = new Long(0, 0);
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
          BooleanSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeLongElement_994anb_k$(tmp0_desc, 3);
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
                BooleanSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeLongElement_994anb_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return E2EIConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_39).serialize_ez7o39_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        StringSerializer_getInstance(),
        value.url_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        StringSerializer_getInstance(),
        value.crlProxy_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        BooleanSerializer_getInstance(),
        value.shouldUseProxy_1,
      );
      tmp1_output.encodeLongElement_cega27_k$(tmp0_desc, 3, value.verificationExpirationSeconds_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_39).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ez7o39_k$(encoder, value instanceof E2EIConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_39;
    function $serializer_getInstance_39() {
      if ($serializer_instance_39 == null) new $serializer_39();
      return $serializer_instance_39;
    }
    function E2EIConfigDTO_init_$Init$(
      seen1,
      url,
      crlProxy,
      shouldUseProxy,
      verificationExpirationSeconds,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(15 === (15 & seen1))) {
        throwMissingFieldException(seen1, 15, $serializer_getInstance_39().descriptor_1);
      }
      $this.url_1 = url;
      $this.crlProxy_1 = crlProxy;
      $this.shouldUseProxy_1 = shouldUseProxy;
      $this.verificationExpirationSeconds_1 = verificationExpirationSeconds;
      return $this;
    }
    function E2EIConfigDTO_init_$Create$(
      seen1,
      url,
      crlProxy,
      shouldUseProxy,
      verificationExpirationSeconds,
      serializationConstructorMarker,
    ) {
      return E2EIConfigDTO_init_$Init$(
        seen1,
        url,
        crlProxy,
        shouldUseProxy,
        verificationExpirationSeconds,
        serializationConstructorMarker,
        objectCreate(protoOf(E2EIConfigDTO)),
      );
    }
    function E2EIConfigDTO(url, crlProxy, shouldUseProxy, verificationExpirationSeconds) {
      Companion_getInstance_54();
      this.url_1 = url;
      this.crlProxy_1 = crlProxy;
      this.shouldUseProxy_1 = shouldUseProxy;
      this.verificationExpirationSeconds_1 = verificationExpirationSeconds;
    }
    protoOf(E2EIConfigDTO).get_url_18iuii_k$ = function () {
      return this.url_1;
    };
    protoOf(E2EIConfigDTO).get_crlProxy_1ctx7e_k$ = function () {
      return this.crlProxy_1;
    };
    protoOf(E2EIConfigDTO).get_shouldUseProxy_9kow03_k$ = function () {
      return this.shouldUseProxy_1;
    };
    protoOf(E2EIConfigDTO).get_verificationExpirationSeconds_wlsxcc_k$ = function () {
      return this.verificationExpirationSeconds_1;
    };
    protoOf(E2EIConfigDTO).component1_7eebsc_k$ = function () {
      return this.url_1;
    };
    protoOf(E2EIConfigDTO).component2_7eebsb_k$ = function () {
      return this.crlProxy_1;
    };
    protoOf(E2EIConfigDTO).component3_7eebsa_k$ = function () {
      return this.shouldUseProxy_1;
    };
    protoOf(E2EIConfigDTO).component4_7eebs9_k$ = function () {
      return this.verificationExpirationSeconds_1;
    };
    protoOf(E2EIConfigDTO).copy_6g3cfr_k$ = function (url, crlProxy, shouldUseProxy, verificationExpirationSeconds) {
      return new E2EIConfigDTO(url, crlProxy, shouldUseProxy, verificationExpirationSeconds);
    };
    protoOf(E2EIConfigDTO).copy$default_pzwj3f_k$ = function (
      url,
      crlProxy,
      shouldUseProxy,
      verificationExpirationSeconds,
      $super,
    ) {
      url = url === VOID ? this.url_1 : url;
      crlProxy = crlProxy === VOID ? this.crlProxy_1 : crlProxy;
      shouldUseProxy = shouldUseProxy === VOID ? this.shouldUseProxy_1 : shouldUseProxy;
      verificationExpirationSeconds =
        verificationExpirationSeconds === VOID ? this.verificationExpirationSeconds_1 : verificationExpirationSeconds;
      return $super === VOID
        ? this.copy_6g3cfr_k$(url, crlProxy, shouldUseProxy, verificationExpirationSeconds)
        : $super.copy_6g3cfr_k$.call(this, url, crlProxy, shouldUseProxy, verificationExpirationSeconds);
    };
    protoOf(E2EIConfigDTO).toString = function () {
      return (
        'E2EIConfigDTO(url=' +
        this.url_1 +
        ', crlProxy=' +
        this.crlProxy_1 +
        ', shouldUseProxy=' +
        this.shouldUseProxy_1 +
        ', verificationExpirationSeconds=' +
        this.verificationExpirationSeconds_1.toString() +
        ')'
      );
    };
    protoOf(E2EIConfigDTO).hashCode = function () {
      var result = this.url_1 == null ? 0 : getStringHashCode(this.url_1);
      result = (imul(result, 31) + (this.crlProxy_1 == null ? 0 : getStringHashCode(this.crlProxy_1))) | 0;
      result = (imul(result, 31) + (this.shouldUseProxy_1 == null ? 0 : getBooleanHashCode(this.shouldUseProxy_1))) | 0;
      result = (imul(result, 31) + this.verificationExpirationSeconds_1.hashCode()) | 0;
      return result;
    };
    protoOf(E2EIConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof E2EIConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof E2EIConfigDTO ? other : THROW_CCE();
      if (!(this.url_1 == tmp0_other_with_cast.url_1)) return false;
      if (!(this.crlProxy_1 == tmp0_other_with_cast.crlProxy_1)) return false;
      if (!(this.shouldUseProxy_1 == tmp0_other_with_cast.shouldUseProxy_1)) return false;
      if (!this.verificationExpirationSeconds_1.equals(tmp0_other_with_cast.verificationExpirationSeconds_1))
        return false;
      return true;
    };
    function Companion_53() {
      Companion_instance_53 = this;
    }
    protoOf(Companion_53).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_40();
    };
    var Companion_instance_53;
    function Companion_getInstance_55() {
      if (Companion_instance_53 == null) new Companion_53();
      return Companion_instance_53;
    }
    function $serializer_40() {
      $serializer_instance_40 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.featureConfigs.MLSMigrationConfigDTO',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('startTime', false);
      tmp0_serialDesc.addElement_5pzumi_k$('finaliseRegardlessAfter', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_40).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_40).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        get_nullable(InstantIso8601Serializer_getInstance()),
        get_nullable(InstantIso8601Serializer_getInstance()),
      ];
    };
    protoOf($serializer_40).deserialize_sy6x50_k$ = function (decoder) {
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
          InstantIso8601Serializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          InstantIso8601Serializer_getInstance(),
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
                InstantIso8601Serializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                InstantIso8601Serializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MLSMigrationConfigDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_40).serialize_iclcp8_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        0,
        InstantIso8601Serializer_getInstance(),
        value.startTime_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        InstantIso8601Serializer_getInstance(),
        value.finaliseRegardlessAfter_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_40).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_iclcp8_k$(encoder, value instanceof MLSMigrationConfigDTO ? value : THROW_CCE());
    };
    var $serializer_instance_40;
    function $serializer_getInstance_40() {
      if ($serializer_instance_40 == null) new $serializer_40();
      return $serializer_instance_40;
    }
    function MLSMigrationConfigDTO_init_$Init$(
      seen1,
      startTime,
      finaliseRegardlessAfter,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_40().descriptor_1);
      }
      $this.startTime_1 = startTime;
      $this.finaliseRegardlessAfter_1 = finaliseRegardlessAfter;
      return $this;
    }
    function MLSMigrationConfigDTO_init_$Create$(
      seen1,
      startTime,
      finaliseRegardlessAfter,
      serializationConstructorMarker,
    ) {
      return MLSMigrationConfigDTO_init_$Init$(
        seen1,
        startTime,
        finaliseRegardlessAfter,
        serializationConstructorMarker,
        objectCreate(protoOf(MLSMigrationConfigDTO)),
      );
    }
    function MLSMigrationConfigDTO(startTime, finaliseRegardlessAfter) {
      Companion_getInstance_55();
      this.startTime_1 = startTime;
      this.finaliseRegardlessAfter_1 = finaliseRegardlessAfter;
    }
    protoOf(MLSMigrationConfigDTO).get_startTime_qp7d5m_k$ = function () {
      return this.startTime_1;
    };
    protoOf(MLSMigrationConfigDTO).get_finaliseRegardlessAfter_mwe16e_k$ = function () {
      return this.finaliseRegardlessAfter_1;
    };
    protoOf(MLSMigrationConfigDTO).component1_7eebsc_k$ = function () {
      return this.startTime_1;
    };
    protoOf(MLSMigrationConfigDTO).component2_7eebsb_k$ = function () {
      return this.finaliseRegardlessAfter_1;
    };
    protoOf(MLSMigrationConfigDTO).copy_ku5q37_k$ = function (startTime, finaliseRegardlessAfter) {
      return new MLSMigrationConfigDTO(startTime, finaliseRegardlessAfter);
    };
    protoOf(MLSMigrationConfigDTO).copy$default_hkn9tq_k$ = function (startTime, finaliseRegardlessAfter, $super) {
      startTime = startTime === VOID ? this.startTime_1 : startTime;
      finaliseRegardlessAfter =
        finaliseRegardlessAfter === VOID ? this.finaliseRegardlessAfter_1 : finaliseRegardlessAfter;
      return $super === VOID
        ? this.copy_ku5q37_k$(startTime, finaliseRegardlessAfter)
        : $super.copy_ku5q37_k$.call(this, startTime, finaliseRegardlessAfter);
    };
    protoOf(MLSMigrationConfigDTO).toString = function () {
      return (
        'MLSMigrationConfigDTO(startTime=' +
        this.startTime_1 +
        ', finaliseRegardlessAfter=' +
        this.finaliseRegardlessAfter_1 +
        ')'
      );
    };
    protoOf(MLSMigrationConfigDTO).hashCode = function () {
      var result = this.startTime_1 == null ? 0 : this.startTime_1.hashCode();
      result =
        (imul(result, 31) + (this.finaliseRegardlessAfter_1 == null ? 0 : this.finaliseRegardlessAfter_1.hashCode())) |
        0;
      return result;
    };
    protoOf(MLSMigrationConfigDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MLSMigrationConfigDTO)) return false;
      var tmp0_other_with_cast = other instanceof MLSMigrationConfigDTO ? other : THROW_CCE();
      if (!equals(this.startTime_1, tmp0_other_with_cast.startTime_1)) return false;
      if (!equals(this.finaliseRegardlessAfter_1, tmp0_other_with_cast.finaliseRegardlessAfter_1)) return false;
      return true;
    };
    function FeatureFlagStatusDTO_ENABLED_getInstance() {
      FeatureFlagStatusDTO_initEntries();
      return FeatureFlagStatusDTO_ENABLED_instance;
    }
    function FeatureFlagStatusDTO_DISABLED_getInstance() {
      FeatureFlagStatusDTO_initEntries();
      return FeatureFlagStatusDTO_DISABLED_instance;
    }
    function Companion_54() {
      Companion_instance_54 = this;
    }
    protoOf(Companion_54).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_41();
    };
    var Companion_instance_54;
    function Companion_getInstance_56() {
      if (Companion_instance_54 == null) new Companion_54();
      return Companion_instance_54;
    }
    function $serializer_41() {
      $serializer_instance_41 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.keypackage.LastPreKeyDTO',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('key', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_41).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_41).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [IntSerializer_getInstance(), StringSerializer_getInstance()];
    };
    protoOf($serializer_41).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = 0;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeIntElement_941u6a_k$(tmp0_desc, 0);
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
              tmp4_local0 = tmp6_input.decodeIntElement_941u6a_k$(tmp0_desc, 0);
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
      return LastPreKeyDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_41).serialize_79d8ym_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeIntElement_krhhce_k$(tmp0_desc, 0, value.id_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.key_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_41).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_79d8ym_k$(encoder, value instanceof LastPreKeyDTO ? value : THROW_CCE());
    };
    var $serializer_instance_41;
    function $serializer_getInstance_41() {
      if ($serializer_instance_41 == null) new $serializer_41();
      return $serializer_instance_41;
    }
    function LastPreKeyDTO_init_$Init$(seen1, id, key, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_41().descriptor_1);
      }
      $this.id_1 = id;
      $this.key_1 = key;
      return $this;
    }
    function LastPreKeyDTO_init_$Create$(seen1, id, key, serializationConstructorMarker) {
      return LastPreKeyDTO_init_$Init$(
        seen1,
        id,
        key,
        serializationConstructorMarker,
        objectCreate(protoOf(LastPreKeyDTO)),
      );
    }
    function LastPreKeyDTO(id, key) {
      Companion_getInstance_56();
      this.id_1 = id;
      this.key_1 = key;
    }
    protoOf(LastPreKeyDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(LastPreKeyDTO).get_key_18j28a_k$ = function () {
      return this.key_1;
    };
    protoOf(LastPreKeyDTO).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(LastPreKeyDTO).component2_7eebsb_k$ = function () {
      return this.key_1;
    };
    protoOf(LastPreKeyDTO).copy_xhhsuv_k$ = function (id, key) {
      return new LastPreKeyDTO(id, key);
    };
    protoOf(LastPreKeyDTO).copy$default_17fsu0_k$ = function (id, key, $super) {
      id = id === VOID ? this.id_1 : id;
      key = key === VOID ? this.key_1 : key;
      return $super === VOID ? this.copy_xhhsuv_k$(id, key) : $super.copy_xhhsuv_k$.call(this, id, key);
    };
    protoOf(LastPreKeyDTO).toString = function () {
      return 'LastPreKeyDTO(id=' + this.id_1 + ', key=' + this.key_1 + ')';
    };
    protoOf(LastPreKeyDTO).hashCode = function () {
      var result = this.id_1;
      result = (imul(result, 31) + getStringHashCode(this.key_1)) | 0;
      return result;
    };
    protoOf(LastPreKeyDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof LastPreKeyDTO)) return false;
      var tmp0_other_with_cast = other instanceof LastPreKeyDTO ? other : THROW_CCE();
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!(this.key_1 === tmp0_other_with_cast.key_1)) return false;
      return true;
    };
    function Companion_55() {
      Companion_instance_55 = this;
    }
    protoOf(Companion_55).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_42();
    };
    var Companion_instance_55;
    function Companion_getInstance_57() {
      if (Companion_instance_55 == null) new Companion_55();
      return Companion_instance_55;
    }
    function $serializer_42() {
      $serializer_instance_42 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.create', this, 4);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_42).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_42).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        InstantIso8601Serializer_getInstance(),
        $serializer_getInstance_6(),
      ];
    };
    protoOf($serializer_42).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_6(),
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
              tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_6(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewConversationDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_42).serialize_mpbqbc_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 3, $serializer_getInstance_6(), value.data_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_42).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_mpbqbc_k$(encoder, value instanceof NewConversationDTO ? value : THROW_CCE());
    };
    var $serializer_instance_42;
    function $serializer_getInstance_42() {
      if ($serializer_instance_42 == null) new $serializer_42();
      return $serializer_instance_42;
    }
    function NewConversationDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      data,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(15 === (15 & seen1))) {
        throwMissingFieldException(seen1, 15, $serializer_getInstance_42().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.data_1 = data;
      return $this;
    }
    function NewConversationDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      data,
      serializationConstructorMarker,
    ) {
      return NewConversationDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        data,
        serializationConstructorMarker,
        objectCreate(protoOf(NewConversationDTO)),
      );
    }
    function Companion_56() {
      Companion_instance_56 = this;
    }
    protoOf(Companion_56).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_43();
    };
    var Companion_instance_56;
    function Companion_getInstance_58() {
      if (Companion_instance_56 == null) new Companion_56();
      return Companion_instance_56;
    }
    function $serializer_43() {
      $serializer_instance_43 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.delete', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_43).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_43).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), $serializer_getInstance_82(), StringSerializer_getInstance()];
    };
    protoOf($serializer_43).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp7_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return DeletedConversationDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_43).serialize_nln2q9_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.time_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_43).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_nln2q9_k$(encoder, value instanceof DeletedConversationDTO ? value : THROW_CCE());
    };
    var $serializer_instance_43;
    function $serializer_getInstance_43() {
      if ($serializer_instance_43 == null) new $serializer_43();
      return $serializer_instance_43;
    }
    function DeletedConversationDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_43().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      return $this;
    }
    function DeletedConversationDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      serializationConstructorMarker,
    ) {
      return DeletedConversationDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        serializationConstructorMarker,
        objectCreate(protoOf(DeletedConversationDTO)),
      );
    }
    function Companion_57() {
      Companion_instance_57 = this;
    }
    protoOf(Companion_57).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_44();
    };
    var Companion_instance_57;
    function Companion_getInstance_59() {
      if (Companion_instance_57 == null) new Companion_57();
      return Companion_instance_57;
    }
    function $serializer_44() {
      $serializer_instance_44 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.rename', this, 4);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_44).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_44).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        InstantIso8601Serializer_getInstance(),
        $serializer_getInstance_2(),
      ];
    };
    protoOf($serializer_44).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_2(),
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
              tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_2(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationRenameDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        null,
      );
    };
    protoOf($serializer_44).serialize_1wx83c_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        3,
        $serializer_getInstance_2(),
        value.updateNameData_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_44).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_1wx83c_k$(encoder, value instanceof ConversationRenameDTO ? value : THROW_CCE());
    };
    var $serializer_instance_44;
    function $serializer_getInstance_44() {
      if ($serializer_instance_44 == null) new $serializer_44();
      return $serializer_instance_44;
    }
    function ConversationRenameDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      updateNameData,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(15 === (15 & seen1))) {
        throwMissingFieldException(seen1, 15, $serializer_getInstance_44().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.updateNameData_1 = updateNameData;
      return $this;
    }
    function ConversationRenameDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      updateNameData,
      serializationConstructorMarker,
    ) {
      return ConversationRenameDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        updateNameData,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationRenameDTO)),
      );
    }
    function Companion_58() {
      Companion_instance_58 = this;
    }
    protoOf(Companion_58).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_45();
    };
    var Companion_instance_58;
    function Companion_getInstance_60() {
      if (Companion_instance_58 == null) new Companion_58();
      return Companion_instance_58;
    }
    function $serializer_45() {
      $serializer_instance_45 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.member-join', this, 5);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_45).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_45).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        InstantIso8601Serializer_getInstance(),
        $serializer_getInstance_3(),
        StringSerializer_getInstance(),
      ];
    };
    protoOf($serializer_45).deserialize_sy6x50_k$ = function (decoder) {
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
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_3(),
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
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_3(),
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
      return MemberJoinDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_45).serialize_szgyvp_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 3, $serializer_getInstance_3(), value.members_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.from_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_45).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_szgyvp_k$(encoder, value instanceof MemberJoinDTO ? value : THROW_CCE());
    };
    var $serializer_instance_45;
    function $serializer_getInstance_45() {
      if ($serializer_instance_45 == null) new $serializer_45();
      return $serializer_instance_45;
    }
    function MemberJoinDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      members,
      from,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_45().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.members_1 = members;
      $this.from_1 = from;
      return $this;
    }
    function MemberJoinDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      members,
      from,
      serializationConstructorMarker,
    ) {
      return MemberJoinDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        members,
        from,
        serializationConstructorMarker,
        objectCreate(protoOf(MemberJoinDTO)),
      );
    }
    function Companion_59() {
      Companion_instance_59 = this;
    }
    protoOf(Companion_59).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_46();
    };
    var Companion_instance_59;
    function Companion_getInstance_61() {
      if (Companion_instance_59 == null) new Companion_59();
      return Companion_instance_59;
    }
    function $serializer_46() {
      $serializer_instance_46 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.member-leave', this, 5);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_46).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_46).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        InstantIso8601Serializer_getInstance(),
        $serializer_getInstance_4(),
        StringSerializer_getInstance(),
      ];
    };
    protoOf($serializer_46).deserialize_sy6x50_k$ = function (decoder) {
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
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          $serializer_getInstance_4(),
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
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                $serializer_getInstance_4(),
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
      return MemberLeaveDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_46).serialize_2sa9fy_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 3, $serializer_getInstance_4(), value.removedUsers_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 4, value.from_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_46).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_2sa9fy_k$(encoder, value instanceof MemberLeaveDTO ? value : THROW_CCE());
    };
    var $serializer_instance_46;
    function $serializer_getInstance_46() {
      if ($serializer_instance_46 == null) new $serializer_46();
      return $serializer_instance_46;
    }
    function MemberLeaveDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      removedUsers,
      from,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_46().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.removedUsers_1 = removedUsers;
      $this.from_1 = from;
      return $this;
    }
    function MemberLeaveDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      removedUsers,
      from,
      serializationConstructorMarker,
    ) {
      return MemberLeaveDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        removedUsers,
        from,
        serializationConstructorMarker,
        objectCreate(protoOf(MemberLeaveDTO)),
      );
    }
    function Companion_60() {
      Companion_instance_60 = this;
    }
    protoOf(Companion_60).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_47();
    };
    var Companion_instance_60;
    function Companion_getInstance_62() {
      if (Companion_instance_60 == null) new Companion_60();
      return Companion_instance_60;
    }
    function $serializer_47() {
      $serializer_instance_47 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.member-update', this, 5);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_47).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_47).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        $serializer_getInstance_5(),
      ];
    };
    protoOf($serializer_47).deserialize_sy6x50_k$ = function (decoder) {
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
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          4,
          $serializer_getInstance_5(),
          tmp8_local4,
        );
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
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                4,
                $serializer_getInstance_5(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp9_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MemberUpdateDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_47).serialize_hlel7a_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.time_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 3, value.from_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 4, $serializer_getInstance_5(), value.roleChange_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_47).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_hlel7a_k$(encoder, value instanceof MemberUpdateDTO ? value : THROW_CCE());
    };
    var $serializer_instance_47;
    function $serializer_getInstance_47() {
      if ($serializer_instance_47 == null) new $serializer_47();
      return $serializer_instance_47;
    }
    function MemberUpdateDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      roleChange,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_47().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.from_1 = from;
      $this.roleChange_1 = roleChange;
      return $this;
    }
    function MemberUpdateDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      roleChange,
      serializationConstructorMarker,
    ) {
      return MemberUpdateDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        from,
        roleChange,
        serializationConstructorMarker,
        objectCreate(protoOf(MemberUpdateDTO)),
      );
    }
    function Companion_61() {
      Companion_instance_61 = this;
    }
    protoOf(Companion_61).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_48();
    };
    var Companion_instance_61;
    function Companion_getInstance_63() {
      if (Companion_instance_61 == null) new Companion_61();
      return Companion_instance_61;
    }
    function $serializer_48() {
      $serializer_instance_48 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.typing', this, 5);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_48).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_48).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        $serializer_getInstance_12(),
      ];
    };
    protoOf($serializer_48).deserialize_sy6x50_k$ = function (decoder) {
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
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          4,
          $serializer_getInstance_12(),
          tmp8_local4,
        );
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
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                4,
                $serializer_getInstance_12(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp9_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ConversationTypingDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_48).serialize_vwe3tr_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.time_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 3, value.from_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 4, $serializer_getInstance_12(), value.status_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_48).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_vwe3tr_k$(encoder, value instanceof ConversationTypingDTO ? value : THROW_CCE());
    };
    var $serializer_instance_48;
    function $serializer_getInstance_48() {
      if ($serializer_instance_48 == null) new $serializer_48();
      return $serializer_instance_48;
    }
    function ConversationTypingDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      status,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_48().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.from_1 = from;
      $this.status_1 = status;
      return $this;
    }
    function ConversationTypingDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      status,
      serializationConstructorMarker,
    ) {
      return ConversationTypingDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        from,
        status,
        serializationConstructorMarker,
        objectCreate(protoOf(ConversationTypingDTO)),
      );
    }
    function Companion_62() {
      Companion_instance_62 = this;
    }
    protoOf(Companion_62).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_49();
    };
    var Companion_instance_62;
    function Companion_getInstance_64() {
      if (Companion_instance_62 == null) new Companion_62();
      return Companion_instance_62;
    }
    function $serializer_49() {
      $serializer_instance_49 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.otr-message-add', this, 6);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('conversation', true);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', true);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_49).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_49).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        get_nullable(StringSerializer_getInstance()),
        InstantIso8601Serializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
        $serializer_getInstance_75(),
      ];
    };
    protoOf($serializer_49).deserialize_sy6x50_k$ = function (decoder) {
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
      var tmp10_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp10_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp10_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp10_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp10_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp10_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          InstantIso8601Serializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp10_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp10_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          5,
          $serializer_getInstance_75(),
          tmp9_local5,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp10_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp10_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp10_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp10_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp10_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                InstantIso8601Serializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp10_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                StringSerializer_getInstance(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp10_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                5,
                $serializer_getInstance_75(),
                tmp9_local5,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp10_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewMessageDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        tmp9_local5,
        null,
      );
    };
    protoOf($serializer_49).serialize_y7pscy_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 2) ? true : !(value.conversation_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          value.conversation_1,
        );
      }
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        3,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      if (tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 4) ? true : !(value.from_1 == null)) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          value.from_1,
        );
      }
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 5, $serializer_getInstance_75(), value.data_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_49).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_y7pscy_k$(encoder, value instanceof NewMessageDTO ? value : THROW_CCE());
    };
    var $serializer_instance_49;
    function $serializer_getInstance_49() {
      if ($serializer_instance_49 == null) new $serializer_49();
      return $serializer_instance_49;
    }
    function NewMessageDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      conversation,
      time,
      from,
      data,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(43 === (43 & seen1))) {
        throwMissingFieldException(seen1, 43, $serializer_getInstance_49().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      if (0 === (seen1 & 4)) $this.conversation_1 = null;
      else $this.conversation_1 = conversation;
      $this.time_1 = time;
      if (0 === (seen1 & 16)) $this.from_1 = null;
      else $this.from_1 = from;
      $this.data_1 = data;
      return $this;
    }
    function NewMessageDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      conversation,
      time,
      from,
      data,
      serializationConstructorMarker,
    ) {
      return NewMessageDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        conversation,
        time,
        from,
        data,
        serializationConstructorMarker,
        objectCreate(protoOf(NewMessageDTO)),
      );
    }
    function Companion_63() {
      Companion_instance_63 = this;
    }
    protoOf(Companion_63).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_50();
    };
    var Companion_instance_63;
    function Companion_getInstance_65() {
      if (Companion_instance_63 == null) new Companion_63();
      return Companion_instance_63;
    }
    function $serializer_50() {
      $serializer_instance_50 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.access-update', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_50).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_50).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), JsonCorrectingSerializer_getInstance(), $serializer_getInstance_82()];
    };
    protoOf($serializer_50).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          JsonCorrectingSerializer_getInstance(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_82(),
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
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                JsonCorrectingSerializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_82(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return AccessUpdate_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_50).serialize_pa3vuv_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        JsonCorrectingSerializer_getInstance(),
        value.data_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_50).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_pa3vuv_k$(encoder, value instanceof AccessUpdate ? value : THROW_CCE());
    };
    var $serializer_instance_50;
    function $serializer_getInstance_50() {
      if ($serializer_instance_50 == null) new $serializer_50();
      return $serializer_instance_50;
    }
    function AccessUpdate_init_$Init$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_50().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.data_1 = data;
      $this.qualifiedFrom_1 = qualifiedFrom;
      return $this;
    }
    function AccessUpdate_init_$Create$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
    ) {
      return AccessUpdate_init_$Init$(
        seen1,
        qualifiedConversation,
        data,
        qualifiedFrom,
        serializationConstructorMarker,
        objectCreate(protoOf(AccessUpdate)),
      );
    }
    function Companion_64() {
      Companion_instance_64 = this;
    }
    protoOf(Companion_64).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_51();
    };
    var Companion_instance_64;
    function Companion_getInstance_66() {
      if (Companion_instance_64 == null) new Companion_64();
      return Companion_instance_64;
    }
    function $serializer_51() {
      $serializer_instance_51 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.code-update', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_51).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_51).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), $serializer_getInstance_13(), $serializer_getInstance_82()];
    };
    protoOf($serializer_51).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_13(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_82(),
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
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_13(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_82(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return CodeUpdated_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_51).serialize_rr3gqg_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_13(), value.data_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_51).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_rr3gqg_k$(encoder, value instanceof CodeUpdated ? value : THROW_CCE());
    };
    var $serializer_instance_51;
    function $serializer_getInstance_51() {
      if ($serializer_instance_51 == null) new $serializer_51();
      return $serializer_instance_51;
    }
    function CodeUpdated_init_$Init$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_51().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.data_1 = data;
      $this.qualifiedFrom_1 = qualifiedFrom;
      return $this;
    }
    function CodeUpdated_init_$Create$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
    ) {
      return CodeUpdated_init_$Init$(
        seen1,
        qualifiedConversation,
        data,
        qualifiedFrom,
        serializationConstructorMarker,
        objectCreate(protoOf(CodeUpdated)),
      );
    }
    function Companion_65() {
      Companion_instance_65 = this;
    }
    protoOf(Companion_65).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_52();
    };
    var Companion_instance_65;
    function Companion_getInstance_67() {
      if (Companion_instance_65 == null) new Companion_65();
      return Companion_instance_65;
    }
    function $serializer_52() {
      $serializer_instance_52 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.code-delete', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_52).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_52).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), $serializer_getInstance_82()];
    };
    protoOf($serializer_52).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp6_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
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
              tmp4_local0 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return CodeDeleted_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_52).serialize_sny95y_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_52).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_sny95y_k$(encoder, value instanceof CodeDeleted ? value : THROW_CCE());
    };
    var $serializer_instance_52;
    function $serializer_getInstance_52() {
      if ($serializer_instance_52 == null) new $serializer_52();
      return $serializer_instance_52;
    }
    function CodeDeleted_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_52().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      return $this;
    }
    function CodeDeleted_init_$Create$(seen1, qualifiedConversation, qualifiedFrom, serializationConstructorMarker) {
      return CodeDeleted_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        serializationConstructorMarker,
        objectCreate(protoOf(CodeDeleted)),
      );
    }
    function Companion_66() {
      Companion_instance_66 = this;
    }
    protoOf(Companion_66).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_53();
    };
    var Companion_instance_66;
    function Companion_getInstance_68() {
      if (Companion_instance_66 == null) new Companion_66();
      return Companion_instance_66;
    }
    function $serializer_53() {
      $serializer_instance_53 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.receipt-mode-update', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_53).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_53).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), $serializer_getInstance_17(), $serializer_getInstance_82()];
    };
    protoOf($serializer_53).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_17(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_82(),
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
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_17(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_82(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ReceiptModeUpdate_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_53).serialize_ruf0ta_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_17(), value.data_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_53).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ruf0ta_k$(encoder, value instanceof ReceiptModeUpdate ? value : THROW_CCE());
    };
    var $serializer_instance_53;
    function $serializer_getInstance_53() {
      if ($serializer_instance_53 == null) new $serializer_53();
      return $serializer_instance_53;
    }
    function ReceiptModeUpdate_init_$Init$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_53().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.data_1 = data;
      $this.qualifiedFrom_1 = qualifiedFrom;
      return $this;
    }
    function ReceiptModeUpdate_init_$Create$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
    ) {
      return ReceiptModeUpdate_init_$Init$(
        seen1,
        qualifiedConversation,
        data,
        qualifiedFrom,
        serializationConstructorMarker,
        objectCreate(protoOf(ReceiptModeUpdate)),
      );
    }
    function Companion_67() {
      Companion_instance_67 = this;
    }
    protoOf(Companion_67).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_54();
    };
    var Companion_instance_67;
    function Companion_getInstance_69() {
      if (Companion_instance_67 == null) new Companion_67();
      return Companion_instance_67;
    }
    function $serializer_54() {
      $serializer_instance_54 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.message-timer-update', this, 4);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_54).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_54).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_14(),
        $serializer_getInstance_82(),
        InstantIso8601Serializer_getInstance(),
      ];
    };
    protoOf($serializer_54).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_14(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_82(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          3,
          InstantIso8601Serializer_getInstance(),
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
              tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_14(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_82(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                3,
                InstantIso8601Serializer_getInstance(),
                tmp7_local3,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MessageTimerUpdate_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_54).serialize_ky05rh_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_14(), value.data_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        3,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_54).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ky05rh_k$(encoder, value instanceof MessageTimerUpdate ? value : THROW_CCE());
    };
    var $serializer_instance_54;
    function $serializer_getInstance_54() {
      if ($serializer_instance_54 == null) new $serializer_54();
      return $serializer_instance_54;
    }
    function MessageTimerUpdate_init_$Init$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      time,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(15 === (15 & seen1))) {
        throwMissingFieldException(seen1, 15, $serializer_getInstance_54().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.data_1 = data;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      return $this;
    }
    function MessageTimerUpdate_init_$Create$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      time,
      serializationConstructorMarker,
    ) {
      return MessageTimerUpdate_init_$Init$(
        seen1,
        qualifiedConversation,
        data,
        qualifiedFrom,
        time,
        serializationConstructorMarker,
        objectCreate(protoOf(MessageTimerUpdate)),
      );
    }
    function Companion_68() {
      Companion_instance_68 = this;
    }
    protoOf(Companion_68).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_55();
    };
    var Companion_instance_68;
    function Companion_getInstance_70() {
      if (Companion_instance_68 == null) new Companion_68();
      return Companion_instance_68;
    }
    function $serializer_55() {
      $serializer_instance_55 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.mls-message-add', this, 5);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('subconv', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_55).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_55).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        InstantIso8601Serializer_getInstance(),
        StringSerializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
      ];
    };
    protoOf($serializer_55).deserialize_sy6x50_k$ = function (decoder) {
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
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp9_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          tmp8_local4,
        );
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
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp9_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                StringSerializer_getInstance(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp9_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewMLSMessageDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_55).serialize_jejh20_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 3, value.message_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        4,
        StringSerializer_getInstance(),
        value.subconversation_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_55).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_jejh20_k$(encoder, value instanceof NewMLSMessageDTO ? value : THROW_CCE());
    };
    var $serializer_instance_55;
    function $serializer_getInstance_55() {
      if ($serializer_instance_55 == null) new $serializer_55();
      return $serializer_instance_55;
    }
    function NewMLSMessageDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      message,
      subconversation,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_55().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.time_1 = time;
      $this.message_1 = message;
      $this.subconversation_1 = subconversation;
      return $this;
    }
    function NewMLSMessageDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      time,
      message,
      subconversation,
      serializationConstructorMarker,
    ) {
      return NewMLSMessageDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        time,
        message,
        subconversation,
        serializationConstructorMarker,
        objectCreate(protoOf(NewMLSMessageDTO)),
      );
    }
    function Companion_69() {
      Companion_instance_69 = this;
    }
    protoOf(Companion_69).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_56();
    };
    var Companion_instance_69;
    function Companion_getInstance_71() {
      if (Companion_instance_69 == null) new Companion_69();
      return Companion_instance_69;
    }
    function $serializer_56() {
      $serializer_instance_56 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.mls-welcome', this, 4);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_56).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_56).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        $serializer_getInstance_82(),
        $serializer_getInstance_82(),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
      ];
    };
    protoOf($serializer_56).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp8_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp8_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MLSWelcomeDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_56).serialize_z87y97_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.message_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 3, value.from_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_56).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_z87y97_k$(encoder, value instanceof MLSWelcomeDTO ? value : THROW_CCE());
    };
    var $serializer_instance_56;
    function $serializer_getInstance_56() {
      if ($serializer_instance_56 == null) new $serializer_56();
      return $serializer_instance_56;
    }
    function MLSWelcomeDTO_init_$Init$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      message,
      from,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(15 === (15 & seen1))) {
        throwMissingFieldException(seen1, 15, $serializer_getInstance_56().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.qualifiedFrom_1 = qualifiedFrom;
      $this.message_1 = message;
      $this.from_1 = from;
      return $this;
    }
    function MLSWelcomeDTO_init_$Create$(
      seen1,
      qualifiedConversation,
      qualifiedFrom,
      message,
      from,
      serializationConstructorMarker,
    ) {
      return MLSWelcomeDTO_init_$Init$(
        seen1,
        qualifiedConversation,
        qualifiedFrom,
        message,
        from,
        serializationConstructorMarker,
        objectCreate(protoOf(MLSWelcomeDTO)),
      );
    }
    function Companion_70() {
      Companion_instance_70 = this;
    }
    protoOf(Companion_70).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_57();
    };
    var Companion_instance_70;
    function Companion_getInstance_72() {
      if (Companion_instance_70 == null) new Companion_70();
      return Companion_instance_70;
    }
    function $serializer_57() {
      $serializer_instance_57 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('conversation.protocol-update', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversation', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_from', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_57).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_57).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_82(), $serializer_getInstance_16(), $serializer_getInstance_82()];
    };
    protoOf($serializer_57).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_82(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_16(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          $serializer_getInstance_82(),
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
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_82(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_16(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                $serializer_getInstance_82(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ProtocolUpdate_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_57).serialize_170f71_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        0,
        $serializer_getInstance_82(),
        value.qualifiedConversation_1,
      );
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_16(), value.data_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        $serializer_getInstance_82(),
        value.qualifiedFrom_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_57).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_170f71_k$(encoder, value instanceof ProtocolUpdate ? value : THROW_CCE());
    };
    var $serializer_instance_57;
    function $serializer_getInstance_57() {
      if ($serializer_instance_57 == null) new $serializer_57();
      return $serializer_instance_57;
    }
    function ProtocolUpdate_init_$Init$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_57().descriptor_1);
      }
      Conversation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.qualifiedConversation_1 = qualifiedConversation;
      $this.data_1 = data;
      $this.qualifiedFrom_1 = qualifiedFrom;
      return $this;
    }
    function ProtocolUpdate_init_$Create$(
      seen1,
      qualifiedConversation,
      data,
      qualifiedFrom,
      serializationConstructorMarker,
    ) {
      return ProtocolUpdate_init_$Init$(
        seen1,
        qualifiedConversation,
        data,
        qualifiedFrom,
        serializationConstructorMarker,
        objectCreate(protoOf(ProtocolUpdate)),
      );
    }
    function _get_$cachedSerializer__te6jhj_8($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$Conversation$Companion$_anonymous__2a4a3c() {
      var tmp = getKClass(Conversation);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [
        getKClass(AccessUpdate),
        getKClass(CodeDeleted),
        getKClass(CodeUpdated),
        getKClass(ConversationRenameDTO),
        getKClass(ConversationTypingDTO),
        getKClass(DeletedConversationDTO),
        getKClass(MLSWelcomeDTO),
        getKClass(MemberJoinDTO),
        getKClass(MemberLeaveDTO),
        getKClass(MemberUpdateDTO),
        getKClass(MessageTimerUpdate),
        getKClass(NewConversationDTO),
        getKClass(NewMLSMessageDTO),
        getKClass(NewMessageDTO),
        getKClass(ProtocolUpdate),
        getKClass(ReceiptModeUpdate),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [
        $serializer_getInstance_50(),
        $serializer_getInstance_52(),
        $serializer_getInstance_51(),
        $serializer_getInstance_44(),
        $serializer_getInstance_48(),
        $serializer_getInstance_43(),
        $serializer_getInstance_56(),
        $serializer_getInstance_45(),
        $serializer_getInstance_46(),
        $serializer_getInstance_47(),
        $serializer_getInstance_54(),
        $serializer_getInstance_42(),
        $serializer_getInstance_55(),
        $serializer_getInstance_49(),
        $serializer_getInstance_57(),
        $serializer_getInstance_53(),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.Conversation',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function NewConversationDTO(qualifiedConversation, qualifiedFrom, time, data) {
      Companion_getInstance_57();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.data_1 = data;
    }
    protoOf(NewConversationDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewConversationDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewConversationDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(NewConversationDTO).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(NewConversationDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewConversationDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewConversationDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(NewConversationDTO).component4_7eebs9_k$ = function () {
      return this.data_1;
    };
    protoOf(NewConversationDTO).copy_6fxthc_k$ = function (qualifiedConversation, qualifiedFrom, time, data) {
      return new NewConversationDTO(qualifiedConversation, qualifiedFrom, time, data);
    };
    protoOf(NewConversationDTO).copy$default_mhgxqz_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      data,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      data = data === VOID ? this.data_1 : data;
      return $super === VOID
        ? this.copy_6fxthc_k$(qualifiedConversation, qualifiedFrom, time, data)
        : $super.copy_6fxthc_k$.call(this, qualifiedConversation, qualifiedFrom, time, data);
    };
    protoOf(NewConversationDTO).toString = function () {
      return (
        'NewConversationDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', data=' +
        this.data_1 +
        ')'
      );
    };
    protoOf(NewConversationDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      return result;
    };
    protoOf(NewConversationDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewConversationDTO)) return false;
      var tmp0_other_with_cast = other instanceof NewConversationDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      return true;
    };
    function DeletedConversationDTO(qualifiedConversation, qualifiedFrom, time) {
      Companion_getInstance_58();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
    }
    protoOf(DeletedConversationDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(DeletedConversationDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(DeletedConversationDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(DeletedConversationDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(DeletedConversationDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(DeletedConversationDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(DeletedConversationDTO).copy_9l3c5h_k$ = function (qualifiedConversation, qualifiedFrom, time) {
      return new DeletedConversationDTO(qualifiedConversation, qualifiedFrom, time);
    };
    protoOf(DeletedConversationDTO).copy$default_abogi8_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      return $super === VOID
        ? this.copy_9l3c5h_k$(qualifiedConversation, qualifiedFrom, time)
        : $super.copy_9l3c5h_k$.call(this, qualifiedConversation, qualifiedFrom, time);
    };
    protoOf(DeletedConversationDTO).toString = function () {
      return (
        'DeletedConversationDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ')'
      );
    };
    protoOf(DeletedConversationDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      return result;
    };
    protoOf(DeletedConversationDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof DeletedConversationDTO)) return false;
      var tmp0_other_with_cast = other instanceof DeletedConversationDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      return true;
    };
    function ConversationRenameDTO(qualifiedConversation, qualifiedFrom, time, updateNameData) {
      Companion_getInstance_59();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.updateNameData_1 = updateNameData;
    }
    protoOf(ConversationRenameDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ConversationRenameDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ConversationRenameDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(ConversationRenameDTO).get_updateNameData_75h9s7_k$ = function () {
      return this.updateNameData_1;
    };
    protoOf(ConversationRenameDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ConversationRenameDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ConversationRenameDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(ConversationRenameDTO).component4_7eebs9_k$ = function () {
      return this.updateNameData_1;
    };
    protoOf(ConversationRenameDTO).copy_i63rdr_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      updateNameData,
    ) {
      return new ConversationRenameDTO(qualifiedConversation, qualifiedFrom, time, updateNameData);
    };
    protoOf(ConversationRenameDTO).copy$default_lgalui_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      updateNameData,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      updateNameData = updateNameData === VOID ? this.updateNameData_1 : updateNameData;
      return $super === VOID
        ? this.copy_i63rdr_k$(qualifiedConversation, qualifiedFrom, time, updateNameData)
        : $super.copy_i63rdr_k$.call(this, qualifiedConversation, qualifiedFrom, time, updateNameData);
    };
    protoOf(ConversationRenameDTO).toString = function () {
      return (
        'ConversationRenameDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', updateNameData=' +
        this.updateNameData_1 +
        ')'
      );
    };
    protoOf(ConversationRenameDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      result = (imul(result, 31) + this.updateNameData_1.hashCode()) | 0;
      return result;
    };
    protoOf(ConversationRenameDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationRenameDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationRenameDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      if (!this.updateNameData_1.equals(tmp0_other_with_cast.updateNameData_1)) return false;
      return true;
    };
    function MemberJoinDTO(qualifiedConversation, qualifiedFrom, time, members, from) {
      Companion_getInstance_60();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.members_1 = members;
      this.from_1 = from;
    }
    protoOf(MemberJoinDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MemberJoinDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MemberJoinDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberJoinDTO).get_members_gyhru8_k$ = function () {
      return this.members_1;
    };
    protoOf(MemberJoinDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(MemberJoinDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MemberJoinDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MemberJoinDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberJoinDTO).component4_7eebs9_k$ = function () {
      return this.members_1;
    };
    protoOf(MemberJoinDTO).component5_7eebs8_k$ = function () {
      return this.from_1;
    };
    protoOf(MemberJoinDTO).copy_uzqz0u_k$ = function (qualifiedConversation, qualifiedFrom, time, members, from) {
      return new MemberJoinDTO(qualifiedConversation, qualifiedFrom, time, members, from);
    };
    protoOf(MemberJoinDTO).copy$default_jdzxzl_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      members,
      from,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      members = members === VOID ? this.members_1 : members;
      from = from === VOID ? this.from_1 : from;
      return $super === VOID
        ? this.copy_uzqz0u_k$(qualifiedConversation, qualifiedFrom, time, members, from)
        : $super.copy_uzqz0u_k$.call(this, qualifiedConversation, qualifiedFrom, time, members, from);
    };
    protoOf(MemberJoinDTO).toString = function () {
      return (
        'MemberJoinDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', members=' +
        this.members_1 +
        ', from=' +
        this.from_1 +
        ')'
      );
    };
    protoOf(MemberJoinDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      result = (imul(result, 31) + this.members_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      return result;
    };
    protoOf(MemberJoinDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MemberJoinDTO)) return false;
      var tmp0_other_with_cast = other instanceof MemberJoinDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      if (!this.members_1.equals(tmp0_other_with_cast.members_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      return true;
    };
    function MemberLeaveDTO(qualifiedConversation, qualifiedFrom, time, removedUsers, from) {
      Companion_getInstance_61();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.removedUsers_1 = removedUsers;
      this.from_1 = from;
    }
    protoOf(MemberLeaveDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MemberLeaveDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MemberLeaveDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberLeaveDTO).get_removedUsers_1zsz73_k$ = function () {
      return this.removedUsers_1;
    };
    protoOf(MemberLeaveDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(MemberLeaveDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MemberLeaveDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MemberLeaveDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberLeaveDTO).component4_7eebs9_k$ = function () {
      return this.removedUsers_1;
    };
    protoOf(MemberLeaveDTO).component5_7eebs8_k$ = function () {
      return this.from_1;
    };
    protoOf(MemberLeaveDTO).copy_rqp0sy_k$ = function (qualifiedConversation, qualifiedFrom, time, removedUsers, from) {
      return new MemberLeaveDTO(qualifiedConversation, qualifiedFrom, time, removedUsers, from);
    };
    protoOf(MemberLeaveDTO).copy$default_edf29e_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      removedUsers,
      from,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      removedUsers = removedUsers === VOID ? this.removedUsers_1 : removedUsers;
      from = from === VOID ? this.from_1 : from;
      return $super === VOID
        ? this.copy_rqp0sy_k$(qualifiedConversation, qualifiedFrom, time, removedUsers, from)
        : $super.copy_rqp0sy_k$.call(this, qualifiedConversation, qualifiedFrom, time, removedUsers, from);
    };
    protoOf(MemberLeaveDTO).toString = function () {
      return (
        'MemberLeaveDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', removedUsers=' +
        this.removedUsers_1 +
        ', from=' +
        this.from_1 +
        ')'
      );
    };
    protoOf(MemberLeaveDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      result = (imul(result, 31) + this.removedUsers_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      return result;
    };
    protoOf(MemberLeaveDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MemberLeaveDTO)) return false;
      var tmp0_other_with_cast = other instanceof MemberLeaveDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      if (!this.removedUsers_1.equals(tmp0_other_with_cast.removedUsers_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      return true;
    };
    function MemberUpdateDTO(qualifiedConversation, qualifiedFrom, time, from, roleChange) {
      Companion_getInstance_62();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.from_1 = from;
      this.roleChange_1 = roleChange;
    }
    protoOf(MemberUpdateDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MemberUpdateDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MemberUpdateDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberUpdateDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(MemberUpdateDTO).get_roleChange_3eiz01_k$ = function () {
      return this.roleChange_1;
    };
    protoOf(MemberUpdateDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MemberUpdateDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MemberUpdateDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberUpdateDTO).component4_7eebs9_k$ = function () {
      return this.from_1;
    };
    protoOf(MemberUpdateDTO).component5_7eebs8_k$ = function () {
      return this.roleChange_1;
    };
    protoOf(MemberUpdateDTO).copy_kue9hy_k$ = function (qualifiedConversation, qualifiedFrom, time, from, roleChange) {
      return new MemberUpdateDTO(qualifiedConversation, qualifiedFrom, time, from, roleChange);
    };
    protoOf(MemberUpdateDTO).copy$default_m1svt0_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      roleChange,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      from = from === VOID ? this.from_1 : from;
      roleChange = roleChange === VOID ? this.roleChange_1 : roleChange;
      return $super === VOID
        ? this.copy_kue9hy_k$(qualifiedConversation, qualifiedFrom, time, from, roleChange)
        : $super.copy_kue9hy_k$.call(this, qualifiedConversation, qualifiedFrom, time, from, roleChange);
    };
    protoOf(MemberUpdateDTO).toString = function () {
      return (
        'MemberUpdateDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', from=' +
        this.from_1 +
        ', roleChange=' +
        this.roleChange_1 +
        ')'
      );
    };
    protoOf(MemberUpdateDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + this.roleChange_1.hashCode()) | 0;
      return result;
    };
    protoOf(MemberUpdateDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MemberUpdateDTO)) return false;
      var tmp0_other_with_cast = other instanceof MemberUpdateDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!this.roleChange_1.equals(tmp0_other_with_cast.roleChange_1)) return false;
      return true;
    };
    function ConversationTypingDTO(qualifiedConversation, qualifiedFrom, time, from, status) {
      Companion_getInstance_63();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.from_1 = from;
      this.status_1 = status;
    }
    protoOf(ConversationTypingDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ConversationTypingDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ConversationTypingDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(ConversationTypingDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(ConversationTypingDTO).get_status_jnf6d7_k$ = function () {
      return this.status_1;
    };
    protoOf(ConversationTypingDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ConversationTypingDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ConversationTypingDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(ConversationTypingDTO).component4_7eebs9_k$ = function () {
      return this.from_1;
    };
    protoOf(ConversationTypingDTO).component5_7eebs8_k$ = function () {
      return this.status_1;
    };
    protoOf(ConversationTypingDTO).copy_bbe992_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      status,
    ) {
      return new ConversationTypingDTO(qualifiedConversation, qualifiedFrom, time, from, status);
    };
    protoOf(ConversationTypingDTO).copy$default_6fzprb_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      from,
      status,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      from = from === VOID ? this.from_1 : from;
      status = status === VOID ? this.status_1 : status;
      return $super === VOID
        ? this.copy_bbe992_k$(qualifiedConversation, qualifiedFrom, time, from, status)
        : $super.copy_bbe992_k$.call(this, qualifiedConversation, qualifiedFrom, time, from, status);
    };
    protoOf(ConversationTypingDTO).toString = function () {
      return (
        'ConversationTypingDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', from=' +
        this.from_1 +
        ', status=' +
        this.status_1 +
        ')'
      );
    };
    protoOf(ConversationTypingDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.time_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      result = (imul(result, 31) + this.status_1.hashCode()) | 0;
      return result;
    };
    protoOf(ConversationTypingDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ConversationTypingDTO)) return false;
      var tmp0_other_with_cast = other instanceof ConversationTypingDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.time_1 === tmp0_other_with_cast.time_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      if (!this.status_1.equals(tmp0_other_with_cast.status_1)) return false;
      return true;
    };
    function NewMessageDTO(qualifiedConversation, qualifiedFrom, conversation, time, from, data) {
      Companion_getInstance_64();
      conversation = conversation === VOID ? null : conversation;
      from = from === VOID ? null : from;
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.conversation_1 = conversation;
      this.time_1 = time;
      this.from_1 = from;
      this.data_1 = data;
    }
    protoOf(NewMessageDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewMessageDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewMessageDTO).get_conversation_gs8dl8_k$ = function () {
      return this.conversation_1;
    };
    protoOf(NewMessageDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(NewMessageDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(NewMessageDTO).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(NewMessageDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewMessageDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewMessageDTO).component3_7eebsa_k$ = function () {
      return this.conversation_1;
    };
    protoOf(NewMessageDTO).component4_7eebs9_k$ = function () {
      return this.time_1;
    };
    protoOf(NewMessageDTO).component5_7eebs8_k$ = function () {
      return this.from_1;
    };
    protoOf(NewMessageDTO).component6_7eebs7_k$ = function () {
      return this.data_1;
    };
    protoOf(NewMessageDTO).copy_fr17ch_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      conversation,
      time,
      from,
      data,
    ) {
      return new NewMessageDTO(qualifiedConversation, qualifiedFrom, conversation, time, from, data);
    };
    protoOf(NewMessageDTO).copy$default_1zgvii_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      conversation,
      time,
      from,
      data,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      conversation = conversation === VOID ? this.conversation_1 : conversation;
      time = time === VOID ? this.time_1 : time;
      from = from === VOID ? this.from_1 : from;
      data = data === VOID ? this.data_1 : data;
      return $super === VOID
        ? this.copy_fr17ch_k$(qualifiedConversation, qualifiedFrom, conversation, time, from, data)
        : $super.copy_fr17ch_k$.call(this, qualifiedConversation, qualifiedFrom, conversation, time, from, data);
    };
    protoOf(NewMessageDTO).toString = function () {
      return (
        'NewMessageDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', conversation=' +
        this.conversation_1 +
        ', time=' +
        this.time_1 +
        ', from=' +
        this.from_1 +
        ', data=' +
        this.data_1 +
        ')'
      );
    };
    protoOf(NewMessageDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.conversation_1 == null ? 0 : getStringHashCode(this.conversation_1))) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      result = (imul(result, 31) + (this.from_1 == null ? 0 : getStringHashCode(this.from_1))) | 0;
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      return result;
    };
    protoOf(NewMessageDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewMessageDTO)) return false;
      var tmp0_other_with_cast = other instanceof NewMessageDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.conversation_1 == tmp0_other_with_cast.conversation_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      if (!(this.from_1 == tmp0_other_with_cast.from_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      return true;
    };
    function AccessUpdate(qualifiedConversation, data, qualifiedFrom) {
      Companion_getInstance_65();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.data_1 = data;
      this.qualifiedFrom_1 = qualifiedFrom;
    }
    protoOf(AccessUpdate).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(AccessUpdate).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(AccessUpdate).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(AccessUpdate).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(AccessUpdate).component2_7eebsb_k$ = function () {
      return this.data_1;
    };
    protoOf(AccessUpdate).component3_7eebsa_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(AccessUpdate).copy_5rekex_k$ = function (qualifiedConversation, data, qualifiedFrom) {
      return new AccessUpdate(qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(AccessUpdate).copy$default_nd5oz6_k$ = function (qualifiedConversation, data, qualifiedFrom, $super) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      data = data === VOID ? this.data_1 : data;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      return $super === VOID
        ? this.copy_5rekex_k$(qualifiedConversation, data, qualifiedFrom)
        : $super.copy_5rekex_k$.call(this, qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(AccessUpdate).toString = function () {
      return (
        'AccessUpdate(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', data=' +
        this.data_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ')'
      );
    };
    protoOf(AccessUpdate).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      return result;
    };
    protoOf(AccessUpdate).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof AccessUpdate)) return false;
      var tmp0_other_with_cast = other instanceof AccessUpdate ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      return true;
    };
    function CodeUpdated(qualifiedConversation, data, qualifiedFrom) {
      Companion_getInstance_66();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.data_1 = data;
      this.qualifiedFrom_1 = qualifiedFrom;
    }
    protoOf(CodeUpdated).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(CodeUpdated).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(CodeUpdated).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(CodeUpdated).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(CodeUpdated).component2_7eebsb_k$ = function () {
      return this.data_1;
    };
    protoOf(CodeUpdated).component3_7eebsa_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(CodeUpdated).copy_l6nao2_k$ = function (qualifiedConversation, data, qualifiedFrom) {
      return new CodeUpdated(qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(CodeUpdated).copy$default_agucb0_k$ = function (qualifiedConversation, data, qualifiedFrom, $super) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      data = data === VOID ? this.data_1 : data;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      return $super === VOID
        ? this.copy_l6nao2_k$(qualifiedConversation, data, qualifiedFrom)
        : $super.copy_l6nao2_k$.call(this, qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(CodeUpdated).toString = function () {
      return (
        'CodeUpdated(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', data=' +
        this.data_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ')'
      );
    };
    protoOf(CodeUpdated).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      return result;
    };
    protoOf(CodeUpdated).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof CodeUpdated)) return false;
      var tmp0_other_with_cast = other instanceof CodeUpdated ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      return true;
    };
    function CodeDeleted(qualifiedConversation, qualifiedFrom) {
      Companion_getInstance_67();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
    }
    protoOf(CodeDeleted).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(CodeDeleted).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(CodeDeleted).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(CodeDeleted).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(CodeDeleted).copy_ucp0k5_k$ = function (qualifiedConversation, qualifiedFrom) {
      return new CodeDeleted(qualifiedConversation, qualifiedFrom);
    };
    protoOf(CodeDeleted).copy$default_romgne_k$ = function (qualifiedConversation, qualifiedFrom, $super) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      return $super === VOID
        ? this.copy_ucp0k5_k$(qualifiedConversation, qualifiedFrom)
        : $super.copy_ucp0k5_k$.call(this, qualifiedConversation, qualifiedFrom);
    };
    protoOf(CodeDeleted).toString = function () {
      return (
        'CodeDeleted(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ')'
      );
    };
    protoOf(CodeDeleted).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      return result;
    };
    protoOf(CodeDeleted).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof CodeDeleted)) return false;
      var tmp0_other_with_cast = other instanceof CodeDeleted ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      return true;
    };
    function ReceiptModeUpdate(qualifiedConversation, data, qualifiedFrom) {
      Companion_getInstance_68();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.data_1 = data;
      this.qualifiedFrom_1 = qualifiedFrom;
    }
    protoOf(ReceiptModeUpdate).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ReceiptModeUpdate).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(ReceiptModeUpdate).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ReceiptModeUpdate).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ReceiptModeUpdate).component2_7eebsb_k$ = function () {
      return this.data_1;
    };
    protoOf(ReceiptModeUpdate).component3_7eebsa_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ReceiptModeUpdate).copy_jh5sy_k$ = function (qualifiedConversation, data, qualifiedFrom) {
      return new ReceiptModeUpdate(qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(ReceiptModeUpdate).copy$default_qfadmu_k$ = function (qualifiedConversation, data, qualifiedFrom, $super) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      data = data === VOID ? this.data_1 : data;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      return $super === VOID
        ? this.copy_jh5sy_k$(qualifiedConversation, data, qualifiedFrom)
        : $super.copy_jh5sy_k$.call(this, qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(ReceiptModeUpdate).toString = function () {
      return (
        'ReceiptModeUpdate(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', data=' +
        this.data_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ')'
      );
    };
    protoOf(ReceiptModeUpdate).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      return result;
    };
    protoOf(ReceiptModeUpdate).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ReceiptModeUpdate)) return false;
      var tmp0_other_with_cast = other instanceof ReceiptModeUpdate ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      return true;
    };
    function MessageTimerUpdate(qualifiedConversation, data, qualifiedFrom, time) {
      Companion_getInstance_69();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.data_1 = data;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
    }
    protoOf(MessageTimerUpdate).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MessageTimerUpdate).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(MessageTimerUpdate).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MessageTimerUpdate).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(MessageTimerUpdate).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MessageTimerUpdate).component2_7eebsb_k$ = function () {
      return this.data_1;
    };
    protoOf(MessageTimerUpdate).component3_7eebsa_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MessageTimerUpdate).component4_7eebs9_k$ = function () {
      return this.time_1;
    };
    protoOf(MessageTimerUpdate).copy_dyac4j_k$ = function (qualifiedConversation, data, qualifiedFrom, time) {
      return new MessageTimerUpdate(qualifiedConversation, data, qualifiedFrom, time);
    };
    protoOf(MessageTimerUpdate).copy$default_1bkbr_k$ = function (
      qualifiedConversation,
      data,
      qualifiedFrom,
      time,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      data = data === VOID ? this.data_1 : data;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      return $super === VOID
        ? this.copy_dyac4j_k$(qualifiedConversation, data, qualifiedFrom, time)
        : $super.copy_dyac4j_k$.call(this, qualifiedConversation, data, qualifiedFrom, time);
    };
    protoOf(MessageTimerUpdate).toString = function () {
      return (
        'MessageTimerUpdate(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', data=' +
        this.data_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ')'
      );
    };
    protoOf(MessageTimerUpdate).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      return result;
    };
    protoOf(MessageTimerUpdate).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MessageTimerUpdate)) return false;
      var tmp0_other_with_cast = other instanceof MessageTimerUpdate ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      return true;
    };
    function NewMLSMessageDTO(qualifiedConversation, qualifiedFrom, time, message, subconversation) {
      Companion_getInstance_70();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.time_1 = time;
      this.message_1 = message;
      this.subconversation_1 = subconversation;
    }
    protoOf(NewMLSMessageDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewMLSMessageDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewMLSMessageDTO).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(NewMLSMessageDTO).get_message_h23axq_k$ = function () {
      return this.message_1;
    };
    protoOf(NewMLSMessageDTO).get_subconversation_q8sy7a_k$ = function () {
      return this.subconversation_1;
    };
    protoOf(NewMLSMessageDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(NewMLSMessageDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(NewMLSMessageDTO).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(NewMLSMessageDTO).component4_7eebs9_k$ = function () {
      return this.message_1;
    };
    protoOf(NewMLSMessageDTO).component5_7eebs8_k$ = function () {
      return this.subconversation_1;
    };
    protoOf(NewMLSMessageDTO).copy_k747k3_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      message,
      subconversation,
    ) {
      return new NewMLSMessageDTO(qualifiedConversation, qualifiedFrom, time, message, subconversation);
    };
    protoOf(NewMLSMessageDTO).copy$default_3aytt1_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      time,
      message,
      subconversation,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      time = time === VOID ? this.time_1 : time;
      message = message === VOID ? this.message_1 : message;
      subconversation = subconversation === VOID ? this.subconversation_1 : subconversation;
      return $super === VOID
        ? this.copy_k747k3_k$(qualifiedConversation, qualifiedFrom, time, message, subconversation)
        : $super.copy_k747k3_k$.call(this, qualifiedConversation, qualifiedFrom, time, message, subconversation);
    };
    protoOf(NewMLSMessageDTO).toString = function () {
      return (
        'NewMLSMessageDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', time=' +
        this.time_1 +
        ', message=' +
        this.message_1 +
        ', subconversation=' +
        this.subconversation_1 +
        ')'
      );
    };
    protoOf(NewMLSMessageDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.message_1)) | 0;
      result =
        (imul(result, 31) + (this.subconversation_1 == null ? 0 : getStringHashCode(this.subconversation_1))) | 0;
      return result;
    };
    protoOf(NewMLSMessageDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewMLSMessageDTO)) return false;
      var tmp0_other_with_cast = other instanceof NewMLSMessageDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      if (!(this.message_1 === tmp0_other_with_cast.message_1)) return false;
      if (!(this.subconversation_1 == tmp0_other_with_cast.subconversation_1)) return false;
      return true;
    };
    function MLSWelcomeDTO(qualifiedConversation, qualifiedFrom, message, from) {
      Companion_getInstance_71();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.qualifiedFrom_1 = qualifiedFrom;
      this.message_1 = message;
      this.from_1 = from;
    }
    protoOf(MLSWelcomeDTO).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MLSWelcomeDTO).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MLSWelcomeDTO).get_message_h23axq_k$ = function () {
      return this.message_1;
    };
    protoOf(MLSWelcomeDTO).get_from_wom7eb_k$ = function () {
      return this.from_1;
    };
    protoOf(MLSWelcomeDTO).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(MLSWelcomeDTO).component2_7eebsb_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(MLSWelcomeDTO).component3_7eebsa_k$ = function () {
      return this.message_1;
    };
    protoOf(MLSWelcomeDTO).component4_7eebs9_k$ = function () {
      return this.from_1;
    };
    protoOf(MLSWelcomeDTO).copy_ahxs0l_k$ = function (qualifiedConversation, qualifiedFrom, message, from) {
      return new MLSWelcomeDTO(qualifiedConversation, qualifiedFrom, message, from);
    };
    protoOf(MLSWelcomeDTO).copy$default_x8zrl1_k$ = function (
      qualifiedConversation,
      qualifiedFrom,
      message,
      from,
      $super,
    ) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      message = message === VOID ? this.message_1 : message;
      from = from === VOID ? this.from_1 : from;
      return $super === VOID
        ? this.copy_ahxs0l_k$(qualifiedConversation, qualifiedFrom, message, from)
        : $super.copy_ahxs0l_k$.call(this, qualifiedConversation, qualifiedFrom, message, from);
    };
    protoOf(MLSWelcomeDTO).toString = function () {
      return (
        'MLSWelcomeDTO(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ', message=' +
        this.message_1 +
        ', from=' +
        this.from_1 +
        ')'
      );
    };
    protoOf(MLSWelcomeDTO).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.message_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.from_1)) | 0;
      return result;
    };
    protoOf(MLSWelcomeDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MLSWelcomeDTO)) return false;
      var tmp0_other_with_cast = other instanceof MLSWelcomeDTO ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      if (!(this.message_1 === tmp0_other_with_cast.message_1)) return false;
      if (!(this.from_1 === tmp0_other_with_cast.from_1)) return false;
      return true;
    };
    function ProtocolUpdate(qualifiedConversation, data, qualifiedFrom) {
      Companion_getInstance_72();
      Conversation.call(this);
      this.qualifiedConversation_1 = qualifiedConversation;
      this.data_1 = data;
      this.qualifiedFrom_1 = qualifiedFrom;
    }
    protoOf(ProtocolUpdate).get_qualifiedConversation_iu3gmi_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ProtocolUpdate).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(ProtocolUpdate).get_qualifiedFrom_aop3nn_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ProtocolUpdate).component1_7eebsc_k$ = function () {
      return this.qualifiedConversation_1;
    };
    protoOf(ProtocolUpdate).component2_7eebsb_k$ = function () {
      return this.data_1;
    };
    protoOf(ProtocolUpdate).component3_7eebsa_k$ = function () {
      return this.qualifiedFrom_1;
    };
    protoOf(ProtocolUpdate).copy_novipt_k$ = function (qualifiedConversation, data, qualifiedFrom) {
      return new ProtocolUpdate(qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(ProtocolUpdate).copy$default_d9ss7g_k$ = function (qualifiedConversation, data, qualifiedFrom, $super) {
      qualifiedConversation = qualifiedConversation === VOID ? this.qualifiedConversation_1 : qualifiedConversation;
      data = data === VOID ? this.data_1 : data;
      qualifiedFrom = qualifiedFrom === VOID ? this.qualifiedFrom_1 : qualifiedFrom;
      return $super === VOID
        ? this.copy_novipt_k$(qualifiedConversation, data, qualifiedFrom)
        : $super.copy_novipt_k$.call(this, qualifiedConversation, data, qualifiedFrom);
    };
    protoOf(ProtocolUpdate).toString = function () {
      return (
        'ProtocolUpdate(qualifiedConversation=' +
        this.qualifiedConversation_1 +
        ', data=' +
        this.data_1 +
        ', qualifiedFrom=' +
        this.qualifiedFrom_1 +
        ')'
      );
    };
    protoOf(ProtocolUpdate).hashCode = function () {
      var result = this.qualifiedConversation_1.hashCode();
      result = (imul(result, 31) + this.data_1.hashCode()) | 0;
      result = (imul(result, 31) + this.qualifiedFrom_1.hashCode()) | 0;
      return result;
    };
    protoOf(ProtocolUpdate).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ProtocolUpdate)) return false;
      var tmp0_other_with_cast = other instanceof ProtocolUpdate ? other : THROW_CCE();
      if (!this.qualifiedConversation_1.equals(tmp0_other_with_cast.qualifiedConversation_1)) return false;
      if (!this.data_1.equals(tmp0_other_with_cast.data_1)) return false;
      if (!this.qualifiedFrom_1.equals(tmp0_other_with_cast.qualifiedFrom_1)) return false;
      return true;
    };
    function Companion_71() {
      Companion_instance_71 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$Conversation$Companion$_anonymous__2a4a3c);
    }
    protoOf(Companion_71).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_8(this);
    };
    protoOf(Companion_71).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_71;
    function Companion_getInstance_73() {
      if (Companion_instance_71 == null) new Companion_71();
      return Companion_instance_71;
    }
    function Conversation_init_$Init$(seen1, serializationConstructorMarker, $this) {
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function Conversation_init_$Create$(seen1, serializationConstructorMarker) {
      return Conversation_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(Conversation)));
    }
    function Companion_72() {
      Companion_instance_72 = this;
    }
    protoOf(Companion_72).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_58();
    };
    var Companion_instance_72;
    function Companion_getInstance_74() {
      if (Companion_instance_72 == null) new Companion_72();
      return Companion_instance_72;
    }
    function $serializer_58() {
      $serializer_instance_58 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('team.member-leave', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('data', false);
      tmp0_serialDesc.addElement_5pzumi_k$('team', false);
      tmp0_serialDesc.addElement_5pzumi_k$('time', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_58).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_58).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_76(), StringSerializer_getInstance(), InstantIso8601Serializer_getInstance()];
    };
    protoOf($serializer_58).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_76(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          InstantIso8601Serializer_getInstance(),
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
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_76(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                InstantIso8601Serializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MemberLeave_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_58).serialize_8lyp05_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_76(), value.teamMember_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.teamId_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        2,
        InstantIso8601Serializer_getInstance(),
        value.time_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_58).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_8lyp05_k$(encoder, value instanceof MemberLeave ? value : THROW_CCE());
    };
    var $serializer_instance_58;
    function $serializer_getInstance_58() {
      if ($serializer_instance_58 == null) new $serializer_58();
      return $serializer_instance_58;
    }
    function MemberLeave_init_$Init$(seen1, teamMember, teamId, time, serializationConstructorMarker, $this) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_58().descriptor_1);
      }
      Team_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.teamMember_1 = teamMember;
      $this.teamId_1 = teamId;
      $this.time_1 = time;
      return $this;
    }
    function MemberLeave_init_$Create$(seen1, teamMember, teamId, time, serializationConstructorMarker) {
      return MemberLeave_init_$Init$(
        seen1,
        teamMember,
        teamId,
        time,
        serializationConstructorMarker,
        objectCreate(protoOf(MemberLeave)),
      );
    }
    function _get_$cachedSerializer__te6jhj_9($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$Team$Companion$_anonymous__yz0y32() {
      var tmp = getKClass(Team);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [getKClass(MemberLeave)];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [$serializer_getInstance_58()];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.Team',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function MemberLeave(teamMember, teamId, time) {
      Companion_getInstance_74();
      Team.call(this);
      this.teamMember_1 = teamMember;
      this.teamId_1 = teamId;
      this.time_1 = time;
    }
    protoOf(MemberLeave).get_teamMember_n1skio_k$ = function () {
      return this.teamMember_1;
    };
    protoOf(MemberLeave).get_teamId_jw7plt_k$ = function () {
      return this.teamId_1;
    };
    protoOf(MemberLeave).get_time_wouyhi_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberLeave).component1_7eebsc_k$ = function () {
      return this.teamMember_1;
    };
    protoOf(MemberLeave).component2_7eebsb_k$ = function () {
      return this.teamId_1;
    };
    protoOf(MemberLeave).component3_7eebsa_k$ = function () {
      return this.time_1;
    };
    protoOf(MemberLeave).copy_2o4o3o_k$ = function (teamMember, teamId, time) {
      return new MemberLeave(teamMember, teamId, time);
    };
    protoOf(MemberLeave).copy$default_yf9vln_k$ = function (teamMember, teamId, time, $super) {
      teamMember = teamMember === VOID ? this.teamMember_1 : teamMember;
      teamId = teamId === VOID ? this.teamId_1 : teamId;
      time = time === VOID ? this.time_1 : time;
      return $super === VOID
        ? this.copy_2o4o3o_k$(teamMember, teamId, time)
        : $super.copy_2o4o3o_k$.call(this, teamMember, teamId, time);
    };
    protoOf(MemberLeave).toString = function () {
      return (
        'MemberLeave(teamMember=' + this.teamMember_1 + ', teamId=' + this.teamId_1 + ', time=' + this.time_1 + ')'
      );
    };
    protoOf(MemberLeave).hashCode = function () {
      var result = this.teamMember_1.hashCode();
      result = (imul(result, 31) + getStringHashCode(this.teamId_1)) | 0;
      result = (imul(result, 31) + this.time_1.hashCode()) | 0;
      return result;
    };
    protoOf(MemberLeave).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MemberLeave)) return false;
      var tmp0_other_with_cast = other instanceof MemberLeave ? other : THROW_CCE();
      if (!this.teamMember_1.equals(tmp0_other_with_cast.teamMember_1)) return false;
      if (!(this.teamId_1 === tmp0_other_with_cast.teamId_1)) return false;
      if (!this.time_1.equals(tmp0_other_with_cast.time_1)) return false;
      return true;
    };
    function Companion_73() {
      Companion_instance_73 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$Team$Companion$_anonymous__yz0y32);
    }
    protoOf(Companion_73).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_9(this);
    };
    protoOf(Companion_73).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_73;
    function Companion_getInstance_75() {
      if (Companion_instance_73 == null) new Companion_73();
      return Companion_instance_73;
    }
    function Team_init_$Init$(seen1, serializationConstructorMarker, $this) {
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function Team_init_$Create$(seen1, serializationConstructorMarker) {
      return Team_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(Team)));
    }
    function Companion_74() {
      Companion_instance_74 = this;
    }
    protoOf(Companion_74).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_59();
    };
    var Companion_instance_74;
    function Companion_getInstance_76() {
      if (Companion_instance_74 == null) new Companion_74();
      return Companion_instance_74;
    }
    function $serializer_59() {
      $serializer_instance_59 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.client-add', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('client', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_59).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_59).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance()];
    };
    protoOf($serializer_59).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewClientDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_59).serialize_z6dytc_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance(), value.client_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_59).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_z6dytc_k$(encoder, value instanceof NewClientDTO ? value : THROW_CCE());
    };
    var $serializer_instance_59;
    function $serializer_getInstance_59() {
      if ($serializer_instance_59 == null) new $serializer_59();
      return $serializer_instance_59;
    }
    function NewClientDTO_init_$Init$(seen1, client, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_59().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.client_1 = client;
      return $this;
    }
    function NewClientDTO_init_$Create$(seen1, client, serializationConstructorMarker) {
      return NewClientDTO_init_$Init$(
        seen1,
        client,
        serializationConstructorMarker,
        objectCreate(protoOf(NewClientDTO)),
      );
    }
    function Companion_75() {
      Companion_instance_75 = this;
    }
    protoOf(Companion_75).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_60();
    };
    var Companion_instance_75;
    function Companion_getInstance_77() {
      if (Companion_instance_75 == null) new Companion_75();
      return Companion_instance_75;
    }
    function $serializer_60() {
      $serializer_instance_60 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.client-remove', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('client', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_60).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_60).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_77()];
    };
    protoOf($serializer_60).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_77(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_77(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return ClientRemoveDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_60).serialize_9sxfp6_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_77(), value.client_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_60).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_9sxfp6_k$(encoder, value instanceof ClientRemoveDTO ? value : THROW_CCE());
    };
    var $serializer_instance_60;
    function $serializer_getInstance_60() {
      if ($serializer_instance_60 == null) new $serializer_60();
      return $serializer_instance_60;
    }
    function ClientRemoveDTO_init_$Init$(seen1, client, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_60().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.client_1 = client;
      return $this;
    }
    function ClientRemoveDTO_init_$Create$(seen1, client, serializationConstructorMarker) {
      return ClientRemoveDTO_init_$Init$(
        seen1,
        client,
        serializationConstructorMarker,
        objectCreate(protoOf(ClientRemoveDTO)),
      );
    }
    function Companion_76() {
      Companion_instance_76 = this;
    }
    protoOf(Companion_76).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_61();
    };
    var Companion_instance_76;
    function Companion_getInstance_78() {
      if (Companion_instance_76 == null) new Companion_76();
      return Companion_instance_76;
    }
    function $serializer_61() {
      $serializer_instance_61 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.update', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('user', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_61).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_61).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_78()];
    };
    protoOf($serializer_61).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_78(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_78(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return UpdateDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_61).serialize_y9fo68_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_78(), value.userData_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_61).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_y9fo68_k$(encoder, value instanceof UpdateDTO ? value : THROW_CCE());
    };
    var $serializer_instance_61;
    function $serializer_getInstance_61() {
      if ($serializer_instance_61 == null) new $serializer_61();
      return $serializer_instance_61;
    }
    function UpdateDTO_init_$Init$(seen1, userData, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_61().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.userData_1 = userData;
      return $this;
    }
    function UpdateDTO_init_$Create$(seen1, userData, serializationConstructorMarker) {
      return UpdateDTO_init_$Init$(seen1, userData, serializationConstructorMarker, objectCreate(protoOf(UpdateDTO)));
    }
    function Companion_77() {
      Companion_instance_77 = this;
    }
    protoOf(Companion_77).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_62();
    };
    var Companion_instance_77;
    function Companion_getInstance_79() {
      if (Companion_instance_77 == null) new Companion_77();
      return Companion_instance_77;
    }
    function $serializer_62() {
      $serializer_instance_62 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.connection', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('connection', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_62).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_62).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_1()];
    };
    protoOf($serializer_62).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_1(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_1(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewConnectionDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_62).serialize_6x1l6b_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_1(), value.connection_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_62).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_6x1l6b_k$(encoder, value instanceof NewConnectionDTO ? value : THROW_CCE());
    };
    var $serializer_instance_62;
    function $serializer_getInstance_62() {
      if ($serializer_instance_62 == null) new $serializer_62();
      return $serializer_instance_62;
    }
    function NewConnectionDTO_init_$Init$(seen1, connection, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_62().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.connection_1 = connection;
      return $this;
    }
    function NewConnectionDTO_init_$Create$(seen1, connection, serializationConstructorMarker) {
      return NewConnectionDTO_init_$Init$(
        seen1,
        connection,
        serializationConstructorMarker,
        objectCreate(protoOf(NewConnectionDTO)),
      );
    }
    function Companion_78() {
      Companion_instance_78 = this;
    }
    protoOf(Companion_78).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_63();
    };
    var Companion_instance_78;
    function Companion_getInstance_80() {
      if (Companion_instance_78 == null) new Companion_78();
      return Companion_instance_78;
    }
    function $serializer_63() {
      $serializer_instance_63 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.legalhold-request', this, 3);
      tmp0_serialDesc.addElement_5pzumi_k$('client', false);
      tmp0_serialDesc.addElement_5pzumi_k$('last_prekey', false);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_63).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_63).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_0(), $serializer_getInstance_41(), StringSerializer_getInstance()];
    };
    protoOf($serializer_63).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          0,
          $serializer_getInstance_0(),
          tmp4_local0,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_41(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp7_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                0,
                $serializer_getInstance_0(),
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_41(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp7_input.endStructure_1xqz0n_k$(tmp0_desc);
      return NewLegalHoldRequestDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_63).serialize_ex0ngs_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, $serializer_getInstance_0(), value.clientId_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_41(), value.lastPreKey_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.id_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_63).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ex0ngs_k$(encoder, value instanceof NewLegalHoldRequestDTO ? value : THROW_CCE());
    };
    var $serializer_instance_63;
    function $serializer_getInstance_63() {
      if ($serializer_instance_63 == null) new $serializer_63();
      return $serializer_instance_63;
    }
    function NewLegalHoldRequestDTO_init_$Init$(
      seen1,
      clientId,
      lastPreKey,
      id,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_63().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.clientId_1 = clientId;
      $this.lastPreKey_1 = lastPreKey;
      $this.id_1 = id;
      return $this;
    }
    function NewLegalHoldRequestDTO_init_$Create$(seen1, clientId, lastPreKey, id, serializationConstructorMarker) {
      return NewLegalHoldRequestDTO_init_$Init$(
        seen1,
        clientId,
        lastPreKey,
        id,
        serializationConstructorMarker,
        objectCreate(protoOf(NewLegalHoldRequestDTO)),
      );
    }
    function Companion_79() {
      Companion_instance_79 = this;
    }
    protoOf(Companion_79).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_64();
    };
    var Companion_instance_79;
    function Companion_getInstance_81() {
      if (Companion_instance_79 == null) new Companion_79();
      return Companion_instance_79;
    }
    function $serializer_64() {
      $serializer_instance_64 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.legalhold-enable', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_64).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_64).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_64).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return LegalHoldEnabledDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_64).serialize_8d8cgw_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.id_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_64).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_8d8cgw_k$(encoder, value instanceof LegalHoldEnabledDTO ? value : THROW_CCE());
    };
    var $serializer_instance_64;
    function $serializer_getInstance_64() {
      if ($serializer_instance_64 == null) new $serializer_64();
      return $serializer_instance_64;
    }
    function LegalHoldEnabledDTO_init_$Init$(seen1, id, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_64().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.id_1 = id;
      return $this;
    }
    function LegalHoldEnabledDTO_init_$Create$(seen1, id, serializationConstructorMarker) {
      return LegalHoldEnabledDTO_init_$Init$(
        seen1,
        id,
        serializationConstructorMarker,
        objectCreate(protoOf(LegalHoldEnabledDTO)),
      );
    }
    function Companion_80() {
      Companion_instance_80 = this;
    }
    protoOf(Companion_80).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_65();
    };
    var Companion_instance_80;
    function Companion_getInstance_82() {
      if (Companion_instance_80 == null) new Companion_80();
      return Companion_instance_80;
    }
    function $serializer_65() {
      $serializer_instance_65 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.legalhold-disable', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_65).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_65).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_65).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return LegalHoldDisabledDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_65).serialize_ukqerb_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.id_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_65).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_ukqerb_k$(encoder, value instanceof LegalHoldDisabledDTO ? value : THROW_CCE());
    };
    var $serializer_instance_65;
    function $serializer_getInstance_65() {
      if ($serializer_instance_65 == null) new $serializer_65();
      return $serializer_instance_65;
    }
    function LegalHoldDisabledDTO_init_$Init$(seen1, id, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_65().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.id_1 = id;
      return $this;
    }
    function LegalHoldDisabledDTO_init_$Create$(seen1, id, serializationConstructorMarker) {
      return LegalHoldDisabledDTO_init_$Init$(
        seen1,
        id,
        serializationConstructorMarker,
        objectCreate(protoOf(LegalHoldDisabledDTO)),
      );
    }
    function Companion_81() {
      Companion_instance_81 = this;
    }
    protoOf(Companion_81).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_66();
    };
    var Companion_instance_81;
    function Companion_getInstance_83() {
      if (Companion_instance_81 == null) new Companion_81();
      return Companion_instance_81;
    }
    function $serializer_66() {
      $serializer_instance_66 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.delete', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_id', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_66).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_66).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), $serializer_getInstance_82()];
    };
    protoOf($serializer_66).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          $serializer_getInstance_82(),
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
              tmp4_local0 = tmp6_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                $serializer_getInstance_82(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return UserDeleteDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_66).serialize_o2m2kt_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.id_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 1, $serializer_getInstance_82(), value.userId_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_66).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_o2m2kt_k$(encoder, value instanceof UserDeleteDTO ? value : THROW_CCE());
    };
    var $serializer_instance_66;
    function $serializer_getInstance_66() {
      if ($serializer_instance_66 == null) new $serializer_66();
      return $serializer_instance_66;
    }
    function UserDeleteDTO_init_$Init$(seen1, id, userId, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_66().descriptor_1);
      }
      User_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.id_1 = id;
      $this.userId_1 = userId;
      return $this;
    }
    function UserDeleteDTO_init_$Create$(seen1, id, userId, serializationConstructorMarker) {
      return UserDeleteDTO_init_$Init$(
        seen1,
        id,
        userId,
        serializationConstructorMarker,
        objectCreate(protoOf(UserDeleteDTO)),
      );
    }
    function _get_$cachedSerializer__te6jhj_10($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$User$Companion$_anonymous__9a0c4g() {
      var tmp = getKClass(User);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [
        getKClass(ClientRemoveDTO),
        getKClass(LegalHoldDisabledDTO),
        getKClass(LegalHoldEnabledDTO),
        getKClass(NewClientDTO),
        getKClass(NewConnectionDTO),
        getKClass(NewLegalHoldRequestDTO),
        getKClass(UpdateDTO),
        getKClass(UserDeleteDTO),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [
        $serializer_getInstance_60(),
        $serializer_getInstance_65(),
        $serializer_getInstance_64(),
        $serializer_getInstance_59(),
        $serializer_getInstance_62(),
        $serializer_getInstance_63(),
        $serializer_getInstance_61(),
        $serializer_getInstance_66(),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.User',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function NewClientDTO(client) {
      Companion_getInstance_76();
      User.call(this);
      this.client_1 = client;
    }
    protoOf(NewClientDTO).get_client_byfnx0_k$ = function () {
      return this.client_1;
    };
    protoOf(NewClientDTO).component1_7eebsc_k$ = function () {
      return this.client_1;
    };
    protoOf(NewClientDTO).copy_uuwp4b_k$ = function (client) {
      return new NewClientDTO(client);
    };
    protoOf(NewClientDTO).copy$default_sp9xht_k$ = function (client, $super) {
      client = client === VOID ? this.client_1 : client;
      return $super === VOID ? this.copy_uuwp4b_k$(client) : $super.copy_uuwp4b_k$.call(this, client);
    };
    protoOf(NewClientDTO).toString = function () {
      return 'NewClientDTO(client=' + this.client_1 + ')';
    };
    protoOf(NewClientDTO).hashCode = function () {
      return this.client_1.hashCode();
    };
    protoOf(NewClientDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewClientDTO)) return false;
      var tmp0_other_with_cast = other instanceof NewClientDTO ? other : THROW_CCE();
      if (!this.client_1.equals(tmp0_other_with_cast.client_1)) return false;
      return true;
    };
    function ClientRemoveDTO(client) {
      Companion_getInstance_77();
      User.call(this);
      this.client_1 = client;
    }
    protoOf(ClientRemoveDTO).get_client_byfnx0_k$ = function () {
      return this.client_1;
    };
    protoOf(ClientRemoveDTO).component1_7eebsc_k$ = function () {
      return this.client_1;
    };
    protoOf(ClientRemoveDTO).copy_5ty38q_k$ = function (client) {
      return new ClientRemoveDTO(client);
    };
    protoOf(ClientRemoveDTO).copy$default_nvfrbi_k$ = function (client, $super) {
      client = client === VOID ? this.client_1 : client;
      return $super === VOID ? this.copy_5ty38q_k$(client) : $super.copy_5ty38q_k$.call(this, client);
    };
    protoOf(ClientRemoveDTO).toString = function () {
      return 'ClientRemoveDTO(client=' + this.client_1 + ')';
    };
    protoOf(ClientRemoveDTO).hashCode = function () {
      return this.client_1.hashCode();
    };
    protoOf(ClientRemoveDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ClientRemoveDTO)) return false;
      var tmp0_other_with_cast = other instanceof ClientRemoveDTO ? other : THROW_CCE();
      if (!this.client_1.equals(tmp0_other_with_cast.client_1)) return false;
      return true;
    };
    function UpdateDTO(userData) {
      Companion_getInstance_78();
      User.call(this);
      this.userData_1 = userData;
    }
    protoOf(UpdateDTO).get_userData_yt8c7y_k$ = function () {
      return this.userData_1;
    };
    protoOf(UpdateDTO).component1_7eebsc_k$ = function () {
      return this.userData_1;
    };
    protoOf(UpdateDTO).copy_ahcwo5_k$ = function (userData) {
      return new UpdateDTO(userData);
    };
    protoOf(UpdateDTO).copy$default_i41i6p_k$ = function (userData, $super) {
      userData = userData === VOID ? this.userData_1 : userData;
      return $super === VOID ? this.copy_ahcwo5_k$(userData) : $super.copy_ahcwo5_k$.call(this, userData);
    };
    protoOf(UpdateDTO).toString = function () {
      return 'UpdateDTO(userData=' + this.userData_1 + ')';
    };
    protoOf(UpdateDTO).hashCode = function () {
      return this.userData_1.hashCode();
    };
    protoOf(UpdateDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof UpdateDTO)) return false;
      var tmp0_other_with_cast = other instanceof UpdateDTO ? other : THROW_CCE();
      if (!this.userData_1.equals(tmp0_other_with_cast.userData_1)) return false;
      return true;
    };
    function NewConnectionDTO(connection) {
      Companion_getInstance_79();
      User.call(this);
      this.connection_1 = connection;
    }
    protoOf(NewConnectionDTO).get_connection_x01z89_k$ = function () {
      return this.connection_1;
    };
    protoOf(NewConnectionDTO).component1_7eebsc_k$ = function () {
      return this.connection_1;
    };
    protoOf(NewConnectionDTO).copy_3uvdqj_k$ = function (connection) {
      return new NewConnectionDTO(connection);
    };
    protoOf(NewConnectionDTO).copy$default_hbnezm_k$ = function (connection, $super) {
      connection = connection === VOID ? this.connection_1 : connection;
      return $super === VOID ? this.copy_3uvdqj_k$(connection) : $super.copy_3uvdqj_k$.call(this, connection);
    };
    protoOf(NewConnectionDTO).toString = function () {
      return 'NewConnectionDTO(connection=' + this.connection_1 + ')';
    };
    protoOf(NewConnectionDTO).hashCode = function () {
      return this.connection_1.hashCode();
    };
    protoOf(NewConnectionDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewConnectionDTO)) return false;
      var tmp0_other_with_cast = other instanceof NewConnectionDTO ? other : THROW_CCE();
      if (!this.connection_1.equals(tmp0_other_with_cast.connection_1)) return false;
      return true;
    };
    function NewLegalHoldRequestDTO(clientId, lastPreKey, id) {
      Companion_getInstance_80();
      User.call(this);
      this.clientId_1 = clientId;
      this.lastPreKey_1 = lastPreKey;
      this.id_1 = id;
    }
    protoOf(NewLegalHoldRequestDTO).get_clientId_gs3e9d_k$ = function () {
      return this.clientId_1;
    };
    protoOf(NewLegalHoldRequestDTO).get_lastPreKey_ag4wvv_k$ = function () {
      return this.lastPreKey_1;
    };
    protoOf(NewLegalHoldRequestDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(NewLegalHoldRequestDTO).component1_7eebsc_k$ = function () {
      return this.clientId_1;
    };
    protoOf(NewLegalHoldRequestDTO).component2_7eebsb_k$ = function () {
      return this.lastPreKey_1;
    };
    protoOf(NewLegalHoldRequestDTO).component3_7eebsa_k$ = function () {
      return this.id_1;
    };
    protoOf(NewLegalHoldRequestDTO).copy_sm67hp_k$ = function (clientId, lastPreKey, id) {
      return new NewLegalHoldRequestDTO(clientId, lastPreKey, id);
    };
    protoOf(NewLegalHoldRequestDTO).copy$default_3zhtkb_k$ = function (clientId, lastPreKey, id, $super) {
      clientId = clientId === VOID ? this.clientId_1 : clientId;
      lastPreKey = lastPreKey === VOID ? this.lastPreKey_1 : lastPreKey;
      id = id === VOID ? this.id_1 : id;
      return $super === VOID
        ? this.copy_sm67hp_k$(clientId, lastPreKey, id)
        : $super.copy_sm67hp_k$.call(this, clientId, lastPreKey, id);
    };
    protoOf(NewLegalHoldRequestDTO).toString = function () {
      return (
        'NewLegalHoldRequestDTO(clientId=' +
        this.clientId_1 +
        ', lastPreKey=' +
        this.lastPreKey_1 +
        ', id=' +
        this.id_1 +
        ')'
      );
    };
    protoOf(NewLegalHoldRequestDTO).hashCode = function () {
      var result = this.clientId_1.hashCode();
      result = (imul(result, 31) + this.lastPreKey_1.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.id_1)) | 0;
      return result;
    };
    protoOf(NewLegalHoldRequestDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof NewLegalHoldRequestDTO)) return false;
      var tmp0_other_with_cast = other instanceof NewLegalHoldRequestDTO ? other : THROW_CCE();
      if (!this.clientId_1.equals(tmp0_other_with_cast.clientId_1)) return false;
      if (!this.lastPreKey_1.equals(tmp0_other_with_cast.lastPreKey_1)) return false;
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      return true;
    };
    function LegalHoldEnabledDTO(id) {
      Companion_getInstance_81();
      User.call(this);
      this.id_1 = id;
    }
    protoOf(LegalHoldEnabledDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(LegalHoldEnabledDTO).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(LegalHoldEnabledDTO).copy_a35qlh_k$ = function (id) {
      return new LegalHoldEnabledDTO(id);
    };
    protoOf(LegalHoldEnabledDTO).copy$default_e2tf51_k$ = function (id, $super) {
      id = id === VOID ? this.id_1 : id;
      return $super === VOID ? this.copy_a35qlh_k$(id) : $super.copy_a35qlh_k$.call(this, id);
    };
    protoOf(LegalHoldEnabledDTO).toString = function () {
      return 'LegalHoldEnabledDTO(id=' + this.id_1 + ')';
    };
    protoOf(LegalHoldEnabledDTO).hashCode = function () {
      return getStringHashCode(this.id_1);
    };
    protoOf(LegalHoldEnabledDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof LegalHoldEnabledDTO)) return false;
      var tmp0_other_with_cast = other instanceof LegalHoldEnabledDTO ? other : THROW_CCE();
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      return true;
    };
    function LegalHoldDisabledDTO(id) {
      Companion_getInstance_82();
      User.call(this);
      this.id_1 = id;
    }
    protoOf(LegalHoldDisabledDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(LegalHoldDisabledDTO).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(LegalHoldDisabledDTO).copy_a35qlh_k$ = function (id) {
      return new LegalHoldDisabledDTO(id);
    };
    protoOf(LegalHoldDisabledDTO).copy$default_vczuwo_k$ = function (id, $super) {
      id = id === VOID ? this.id_1 : id;
      return $super === VOID ? this.copy_a35qlh_k$(id) : $super.copy_a35qlh_k$.call(this, id);
    };
    protoOf(LegalHoldDisabledDTO).toString = function () {
      return 'LegalHoldDisabledDTO(id=' + this.id_1 + ')';
    };
    protoOf(LegalHoldDisabledDTO).hashCode = function () {
      return getStringHashCode(this.id_1);
    };
    protoOf(LegalHoldDisabledDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof LegalHoldDisabledDTO)) return false;
      var tmp0_other_with_cast = other instanceof LegalHoldDisabledDTO ? other : THROW_CCE();
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      return true;
    };
    function UserDeleteDTO(id, userId) {
      Companion_getInstance_83();
      User.call(this);
      this.id_1 = id;
      this.userId_1 = userId;
    }
    protoOf(UserDeleteDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(UserDeleteDTO).get_userId_kl13yn_k$ = function () {
      return this.userId_1;
    };
    protoOf(UserDeleteDTO).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(UserDeleteDTO).component2_7eebsb_k$ = function () {
      return this.userId_1;
    };
    protoOf(UserDeleteDTO).copy_h3bvka_k$ = function (id, userId) {
      return new UserDeleteDTO(id, userId);
    };
    protoOf(UserDeleteDTO).copy$default_vijsh4_k$ = function (id, userId, $super) {
      id = id === VOID ? this.id_1 : id;
      userId = userId === VOID ? this.userId_1 : userId;
      return $super === VOID ? this.copy_h3bvka_k$(id, userId) : $super.copy_h3bvka_k$.call(this, id, userId);
    };
    protoOf(UserDeleteDTO).toString = function () {
      return 'UserDeleteDTO(id=' + this.id_1 + ', userId=' + this.userId_1 + ')';
    };
    protoOf(UserDeleteDTO).hashCode = function () {
      var result = getStringHashCode(this.id_1);
      result = (imul(result, 31) + this.userId_1.hashCode()) | 0;
      return result;
    };
    protoOf(UserDeleteDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof UserDeleteDTO)) return false;
      var tmp0_other_with_cast = other instanceof UserDeleteDTO ? other : THROW_CCE();
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!this.userId_1.equals(tmp0_other_with_cast.userId_1)) return false;
      return true;
    };
    function Companion_82() {
      Companion_instance_82 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$User$Companion$_anonymous__9a0c4g);
    }
    protoOf(Companion_82).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_10(this);
    };
    protoOf(Companion_82).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_82;
    function Companion_getInstance_84() {
      if (Companion_instance_82 == null) new Companion_82();
      return Companion_instance_82;
    }
    function User_init_$Init$(seen1, serializationConstructorMarker, $this) {
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function User_init_$Create$(seen1, serializationConstructorMarker) {
      return User_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(User)));
    }
    function Companion_83() {
      Companion_instance_83 = this;
    }
    protoOf(Companion_83).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_67();
    };
    var Companion_instance_83;
    function Companion_getInstance_85() {
      if (Companion_instance_83 == null) new Companion_83();
      return Companion_instance_83;
    }
    function $serializer_67() {
      $serializer_instance_67 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('federation.delete', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('domain', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_67).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_67).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_67).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return FederationDeleteDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_67).serialize_xezq39_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.domain_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_67).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_xezq39_k$(encoder, value instanceof FederationDeleteDTO ? value : THROW_CCE());
    };
    var $serializer_instance_67;
    function $serializer_getInstance_67() {
      if ($serializer_instance_67 == null) new $serializer_67();
      return $serializer_instance_67;
    }
    function FederationDeleteDTO_init_$Init$(seen1, domain, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_67().descriptor_1);
      }
      Federation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.domain_1 = domain;
      return $this;
    }
    function FederationDeleteDTO_init_$Create$(seen1, domain, serializationConstructorMarker) {
      return FederationDeleteDTO_init_$Init$(
        seen1,
        domain,
        serializationConstructorMarker,
        objectCreate(protoOf(FederationDeleteDTO)),
      );
    }
    function _get_$childSerializers__r2zwns_27($this) {
      return $this.$childSerializers_1;
    }
    function Companion_84() {
      Companion_instance_84 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [new ArrayListSerializer(StringSerializer_getInstance())];
    }
    protoOf(Companion_84).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_68();
    };
    var Companion_instance_84;
    function Companion_getInstance_86() {
      if (Companion_instance_84 == null) new Companion_84();
      return Companion_instance_84;
    }
    function $serializer_68() {
      $serializer_instance_68 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('federation.connectionRemoved', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('domains', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_68).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_68).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_86().$childSerializers_1[0]];
    };
    protoOf($serializer_68).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_86().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return FederationConnectionRemovedDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_68).serialize_f59f9w_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_86().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.domains_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_68).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_f59f9w_k$(encoder, value instanceof FederationConnectionRemovedDTO ? value : THROW_CCE());
    };
    var $serializer_instance_68;
    function $serializer_getInstance_68() {
      if ($serializer_instance_68 == null) new $serializer_68();
      return $serializer_instance_68;
    }
    function FederationConnectionRemovedDTO_init_$Init$(seen1, domains, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_68().descriptor_1);
      }
      Federation_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.domains_1 = domains;
      return $this;
    }
    function FederationConnectionRemovedDTO_init_$Create$(seen1, domains, serializationConstructorMarker) {
      return FederationConnectionRemovedDTO_init_$Init$(
        seen1,
        domains,
        serializationConstructorMarker,
        objectCreate(protoOf(FederationConnectionRemovedDTO)),
      );
    }
    function _get_$cachedSerializer__te6jhj_11($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$Federation$Companion$_anonymous__1up8m0() {
      var tmp = getKClass(Federation);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [getKClass(FederationConnectionRemovedDTO), getKClass(FederationDeleteDTO)];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [$serializer_getInstance_68(), $serializer_getInstance_67()];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.Federation',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function FederationDeleteDTO(domain) {
      Companion_getInstance_85();
      Federation.call(this);
      this.domain_1 = domain;
    }
    protoOf(FederationDeleteDTO).get_domain_ch74y5_k$ = function () {
      return this.domain_1;
    };
    protoOf(FederationDeleteDTO).component1_7eebsc_k$ = function () {
      return this.domain_1;
    };
    protoOf(FederationDeleteDTO).copy_a35qlh_k$ = function (domain) {
      return new FederationDeleteDTO(domain);
    };
    protoOf(FederationDeleteDTO).copy$default_ddoh5s_k$ = function (domain, $super) {
      domain = domain === VOID ? this.domain_1 : domain;
      return $super === VOID ? this.copy_a35qlh_k$(domain) : $super.copy_a35qlh_k$.call(this, domain);
    };
    protoOf(FederationDeleteDTO).toString = function () {
      return 'FederationDeleteDTO(domain=' + this.domain_1 + ')';
    };
    protoOf(FederationDeleteDTO).hashCode = function () {
      return getStringHashCode(this.domain_1);
    };
    protoOf(FederationDeleteDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof FederationDeleteDTO)) return false;
      var tmp0_other_with_cast = other instanceof FederationDeleteDTO ? other : THROW_CCE();
      if (!(this.domain_1 === tmp0_other_with_cast.domain_1)) return false;
      return true;
    };
    function FederationConnectionRemovedDTO(domains) {
      Companion_getInstance_86();
      Federation.call(this);
      this.domains_1 = domains;
    }
    protoOf(FederationConnectionRemovedDTO).get_domains_vnkzly_k$ = function () {
      return this.domains_1;
    };
    protoOf(FederationConnectionRemovedDTO).component1_7eebsc_k$ = function () {
      return this.domains_1;
    };
    protoOf(FederationConnectionRemovedDTO).copy_is4t59_k$ = function (domains) {
      return new FederationConnectionRemovedDTO(domains);
    };
    protoOf(FederationConnectionRemovedDTO).copy$default_r8j5ed_k$ = function (domains, $super) {
      domains = domains === VOID ? this.domains_1 : domains;
      return $super === VOID ? this.copy_is4t59_k$(domains) : $super.copy_is4t59_k$.call(this, domains);
    };
    protoOf(FederationConnectionRemovedDTO).toString = function () {
      return 'FederationConnectionRemovedDTO(domains=' + this.domains_1 + ')';
    };
    protoOf(FederationConnectionRemovedDTO).hashCode = function () {
      return hashCode(this.domains_1);
    };
    protoOf(FederationConnectionRemovedDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof FederationConnectionRemovedDTO)) return false;
      var tmp0_other_with_cast = other instanceof FederationConnectionRemovedDTO ? other : THROW_CCE();
      if (!equals(this.domains_1, tmp0_other_with_cast.domains_1)) return false;
      return true;
    };
    function Companion_85() {
      Companion_instance_85 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$Federation$Companion$_anonymous__1up8m0);
    }
    protoOf(Companion_85).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_11(this);
    };
    protoOf(Companion_85).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_85;
    function Companion_getInstance_87() {
      if (Companion_instance_85 == null) new Companion_85();
      return Companion_instance_85;
    }
    function Federation_init_$Init$(seen1, serializationConstructorMarker, $this) {
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function Federation_init_$Create$(seen1, serializationConstructorMarker) {
      return Federation_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(Federation)));
    }
    function Companion_86() {
      Companion_instance_86 = this;
    }
    protoOf(Companion_86).serializer_9w0wvi_k$ = function () {
      return JsonCorrectingSerializer_getInstance_0();
    };
    var Companion_instance_86;
    function Companion_getInstance_88() {
      if (Companion_instance_86 == null) new Companion_86();
      return Companion_instance_86;
    }
    function _get_$cachedSerializer__te6jhj_12($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$FeatureConfig$Companion$_anonymous__ukvpyd() {
      var tmp = getKClass(FeatureConfig);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [getKClass(FeatureConfigUpdatedDTO)];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [JsonCorrectingSerializer_getInstance_0()];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.FeatureConfig',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function FeatureConfigUpdatedDTO(data) {
      Companion_getInstance_88();
      FeatureConfig.call(this);
      this.data_1 = data;
    }
    protoOf(FeatureConfigUpdatedDTO).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(FeatureConfigUpdatedDTO).component1_7eebsc_k$ = function () {
      return this.data_1;
    };
    protoOf(FeatureConfigUpdatedDTO).copy_lwp43x_k$ = function (data) {
      return new FeatureConfigUpdatedDTO(data);
    };
    protoOf(FeatureConfigUpdatedDTO).copy$default_ni48g5_k$ = function (data, $super) {
      data = data === VOID ? this.data_1 : data;
      return $super === VOID ? this.copy_lwp43x_k$(data) : $super.copy_lwp43x_k$.call(this, data);
    };
    protoOf(FeatureConfigUpdatedDTO).toString = function () {
      return 'FeatureConfigUpdatedDTO(data=' + this.data_1 + ')';
    };
    protoOf(FeatureConfigUpdatedDTO).hashCode = function () {
      return hashCode(this.data_1);
    };
    protoOf(FeatureConfigUpdatedDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof FeatureConfigUpdatedDTO)) return false;
      var tmp0_other_with_cast = other instanceof FeatureConfigUpdatedDTO ? other : THROW_CCE();
      if (!equals(this.data_1, tmp0_other_with_cast.data_1)) return false;
      return true;
    };
    function Companion_87() {
      Companion_instance_87 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$FeatureConfig$Companion$_anonymous__ukvpyd);
    }
    protoOf(Companion_87).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_12(this);
    };
    protoOf(Companion_87).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_87;
    function Companion_getInstance_89() {
      if (Companion_instance_87 == null) new Companion_87();
      return Companion_instance_87;
    }
    function FeatureConfig_init_$Init$(seen1, serializationConstructorMarker, $this) {
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function FeatureConfig_init_$Create$(seen1, serializationConstructorMarker) {
      return FeatureConfig_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(FeatureConfig)));
    }
    function Companion_88() {
      Companion_instance_88 = this;
    }
    protoOf(Companion_88).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_69();
    };
    var Companion_instance_88;
    function Companion_getInstance_90() {
      if (Companion_instance_88 == null) new Companion_88();
      return Companion_instance_88;
    }
    function $serializer_69() {
      $serializer_instance_69 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.properties-set', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('key', false);
      tmp0_serialDesc.addElement_5pzumi_k$('value', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_69).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_69).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), FieldKeyValueDeserializer_getInstance()];
    };
    protoOf($serializer_69).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          1,
          FieldKeyValueDeserializer_getInstance(),
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
              tmp4_local0 = tmp6_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp6_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                1,
                FieldKeyValueDeserializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp6_input.endStructure_1xqz0n_k$(tmp0_desc);
      return PropertiesSetDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer_69).serialize_or6324_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.key_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(
        tmp0_desc,
        1,
        FieldKeyValueDeserializer_getInstance(),
        value.value_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_69).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_or6324_k$(encoder, value instanceof PropertiesSetDTO ? value : THROW_CCE());
    };
    var $serializer_instance_69;
    function $serializer_getInstance_69() {
      if ($serializer_instance_69 == null) new $serializer_69();
      return $serializer_instance_69;
    }
    function PropertiesSetDTO_init_$Init$(seen1, key, value, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_69().descriptor_1);
      }
      UserProperty_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.key_1 = key;
      $this.value_1 = value;
      return $this;
    }
    function PropertiesSetDTO_init_$Create$(seen1, key, value, serializationConstructorMarker) {
      return PropertiesSetDTO_init_$Init$(
        seen1,
        key,
        value,
        serializationConstructorMarker,
        objectCreate(protoOf(PropertiesSetDTO)),
      );
    }
    function Companion_89() {
      Companion_instance_89 = this;
    }
    protoOf(Companion_89).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_70();
    };
    var Companion_instance_89;
    function Companion_getInstance_91() {
      if (Companion_instance_89 == null) new Companion_89();
      return Companion_instance_89;
    }
    function $serializer_70() {
      $serializer_instance_70 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('user.properties-delete', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('key', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_70).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_70).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_70).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return PropertiesDeleteDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_70).serialize_cc49jf_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.key_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_70).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_cc49jf_k$(encoder, value instanceof PropertiesDeleteDTO ? value : THROW_CCE());
    };
    var $serializer_instance_70;
    function $serializer_getInstance_70() {
      if ($serializer_instance_70 == null) new $serializer_70();
      return $serializer_instance_70;
    }
    function PropertiesDeleteDTO_init_$Init$(seen1, key, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_70().descriptor_1);
      }
      UserProperty_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.key_1 = key;
      return $this;
    }
    function PropertiesDeleteDTO_init_$Create$(seen1, key, serializationConstructorMarker) {
      return PropertiesDeleteDTO_init_$Init$(
        seen1,
        key,
        serializationConstructorMarker,
        objectCreate(protoOf(PropertiesDeleteDTO)),
      );
    }
    function _get_$cachedSerializer__te6jhj_13($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$UserProperty$Companion$_anonymous__qcawt1() {
      var tmp = getKClass(UserProperty);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [getKClass(PropertiesDeleteDTO), getKClass(PropertiesSetDTO)];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [$serializer_getInstance_70(), $serializer_getInstance_69()];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.UserProperty',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function PropertiesSetDTO(key, value) {
      Companion_getInstance_90();
      UserProperty.call(this);
      this.key_1 = key;
      this.value_1 = value;
    }
    protoOf(PropertiesSetDTO).get_key_18j28a_k$ = function () {
      return this.key_1;
    };
    protoOf(PropertiesSetDTO).get_value_j01efc_k$ = function () {
      return this.value_1;
    };
    protoOf(PropertiesSetDTO).component1_7eebsc_k$ = function () {
      return this.key_1;
    };
    protoOf(PropertiesSetDTO).component2_7eebsb_k$ = function () {
      return this.value_1;
    };
    protoOf(PropertiesSetDTO).copy_obshw1_k$ = function (key, value) {
      return new PropertiesSetDTO(key, value);
    };
    protoOf(PropertiesSetDTO).copy$default_svkeu6_k$ = function (key, value, $super) {
      key = key === VOID ? this.key_1 : key;
      value = value === VOID ? this.value_1 : value;
      return $super === VOID ? this.copy_obshw1_k$(key, value) : $super.copy_obshw1_k$.call(this, key, value);
    };
    protoOf(PropertiesSetDTO).toString = function () {
      return 'PropertiesSetDTO(key=' + this.key_1 + ', value=' + this.value_1 + ')';
    };
    protoOf(PropertiesSetDTO).hashCode = function () {
      var result = getStringHashCode(this.key_1);
      result = (imul(result, 31) + hashCode(this.value_1)) | 0;
      return result;
    };
    protoOf(PropertiesSetDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof PropertiesSetDTO)) return false;
      var tmp0_other_with_cast = other instanceof PropertiesSetDTO ? other : THROW_CCE();
      if (!(this.key_1 === tmp0_other_with_cast.key_1)) return false;
      if (!equals(this.value_1, tmp0_other_with_cast.value_1)) return false;
      return true;
    };
    function PropertiesDeleteDTO(key) {
      Companion_getInstance_91();
      UserProperty.call(this);
      this.key_1 = key;
    }
    protoOf(PropertiesDeleteDTO).get_key_18j28a_k$ = function () {
      return this.key_1;
    };
    protoOf(PropertiesDeleteDTO).component1_7eebsc_k$ = function () {
      return this.key_1;
    };
    protoOf(PropertiesDeleteDTO).copy_a35qlh_k$ = function (key) {
      return new PropertiesDeleteDTO(key);
    };
    protoOf(PropertiesDeleteDTO).copy$default_yreueo_k$ = function (key, $super) {
      key = key === VOID ? this.key_1 : key;
      return $super === VOID ? this.copy_a35qlh_k$(key) : $super.copy_a35qlh_k$.call(this, key);
    };
    protoOf(PropertiesDeleteDTO).toString = function () {
      return 'PropertiesDeleteDTO(key=' + this.key_1 + ')';
    };
    protoOf(PropertiesDeleteDTO).hashCode = function () {
      return getStringHashCode(this.key_1);
    };
    protoOf(PropertiesDeleteDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof PropertiesDeleteDTO)) return false;
      var tmp0_other_with_cast = other instanceof PropertiesDeleteDTO ? other : THROW_CCE();
      if (!(this.key_1 === tmp0_other_with_cast.key_1)) return false;
      return true;
    };
    function Companion_90() {
      Companion_instance_90 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$UserProperty$Companion$_anonymous__qcawt1);
    }
    protoOf(Companion_90).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_13(this);
    };
    protoOf(Companion_90).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_90;
    function Companion_getInstance_92() {
      if (Companion_instance_90 == null) new Companion_90();
      return Companion_instance_90;
    }
    function UserProperty_init_$Init$(seen1, serializationConstructorMarker, $this) {
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      return $this;
    }
    function UserProperty_init_$Create$(seen1, serializationConstructorMarker) {
      return UserProperty_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(UserProperty)));
    }
    function Companion_91() {
      Companion_instance_91 = this;
    }
    protoOf(Companion_91).serializer_9w0wvi_k$ = function () {
      return FieldKeyValueDeserializer_getInstance();
    };
    protoOf(Companion_91).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_91;
    function Companion_getInstance_93() {
      if (Companion_instance_91 == null) new Companion_91();
      return Companion_instance_91;
    }
    function _FieldKeyNumberValue___init__impl__kuw9wq(value) {
      return value;
    }
    function _FieldKeyNumberValue___get_value__impl__g60pbq($this) {
      return $this;
    }
    function Companion_92() {
      Companion_instance_92 = this;
    }
    protoOf(Companion_92).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_71();
    };
    var Companion_instance_92;
    function Companion_getInstance_94() {
      if (Companion_instance_92 == null) new Companion_92();
      return Companion_instance_92;
    }
    function $serializer_71() {
      $serializer_instance_71 = this;
      var tmp0_serialDesc = new InlineClassDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.FieldKeyNumberValue',
        this,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('value', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_71).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_71).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [IntSerializer_getInstance()];
    };
    protoOf($serializer_71).deserialize_pwn3g3_k$ = function (decoder) {
      return _FieldKeyNumberValue___init__impl__kuw9wq(
        decoder.decodeInline_ux3vza_k$(this.descriptor_1).decodeInt_8iq8f5_k$(),
      );
    };
    protoOf($serializer_71).deserialize_sy6x50_k$ = function (decoder) {
      return new FieldKeyNumberValue(this.deserialize_pwn3g3_k$(decoder));
    };
    protoOf($serializer_71).serialize_njd62z_k$ = function (encoder, value) {
      var tmp0_inlineEncoder = encoder.encodeInline_wxp5pu_k$(this.descriptor_1);
      if (tmp0_inlineEncoder == null) null;
      else {
        tmp0_inlineEncoder.encodeInt_y5zi3z_k$(_FieldKeyNumberValue___get_value__impl__g60pbq(value));
      }
    };
    protoOf($serializer_71).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_njd62z_k$(encoder, value instanceof FieldKeyNumberValue ? value.value_1 : THROW_CCE());
    };
    var $serializer_instance_71;
    function $serializer_getInstance_71() {
      if ($serializer_instance_71 == null) new $serializer_71();
      return $serializer_instance_71;
    }
    function FieldKeyNumberValue__toString_impl_baw7mq($this) {
      return 'FieldKeyNumberValue(value=' + $this + ')';
    }
    function FieldKeyNumberValue__hashCode_impl_x224fl($this) {
      return $this;
    }
    function FieldKeyNumberValue__equals_impl_v683e3($this, other) {
      if (!(other instanceof FieldKeyNumberValue)) return false;
      if (!($this === (other instanceof FieldKeyNumberValue ? other.value_1 : THROW_CCE()))) return false;
      return true;
    }
    function _FieldUnknownValue___init__impl__9jhdg8(value) {
      return value;
    }
    function _FieldUnknownValue___get_value__impl__m5km44($this) {
      return $this;
    }
    function Companion_93() {
      Companion_instance_93 = this;
    }
    protoOf(Companion_93).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_72();
    };
    var Companion_instance_93;
    function Companion_getInstance_95() {
      if (Companion_instance_93 == null) new Companion_93();
      return Companion_instance_93;
    }
    function $serializer_72() {
      $serializer_instance_72 = this;
      var tmp0_serialDesc = new InlineClassDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.FieldUnknownValue',
        this,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('value', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_72).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_72).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_72).deserialize_ufngp7_k$ = function (decoder) {
      return _FieldUnknownValue___init__impl__9jhdg8(
        decoder.decodeInline_ux3vza_k$(this.descriptor_1).decodeString_x3hxsx_k$(),
      );
    };
    protoOf($serializer_72).deserialize_sy6x50_k$ = function (decoder) {
      return new FieldUnknownValue(this.deserialize_ufngp7_k$(decoder));
    };
    protoOf($serializer_72).serialize_6gm4i5_k$ = function (encoder, value) {
      var tmp0_inlineEncoder = encoder.encodeInline_wxp5pu_k$(this.descriptor_1);
      if (tmp0_inlineEncoder == null) null;
      else {
        tmp0_inlineEncoder.encodeString_424b5v_k$(_FieldUnknownValue___get_value__impl__m5km44(value));
      }
    };
    protoOf($serializer_72).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_6gm4i5_k$(encoder, value instanceof FieldUnknownValue ? value.value_1 : THROW_CCE());
    };
    var $serializer_instance_72;
    function $serializer_getInstance_72() {
      if ($serializer_instance_72 == null) new $serializer_72();
      return $serializer_instance_72;
    }
    function FieldUnknownValue__toString_impl_d2fk4g($this) {
      return 'FieldUnknownValue(value=' + $this + ')';
    }
    function FieldUnknownValue__hashCode_impl_8oqcof($this) {
      return getStringHashCode($this);
    }
    function FieldUnknownValue__equals_impl_q5pl3n($this, other) {
      if (!(other instanceof FieldUnknownValue)) return false;
      if (!($this === (other instanceof FieldUnknownValue ? other.value_1 : THROW_CCE()))) return false;
      return true;
    }
    function _FieldLabelListValue___init__impl__e1o0u8(value) {
      return value;
    }
    function _FieldLabelListValue___get_value__impl__xt64gc($this) {
      return $this;
    }
    function Companion_94() {
      Companion_instance_94 = this;
    }
    protoOf(Companion_94).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_73();
    };
    var Companion_instance_94;
    function Companion_getInstance_96() {
      if (Companion_instance_94 == null) new Companion_94();
      return Companion_instance_94;
    }
    function $serializer_73() {
      $serializer_instance_73 = this;
      var tmp0_serialDesc = new InlineClassDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO.FieldLabelListValue',
        this,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('value', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_73).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_73).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [$serializer_getInstance_79()];
    };
    protoOf($serializer_73).deserialize_xwonq5_k$ = function (decoder) {
      return _FieldLabelListValue___init__impl__e1o0u8(
        decoder
          .decodeInline_ux3vza_k$(this.descriptor_1)
          .decodeSerializableValue_xpnpad_k$($serializer_getInstance_79()),
      );
    };
    protoOf($serializer_73).deserialize_sy6x50_k$ = function (decoder) {
      return new FieldLabelListValue(this.deserialize_xwonq5_k$(decoder));
    };
    protoOf($serializer_73).serialize_84ht4l_k$ = function (encoder, value) {
      var tmp0_inlineEncoder = encoder.encodeInline_wxp5pu_k$(this.descriptor_1);
      if (tmp0_inlineEncoder == null) null;
      else {
        tmp0_inlineEncoder.encodeSerializableValue_3uuzip_k$(
          $serializer_getInstance_79(),
          _FieldLabelListValue___get_value__impl__xt64gc(value),
        );
      }
    };
    protoOf($serializer_73).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_84ht4l_k$(encoder, value instanceof FieldLabelListValue ? value.value_1 : THROW_CCE());
    };
    var $serializer_instance_73;
    function $serializer_getInstance_73() {
      if ($serializer_instance_73 == null) new $serializer_73();
      return $serializer_instance_73;
    }
    function FieldLabelListValue__toString_impl_rvon7c($this) {
      return 'FieldLabelListValue(value=' + $this + ')';
    }
    function FieldLabelListValue__hashCode_impl_le9hyx($this) {
      return $this.hashCode();
    }
    function FieldLabelListValue__equals_impl_4ubt1x($this, other) {
      if (!(other instanceof FieldLabelListValue)) return false;
      var tmp0_other_with_cast = other instanceof FieldLabelListValue ? other.value_1 : THROW_CCE();
      if (!$this.equals(tmp0_other_with_cast)) return false;
      return true;
    }
    function Companion_95() {
      Companion_instance_95 = this;
    }
    protoOf(Companion_95).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_74();
    };
    var Companion_instance_95;
    function Companion_getInstance_97() {
      if (Companion_instance_95 == null) new Companion_95();
      return Companion_instance_95;
    }
    function $serializer_74() {
      $serializer_instance_74 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('unknown', this, 1);
      tmp0_serialDesc.addElement_5pzumi_k$('type', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_74).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_74).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_74).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return Unknown_init_$Create$_0(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_74).serialize_e55ty2_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.type_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_74).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_e55ty2_k$(encoder, value instanceof Unknown_0 ? value : THROW_CCE());
    };
    var $serializer_instance_74;
    function $serializer_getInstance_74() {
      if ($serializer_instance_74 == null) new $serializer_74();
      return $serializer_instance_74;
    }
    function Unknown_init_$Init$_0(seen1, type, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_74().descriptor_1);
      }
      EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this);
      $this.type_1 = type;
      return $this;
    }
    function Unknown_init_$Create$_0(seen1, type, serializationConstructorMarker) {
      return Unknown_init_$Init$_0(seen1, type, serializationConstructorMarker, objectCreate(protoOf(Unknown_0)));
    }
    function _get_$cachedSerializer__te6jhj_14($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function EventContentDTO$Companion$_anonymous__x6rz0x() {
      var tmp = getKClass(EventContentDTO);
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = [
        getKClass(AccessUpdate),
        getKClass(CodeDeleted),
        getKClass(CodeUpdated),
        getKClass(ConversationRenameDTO),
        getKClass(ConversationTypingDTO),
        getKClass(DeletedConversationDTO),
        getKClass(MLSWelcomeDTO),
        getKClass(MemberJoinDTO),
        getKClass(MemberLeaveDTO),
        getKClass(MemberUpdateDTO),
        getKClass(MessageTimerUpdate),
        getKClass(NewConversationDTO),
        getKClass(NewMLSMessageDTO),
        getKClass(NewMessageDTO),
        getKClass(ProtocolUpdate),
        getKClass(ReceiptModeUpdate),
        getKClass(FeatureConfigUpdatedDTO),
        getKClass(FederationConnectionRemovedDTO),
        getKClass(FederationDeleteDTO),
        getKClass(MemberLeave),
        getKClass(Unknown_0),
        getKClass(ClientRemoveDTO),
        getKClass(LegalHoldDisabledDTO),
        getKClass(LegalHoldEnabledDTO),
        getKClass(NewClientDTO),
        getKClass(NewConnectionDTO),
        getKClass(NewLegalHoldRequestDTO),
        getKClass(UpdateDTO),
        getKClass(UserDeleteDTO),
        getKClass(PropertiesDeleteDTO),
        getKClass(PropertiesSetDTO),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = [
        $serializer_getInstance_50(),
        $serializer_getInstance_52(),
        $serializer_getInstance_51(),
        $serializer_getInstance_44(),
        $serializer_getInstance_48(),
        $serializer_getInstance_43(),
        $serializer_getInstance_56(),
        $serializer_getInstance_45(),
        $serializer_getInstance_46(),
        $serializer_getInstance_47(),
        $serializer_getInstance_54(),
        $serializer_getInstance_42(),
        $serializer_getInstance_55(),
        $serializer_getInstance_49(),
        $serializer_getInstance_57(),
        $serializer_getInstance_53(),
        JsonCorrectingSerializer_getInstance_0(),
        $serializer_getInstance_68(),
        $serializer_getInstance_67(),
        $serializer_getInstance_58(),
        $serializer_getInstance_74(),
        $serializer_getInstance_60(),
        $serializer_getInstance_65(),
        $serializer_getInstance_64(),
        $serializer_getInstance_59(),
        $serializer_getInstance_62(),
        $serializer_getInstance_63(),
        $serializer_getInstance_61(),
        $serializer_getInstance_66(),
        $serializer_getInstance_70(),
        $serializer_getInstance_69(),
      ];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$8 = [];
      return SealedClassSerializer_init_$Create$(
        'com.wire.kalium.network.api.authenticated.notification.EventContentDTO',
        tmp,
        tmp_0,
        tmp_1,
        tmp$ret$8,
      );
    }
    function Conversation() {
      Companion_getInstance_73();
      EventContentDTO.call(this);
    }
    function Team() {
      Companion_getInstance_75();
      EventContentDTO.call(this);
    }
    function User() {
      Companion_getInstance_84();
      EventContentDTO.call(this);
    }
    function Federation() {
      Companion_getInstance_87();
      EventContentDTO.call(this);
    }
    function FeatureConfig() {
      Companion_getInstance_89();
      EventContentDTO.call(this);
    }
    function UserProperty() {
      Companion_getInstance_92();
      EventContentDTO.call(this);
    }
    function FieldKeyValue() {}
    function FieldKeyNumberValue(value) {
      Companion_getInstance_94();
      this.value_1 = value;
    }
    protoOf(FieldKeyNumberValue).toString = function () {
      return FieldKeyNumberValue__toString_impl_baw7mq(this.value_1);
    };
    protoOf(FieldKeyNumberValue).hashCode = function () {
      return FieldKeyNumberValue__hashCode_impl_x224fl(this.value_1);
    };
    protoOf(FieldKeyNumberValue).equals = function (other) {
      return FieldKeyNumberValue__equals_impl_v683e3(this.value_1, other);
    };
    function FieldUnknownValue(value) {
      Companion_getInstance_95();
      this.value_1 = value;
    }
    protoOf(FieldUnknownValue).toString = function () {
      return FieldUnknownValue__toString_impl_d2fk4g(this.value_1);
    };
    protoOf(FieldUnknownValue).hashCode = function () {
      return FieldUnknownValue__hashCode_impl_8oqcof(this.value_1);
    };
    protoOf(FieldUnknownValue).equals = function (other) {
      return FieldUnknownValue__equals_impl_q5pl3n(this.value_1, other);
    };
    function FieldLabelListValue(value) {
      Companion_getInstance_96();
      this.value_1 = value;
    }
    protoOf(FieldLabelListValue).toString = function () {
      return FieldLabelListValue__toString_impl_rvon7c(this.value_1);
    };
    protoOf(FieldLabelListValue).hashCode = function () {
      return FieldLabelListValue__hashCode_impl_le9hyx(this.value_1);
    };
    protoOf(FieldLabelListValue).equals = function (other) {
      return FieldLabelListValue__equals_impl_4ubt1x(this.value_1, other);
    };
    function Unknown_0(type) {
      Companion_getInstance_97();
      EventContentDTO.call(this);
      this.type_1 = type;
    }
    protoOf(Unknown_0).get_type_wovaf7_k$ = function () {
      return this.type_1;
    };
    protoOf(Unknown_0).component1_7eebsc_k$ = function () {
      return this.type_1;
    };
    protoOf(Unknown_0).copy_a35qlh_k$ = function (type) {
      return new Unknown_0(type);
    };
    protoOf(Unknown_0).copy$default_38ic6b_k$ = function (type, $super) {
      type = type === VOID ? this.type_1 : type;
      return $super === VOID ? this.copy_a35qlh_k$(type) : $super.copy_a35qlh_k$.call(this, type);
    };
    protoOf(Unknown_0).toString = function () {
      return 'Unknown(type=' + this.type_1 + ')';
    };
    protoOf(Unknown_0).hashCode = function () {
      return getStringHashCode(this.type_1);
    };
    protoOf(Unknown_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Unknown_0)) return false;
      var tmp0_other_with_cast = other instanceof Unknown_0 ? other : THROW_CCE();
      if (!(this.type_1 === tmp0_other_with_cast.type_1)) return false;
      return true;
    };
    function Companion_96() {
      Companion_instance_96 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, EventContentDTO$Companion$_anonymous__x6rz0x);
    }
    protoOf(Companion_96).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_14(this);
    };
    protoOf(Companion_96).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_96;
    function Companion_getInstance_98() {
      if (Companion_instance_96 == null) new Companion_96();
      return Companion_instance_96;
    }
    function EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, $this) {
      return $this;
    }
    function EventContentDTO_init_$Create$(seen1, serializationConstructorMarker) {
      return EventContentDTO_init_$Init$(seen1, serializationConstructorMarker, objectCreate(protoOf(EventContentDTO)));
    }
    function EventContentDTO() {
      Companion_getInstance_98();
    }
    function JsonCorrectingSerializer_0() {
      JsonCorrectingSerializer_instance_0 = this;
      JsonTransformingSerializer.call(this, FeatureConfigUpdatedDTOSerializer_getInstance());
    }
    protoOf(JsonCorrectingSerializer_0).transformDeserialize_isl1lf_k$ = function (element) {
      // Inline function 'kotlin.apply' call
      var this_0 = toMutableMap(get_jsonObject(element));
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.network.api.authenticated.notification.JsonCorrectingSerializer.transformDeserialize.<anonymous>' call
      // Inline function 'kotlin.collections.set' call
      // Inline function 'kotlin.apply' call
      var tmp0_safe_receiver = this_0.get_wei43m_k$('data');
      var tmp1_safe_receiver = tmp0_safe_receiver == null ? null : get_jsonObject(tmp0_safe_receiver);
      var this_1 = tmp1_safe_receiver == null ? null : toMutableMap(tmp1_safe_receiver);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.network.api.authenticated.notification.JsonCorrectingSerializer.transformDeserialize.<anonymous>.<anonymous>' call
      var tmp0_safe_receiver_0 = get_jsonObject(element).get_6bo4tg_k$('name');
      if (tmp0_safe_receiver_0 == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        if (this_1 == null) null;
        else {
          // Inline function 'kotlin.collections.set' call
          this_1.put_4fpzoq_k$('name', tmp0_safe_receiver_0);
        }
      }
      var value = new JsonObject(this_1 == null ? emptyMap() : this_1);
      this_0.put_4fpzoq_k$('data', value);
      return new JsonObject(this_0);
    };
    var JsonCorrectingSerializer_instance_0;
    function JsonCorrectingSerializer_getInstance_0() {
      if (JsonCorrectingSerializer_instance_0 == null) new JsonCorrectingSerializer_0();
      return JsonCorrectingSerializer_instance_0;
    }
    function FieldKeyValueDeserializer() {
      FieldKeyValueDeserializer_instance = this;
      this.descriptor_1 = buildSerialDescriptor('value', SEALED_getInstance(), []);
    }
    protoOf(FieldKeyValueDeserializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(FieldKeyValueDeserializer).serialize_chwyvr_k$ = function (encoder, value) {
      if (value instanceof FieldKeyNumberValue) {
        encoder.encodeInt_y5zi3z_k$(_FieldKeyNumberValue___get_value__impl__g60pbq(value.value_1));
      } else {
        if (value instanceof FieldLabelListValue) {
          encoder.encodeSerializableValue_3uuzip_k$(Companion_getInstance_96().serializer_9w0wvi_k$(), value);
        } else {
          if (value instanceof FieldUnknownValue) throw SerializationException_init_$Create$('Not handled yet');
        }
      }
    };
    protoOf(FieldKeyValueDeserializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_chwyvr_k$(
        encoder,
        (!(value == null) ? isInterface(value, FieldKeyValue) : false) ? value : THROW_CCE(),
      );
    };
    protoOf(FieldKeyValueDeserializer).deserialize_sy6x50_k$ = function (decoder) {
      try {
        var tmp0_elvis_lhs = isInterface(decoder, JsonDecoder) ? decoder : null;
        var tmp;
        if (tmp0_elvis_lhs == null) {
          throw SerializationException_init_$Create$('Expected JsonDecoder');
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var input = tmp;
        var element = input.decodeJsonElement_6lz9ye_k$();
        var tmp_0;
        if (element instanceof JsonPrimitive) {
          var tmp_1;
          if (element.get_isString_zep7bw_k$()) {
            tmp_1 = new FieldUnknownValue(_FieldUnknownValue___init__impl__9jhdg8(element.get_content_h02jrk_k$()));
          } else {
            tmp_1 = new FieldKeyNumberValue(_FieldKeyNumberValue___init__impl__kuw9wq(get_int(element)));
          }
          tmp_0 = tmp_1;
        } else {
          if (element instanceof JsonObject) {
            if (element.containsKey_w445h6_k$('labels')) {
              return input
                .get_json_woos35_k$()
                .decodeFromJsonElement_tsogwj_k$(Companion_getInstance_96().serializer_9w0wvi_k$(), element);
            }
            tmp_0 = new FieldUnknownValue(_FieldUnknownValue___init__impl__9jhdg8(toString_0(element)));
          } else {
            throw SerializationException_init_$Create$(
              'Unexpected JSON element type: ' + getKClassFromExpression(element).get_simpleName_r6f8py_k$(),
            );
          }
        }
        return tmp_0;
      } catch ($p) {
        if ($p instanceof Exception) {
          var exception = $p;
          var jsonElement = toString_0(toJsonElement(decoder));
          get_kaliumUtilLogger().d$default_10deum_k$("Error deserializing 'user.properties-set', prop: " + jsonElement);
          get_kaliumUtilLogger().w$default_6d8fd1_k$("Error deserializing 'user.properties-set', error: " + exception);
          return new FieldUnknownValue(_FieldUnknownValue___init__impl__9jhdg8(jsonElement));
        } else {
          throw $p;
        }
      }
    };
    var FieldKeyValueDeserializer_instance;
    function FieldKeyValueDeserializer_getInstance() {
      if (FieldKeyValueDeserializer_instance == null) new FieldKeyValueDeserializer();
      return FieldKeyValueDeserializer_instance;
    }
    function FeatureConfigUpdatedDTOSerializer$descriptor$lambda($this$buildClassSerialDescriptor) {
      // Inline function 'kotlinx.serialization.descriptors.element' call
      var annotations = emptyList();
      // Inline function 'kotlinx.serialization.serializer' call
      // Inline function 'kotlinx.serialization.internal.cast' call
      var this_0 = serializer(createKType(getKClass(FeatureConfigData), arrayOf([]), false));
      var descriptor = (isInterface(this_0, KSerializer) ? this_0 : THROW_CCE()).get_descriptor_wjt6a0_k$();
      $this$buildClassSerialDescriptor.element_om879h_k$('data', descriptor, annotations, false);
      return Unit_getInstance();
    }
    function FeatureConfigUpdatedDTOSerializer() {
      FeatureConfigUpdatedDTOSerializer_instance = this;
      var tmp = this;
      tmp.descriptor_1 = buildClassSerialDescriptor(
        'feature-config.update',
        [],
        FeatureConfigUpdatedDTOSerializer$descriptor$lambda,
      );
    }
    protoOf(FeatureConfigUpdatedDTOSerializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(FeatureConfigUpdatedDTOSerializer).deserialize_sy6x50_k$ = function (decoder) {
      var data = {_v: new Unknown(FeatureFlagStatusDTO_ENABLED_getInstance())};
      // Inline function 'kotlinx.serialization.encoding.decodeStructure' call
      var descriptor = this.descriptor_1;
      var composite = decoder.beginStructure_yljocp_k$(descriptor);
      $l$loop: while (true) {
        var index = composite.decodeElementIndex_bstkhp_k$(
          FeatureConfigUpdatedDTOSerializer_getInstance().descriptor_1,
        );
        if (index === 0) {
          data._v = composite.decodeSerializableElement$default_j0zaoi_k$(
            FeatureConfigUpdatedDTOSerializer_getInstance().descriptor_1,
            0,
            Companion_getInstance_47().serializer_9w0wvi_k$(),
          );
        } else if (index === Companion_getInstance().get_DECODE_DONE_1b8fna_k$()) break $l$loop;
        else {
          // Inline function 'kotlin.error' call
          var message = 'Unexpected index: ' + index;
          throw IllegalStateException_init_$Create$(toString_0(message));
        }
      }
      var result = Unit_getInstance();
      composite.endStructure_1xqz0n_k$(descriptor);
      return new FeatureConfigUpdatedDTO(data._v);
    };
    protoOf(FeatureConfigUpdatedDTOSerializer).serialize_josucs_k$ = function (encoder, value) {
      // Inline function 'kotlinx.serialization.encoding.encodeStructure' call
      var descriptor = this.descriptor_1;
      var composite = encoder.beginStructure_yljocp_k$(descriptor);
      // Inline function 'com.wire.kalium.network.api.authenticated.notification.FeatureConfigUpdatedDTOSerializer.serialize.<anonymous>' call
      composite.encodeSerializableElement_isqxcl_k$(
        FeatureConfigUpdatedDTOSerializer_getInstance().descriptor_1,
        0,
        Companion_getInstance_47().serializer_9w0wvi_k$(),
        value.data_1,
      );
      composite.endStructure_1xqz0n_k$(descriptor);
    };
    protoOf(FeatureConfigUpdatedDTOSerializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_josucs_k$(encoder, value instanceof FeatureConfigUpdatedDTO ? value : THROW_CCE());
    };
    var FeatureConfigUpdatedDTOSerializer_instance;
    function FeatureConfigUpdatedDTOSerializer_getInstance() {
      if (FeatureConfigUpdatedDTOSerializer_instance == null) new FeatureConfigUpdatedDTOSerializer();
      return FeatureConfigUpdatedDTOSerializer_instance;
    }
    function get_eventSerializationModule() {
      _init_properties_EventSerialization_kt__90ycoa();
      return eventSerializationModule;
    }
    var eventSerializationModule;
    function eventSerializationModule$lambda(it) {
      _init_properties_EventSerialization_kt__90ycoa();
      return Companion_getInstance_31().serializer_9w0wvi_k$();
    }
    function eventSerializationModule$lambda_0(it) {
      _init_properties_EventSerialization_kt__90ycoa();
      return Companion_getInstance_97().serializer_9w0wvi_k$();
    }
    var properties_initialized_EventSerialization_kt_bdkrt4;
    function _init_properties_EventSerialization_kt__90ycoa() {
      if (!properties_initialized_EventSerialization_kt_bdkrt4) {
        properties_initialized_EventSerialization_kt_bdkrt4 = true;
        // Inline function 'kotlinx.serialization.modules.SerializersModule' call
        var builder = new SerializersModuleBuilder();
        // Inline function 'com.wire.kalium.network.api.authenticated.notification.eventSerializationModule.<anonymous>' call
        // Inline function 'kotlinx.serialization.modules.polymorphic' call
        var baseClass = getKClass(EventContentDTO);
        var builder_0 = new PolymorphicModuleBuilder(baseClass, null);
        // Inline function 'com.wire.kalium.network.api.authenticated.notification.eventSerializationModule.<anonymous>.<anonymous>' call
        // Inline function 'kotlinx.serialization.modules.polymorphic' call
        var baseClass_0 = getKClass(FeatureConfigData);
        var builder_1 = new PolymorphicModuleBuilder(baseClass_0, null);
        // Inline function 'com.wire.kalium.network.api.authenticated.notification.eventSerializationModule.<anonymous>.<anonymous>.<anonymous>' call
        builder_1.defaultDeserializer_i4d5r7_k$(eventSerializationModule$lambda);
        builder_1.buildTo_m1auds_k$(builder);
        builder_0.defaultDeserializer_i4d5r7_k$(eventSerializationModule$lambda_0);
        builder_0.buildTo_m1auds_k$(builder);
        eventSerializationModule = builder.build_1k0s4u_k$();
      }
    }
    function _get_$cachedSerializer__te6jhj_15($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function MemberLeaveReasonDTO$Companion$_anonymous__al2le9() {
      var tmp = values_9();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['left', 'removed', 'user-deleted'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.authenticated.notification.MemberLeaveReasonDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var MemberLeaveReasonDTO_LEFT_instance;
    var MemberLeaveReasonDTO_REMOVED_instance;
    var MemberLeaveReasonDTO_USER_DELETED_instance;
    function Companion_97() {
      Companion_instance_97 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, MemberLeaveReasonDTO$Companion$_anonymous__al2le9);
    }
    protoOf(Companion_97).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_15(this);
    };
    protoOf(Companion_97).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_97;
    function Companion_getInstance_99() {
      MemberLeaveReasonDTO_initEntries();
      if (Companion_instance_97 == null) new Companion_97();
      return Companion_instance_97;
    }
    function values_9() {
      return [
        MemberLeaveReasonDTO_LEFT_getInstance(),
        MemberLeaveReasonDTO_REMOVED_getInstance(),
        MemberLeaveReasonDTO_USER_DELETED_getInstance(),
      ];
    }
    function valueOf_9(value) {
      switch (value) {
        case 'LEFT':
          return MemberLeaveReasonDTO_LEFT_getInstance();
        case 'REMOVED':
          return MemberLeaveReasonDTO_REMOVED_getInstance();
        case 'USER_DELETED':
          return MemberLeaveReasonDTO_USER_DELETED_getInstance();
        default:
          MemberLeaveReasonDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_9() {
      if ($ENTRIES_9 == null) $ENTRIES_9 = enumEntries(values_9());
      return $ENTRIES_9;
    }
    var MemberLeaveReasonDTO_entriesInitialized;
    function MemberLeaveReasonDTO_initEntries() {
      if (MemberLeaveReasonDTO_entriesInitialized) return Unit_getInstance();
      MemberLeaveReasonDTO_entriesInitialized = true;
      MemberLeaveReasonDTO_LEFT_instance = new MemberLeaveReasonDTO('LEFT', 0);
      MemberLeaveReasonDTO_REMOVED_instance = new MemberLeaveReasonDTO('REMOVED', 1);
      MemberLeaveReasonDTO_USER_DELETED_instance = new MemberLeaveReasonDTO('USER_DELETED', 2);
      Companion_getInstance_99();
    }
    var $ENTRIES_9;
    function MemberLeaveReasonDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(MemberLeaveReasonDTO).toString = function () {
      var tmp;
      switch (this.get_ordinal_ip24qg_k$()) {
        case 0:
          tmp = 'left';
          break;
        case 1:
          tmp = 'removed';
          break;
        case 2:
          tmp = 'user-deleted';
          break;
        default:
          noWhenBranchMatchedException();
          break;
      }
      return tmp;
    };
    function MemberLeaveReasonDTO_LEFT_getInstance() {
      MemberLeaveReasonDTO_initEntries();
      return MemberLeaveReasonDTO_LEFT_instance;
    }
    function MemberLeaveReasonDTO_REMOVED_getInstance() {
      MemberLeaveReasonDTO_initEntries();
      return MemberLeaveReasonDTO_REMOVED_instance;
    }
    function MemberLeaveReasonDTO_USER_DELETED_getInstance() {
      MemberLeaveReasonDTO_initEntries();
      return MemberLeaveReasonDTO_USER_DELETED_instance;
    }
    function Companion_98() {
      Companion_instance_98 = this;
    }
    protoOf(Companion_98).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_75();
    };
    var Companion_instance_98;
    function Companion_getInstance_100() {
      if (Companion_instance_98 == null) new Companion_98();
      return Companion_instance_98;
    }
    function $serializer_75() {
      $serializer_instance_75 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.conversation.MessageEventData',
        this,
        4,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('text', false);
      tmp0_serialDesc.addElement_5pzumi_k$('sender', false);
      tmp0_serialDesc.addElement_5pzumi_k$('recipient', false);
      tmp0_serialDesc.addElement_5pzumi_k$('data', true);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_75).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_75).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        get_nullable(StringSerializer_getInstance()),
      ];
    };
    protoOf($serializer_75).deserialize_sy6x50_k$ = function (decoder) {
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
        tmp4_local0 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
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
              tmp4_local0 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp8_input.decodeStringElement_3oenpg_k$(tmp0_desc, 2);
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
      return MessageEventData_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, tmp7_local3, null);
    };
    protoOf($serializer_75).serialize_tryxia_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.text_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.sender_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 2, value.recipient_1);
      if (
        tmp1_output.shouldEncodeElementDefault_x8eyid_k$(tmp0_desc, 3) ? true : !(value.encryptedExternalData_1 == null)
      ) {
        tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          value.encryptedExternalData_1,
        );
      }
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_75).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_tryxia_k$(encoder, value instanceof MessageEventData ? value : THROW_CCE());
    };
    var $serializer_instance_75;
    function $serializer_getInstance_75() {
      if ($serializer_instance_75 == null) new $serializer_75();
      return $serializer_instance_75;
    }
    function MessageEventData_init_$Init$(
      seen1,
      text,
      sender,
      recipient,
      encryptedExternalData,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_75().descriptor_1);
      }
      $this.text_1 = text;
      $this.sender_1 = sender;
      $this.recipient_1 = recipient;
      if (0 === (seen1 & 8)) $this.encryptedExternalData_1 = null;
      else $this.encryptedExternalData_1 = encryptedExternalData;
      return $this;
    }
    function MessageEventData_init_$Create$(
      seen1,
      text,
      sender,
      recipient,
      encryptedExternalData,
      serializationConstructorMarker,
    ) {
      return MessageEventData_init_$Init$(
        seen1,
        text,
        sender,
        recipient,
        encryptedExternalData,
        serializationConstructorMarker,
        objectCreate(protoOf(MessageEventData)),
      );
    }
    function MessageEventData(text, sender, recipient, encryptedExternalData) {
      Companion_getInstance_100();
      encryptedExternalData = encryptedExternalData === VOID ? null : encryptedExternalData;
      this.text_1 = text;
      this.sender_1 = sender;
      this.recipient_1 = recipient;
      this.encryptedExternalData_1 = encryptedExternalData;
    }
    protoOf(MessageEventData).get_text_wouvsm_k$ = function () {
      return this.text_1;
    };
    protoOf(MessageEventData).get_sender_jfe81q_k$ = function () {
      return this.sender_1;
    };
    protoOf(MessageEventData).get_recipient_m2rzw0_k$ = function () {
      return this.recipient_1;
    };
    protoOf(MessageEventData).get_encryptedExternalData_h9vis0_k$ = function () {
      return this.encryptedExternalData_1;
    };
    protoOf(MessageEventData).component1_7eebsc_k$ = function () {
      return this.text_1;
    };
    protoOf(MessageEventData).component2_7eebsb_k$ = function () {
      return this.sender_1;
    };
    protoOf(MessageEventData).component3_7eebsa_k$ = function () {
      return this.recipient_1;
    };
    protoOf(MessageEventData).component4_7eebs9_k$ = function () {
      return this.encryptedExternalData_1;
    };
    protoOf(MessageEventData).copy_oazq5e_k$ = function (text, sender, recipient, encryptedExternalData) {
      return new MessageEventData(text, sender, recipient, encryptedExternalData);
    };
    protoOf(MessageEventData).copy$default_1trfpb_k$ = function (
      text,
      sender,
      recipient,
      encryptedExternalData,
      $super,
    ) {
      text = text === VOID ? this.text_1 : text;
      sender = sender === VOID ? this.sender_1 : sender;
      recipient = recipient === VOID ? this.recipient_1 : recipient;
      encryptedExternalData = encryptedExternalData === VOID ? this.encryptedExternalData_1 : encryptedExternalData;
      return $super === VOID
        ? this.copy_oazq5e_k$(text, sender, recipient, encryptedExternalData)
        : $super.copy_oazq5e_k$.call(this, text, sender, recipient, encryptedExternalData);
    };
    protoOf(MessageEventData).toString = function () {
      return (
        'MessageEventData(text=' +
        this.text_1 +
        ', sender=' +
        this.sender_1 +
        ', recipient=' +
        this.recipient_1 +
        ', encryptedExternalData=' +
        this.encryptedExternalData_1 +
        ')'
      );
    };
    protoOf(MessageEventData).hashCode = function () {
      var result = getStringHashCode(this.text_1);
      result = (imul(result, 31) + getStringHashCode(this.sender_1)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.recipient_1)) | 0;
      result =
        (imul(result, 31) +
          (this.encryptedExternalData_1 == null ? 0 : getStringHashCode(this.encryptedExternalData_1))) |
        0;
      return result;
    };
    protoOf(MessageEventData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MessageEventData)) return false;
      var tmp0_other_with_cast = other instanceof MessageEventData ? other : THROW_CCE();
      if (!(this.text_1 === tmp0_other_with_cast.text_1)) return false;
      if (!(this.sender_1 === tmp0_other_with_cast.sender_1)) return false;
      if (!(this.recipient_1 === tmp0_other_with_cast.recipient_1)) return false;
      if (!(this.encryptedExternalData_1 == tmp0_other_with_cast.encryptedExternalData_1)) return false;
      return true;
    };
    function Companion_99() {
      Companion_instance_99 = this;
    }
    protoOf(Companion_99).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_76();
    };
    var Companion_instance_99;
    function Companion_getInstance_101() {
      if (Companion_instance_99 == null) new Companion_99();
      return Companion_instance_99;
    }
    function $serializer_76() {
      $serializer_instance_76 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.team.TeamMemberIdData',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('user', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_76).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_76).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_76).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return TeamMemberIdData_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_76).serialize_8ft521_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.nonQualifiedUserId_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_76).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_8ft521_k$(encoder, value instanceof TeamMemberIdData ? value : THROW_CCE());
    };
    var $serializer_instance_76;
    function $serializer_getInstance_76() {
      if ($serializer_instance_76 == null) new $serializer_76();
      return $serializer_instance_76;
    }
    function TeamMemberIdData_init_$Init$(seen1, nonQualifiedUserId, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_76().descriptor_1);
      }
      $this.nonQualifiedUserId_1 = nonQualifiedUserId;
      return $this;
    }
    function TeamMemberIdData_init_$Create$(seen1, nonQualifiedUserId, serializationConstructorMarker) {
      return TeamMemberIdData_init_$Init$(
        seen1,
        nonQualifiedUserId,
        serializationConstructorMarker,
        objectCreate(protoOf(TeamMemberIdData)),
      );
    }
    function TeamMemberIdData(nonQualifiedUserId) {
      Companion_getInstance_101();
      this.nonQualifiedUserId_1 = nonQualifiedUserId;
    }
    protoOf(TeamMemberIdData).get_nonQualifiedUserId_xgdqf2_k$ = function () {
      return this.nonQualifiedUserId_1;
    };
    protoOf(TeamMemberIdData).component1_7eebsc_k$ = function () {
      return this.nonQualifiedUserId_1;
    };
    protoOf(TeamMemberIdData).copy_a35qlh_k$ = function (nonQualifiedUserId) {
      return new TeamMemberIdData(nonQualifiedUserId);
    };
    protoOf(TeamMemberIdData).copy$default_ojfub8_k$ = function (nonQualifiedUserId, $super) {
      nonQualifiedUserId = nonQualifiedUserId === VOID ? this.nonQualifiedUserId_1 : nonQualifiedUserId;
      return $super === VOID
        ? this.copy_a35qlh_k$(nonQualifiedUserId)
        : $super.copy_a35qlh_k$.call(this, nonQualifiedUserId);
    };
    protoOf(TeamMemberIdData).toString = function () {
      return 'TeamMemberIdData(nonQualifiedUserId=' + this.nonQualifiedUserId_1 + ')';
    };
    protoOf(TeamMemberIdData).hashCode = function () {
      return getStringHashCode(this.nonQualifiedUserId_1);
    };
    protoOf(TeamMemberIdData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof TeamMemberIdData)) return false;
      var tmp0_other_with_cast = other instanceof TeamMemberIdData ? other : THROW_CCE();
      if (!(this.nonQualifiedUserId_1 === tmp0_other_with_cast.nonQualifiedUserId_1)) return false;
      return true;
    };
    function Companion_100() {
      Companion_instance_100 = this;
    }
    protoOf(Companion_100).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_77();
    };
    var Companion_instance_100;
    function Companion_getInstance_102() {
      if (Companion_instance_100 == null) new Companion_100();
      return Companion_instance_100;
    }
    function $serializer_77() {
      $serializer_instance_77 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.user.RemoveClientEventData',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_77).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_77).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance()];
    };
    protoOf($serializer_77).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return RemoveClientEventData_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_77).serialize_50uhg2_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.clientId_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_77).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_50uhg2_k$(encoder, value instanceof RemoveClientEventData ? value : THROW_CCE());
    };
    var $serializer_instance_77;
    function $serializer_getInstance_77() {
      if ($serializer_instance_77 == null) new $serializer_77();
      return $serializer_instance_77;
    }
    function RemoveClientEventData_init_$Init$(seen1, clientId, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_77().descriptor_1);
      }
      $this.clientId_1 = clientId;
      return $this;
    }
    function RemoveClientEventData_init_$Create$(seen1, clientId, serializationConstructorMarker) {
      return RemoveClientEventData_init_$Init$(
        seen1,
        clientId,
        serializationConstructorMarker,
        objectCreate(protoOf(RemoveClientEventData)),
      );
    }
    function RemoveClientEventData(clientId) {
      Companion_getInstance_102();
      this.clientId_1 = clientId;
    }
    protoOf(RemoveClientEventData).get_clientId_gs3e9d_k$ = function () {
      return this.clientId_1;
    };
    protoOf(RemoveClientEventData).component1_7eebsc_k$ = function () {
      return this.clientId_1;
    };
    protoOf(RemoveClientEventData).copy_a35qlh_k$ = function (clientId) {
      return new RemoveClientEventData(clientId);
    };
    protoOf(RemoveClientEventData).copy$default_3bxbu5_k$ = function (clientId, $super) {
      clientId = clientId === VOID ? this.clientId_1 : clientId;
      return $super === VOID ? this.copy_a35qlh_k$(clientId) : $super.copy_a35qlh_k$.call(this, clientId);
    };
    protoOf(RemoveClientEventData).toString = function () {
      return 'RemoveClientEventData(clientId=' + this.clientId_1 + ')';
    };
    protoOf(RemoveClientEventData).hashCode = function () {
      return getStringHashCode(this.clientId_1);
    };
    protoOf(RemoveClientEventData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof RemoveClientEventData)) return false;
      var tmp0_other_with_cast = other instanceof RemoveClientEventData ? other : THROW_CCE();
      if (!(this.clientId_1 === tmp0_other_with_cast.clientId_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_28($this) {
      return $this.$childSerializers_1;
    }
    function Companion_101() {
      Companion_instance_101 = this;
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
        new ArrayListSerializer($serializer_getInstance_83()),
        new ArrayListSerializer(Companion_getInstance_113().serializer_9w0wvi_k$()),
      ];
    }
    protoOf(Companion_101).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_78();
    };
    var Companion_instance_101;
    function Companion_getInstance_103() {
      if (Companion_instance_101 == null) new Companion_101();
      return Companion_instance_101;
    }
    function $serializer_78() {
      $serializer_instance_78 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.notification.user.UserUpdateEventData',
        this,
        8,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('accent_id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('name', false);
      tmp0_serialDesc.addElement_5pzumi_k$('handle', false);
      tmp0_serialDesc.addElement_5pzumi_k$('email', false);
      tmp0_serialDesc.addElement_5pzumi_k$('sso_id_deleted', false);
      tmp0_serialDesc.addElement_5pzumi_k$('assets', false);
      tmp0_serialDesc.addElement_5pzumi_k$('supported_protocols', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_78).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_78).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_103().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        StringSerializer_getInstance(),
        get_nullable(IntSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(StringSerializer_getInstance()),
        get_nullable(BooleanSerializer_getInstance()),
        get_nullable(tmp0_cached[6]),
        get_nullable(tmp0_cached[7]),
      ];
    };
    protoOf($serializer_78).deserialize_sy6x50_k$ = function (decoder) {
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
      var tmp13_cached = Companion_getInstance_103().$childSerializers_1;
      if (tmp12_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          1,
          IntSerializer_getInstance(),
          tmp5_local1,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          2,
          StringSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          3,
          StringSerializer_getInstance(),
          tmp7_local3,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          StringSerializer_getInstance(),
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
        tmp9_local5 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          5,
          BooleanSerializer_getInstance(),
          tmp9_local5,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 32;
        tmp10_local6 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          6,
          tmp13_cached[6],
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
              tmp4_local0 = tmp12_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                IntSerializer_getInstance(),
                tmp5_local1,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                2,
                StringSerializer_getInstance(),
                tmp6_local2,
              );
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
              tmp8_local4 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                StringSerializer_getInstance(),
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            case 5:
              tmp9_local5 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                5,
                BooleanSerializer_getInstance(),
                tmp9_local5,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 32;
              break;
            case 6:
              tmp10_local6 = tmp12_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                6,
                tmp13_cached[6],
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
      return UserUpdateEventData_init_$Create$(
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
    protoOf($serializer_78).serialize_mo8gc3_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_103().$childSerializers_1;
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.nonQualifiedUserId_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        1,
        IntSerializer_getInstance(),
        value.accentId_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        2,
        StringSerializer_getInstance(),
        value.name_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        3,
        StringSerializer_getInstance(),
        value.handle_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        4,
        StringSerializer_getInstance(),
        value.email_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        5,
        BooleanSerializer_getInstance(),
        value.ssoIdDeleted_1,
      );
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 6, tmp2_cached[6], value.assets_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 7, tmp2_cached[7], value.supportedProtocols_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_78).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_mo8gc3_k$(encoder, value instanceof UserUpdateEventData ? value : THROW_CCE());
    };
    var $serializer_instance_78;
    function $serializer_getInstance_78() {
      if ($serializer_instance_78 == null) new $serializer_78();
      return $serializer_instance_78;
    }
    function UserUpdateEventData_init_$Init$(
      seen1,
      nonQualifiedUserId,
      accentId,
      name,
      handle,
      email,
      ssoIdDeleted,
      assets,
      supportedProtocols,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(255 === (255 & seen1))) {
        throwMissingFieldException(seen1, 255, $serializer_getInstance_78().descriptor_1);
      }
      $this.nonQualifiedUserId_1 = nonQualifiedUserId;
      $this.accentId_1 = accentId;
      $this.name_1 = name;
      $this.handle_1 = handle;
      $this.email_1 = email;
      $this.ssoIdDeleted_1 = ssoIdDeleted;
      $this.assets_1 = assets;
      $this.supportedProtocols_1 = supportedProtocols;
      return $this;
    }
    function UserUpdateEventData_init_$Create$(
      seen1,
      nonQualifiedUserId,
      accentId,
      name,
      handle,
      email,
      ssoIdDeleted,
      assets,
      supportedProtocols,
      serializationConstructorMarker,
    ) {
      return UserUpdateEventData_init_$Init$(
        seen1,
        nonQualifiedUserId,
        accentId,
        name,
        handle,
        email,
        ssoIdDeleted,
        assets,
        supportedProtocols,
        serializationConstructorMarker,
        objectCreate(protoOf(UserUpdateEventData)),
      );
    }
    function UserUpdateEventData(
      nonQualifiedUserId,
      accentId,
      name,
      handle,
      email,
      ssoIdDeleted,
      assets,
      supportedProtocols,
    ) {
      Companion_getInstance_103();
      this.nonQualifiedUserId_1 = nonQualifiedUserId;
      this.accentId_1 = accentId;
      this.name_1 = name;
      this.handle_1 = handle;
      this.email_1 = email;
      this.ssoIdDeleted_1 = ssoIdDeleted;
      this.assets_1 = assets;
      this.supportedProtocols_1 = supportedProtocols;
    }
    protoOf(UserUpdateEventData).get_nonQualifiedUserId_xgdqf2_k$ = function () {
      return this.nonQualifiedUserId_1;
    };
    protoOf(UserUpdateEventData).get_accentId_3q5j66_k$ = function () {
      return this.accentId_1;
    };
    protoOf(UserUpdateEventData).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(UserUpdateEventData).get_handle_e5p7ht_k$ = function () {
      return this.handle_1;
    };
    protoOf(UserUpdateEventData).get_email_iqwbqr_k$ = function () {
      return this.email_1;
    };
    protoOf(UserUpdateEventData).get_ssoIdDeleted_4r5h1k_k$ = function () {
      return this.ssoIdDeleted_1;
    };
    protoOf(UserUpdateEventData).get_assets_b4ddak_k$ = function () {
      return this.assets_1;
    };
    protoOf(UserUpdateEventData).get_supportedProtocols_nhmuga_k$ = function () {
      return this.supportedProtocols_1;
    };
    protoOf(UserUpdateEventData).component1_7eebsc_k$ = function () {
      return this.nonQualifiedUserId_1;
    };
    protoOf(UserUpdateEventData).component2_7eebsb_k$ = function () {
      return this.accentId_1;
    };
    protoOf(UserUpdateEventData).component3_7eebsa_k$ = function () {
      return this.name_1;
    };
    protoOf(UserUpdateEventData).component4_7eebs9_k$ = function () {
      return this.handle_1;
    };
    protoOf(UserUpdateEventData).component5_7eebs8_k$ = function () {
      return this.email_1;
    };
    protoOf(UserUpdateEventData).component6_7eebs7_k$ = function () {
      return this.ssoIdDeleted_1;
    };
    protoOf(UserUpdateEventData).component7_7eebs6_k$ = function () {
      return this.assets_1;
    };
    protoOf(UserUpdateEventData).component8_7eebs5_k$ = function () {
      return this.supportedProtocols_1;
    };
    protoOf(UserUpdateEventData).copy_kau1mm_k$ = function (
      nonQualifiedUserId,
      accentId,
      name,
      handle,
      email,
      ssoIdDeleted,
      assets,
      supportedProtocols,
    ) {
      return new UserUpdateEventData(
        nonQualifiedUserId,
        accentId,
        name,
        handle,
        email,
        ssoIdDeleted,
        assets,
        supportedProtocols,
      );
    };
    protoOf(UserUpdateEventData).copy$default_9kiw50_k$ = function (
      nonQualifiedUserId,
      accentId,
      name,
      handle,
      email,
      ssoIdDeleted,
      assets,
      supportedProtocols,
      $super,
    ) {
      nonQualifiedUserId = nonQualifiedUserId === VOID ? this.nonQualifiedUserId_1 : nonQualifiedUserId;
      accentId = accentId === VOID ? this.accentId_1 : accentId;
      name = name === VOID ? this.name_1 : name;
      handle = handle === VOID ? this.handle_1 : handle;
      email = email === VOID ? this.email_1 : email;
      ssoIdDeleted = ssoIdDeleted === VOID ? this.ssoIdDeleted_1 : ssoIdDeleted;
      assets = assets === VOID ? this.assets_1 : assets;
      supportedProtocols = supportedProtocols === VOID ? this.supportedProtocols_1 : supportedProtocols;
      return $super === VOID
        ? this.copy_kau1mm_k$(
            nonQualifiedUserId,
            accentId,
            name,
            handle,
            email,
            ssoIdDeleted,
            assets,
            supportedProtocols,
          )
        : $super.copy_kau1mm_k$.call(
            this,
            nonQualifiedUserId,
            accentId,
            name,
            handle,
            email,
            ssoIdDeleted,
            assets,
            supportedProtocols,
          );
    };
    protoOf(UserUpdateEventData).toString = function () {
      return (
        'UserUpdateEventData(nonQualifiedUserId=' +
        this.nonQualifiedUserId_1 +
        ', accentId=' +
        this.accentId_1 +
        ', name=' +
        this.name_1 +
        ', handle=' +
        this.handle_1 +
        ', email=' +
        this.email_1 +
        ', ssoIdDeleted=' +
        this.ssoIdDeleted_1 +
        ', assets=' +
        this.assets_1 +
        ', supportedProtocols=' +
        this.supportedProtocols_1 +
        ')'
      );
    };
    protoOf(UserUpdateEventData).hashCode = function () {
      var result = getStringHashCode(this.nonQualifiedUserId_1);
      result = (imul(result, 31) + (this.accentId_1 == null ? 0 : this.accentId_1)) | 0;
      result = (imul(result, 31) + (this.name_1 == null ? 0 : getStringHashCode(this.name_1))) | 0;
      result = (imul(result, 31) + (this.handle_1 == null ? 0 : getStringHashCode(this.handle_1))) | 0;
      result = (imul(result, 31) + (this.email_1 == null ? 0 : getStringHashCode(this.email_1))) | 0;
      result = (imul(result, 31) + (this.ssoIdDeleted_1 == null ? 0 : getBooleanHashCode(this.ssoIdDeleted_1))) | 0;
      result = (imul(result, 31) + (this.assets_1 == null ? 0 : hashCode(this.assets_1))) | 0;
      result = (imul(result, 31) + (this.supportedProtocols_1 == null ? 0 : hashCode(this.supportedProtocols_1))) | 0;
      return result;
    };
    protoOf(UserUpdateEventData).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof UserUpdateEventData)) return false;
      var tmp0_other_with_cast = other instanceof UserUpdateEventData ? other : THROW_CCE();
      if (!(this.nonQualifiedUserId_1 === tmp0_other_with_cast.nonQualifiedUserId_1)) return false;
      if (!(this.accentId_1 == tmp0_other_with_cast.accentId_1)) return false;
      if (!(this.name_1 == tmp0_other_with_cast.name_1)) return false;
      if (!(this.handle_1 == tmp0_other_with_cast.handle_1)) return false;
      if (!(this.email_1 == tmp0_other_with_cast.email_1)) return false;
      if (!(this.ssoIdDeleted_1 == tmp0_other_with_cast.ssoIdDeleted_1)) return false;
      if (!equals(this.assets_1, tmp0_other_with_cast.assets_1)) return false;
      if (!equals(this.supportedProtocols_1, tmp0_other_with_cast.supportedProtocols_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_29($this) {
      return $this.$childSerializers_1;
    }
    function Companion_102() {
      Companion_instance_102 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [new ArrayListSerializer($serializer_getInstance_80())];
    }
    protoOf(Companion_102).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_79();
    };
    var Companion_instance_102;
    function Companion_getInstance_104() {
      if (Companion_instance_102 == null) new Companion_102();
      return Companion_instance_102;
    }
    function $serializer_79() {
      $serializer_instance_79 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.properties.LabelListResponseDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('labels', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_79).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_79).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [Companion_getInstance_104().$childSerializers_1[0]];
    };
    protoOf($serializer_79).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_104().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return LabelListResponseDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_79).serialize_jq28e3_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_104().$childSerializers_1;
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 0, tmp2_cached[0], value.labels_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_79).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_jq28e3_k$(encoder, value instanceof LabelListResponseDTO ? value : THROW_CCE());
    };
    var $serializer_instance_79;
    function $serializer_getInstance_79() {
      if ($serializer_instance_79 == null) new $serializer_79();
      return $serializer_instance_79;
    }
    function LabelListResponseDTO_init_$Init$(seen1, labels, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_79().descriptor_1);
      }
      $this.labels_1 = labels;
      return $this;
    }
    function LabelListResponseDTO_init_$Create$(seen1, labels, serializationConstructorMarker) {
      return LabelListResponseDTO_init_$Init$(
        seen1,
        labels,
        serializationConstructorMarker,
        objectCreate(protoOf(LabelListResponseDTO)),
      );
    }
    function LabelListResponseDTO(labels) {
      Companion_getInstance_104();
      this.labels_1 = labels;
    }
    protoOf(LabelListResponseDTO).get_labels_g1o1zc_k$ = function () {
      return this.labels_1;
    };
    protoOf(LabelListResponseDTO).component1_7eebsc_k$ = function () {
      return this.labels_1;
    };
    protoOf(LabelListResponseDTO).copy_2g3qzi_k$ = function (labels) {
      return new LabelListResponseDTO(labels);
    };
    protoOf(LabelListResponseDTO).copy$default_rl84ul_k$ = function (labels, $super) {
      labels = labels === VOID ? this.labels_1 : labels;
      return $super === VOID ? this.copy_2g3qzi_k$(labels) : $super.copy_2g3qzi_k$.call(this, labels);
    };
    protoOf(LabelListResponseDTO).toString = function () {
      return 'LabelListResponseDTO(labels=' + this.labels_1 + ')';
    };
    protoOf(LabelListResponseDTO).hashCode = function () {
      return hashCode(this.labels_1);
    };
    protoOf(LabelListResponseDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof LabelListResponseDTO)) return false;
      var tmp0_other_with_cast = other instanceof LabelListResponseDTO ? other : THROW_CCE();
      if (!equals(this.labels_1, tmp0_other_with_cast.labels_1)) return false;
      return true;
    };
    function _get_$childSerializers__r2zwns_30($this) {
      return $this.$childSerializers_1;
    }
    function Companion_103() {
      Companion_instance_103 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        null,
        null,
        null,
        new ArrayListSerializer(StringSerializer_getInstance()),
        new ArrayListSerializer($serializer_getInstance_82()),
      ];
    }
    protoOf(Companion_103).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_80();
    };
    var Companion_instance_103;
    function Companion_getInstance_105() {
      if (Companion_instance_103 == null) new Companion_103();
      return Companion_instance_103;
    }
    function $serializer_80() {
      $serializer_instance_80 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.properties.LabelDTO',
        this,
        5,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('name', false);
      tmp0_serialDesc.addElement_5pzumi_k$('type', false);
      tmp0_serialDesc.addElement_5pzumi_k$('conversations', false);
      tmp0_serialDesc.addElement_5pzumi_k$('qualified_conversations', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_80).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_80).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_105().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [
        StringSerializer_getInstance(),
        StringSerializer_getInstance(),
        LabelTypeSerializer_getInstance(),
        tmp0_cached[3],
        get_nullable(tmp0_cached[4]),
      ];
    };
    protoOf($serializer_80).deserialize_sy6x50_k$ = function (decoder) {
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
      var tmp10_cached = Companion_getInstance_105().$childSerializers_1;
      if (tmp9_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
        tmp3_bitMask0 = tmp3_bitMask0 | 2;
        tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
          tmp0_desc,
          2,
          LabelTypeSerializer_getInstance(),
          tmp6_local2,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 4;
        tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 3, tmp10_cached[3], tmp7_local3);
        tmp3_bitMask0 = tmp3_bitMask0 | 8;
        tmp8_local4 = tmp9_input.decodeNullableSerializableElement_k2y6ab_k$(
          tmp0_desc,
          4,
          tmp10_cached[4],
          tmp8_local4,
        );
        tmp3_bitMask0 = tmp3_bitMask0 | 16;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp9_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp9_input.decodeStringElement_3oenpg_k$(tmp0_desc, 1);
              tmp3_bitMask0 = tmp3_bitMask0 | 2;
              break;
            case 2:
              tmp6_local2 = tmp9_input.decodeSerializableElement_uahnnv_k$(
                tmp0_desc,
                2,
                LabelTypeSerializer_getInstance(),
                tmp6_local2,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 4;
              break;
            case 3:
              tmp7_local3 = tmp9_input.decodeSerializableElement_uahnnv_k$(tmp0_desc, 3, tmp10_cached[3], tmp7_local3);
              tmp3_bitMask0 = tmp3_bitMask0 | 8;
              break;
            case 4:
              tmp8_local4 = tmp9_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                4,
                tmp10_cached[4],
                tmp8_local4,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 16;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp9_input.endStructure_1xqz0n_k$(tmp0_desc);
      return LabelDTO_init_$Create$(
        tmp3_bitMask0,
        tmp4_local0,
        tmp5_local1,
        tmp6_local2,
        tmp7_local3,
        tmp8_local4,
        null,
      );
    };
    protoOf($serializer_80).serialize_9vjrok_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_105().$childSerializers_1;
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.id_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.name_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 2, LabelTypeSerializer_getInstance(), value.type_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 3, tmp2_cached[3], value.conversations_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(
        tmp0_desc,
        4,
        tmp2_cached[4],
        value.qualifiedConversations_1,
      );
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_80).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_9vjrok_k$(encoder, value instanceof LabelDTO ? value : THROW_CCE());
    };
    var $serializer_instance_80;
    function $serializer_getInstance_80() {
      if ($serializer_instance_80 == null) new $serializer_80();
      return $serializer_instance_80;
    }
    function LabelDTO_init_$Init$(
      seen1,
      id,
      name,
      type,
      conversations,
      qualifiedConversations,
      serializationConstructorMarker,
      $this,
    ) {
      if (!(31 === (31 & seen1))) {
        throwMissingFieldException(seen1, 31, $serializer_getInstance_80().descriptor_1);
      }
      $this.id_1 = id;
      $this.name_1 = name;
      $this.type_1 = type;
      $this.conversations_1 = conversations;
      $this.qualifiedConversations_1 = qualifiedConversations;
      return $this;
    }
    function LabelDTO_init_$Create$(
      seen1,
      id,
      name,
      type,
      conversations,
      qualifiedConversations,
      serializationConstructorMarker,
    ) {
      return LabelDTO_init_$Init$(
        seen1,
        id,
        name,
        type,
        conversations,
        qualifiedConversations,
        serializationConstructorMarker,
        objectCreate(protoOf(LabelDTO)),
      );
    }
    function LabelDTO(id, name, type, conversations, qualifiedConversations) {
      Companion_getInstance_105();
      this.id_1 = id;
      this.name_1 = name;
      this.type_1 = type;
      this.conversations_1 = conversations;
      this.qualifiedConversations_1 = qualifiedConversations;
    }
    protoOf(LabelDTO).get_id_kntnx8_k$ = function () {
      return this.id_1;
    };
    protoOf(LabelDTO).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(LabelDTO).get_type_wovaf7_k$ = function () {
      return this.type_1;
    };
    protoOf(LabelDTO).get_conversations_n3fbjb_k$ = function () {
      return this.conversations_1;
    };
    protoOf(LabelDTO).get_qualifiedConversations_fo2vhf_k$ = function () {
      return this.qualifiedConversations_1;
    };
    protoOf(LabelDTO).component1_7eebsc_k$ = function () {
      return this.id_1;
    };
    protoOf(LabelDTO).component2_7eebsb_k$ = function () {
      return this.name_1;
    };
    protoOf(LabelDTO).component3_7eebsa_k$ = function () {
      return this.type_1;
    };
    protoOf(LabelDTO).component4_7eebs9_k$ = function () {
      return this.conversations_1;
    };
    protoOf(LabelDTO).component5_7eebs8_k$ = function () {
      return this.qualifiedConversations_1;
    };
    protoOf(LabelDTO).copy_5px7l7_k$ = function (id, name, type, conversations, qualifiedConversations) {
      return new LabelDTO(id, name, type, conversations, qualifiedConversations);
    };
    protoOf(LabelDTO).copy$default_29dkin_k$ = function (
      id,
      name,
      type,
      conversations,
      qualifiedConversations,
      $super,
    ) {
      id = id === VOID ? this.id_1 : id;
      name = name === VOID ? this.name_1 : name;
      type = type === VOID ? this.type_1 : type;
      conversations = conversations === VOID ? this.conversations_1 : conversations;
      qualifiedConversations = qualifiedConversations === VOID ? this.qualifiedConversations_1 : qualifiedConversations;
      return $super === VOID
        ? this.copy_5px7l7_k$(id, name, type, conversations, qualifiedConversations)
        : $super.copy_5px7l7_k$.call(this, id, name, type, conversations, qualifiedConversations);
    };
    protoOf(LabelDTO).toString = function () {
      return (
        'LabelDTO(id=' +
        this.id_1 +
        ', name=' +
        this.name_1 +
        ', type=' +
        this.type_1 +
        ', conversations=' +
        this.conversations_1 +
        ', qualifiedConversations=' +
        this.qualifiedConversations_1 +
        ')'
      );
    };
    protoOf(LabelDTO).hashCode = function () {
      var result = getStringHashCode(this.id_1);
      result = (imul(result, 31) + getStringHashCode(this.name_1)) | 0;
      result = (imul(result, 31) + this.type_1.hashCode()) | 0;
      result = (imul(result, 31) + hashCode(this.conversations_1)) | 0;
      result =
        (imul(result, 31) + (this.qualifiedConversations_1 == null ? 0 : hashCode(this.qualifiedConversations_1))) | 0;
      return result;
    };
    protoOf(LabelDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof LabelDTO)) return false;
      var tmp0_other_with_cast = other instanceof LabelDTO ? other : THROW_CCE();
      if (!(this.id_1 === tmp0_other_with_cast.id_1)) return false;
      if (!(this.name_1 === tmp0_other_with_cast.name_1)) return false;
      if (!this.type_1.equals(tmp0_other_with_cast.type_1)) return false;
      if (!equals(this.conversations_1, tmp0_other_with_cast.conversations_1)) return false;
      if (!equals(this.qualifiedConversations_1, tmp0_other_with_cast.qualifiedConversations_1)) return false;
      return true;
    };
    var LabelTypeDTO_USER_instance;
    var LabelTypeDTO_FAVORITE_instance;
    function values_10() {
      return [LabelTypeDTO_USER_getInstance(), LabelTypeDTO_FAVORITE_getInstance()];
    }
    function valueOf_10(value) {
      switch (value) {
        case 'USER':
          return LabelTypeDTO_USER_getInstance();
        case 'FAVORITE':
          return LabelTypeDTO_FAVORITE_getInstance();
        default:
          LabelTypeDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_10() {
      if ($ENTRIES_10 == null) $ENTRIES_10 = enumEntries(values_10());
      return $ENTRIES_10;
    }
    var LabelTypeDTO_entriesInitialized;
    function LabelTypeDTO_initEntries() {
      if (LabelTypeDTO_entriesInitialized) return Unit_getInstance();
      LabelTypeDTO_entriesInitialized = true;
      LabelTypeDTO_USER_instance = new LabelTypeDTO('USER', 0);
      LabelTypeDTO_FAVORITE_instance = new LabelTypeDTO('FAVORITE', 1);
    }
    var $ENTRIES_10;
    function LabelTypeDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function LabelTypeSerializer() {
      LabelTypeSerializer_instance = this;
      this.descriptor_1 = PrimitiveSerialDescriptor('type', INT_getInstance());
    }
    protoOf(LabelTypeSerializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(LabelTypeSerializer).serialize_txulv1_k$ = function (encoder, value) {
      encoder.encodeInt_y5zi3z_k$(value.get_ordinal_ip24qg_k$());
    };
    protoOf(LabelTypeSerializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_txulv1_k$(encoder, value instanceof LabelTypeDTO ? value : THROW_CCE());
    };
    protoOf(LabelTypeSerializer).deserialize_sy6x50_k$ = function (decoder) {
      var ordinal = decoder.decodeInt_8iq8f5_k$();
      // Inline function 'kotlin.collections.getOrElse' call
      var this_0 = get_entries_10();
      var tmp;
      if (ordinal >= 0 ? ordinal <= get_lastIndex(this_0) : false) {
        tmp = this_0.get_c1px32_k$(ordinal);
      } else {
        // Inline function 'com.wire.kalium.network.api.authenticated.properties.LabelTypeSerializer.deserialize.<anonymous>' call
        tmp = LabelTypeDTO_USER_getInstance();
      }
      return tmp;
    };
    var LabelTypeSerializer_instance;
    function LabelTypeSerializer_getInstance() {
      if (LabelTypeSerializer_instance == null) new LabelTypeSerializer();
      return LabelTypeSerializer_instance;
    }
    function LabelTypeDTO_USER_getInstance() {
      LabelTypeDTO_initEntries();
      return LabelTypeDTO_USER_instance;
    }
    function LabelTypeDTO_FAVORITE_getInstance() {
      LabelTypeDTO_initEntries();
      return LabelTypeDTO_FAVORITE_instance;
    }
    function _get_$childSerializers__r2zwns_31($this) {
      return $this.$childSerializers_1;
    }
    function Companion_104() {
      Companion_instance_104 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        new LinkedHashMapSerializer(StringSerializer_getInstance(), StringSerializer_getInstance()),
      ];
    }
    protoOf(Companion_104).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_81();
    };
    var Companion_instance_104;
    function Companion_getInstance_106() {
      if (Companion_instance_104 == null) new Companion_104();
      return Companion_instance_104;
    }
    function $serializer_81() {
      $serializer_instance_81 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.authenticated.serverpublickey.MLSPublicKeysDTO',
        this,
        1,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('removal', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_81).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_81).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_106().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [get_nullable(tmp0_cached[0])];
    };
    protoOf($serializer_81).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp6_cached = Companion_getInstance_106().$childSerializers_1;
      if (tmp5_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp5_input.decodeNullableSerializableElement_k2y6ab_k$(tmp0_desc, 0, tmp6_cached[0], tmp4_local0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
      } else
        while (tmp1_flag) {
          tmp2_index = tmp5_input.decodeElementIndex_bstkhp_k$(tmp0_desc);
          switch (tmp2_index) {
            case -1:
              tmp1_flag = false;
              break;
            case 0:
              tmp4_local0 = tmp5_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                0,
                tmp6_cached[0],
                tmp4_local0,
              );
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            default:
              throw UnknownFieldException_init_$Create$(tmp2_index);
          }
        }
      tmp5_input.endStructure_1xqz0n_k$(tmp0_desc);
      return MLSPublicKeysDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, null);
    };
    protoOf($serializer_81).serialize_6cmr3b_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_106().$childSerializers_1;
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 0, tmp2_cached[0], value.removal_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_81).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_6cmr3b_k$(encoder, value instanceof MLSPublicKeysDTO ? value : THROW_CCE());
    };
    var $serializer_instance_81;
    function $serializer_getInstance_81() {
      if ($serializer_instance_81 == null) new $serializer_81();
      return $serializer_instance_81;
    }
    function MLSPublicKeysDTO_init_$Init$(seen1, removal, serializationConstructorMarker, $this) {
      if (!(1 === (1 & seen1))) {
        throwMissingFieldException(seen1, 1, $serializer_getInstance_81().descriptor_1);
      }
      $this.removal_1 = removal;
      return $this;
    }
    function MLSPublicKeysDTO_init_$Create$(seen1, removal, serializationConstructorMarker) {
      return MLSPublicKeysDTO_init_$Init$(
        seen1,
        removal,
        serializationConstructorMarker,
        objectCreate(protoOf(MLSPublicKeysDTO)),
      );
    }
    function MLSPublicKeysDTO(removal) {
      Companion_getInstance_106();
      this.removal_1 = removal;
    }
    protoOf(MLSPublicKeysDTO).get_removal_jbls03_k$ = function () {
      return this.removal_1;
    };
    protoOf(MLSPublicKeysDTO).component1_7eebsc_k$ = function () {
      return this.removal_1;
    };
    protoOf(MLSPublicKeysDTO).copy_dsmt0a_k$ = function (removal) {
      return new MLSPublicKeysDTO(removal);
    };
    protoOf(MLSPublicKeysDTO).copy$default_l7c7pf_k$ = function (removal, $super) {
      removal = removal === VOID ? this.removal_1 : removal;
      return $super === VOID ? this.copy_dsmt0a_k$(removal) : $super.copy_dsmt0a_k$.call(this, removal);
    };
    protoOf(MLSPublicKeysDTO).toString = function () {
      return 'MLSPublicKeysDTO(removal=' + this.removal_1 + ')';
    };
    protoOf(MLSPublicKeysDTO).hashCode = function () {
      return this.removal_1 == null ? 0 : hashCode(this.removal_1);
    };
    protoOf(MLSPublicKeysDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof MLSPublicKeysDTO)) return false;
      var tmp0_other_with_cast = other instanceof MLSPublicKeysDTO ? other : THROW_CCE();
      if (!equals(this.removal_1, tmp0_other_with_cast.removal_1)) return false;
      return true;
    };
    function _get_$cachedSerializer__te6jhj_16($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ConversationAccessDTO$Companion$_anonymous__jjusdz() {
      var tmp = values_11();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['private', 'code', 'invite', 'self_invite', 'link'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.model.ConversationAccessDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var ConversationAccessDTO_PRIVATE_instance;
    var ConversationAccessDTO_CODE_instance;
    var ConversationAccessDTO_INVITE_instance;
    var ConversationAccessDTO_SELF_INVITE_instance;
    var ConversationAccessDTO_LINK_instance;
    function Companion_105() {
      Companion_instance_105 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ConversationAccessDTO$Companion$_anonymous__jjusdz);
    }
    protoOf(Companion_105).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_16(this);
    };
    protoOf(Companion_105).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_105;
    function Companion_getInstance_107() {
      ConversationAccessDTO_initEntries();
      if (Companion_instance_105 == null) new Companion_105();
      return Companion_instance_105;
    }
    function values_11() {
      return [
        ConversationAccessDTO_PRIVATE_getInstance(),
        ConversationAccessDTO_CODE_getInstance(),
        ConversationAccessDTO_INVITE_getInstance(),
        ConversationAccessDTO_SELF_INVITE_getInstance(),
        ConversationAccessDTO_LINK_getInstance(),
      ];
    }
    function valueOf_11(value) {
      switch (value) {
        case 'PRIVATE':
          return ConversationAccessDTO_PRIVATE_getInstance();
        case 'CODE':
          return ConversationAccessDTO_CODE_getInstance();
        case 'INVITE':
          return ConversationAccessDTO_INVITE_getInstance();
        case 'SELF_INVITE':
          return ConversationAccessDTO_SELF_INVITE_getInstance();
        case 'LINK':
          return ConversationAccessDTO_LINK_getInstance();
        default:
          ConversationAccessDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_11() {
      if ($ENTRIES_11 == null) $ENTRIES_11 = enumEntries(values_11());
      return $ENTRIES_11;
    }
    var ConversationAccessDTO_entriesInitialized;
    function ConversationAccessDTO_initEntries() {
      if (ConversationAccessDTO_entriesInitialized) return Unit_getInstance();
      ConversationAccessDTO_entriesInitialized = true;
      ConversationAccessDTO_PRIVATE_instance = new ConversationAccessDTO('PRIVATE', 0);
      ConversationAccessDTO_CODE_instance = new ConversationAccessDTO('CODE', 1);
      ConversationAccessDTO_INVITE_instance = new ConversationAccessDTO('INVITE', 2);
      ConversationAccessDTO_SELF_INVITE_instance = new ConversationAccessDTO('SELF_INVITE', 3);
      ConversationAccessDTO_LINK_instance = new ConversationAccessDTO('LINK', 4);
      Companion_getInstance_107();
    }
    var $ENTRIES_11;
    function ConversationAccessDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(ConversationAccessDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function ConversationAccessDTO_PRIVATE_getInstance() {
      ConversationAccessDTO_initEntries();
      return ConversationAccessDTO_PRIVATE_instance;
    }
    function ConversationAccessDTO_CODE_getInstance() {
      ConversationAccessDTO_initEntries();
      return ConversationAccessDTO_CODE_instance;
    }
    function ConversationAccessDTO_INVITE_getInstance() {
      ConversationAccessDTO_initEntries();
      return ConversationAccessDTO_INVITE_instance;
    }
    function ConversationAccessDTO_SELF_INVITE_getInstance() {
      ConversationAccessDTO_initEntries();
      return ConversationAccessDTO_SELF_INVITE_instance;
    }
    function ConversationAccessDTO_LINK_getInstance() {
      ConversationAccessDTO_initEntries();
      return ConversationAccessDTO_LINK_instance;
    }
    function _get_$cachedSerializer__te6jhj_17($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function ConversationAccessRoleDTO$Companion$_anonymous__ftribx() {
      var tmp = values_12();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['team_member', 'non_team_member', 'guest', 'service', 'partner'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null, null, null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.model.ConversationAccessRoleDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var ConversationAccessRoleDTO_TEAM_MEMBER_instance;
    var ConversationAccessRoleDTO_NON_TEAM_MEMBER_instance;
    var ConversationAccessRoleDTO_GUEST_instance;
    var ConversationAccessRoleDTO_SERVICE_instance;
    var ConversationAccessRoleDTO_EXTERNAL_instance;
    function Companion_106() {
      Companion_instance_106 = this;
      this.DEFAULT_VALUE_WHEN_NULL_1 = setOf([
        ConversationAccessRoleDTO_TEAM_MEMBER_getInstance(),
        ConversationAccessRoleDTO_NON_TEAM_MEMBER_getInstance(),
        ConversationAccessRoleDTO_SERVICE_getInstance(),
      ]);
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, ConversationAccessRoleDTO$Companion$_anonymous__ftribx);
    }
    protoOf(Companion_106).get_DEFAULT_VALUE_WHEN_NULL_nr9gc7_k$ = function () {
      return this.DEFAULT_VALUE_WHEN_NULL_1;
    };
    protoOf(Companion_106).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_17(this);
    };
    protoOf(Companion_106).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_106;
    function Companion_getInstance_108() {
      ConversationAccessRoleDTO_initEntries();
      if (Companion_instance_106 == null) new Companion_106();
      return Companion_instance_106;
    }
    function values_12() {
      return [
        ConversationAccessRoleDTO_TEAM_MEMBER_getInstance(),
        ConversationAccessRoleDTO_NON_TEAM_MEMBER_getInstance(),
        ConversationAccessRoleDTO_GUEST_getInstance(),
        ConversationAccessRoleDTO_SERVICE_getInstance(),
        ConversationAccessRoleDTO_EXTERNAL_getInstance(),
      ];
    }
    function valueOf_12(value) {
      switch (value) {
        case 'TEAM_MEMBER':
          return ConversationAccessRoleDTO_TEAM_MEMBER_getInstance();
        case 'NON_TEAM_MEMBER':
          return ConversationAccessRoleDTO_NON_TEAM_MEMBER_getInstance();
        case 'GUEST':
          return ConversationAccessRoleDTO_GUEST_getInstance();
        case 'SERVICE':
          return ConversationAccessRoleDTO_SERVICE_getInstance();
        case 'EXTERNAL':
          return ConversationAccessRoleDTO_EXTERNAL_getInstance();
        default:
          ConversationAccessRoleDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_12() {
      if ($ENTRIES_12 == null) $ENTRIES_12 = enumEntries(values_12());
      return $ENTRIES_12;
    }
    var ConversationAccessRoleDTO_entriesInitialized;
    function ConversationAccessRoleDTO_initEntries() {
      if (ConversationAccessRoleDTO_entriesInitialized) return Unit_getInstance();
      ConversationAccessRoleDTO_entriesInitialized = true;
      ConversationAccessRoleDTO_TEAM_MEMBER_instance = new ConversationAccessRoleDTO('TEAM_MEMBER', 0);
      ConversationAccessRoleDTO_NON_TEAM_MEMBER_instance = new ConversationAccessRoleDTO('NON_TEAM_MEMBER', 1);
      ConversationAccessRoleDTO_GUEST_instance = new ConversationAccessRoleDTO('GUEST', 2);
      ConversationAccessRoleDTO_SERVICE_instance = new ConversationAccessRoleDTO('SERVICE', 3);
      ConversationAccessRoleDTO_EXTERNAL_instance = new ConversationAccessRoleDTO('EXTERNAL', 4);
      Companion_getInstance_108();
    }
    var $ENTRIES_12;
    function ConversationAccessRoleDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(ConversationAccessRoleDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function ConversationAccessRoleDTO_TEAM_MEMBER_getInstance() {
      ConversationAccessRoleDTO_initEntries();
      return ConversationAccessRoleDTO_TEAM_MEMBER_instance;
    }
    function ConversationAccessRoleDTO_NON_TEAM_MEMBER_getInstance() {
      ConversationAccessRoleDTO_initEntries();
      return ConversationAccessRoleDTO_NON_TEAM_MEMBER_instance;
    }
    function ConversationAccessRoleDTO_GUEST_getInstance() {
      ConversationAccessRoleDTO_initEntries();
      return ConversationAccessRoleDTO_GUEST_instance;
    }
    function ConversationAccessRoleDTO_SERVICE_getInstance() {
      ConversationAccessRoleDTO_initEntries();
      return ConversationAccessRoleDTO_SERVICE_instance;
    }
    function ConversationAccessRoleDTO_EXTERNAL_getInstance() {
      ConversationAccessRoleDTO_initEntries();
      return ConversationAccessRoleDTO_EXTERNAL_instance;
    }
    function Companion_107() {
      Companion_instance_107 = this;
    }
    protoOf(Companion_107).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_82();
    };
    var Companion_instance_107;
    function Companion_getInstance_109() {
      if (Companion_instance_107 == null) new Companion_107();
      return Companion_instance_107;
    }
    function $serializer_82() {
      $serializer_instance_82 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.model.QualifiedID',
        this,
        2,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('domain', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_82).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_82).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), StringSerializer_getInstance()];
    };
    protoOf($serializer_82).deserialize_sy6x50_k$ = function (decoder) {
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
    protoOf($serializer_82).serialize_yjr47m_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.value_1);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.domain_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_82).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_yjr47m_k$(encoder, value instanceof QualifiedID ? value : THROW_CCE());
    };
    var $serializer_instance_82;
    function $serializer_getInstance_82() {
      if ($serializer_instance_82 == null) new $serializer_82();
      return $serializer_instance_82;
    }
    function QualifiedID_init_$Init$(seen1, value, domain, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance_82().descriptor_1);
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
      Companion_getInstance_109();
      this.value_1 = value;
      this.domain_1 = domain;
    }
    protoOf(QualifiedID).get_value_j01efc_k$ = function () {
      return this.value_1;
    };
    protoOf(QualifiedID).get_domain_ch74y5_k$ = function () {
      return this.domain_1;
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
    protoOf(QualifiedID).copy$default_8l0zw4_k$ = function (value, domain, $super) {
      value = value === VOID ? this.value_1 : value;
      domain = domain === VOID ? this.domain_1 : domain;
      return $super === VOID ? this.copy_plwnsl_k$(value, domain) : $super.copy_plwnsl_k$.call(this, value, domain);
    };
    protoOf(QualifiedID).toString = function () {
      return 'QualifiedID(value=' + this.value_1 + ', domain=' + this.domain_1 + ')';
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
    function _get_$childSerializers__r2zwns_32($this) {
      return $this.$childSerializers_1;
    }
    function Companion_108() {
      Companion_instance_108 = this;
      var tmp = this;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp.$childSerializers_1 = [
        null,
        Companion_getInstance_111().serializer_9w0wvi_k$(),
        Companion_getInstance_112().serializer_9w0wvi_k$(),
      ];
    }
    protoOf(Companion_108).serializer_9w0wvi_k$ = function () {
      return $serializer_getInstance_83();
    };
    var Companion_instance_108;
    function Companion_getInstance_110() {
      if (Companion_instance_108 == null) new Companion_108();
      return Companion_instance_108;
    }
    function $serializer_83() {
      $serializer_instance_83 = this;
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor(
        'com.wire.kalium.network.api.model.UserAssetDTO',
        this,
        3,
      );
      tmp0_serialDesc.addElement_5pzumi_k$('key', false);
      tmp0_serialDesc.addElement_5pzumi_k$('size', false);
      tmp0_serialDesc.addElement_5pzumi_k$('type', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer_83).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer_83).childSerializers_5ghqw5_k$ = function () {
      var tmp0_cached = Companion_getInstance_110().$childSerializers_1;
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), get_nullable(tmp0_cached[1]), tmp0_cached[2]];
    };
    protoOf($serializer_83).deserialize_sy6x50_k$ = function (decoder) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_flag = true;
      var tmp2_index = 0;
      var tmp3_bitMask0 = 0;
      var tmp4_local0 = null;
      var tmp5_local1 = null;
      var tmp6_local2 = null;
      var tmp7_input = decoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp8_cached = Companion_getInstance_110().$childSerializers_1;
      if (tmp7_input.decodeSequentially_xlblqy_k$()) {
        tmp4_local0 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
        tmp3_bitMask0 = tmp3_bitMask0 | 1;
        tmp5_local1 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(tmp0_desc, 1, tmp8_cached[1], tmp5_local1);
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
              tmp4_local0 = tmp7_input.decodeStringElement_3oenpg_k$(tmp0_desc, 0);
              tmp3_bitMask0 = tmp3_bitMask0 | 1;
              break;
            case 1:
              tmp5_local1 = tmp7_input.decodeNullableSerializableElement_k2y6ab_k$(
                tmp0_desc,
                1,
                tmp8_cached[1],
                tmp5_local1,
              );
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
      return UserAssetDTO_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, tmp6_local2, null);
    };
    protoOf($serializer_83).serialize_3bzs3n_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      var tmp2_cached = Companion_getInstance_110().$childSerializers_1;
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.key_1);
      tmp1_output.encodeNullableSerializableElement_5lquiv_k$(tmp0_desc, 1, tmp2_cached[1], value.size_1);
      tmp1_output.encodeSerializableElement_isqxcl_k$(tmp0_desc, 2, tmp2_cached[2], value.type_1);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer_83).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_3bzs3n_k$(encoder, value instanceof UserAssetDTO ? value : THROW_CCE());
    };
    var $serializer_instance_83;
    function $serializer_getInstance_83() {
      if ($serializer_instance_83 == null) new $serializer_83();
      return $serializer_instance_83;
    }
    function UserAssetDTO_init_$Init$(seen1, key, size, type, serializationConstructorMarker, $this) {
      if (!(7 === (7 & seen1))) {
        throwMissingFieldException(seen1, 7, $serializer_getInstance_83().descriptor_1);
      }
      $this.key_1 = key;
      $this.size_1 = size;
      $this.type_1 = type;
      return $this;
    }
    function UserAssetDTO_init_$Create$(seen1, key, size, type, serializationConstructorMarker) {
      return UserAssetDTO_init_$Init$(
        seen1,
        key,
        size,
        type,
        serializationConstructorMarker,
        objectCreate(protoOf(UserAssetDTO)),
      );
    }
    function UserAssetDTO(key, size, type) {
      Companion_getInstance_110();
      this.key_1 = key;
      this.size_1 = size;
      this.type_1 = type;
    }
    protoOf(UserAssetDTO).get_key_18j28a_k$ = function () {
      return this.key_1;
    };
    protoOf(UserAssetDTO).get_size_woubt6_k$ = function () {
      return this.size_1;
    };
    protoOf(UserAssetDTO).get_type_wovaf7_k$ = function () {
      return this.type_1;
    };
    protoOf(UserAssetDTO).component1_7eebsc_k$ = function () {
      return this.key_1;
    };
    protoOf(UserAssetDTO).component2_7eebsb_k$ = function () {
      return this.size_1;
    };
    protoOf(UserAssetDTO).component3_7eebsa_k$ = function () {
      return this.type_1;
    };
    protoOf(UserAssetDTO).copy_3oqrj6_k$ = function (key, size, type) {
      return new UserAssetDTO(key, size, type);
    };
    protoOf(UserAssetDTO).copy$default_szfbl_k$ = function (key, size, type, $super) {
      key = key === VOID ? this.key_1 : key;
      size = size === VOID ? this.size_1 : size;
      type = type === VOID ? this.type_1 : type;
      return $super === VOID ? this.copy_3oqrj6_k$(key, size, type) : $super.copy_3oqrj6_k$.call(this, key, size, type);
    };
    protoOf(UserAssetDTO).toString = function () {
      return 'UserAssetDTO(key=' + this.key_1 + ', size=' + this.size_1 + ', type=' + this.type_1 + ')';
    };
    protoOf(UserAssetDTO).hashCode = function () {
      var result = getStringHashCode(this.key_1);
      result = (imul(result, 31) + (this.size_1 == null ? 0 : this.size_1.hashCode())) | 0;
      result = (imul(result, 31) + this.type_1.hashCode()) | 0;
      return result;
    };
    protoOf(UserAssetDTO).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof UserAssetDTO)) return false;
      var tmp0_other_with_cast = other instanceof UserAssetDTO ? other : THROW_CCE();
      if (!(this.key_1 === tmp0_other_with_cast.key_1)) return false;
      if (!equals(this.size_1, tmp0_other_with_cast.size_1)) return false;
      if (!this.type_1.equals(tmp0_other_with_cast.type_1)) return false;
      return true;
    };
    function _get_$cachedSerializer__te6jhj_18($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function AssetSizeDTO$Companion$_anonymous__xrbg8x() {
      var tmp = values_13();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['preview', 'complete'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.model.AssetSizeDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var AssetSizeDTO_PREVIEW_instance;
    var AssetSizeDTO_COMPLETE_instance;
    function Companion_109() {
      Companion_instance_109 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, AssetSizeDTO$Companion$_anonymous__xrbg8x);
    }
    protoOf(Companion_109).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_18(this);
    };
    protoOf(Companion_109).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_109;
    function Companion_getInstance_111() {
      AssetSizeDTO_initEntries();
      if (Companion_instance_109 == null) new Companion_109();
      return Companion_instance_109;
    }
    function values_13() {
      return [AssetSizeDTO_PREVIEW_getInstance(), AssetSizeDTO_COMPLETE_getInstance()];
    }
    function valueOf_13(value) {
      switch (value) {
        case 'PREVIEW':
          return AssetSizeDTO_PREVIEW_getInstance();
        case 'COMPLETE':
          return AssetSizeDTO_COMPLETE_getInstance();
        default:
          AssetSizeDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_13() {
      if ($ENTRIES_13 == null) $ENTRIES_13 = enumEntries(values_13());
      return $ENTRIES_13;
    }
    var AssetSizeDTO_entriesInitialized;
    function AssetSizeDTO_initEntries() {
      if (AssetSizeDTO_entriesInitialized) return Unit_getInstance();
      AssetSizeDTO_entriesInitialized = true;
      AssetSizeDTO_PREVIEW_instance = new AssetSizeDTO('PREVIEW', 0);
      AssetSizeDTO_COMPLETE_instance = new AssetSizeDTO('COMPLETE', 1);
      Companion_getInstance_111();
    }
    var $ENTRIES_13;
    function AssetSizeDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(AssetSizeDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function _get_$cachedSerializer__te6jhj_19($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function UserAssetTypeDTO$Companion$_anonymous__lld7v5() {
      var tmp = values_14();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['image'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.model.UserAssetTypeDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var UserAssetTypeDTO_IMAGE_instance;
    function Companion_110() {
      Companion_instance_110 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, UserAssetTypeDTO$Companion$_anonymous__lld7v5);
    }
    protoOf(Companion_110).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_19(this);
    };
    protoOf(Companion_110).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_110;
    function Companion_getInstance_112() {
      UserAssetTypeDTO_initEntries();
      if (Companion_instance_110 == null) new Companion_110();
      return Companion_instance_110;
    }
    function values_14() {
      return [UserAssetTypeDTO_IMAGE_getInstance()];
    }
    function valueOf_14(value) {
      if (value === 'IMAGE') return UserAssetTypeDTO_IMAGE_getInstance();
      else {
        UserAssetTypeDTO_initEntries();
        THROW_IAE('No enum constant value.');
      }
    }
    function get_entries_14() {
      if ($ENTRIES_14 == null) $ENTRIES_14 = enumEntries(values_14());
      return $ENTRIES_14;
    }
    var UserAssetTypeDTO_entriesInitialized;
    function UserAssetTypeDTO_initEntries() {
      if (UserAssetTypeDTO_entriesInitialized) return Unit_getInstance();
      UserAssetTypeDTO_entriesInitialized = true;
      UserAssetTypeDTO_IMAGE_instance = new UserAssetTypeDTO('IMAGE', 0);
      Companion_getInstance_112();
    }
    var $ENTRIES_14;
    function UserAssetTypeDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(UserAssetTypeDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function AssetSizeDTO_PREVIEW_getInstance() {
      AssetSizeDTO_initEntries();
      return AssetSizeDTO_PREVIEW_instance;
    }
    function AssetSizeDTO_COMPLETE_getInstance() {
      AssetSizeDTO_initEntries();
      return AssetSizeDTO_COMPLETE_instance;
    }
    function UserAssetTypeDTO_IMAGE_getInstance() {
      UserAssetTypeDTO_initEntries();
      return UserAssetTypeDTO_IMAGE_instance;
    }
    function _get_$cachedSerializer__te6jhj_20($this) {
      return $this.$cachedSerializer$delegate_1.get_value_j01efc_k$();
    }
    function SupportedProtocolDTO$Companion$_anonymous__olcj7u() {
      var tmp = values_15();
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = ['proteus', 'mls'];
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$5 = [null, null];
      return createAnnotatedEnumSerializer(
        'com.wire.kalium.network.api.model.SupportedProtocolDTO',
        tmp,
        tmp_0,
        tmp$ret$5,
        null,
      );
    }
    var SupportedProtocolDTO_PROTEUS_instance;
    var SupportedProtocolDTO_MLS_instance;
    function Companion_111() {
      Companion_instance_111 = this;
      var tmp = this;
      var tmp_0 = LazyThreadSafetyMode_PUBLICATION_getInstance();
      tmp.$cachedSerializer$delegate_1 = lazy(tmp_0, SupportedProtocolDTO$Companion$_anonymous__olcj7u);
    }
    protoOf(Companion_111).serializer_9w0wvi_k$ = function () {
      return _get_$cachedSerializer__te6jhj_20(this);
    };
    protoOf(Companion_111).serializer_nv39qc_k$ = function (typeParamsSerializers) {
      return this.serializer_9w0wvi_k$();
    };
    var Companion_instance_111;
    function Companion_getInstance_113() {
      SupportedProtocolDTO_initEntries();
      if (Companion_instance_111 == null) new Companion_111();
      return Companion_instance_111;
    }
    function values_15() {
      return [SupportedProtocolDTO_PROTEUS_getInstance(), SupportedProtocolDTO_MLS_getInstance()];
    }
    function valueOf_15(value) {
      switch (value) {
        case 'PROTEUS':
          return SupportedProtocolDTO_PROTEUS_getInstance();
        case 'MLS':
          return SupportedProtocolDTO_MLS_getInstance();
        default:
          SupportedProtocolDTO_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries_15() {
      if ($ENTRIES_15 == null) $ENTRIES_15 = enumEntries(values_15());
      return $ENTRIES_15;
    }
    var SupportedProtocolDTO_entriesInitialized;
    function SupportedProtocolDTO_initEntries() {
      if (SupportedProtocolDTO_entriesInitialized) return Unit_getInstance();
      SupportedProtocolDTO_entriesInitialized = true;
      SupportedProtocolDTO_PROTEUS_instance = new SupportedProtocolDTO('PROTEUS', 0);
      SupportedProtocolDTO_MLS_instance = new SupportedProtocolDTO('MLS', 1);
      Companion_getInstance_113();
    }
    var $ENTRIES_15;
    function SupportedProtocolDTO(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    protoOf(SupportedProtocolDTO).toString = function () {
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.js.asDynamic' call
      return this.get_name_woqyms_k$().toLowerCase();
    };
    function SupportedProtocolDTO_PROTEUS_getInstance() {
      SupportedProtocolDTO_initEntries();
      return SupportedProtocolDTO_PROTEUS_instance;
    }
    function SupportedProtocolDTO_MLS_getInstance() {
      SupportedProtocolDTO_initEntries();
      return SupportedProtocolDTO_MLS_instance;
    }
    function set_kaliumUtilLogger(_set____db54di) {
      _init_properties_NetworkModelLogger_kt__8maetx();
      kaliumUtilLogger = _set____db54di;
    }
    function get_kaliumUtilLogger() {
      _init_properties_NetworkModelLogger_kt__8maetx();
      return kaliumUtilLogger;
    }
    var kaliumUtilLogger;
    var properties_initialized_NetworkModelLogger_kt_dojcpf;
    function _init_properties_NetworkModelLogger_kt__8maetx() {
      if (!properties_initialized_NetworkModelLogger_kt_dojcpf) {
        properties_initialized_NetworkModelLogger_kt_dojcpf = true;
        kaliumUtilLogger = Companion_getInstance_0().disabled_4hb798_k$();
      }
    }
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
    protoOf($serializer_11).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_12).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_13).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_14).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_15).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_16).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_17).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_18).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_19).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_20).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_21).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_22).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_23).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_24).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_25).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_26).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_27).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_28).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_29).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_30).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_31).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_32).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_33).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_34).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_35).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_36).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_37).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_38).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_39).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_40).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_41).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_42).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_43).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_44).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_45).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_46).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_47).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_48).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_49).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_50).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_51).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_52).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_53).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_54).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_55).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_56).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_57).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_58).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_59).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_60).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_61).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_62).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_63).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_64).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_65).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_66).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_67).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_68).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_69).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_70).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_71).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_72).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_73).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_74).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_75).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_76).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_77).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_78).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_79).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_80).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_81).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_82).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    protoOf($serializer_83).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    //endregion
    return _;
  },
);

//# sourceMappingURL=kalium-network-model.js.map
