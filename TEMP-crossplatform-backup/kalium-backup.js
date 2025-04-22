(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define([
      'exports',
      './kotlin-kotlin-stdlib.js',
      './kotlinx-serialization-kotlinx-serialization-core.js',
      './kalium-protobuf.js',
      './Kotlin-DateTime-library-kotlinx-datetime.js',
      './pbandk-pbandk-runtime.js',
      './Kermit-kermit.js',
    ], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlin-kotlin-stdlib.js'),
      require('./kotlinx-serialization-kotlinx-serialization-core.js'),
      require('./kalium-protobuf.js'),
      require('./Kotlin-DateTime-library-kotlinx-datetime.js'),
      require('./pbandk-pbandk-runtime.js'),
      require('./Kermit-kermit.js'),
    );
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'com.wire:backup'.",
      );
    }
    if (typeof this['kotlinx-serialization-kotlinx-serialization-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'kotlinx-serialization-kotlinx-serialization-core' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-core' is loaded prior to 'com.wire:backup'.",
      );
    }
    if (typeof this['kalium-protobuf'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'kalium-protobuf' was not found. Please, check whether 'kalium-protobuf' is loaded prior to 'com.wire:backup'.",
      );
    }
    if (typeof this['Kotlin-DateTime-library-kotlinx-datetime'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'Kotlin-DateTime-library-kotlinx-datetime' was not found. Please, check whether 'Kotlin-DateTime-library-kotlinx-datetime' is loaded prior to 'com.wire:backup'.",
      );
    }
    if (typeof this['pbandk-pbandk-runtime'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'pbandk-pbandk-runtime' was not found. Please, check whether 'pbandk-pbandk-runtime' is loaded prior to 'com.wire:backup'.",
      );
    }
    if (typeof this['Kermit-kermit'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'Kermit-kermit' was not found. Please, check whether 'Kermit-kermit' is loaded prior to 'com.wire:backup'.",
      );
    }
    root['com.wire:backup'] = factory(
      typeof this['com.wire:backup'] === 'undefined' ? {} : this['com.wire:backup'],
      this['kotlin-kotlin-stdlib'],
      this['kotlinx-serialization-kotlinx-serialization-core'],
      this['kalium-protobuf'],
      this['Kotlin-DateTime-library-kotlinx-datetime'],
      this['pbandk-pbandk-runtime'],
      this['Kermit-kermit'],
    );
  }
})(
  this,
  function (
    _,
    kotlin_kotlin,
    kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core,
    kotlin_com_wire_protobuf,
    kotlin_org_jetbrains_kotlinx_kotlinx_datetime,
    kotlin_pro_streem_pbandk_pbandk_runtime,
    kotlin_co_touchlab_kermit,
  ) {
    'use strict';
    //region block: imports
    var imul = Math.imul;
    var protoOf = kotlin_kotlin.$_$.dc;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var defineProp = kotlin_kotlin.$_$.va;
    var toList = kotlin_kotlin.$_$.f9;
    var classMeta = kotlin_kotlin.$_$.ta;
    var split = kotlin_kotlin.$_$.qe;
    var PluginGeneratedSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.g2;
    var StringSerializer_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.s;
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
    var THROW_IAE = kotlin_kotlin.$_$.rg;
    var enumEntries = kotlin_kotlin.$_$.ia;
    var Unit_getInstance = kotlin_kotlin.$_$.k5;
    var toString = kotlin_kotlin.$_$.wh;
    var toString_0 = kotlin_kotlin.$_$.ic;
    var Enum = kotlin_kotlin.$_$.eg;
    var getKClassFromExpression = kotlin_kotlin.$_$.c;
    var contentEquals = kotlin_kotlin.$_$.r6;
    var contentHashCode = kotlin_kotlin.$_$.s6;
    var getNumberHashCode = kotlin_kotlin.$_$.cb;
    var ExportedQualifiedId = kotlin_com_wire_protobuf.$_$.s;
    var ArrayList_init_$Create$ = kotlin_kotlin.$_$.m;
    var System_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_datetime.$_$.b;
    var BackupInfo = kotlin_com_wire_protobuf.$_$.b;
    var collectionSizeOrDefault = kotlin_kotlin.$_$.p6;
    var ArrayList_init_$Create$_0 = kotlin_kotlin.$_$.l;
    var BackupData = kotlin_com_wire_protobuf.$_$.a;
    var encodeToByteArray = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.x;
    var toHexString = kotlin_kotlin.$_$.ff;
    var println = kotlin_kotlin.$_$.ja;
    var Companion_getInstance = kotlin_com_wire_protobuf.$_$.v;
    var decodeFromByteArray = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.w;
    var printStackTrace = kotlin_kotlin.$_$.qh;
    var noWhenBranchMatchedException = kotlin_kotlin.$_$.oh;
    var IllegalArgumentException_init_$Create$ = kotlin_kotlin.$_$.r1;
    var Location = kotlin_com_wire_protobuf.$_$.p;
    var UNRECOGNIZED = kotlin_com_wire_protobuf.$_$.k;
    var BACKUP_AES_GCM_getInstance = kotlin_com_wire_protobuf.$_$.x;
    var BACKUP_AES_CBC_getInstance = kotlin_com_wire_protobuf.$_$.w;
    var Generic = kotlin_com_wire_protobuf.$_$.e;
    var Video = kotlin_com_wire_protobuf.$_$.g;
    var Image = kotlin_com_wire_protobuf.$_$.f;
    var Audio = kotlin_com_wire_protobuf.$_$.d;
    var Asset = kotlin_com_wire_protobuf.$_$.o;
    var Text = kotlin_com_wire_protobuf.$_$.q;
    var ExportUser = kotlin_com_wire_protobuf.$_$.c;
    var ExportedLocation = kotlin_com_wire_protobuf.$_$.n;
    var ExportedText = kotlin_com_wire_protobuf.$_$.t;
    var Companion_getInstance_0 = kotlin_co_touchlab_kermit.$_$.b;
    var toLong = kotlin_kotlin.$_$.gc;
    var ByteArr = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.d;
    var ExportedGenericMetaData = kotlin_com_wire_protobuf.$_$.l;
    var ExportedVideoMetaData = kotlin_com_wire_protobuf.$_$.u;
    var ExportedImageMetaData = kotlin_com_wire_protobuf.$_$.m;
    var ExportedAudioMetaData = kotlin_com_wire_protobuf.$_$.i;
    var ExportedAsset = kotlin_com_wire_protobuf.$_$.h;
    var ExportedMessage = kotlin_com_wire_protobuf.$_$.r;
    var ExportedConversation = kotlin_com_wire_protobuf.$_$.j;
    var copyToArray = kotlin_kotlin.$_$.h7;
    var numberToLong = kotlin_kotlin.$_$.ac;
    //endregion
    //region block: pre-declaration
    setMetadataFor(MPBackup, 'MPBackup', objectMeta);
    setMetadataFor(BackupData_0, 'BackupData', classMeta);
    setMetadataFor(Companion, 'Companion', objectMeta);
    setMetadataFor($serializer, '$serializer', objectMeta, VOID, [GeneratedSerializer]);
    setMetadataFor(BackupQualifiedId, 'BackupQualifiedId', classMeta, VOID, VOID, VOID, VOID, {
      0: $serializer_getInstance,
    });
    setMetadataFor(BackupUser, 'BackupUser', classMeta);
    setMetadataFor(BackupConversation, 'BackupConversation', classMeta);
    setMetadataFor(BackupMessage, 'BackupMessage', classMeta);
    setMetadataFor(AssetMetadata, 'AssetMetadata', classMeta);
    setMetadataFor(Image_0, 'Image', classMeta, AssetMetadata);
    setMetadataFor(Video_0, 'Video', classMeta, AssetMetadata);
    setMetadataFor(Audio_0, 'Audio', classMeta, AssetMetadata);
    setMetadataFor(Generic_0, 'Generic', classMeta, AssetMetadata);
    setMetadataFor(EncryptionAlgorithm, 'EncryptionAlgorithm', classMeta, Enum);
    setMetadataFor(BackupMessageContent, 'BackupMessageContent', classMeta);
    setMetadataFor(Text_0, 'Text', classMeta, BackupMessageContent);
    setMetadataFor(Asset_0, 'Asset', classMeta, BackupMessageContent);
    setMetadataFor(Location_0, 'Location', classMeta, BackupMessageContent);
    setMetadataFor(BackupMetadata, 'BackupMetadata', classMeta);
    setMetadataFor(CommonMPBackupExporter, 'CommonMPBackupExporter', classMeta);
    setMetadataFor(BackupImportResult, 'BackupImportResult', classMeta);
    setMetadataFor(ParsingFailure, 'ParsingFailure', objectMeta, BackupImportResult);
    setMetadataFor(Success, 'Success', classMeta, BackupImportResult);
    setMetadataFor(CommonMPBackupImporter, 'CommonMPBackupImporter', classMeta);
    setMetadataFor(MPBackupMapper, 'MPBackupMapper', classMeta, VOID, VOID, MPBackupMapper);
    setMetadataFor(BackupDateTime, 'BackupDateTime', classMeta);
    setMetadataFor(MPBackupExporter, 'MPBackupExporter', classMeta, CommonMPBackupExporter);
    setMetadataFor(MPBackupImporter, 'MPBackupImporter', classMeta, CommonMPBackupImporter, VOID, MPBackupImporter);
    //endregion
    function MPBackup() {
      MPBackup_instance = this;
      this.ZIP_ENTRY_DATA = 'data.wmbu';
    }
    protoOf(MPBackup).get_ZIP_ENTRY_DATA_etxqwu_k$ = function () {
      return this.ZIP_ENTRY_DATA;
    };
    var MPBackup_instance;
    function MPBackup_getInstance() {
      if (MPBackup_instance == null) new MPBackup();
      return MPBackup_instance;
    }
    function BackupData_0(metadata, users, conversations, messages) {
      this.metadata = metadata;
      this.users = users;
      this.conversations = conversations;
      this.messages = messages;
    }
    protoOf(BackupData_0).get_metadata_vs95vc_k$ = function () {
      return this.metadata;
    };
    protoOf(BackupData_0).get_users_izsycf_k$ = function () {
      return this.users;
    };
    protoOf(BackupData_0).get_conversations_n3fbjb_k$ = function () {
      return this.conversations;
    };
    protoOf(BackupData_0).get_messages_vl21at_k$ = function () {
      return this.messages;
    };
    protoOf(BackupData_0).get_userList_ytdm1e_k$ = function () {
      return toList(this.users);
    };
    protoOf(BackupData_0).get_conversationList_mdhg96_k$ = function () {
      return toList(this.conversations);
    };
    protoOf(BackupData_0).get_messageList_jrlt0_k$ = function () {
      return toList(this.messages);
    };
    function _get_QUALIFIED_ID_COMPONENT_COUNT__l1996p($this) {
      return $this.QUALIFIED_ID_COMPONENT_COUNT_1;
    }
    function Companion() {
      Companion_instance = this;
      this.QUALIFIED_ID_COMPONENT_COUNT_1 = 2;
    }
    protoOf(Companion).fromEncodedString = function (id) {
      var components = split(id, ['@']);
      if (!(components.get_size_woubt6_k$() === 2)) return null;
      return new BackupQualifiedId(components.get_c1px32_k$(0), components.get_c1px32_k$(1));
    };
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
      var tmp0_serialDesc = new PluginGeneratedSerialDescriptor('com.wire.backup.data.BackupQualifiedId', this, 2);
      tmp0_serialDesc.addElement_5pzumi_k$('id', false);
      tmp0_serialDesc.addElement_5pzumi_k$('domain', false);
      this.descriptor_1 = tmp0_serialDesc;
    }
    protoOf($serializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf($serializer).childSerializers_5ghqw5_k$ = function () {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      return [StringSerializer_getInstance(), StringSerializer_getInstance()];
    };
    protoOf($serializer).deserialize_sy6x50_k$ = function (decoder) {
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
      return BackupQualifiedId_init_$Create$(tmp3_bitMask0, tmp4_local0, tmp5_local1, null);
    };
    protoOf($serializer).serialize_oac2io_k$ = function (encoder, value) {
      var tmp0_desc = this.descriptor_1;
      var tmp1_output = encoder.beginStructure_yljocp_k$(tmp0_desc);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 0, value.id);
      tmp1_output.encodeStringElement_1n5wu2_k$(tmp0_desc, 1, value.domain);
      tmp1_output.endStructure_1xqz0n_k$(tmp0_desc);
    };
    protoOf($serializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_oac2io_k$(encoder, value instanceof BackupQualifiedId ? value : THROW_CCE());
    };
    var $serializer_instance;
    function $serializer_getInstance() {
      if ($serializer_instance == null) new $serializer();
      return $serializer_instance;
    }
    function BackupQualifiedId_init_$Init$(seen1, id, domain, serializationConstructorMarker, $this) {
      if (!(3 === (3 & seen1))) {
        throwMissingFieldException(seen1, 3, $serializer_getInstance().descriptor_1);
      }
      $this.id = id;
      $this.domain = domain;
      return $this;
    }
    function BackupQualifiedId_init_$Create$(seen1, id, domain, serializationConstructorMarker) {
      return BackupQualifiedId_init_$Init$(
        seen1,
        id,
        domain,
        serializationConstructorMarker,
        objectCreate(protoOf(BackupQualifiedId)),
      );
    }
    function BackupQualifiedId(id, domain) {
      Companion_getInstance_1();
      this.id = id;
      this.domain = domain;
    }
    protoOf(BackupQualifiedId).get_id_kntnx8_k$ = function () {
      return this.id;
    };
    protoOf(BackupQualifiedId).get_domain_ch74y5_k$ = function () {
      return this.domain;
    };
    protoOf(BackupQualifiedId).toString = function () {
      return this.id + '@' + this.domain;
    };
    protoOf(BackupQualifiedId).component1_7eebsc_k$ = function () {
      return this.id;
    };
    protoOf(BackupQualifiedId).component2_7eebsb_k$ = function () {
      return this.domain;
    };
    protoOf(BackupQualifiedId).copy_plwnsl_k$ = function (id, domain) {
      return new BackupQualifiedId(id, domain);
    };
    protoOf(BackupQualifiedId).copy = function (id, domain, $super) {
      id = id === VOID ? this.id : id;
      domain = domain === VOID ? this.domain : domain;
      return this.copy_plwnsl_k$(id, domain);
    };
    protoOf(BackupQualifiedId).hashCode = function () {
      var result = getStringHashCode(this.id);
      result = (imul(result, 31) + getStringHashCode(this.domain)) | 0;
      return result;
    };
    protoOf(BackupQualifiedId).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupQualifiedId)) return false;
      var tmp0_other_with_cast = other instanceof BackupQualifiedId ? other : THROW_CCE();
      if (!(this.id === tmp0_other_with_cast.id)) return false;
      if (!(this.domain === tmp0_other_with_cast.domain)) return false;
      return true;
    };
    function BackupUser(id, name, handle) {
      this.id = id;
      this.name = name;
      this.handle = handle;
    }
    protoOf(BackupUser).get_id_kntnx8_k$ = function () {
      return this.id;
    };
    protoOf(BackupUser).get_name_woqyms_k$ = function () {
      return this.name;
    };
    protoOf(BackupUser).get_handle_e5p7ht_k$ = function () {
      return this.handle;
    };
    protoOf(BackupUser).component1_7eebsc_k$ = function () {
      return this.id;
    };
    protoOf(BackupUser).component2_7eebsb_k$ = function () {
      return this.name;
    };
    protoOf(BackupUser).component3_7eebsa_k$ = function () {
      return this.handle;
    };
    protoOf(BackupUser).copy_c7ncco_k$ = function (id, name, handle) {
      return new BackupUser(id, name, handle);
    };
    protoOf(BackupUser).copy = function (id, name, handle, $super) {
      id = id === VOID ? this.id : id;
      name = name === VOID ? this.name : name;
      handle = handle === VOID ? this.handle : handle;
      return this.copy_c7ncco_k$(id, name, handle);
    };
    protoOf(BackupUser).toString = function () {
      return 'BackupUser(id=' + this.id + ', name=' + this.name + ', handle=' + this.handle + ')';
    };
    protoOf(BackupUser).hashCode = function () {
      var result = this.id.hashCode();
      result = (imul(result, 31) + getStringHashCode(this.name)) | 0;
      result = (imul(result, 31) + getStringHashCode(this.handle)) | 0;
      return result;
    };
    protoOf(BackupUser).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupUser)) return false;
      var tmp0_other_with_cast = other instanceof BackupUser ? other : THROW_CCE();
      if (!this.id.equals(tmp0_other_with_cast.id)) return false;
      if (!(this.name === tmp0_other_with_cast.name)) return false;
      if (!(this.handle === tmp0_other_with_cast.handle)) return false;
      return true;
    };
    function BackupConversation(id, name) {
      this.id = id;
      this.name = name;
    }
    protoOf(BackupConversation).get_id_kntnx8_k$ = function () {
      return this.id;
    };
    protoOf(BackupConversation).get_name_woqyms_k$ = function () {
      return this.name;
    };
    protoOf(BackupConversation).component1_7eebsc_k$ = function () {
      return this.id;
    };
    protoOf(BackupConversation).component2_7eebsb_k$ = function () {
      return this.name;
    };
    protoOf(BackupConversation).copy_746q2m_k$ = function (id, name) {
      return new BackupConversation(id, name);
    };
    protoOf(BackupConversation).copy = function (id, name, $super) {
      id = id === VOID ? this.id : id;
      name = name === VOID ? this.name : name;
      return this.copy_746q2m_k$(id, name);
    };
    protoOf(BackupConversation).toString = function () {
      return 'BackupConversation(id=' + this.id + ', name=' + this.name + ')';
    };
    protoOf(BackupConversation).hashCode = function () {
      var result = this.id.hashCode();
      result = (imul(result, 31) + getStringHashCode(this.name)) | 0;
      return result;
    };
    protoOf(BackupConversation).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupConversation)) return false;
      var tmp0_other_with_cast = other instanceof BackupConversation ? other : THROW_CCE();
      if (!this.id.equals(tmp0_other_with_cast.id)) return false;
      if (!(this.name === tmp0_other_with_cast.name)) return false;
      return true;
    };
    function BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, content, webPrimaryKey) {
      webPrimaryKey = webPrimaryKey === VOID ? null : webPrimaryKey;
      this.id = id;
      this.conversationId = conversationId;
      this.senderUserId = senderUserId;
      this.senderClientId = senderClientId;
      this.creationDate = creationDate;
      this.content = content;
      this.webPrimaryKey = webPrimaryKey;
    }
    protoOf(BackupMessage).get_id_kntnx8_k$ = function () {
      return this.id;
    };
    protoOf(BackupMessage).get_conversationId_5n2cxz_k$ = function () {
      return this.conversationId;
    };
    protoOf(BackupMessage).get_senderUserId_jvef50_k$ = function () {
      return this.senderUserId;
    };
    protoOf(BackupMessage).get_senderClientId_9ccias_k$ = function () {
      return this.senderClientId;
    };
    protoOf(BackupMessage).get_creationDate_urjqt2_k$ = function () {
      return this.creationDate;
    };
    protoOf(BackupMessage).get_content_h02jrk_k$ = function () {
      return this.content;
    };
    protoOf(BackupMessage).get_webPrimaryKey_3vqzpk_k$ = function () {
      return this.webPrimaryKey;
    };
    protoOf(BackupMessage).component1_7eebsc_k$ = function () {
      return this.id;
    };
    protoOf(BackupMessage).component2_7eebsb_k$ = function () {
      return this.conversationId;
    };
    protoOf(BackupMessage).component3_7eebsa_k$ = function () {
      return this.senderUserId;
    };
    protoOf(BackupMessage).component4_7eebs9_k$ = function () {
      return this.senderClientId;
    };
    protoOf(BackupMessage).component5_7eebs8_k$ = function () {
      return this.creationDate;
    };
    protoOf(BackupMessage).component6_7eebs7_k$ = function () {
      return this.content;
    };
    protoOf(BackupMessage).component7_7eebs6_k$ = function () {
      return this.webPrimaryKey;
    };
    protoOf(BackupMessage).copy_jnjgel_k$ = function (
      id,
      conversationId,
      senderUserId,
      senderClientId,
      creationDate,
      content,
      webPrimaryKey,
    ) {
      return new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, content, webPrimaryKey);
    };
    protoOf(BackupMessage).copy = function (
      id,
      conversationId,
      senderUserId,
      senderClientId,
      creationDate,
      content,
      webPrimaryKey,
      $super,
    ) {
      id = id === VOID ? this.id : id;
      conversationId = conversationId === VOID ? this.conversationId : conversationId;
      senderUserId = senderUserId === VOID ? this.senderUserId : senderUserId;
      senderClientId = senderClientId === VOID ? this.senderClientId : senderClientId;
      creationDate = creationDate === VOID ? this.creationDate : creationDate;
      content = content === VOID ? this.content : content;
      webPrimaryKey = webPrimaryKey === VOID ? this.webPrimaryKey : webPrimaryKey;
      return this.copy_jnjgel_k$(
        id,
        conversationId,
        senderUserId,
        senderClientId,
        creationDate,
        content,
        webPrimaryKey,
      );
    };
    protoOf(BackupMessage).toString = function () {
      return (
        'BackupMessage(id=' +
        this.id +
        ', conversationId=' +
        this.conversationId +
        ', senderUserId=' +
        this.senderUserId +
        ', senderClientId=' +
        this.senderClientId +
        ', creationDate=' +
        this.creationDate +
        ', content=' +
        this.content +
        ', webPrimaryKey=' +
        this.webPrimaryKey +
        ')'
      );
    };
    protoOf(BackupMessage).hashCode = function () {
      var result = getStringHashCode(this.id);
      result = (imul(result, 31) + this.conversationId.hashCode()) | 0;
      result = (imul(result, 31) + this.senderUserId.hashCode()) | 0;
      result = (imul(result, 31) + getStringHashCode(this.senderClientId)) | 0;
      result = (imul(result, 31) + this.creationDate.hashCode()) | 0;
      result = (imul(result, 31) + hashCode(this.content)) | 0;
      result = (imul(result, 31) + (this.webPrimaryKey == null ? 0 : this.webPrimaryKey)) | 0;
      return result;
    };
    protoOf(BackupMessage).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupMessage)) return false;
      var tmp0_other_with_cast = other instanceof BackupMessage ? other : THROW_CCE();
      if (!(this.id === tmp0_other_with_cast.id)) return false;
      if (!this.conversationId.equals(tmp0_other_with_cast.conversationId)) return false;
      if (!this.senderUserId.equals(tmp0_other_with_cast.senderUserId)) return false;
      if (!(this.senderClientId === tmp0_other_with_cast.senderClientId)) return false;
      if (!this.creationDate.equals(tmp0_other_with_cast.creationDate)) return false;
      if (!equals(this.content, tmp0_other_with_cast.content)) return false;
      if (!(this.webPrimaryKey == tmp0_other_with_cast.webPrimaryKey)) return false;
      return true;
    };
    var EncryptionAlgorithm_AES_GCM_instance;
    var EncryptionAlgorithm_AES_CBC_instance;
    function values() {
      return [EncryptionAlgorithm_AES_GCM_getInstance(), EncryptionAlgorithm_AES_CBC_getInstance()];
    }
    function valueOf(value) {
      switch (value) {
        case 'AES_GCM':
          return EncryptionAlgorithm_AES_GCM_getInstance();
        case 'AES_CBC':
          return EncryptionAlgorithm_AES_CBC_getInstance();
        default:
          EncryptionAlgorithm_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    function get_entries() {
      if ($ENTRIES == null) $ENTRIES = enumEntries(values());
      return $ENTRIES;
    }
    var EncryptionAlgorithm_entriesInitialized;
    function EncryptionAlgorithm_initEntries() {
      if (EncryptionAlgorithm_entriesInitialized) return Unit_getInstance();
      EncryptionAlgorithm_entriesInitialized = true;
      EncryptionAlgorithm_AES_GCM_instance = new EncryptionAlgorithm('AES_GCM', 0);
      EncryptionAlgorithm_AES_CBC_instance = new EncryptionAlgorithm('AES_CBC', 1);
    }
    var $ENTRIES;
    function Image_0(width, height, tag) {
      AssetMetadata.call(this);
      this.width = width;
      this.height = height;
      this.tag = tag;
    }
    protoOf(Image_0).get_width_j0q4yl_k$ = function () {
      return this.width;
    };
    protoOf(Image_0).get_height_e7t92o_k$ = function () {
      return this.height;
    };
    protoOf(Image_0).get_tag_18ivnz_k$ = function () {
      return this.tag;
    };
    protoOf(Image_0).component1_7eebsc_k$ = function () {
      return this.width;
    };
    protoOf(Image_0).component2_7eebsb_k$ = function () {
      return this.height;
    };
    protoOf(Image_0).component3_7eebsa_k$ = function () {
      return this.tag;
    };
    protoOf(Image_0).copy_72eg8e_k$ = function (width, height, tag) {
      return new Image_0(width, height, tag);
    };
    protoOf(Image_0).copy = function (width, height, tag, $super) {
      width = width === VOID ? this.width : width;
      height = height === VOID ? this.height : height;
      tag = tag === VOID ? this.tag : tag;
      return this.copy_72eg8e_k$(width, height, tag);
    };
    protoOf(Image_0).toString = function () {
      return 'Image(width=' + this.width + ', height=' + this.height + ', tag=' + this.tag + ')';
    };
    protoOf(Image_0).hashCode = function () {
      var result = this.width;
      result = (imul(result, 31) + this.height) | 0;
      result = (imul(result, 31) + (this.tag == null ? 0 : getStringHashCode(this.tag))) | 0;
      return result;
    };
    protoOf(Image_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Image_0)) return false;
      var tmp0_other_with_cast = other instanceof Image_0 ? other : THROW_CCE();
      if (!(this.width === tmp0_other_with_cast.width)) return false;
      if (!(this.height === tmp0_other_with_cast.height)) return false;
      if (!(this.tag == tmp0_other_with_cast.tag)) return false;
      return true;
    };
    function Video_0(width, height, duration) {
      AssetMetadata.call(this);
      this.width = width;
      this.height = height;
      this.duration = duration;
    }
    protoOf(Video_0).get_width_j0q4yl_k$ = function () {
      return this.width;
    };
    protoOf(Video_0).get_height_e7t92o_k$ = function () {
      return this.height;
    };
    protoOf(Video_0).get_duration_6a6kpp_k$ = function () {
      return this.duration;
    };
    protoOf(Video_0).component1_7eebsc_k$ = function () {
      return this.width;
    };
    protoOf(Video_0).component2_7eebsb_k$ = function () {
      return this.height;
    };
    protoOf(Video_0).component3_7eebsa_k$ = function () {
      return this.duration;
    };
    protoOf(Video_0).copy_um4d44_k$ = function (width, height, duration) {
      return new Video_0(width, height, duration);
    };
    protoOf(Video_0).copy = function (width, height, duration, $super) {
      width = width === VOID ? this.width : width;
      height = height === VOID ? this.height : height;
      duration = duration === VOID ? this.duration : duration;
      return this.copy_um4d44_k$(width, height, duration);
    };
    protoOf(Video_0).toString = function () {
      return 'Video(width=' + this.width + ', height=' + this.height + ', duration=' + toString(this.duration) + ')';
    };
    protoOf(Video_0).hashCode = function () {
      var result = this.width == null ? 0 : this.width;
      result = (imul(result, 31) + (this.height == null ? 0 : this.height)) | 0;
      result = (imul(result, 31) + (this.duration == null ? 0 : this.duration.hashCode())) | 0;
      return result;
    };
    protoOf(Video_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Video_0)) return false;
      var tmp0_other_with_cast = other instanceof Video_0 ? other : THROW_CCE();
      if (!(this.width == tmp0_other_with_cast.width)) return false;
      if (!(this.height == tmp0_other_with_cast.height)) return false;
      if (!equals(this.duration, tmp0_other_with_cast.duration)) return false;
      return true;
    };
    function Audio_0(normalization, duration) {
      AssetMetadata.call(this);
      this.normalization = normalization;
      this.duration = duration;
    }
    protoOf(Audio_0).get_normalization_odhpcc_k$ = function () {
      return this.normalization;
    };
    protoOf(Audio_0).get_duration_6a6kpp_k$ = function () {
      return this.duration;
    };
    protoOf(Audio_0).component1_7eebsc_k$ = function () {
      return this.normalization;
    };
    protoOf(Audio_0).component2_7eebsb_k$ = function () {
      return this.duration;
    };
    protoOf(Audio_0).copy_33o8yx_k$ = function (normalization, duration) {
      return new Audio_0(normalization, duration);
    };
    protoOf(Audio_0).copy = function (normalization, duration, $super) {
      normalization = normalization === VOID ? this.normalization : normalization;
      duration = duration === VOID ? this.duration : duration;
      return this.copy_33o8yx_k$(normalization, duration);
    };
    protoOf(Audio_0).toString = function () {
      return 'Audio(normalization=' + toString_0(this.normalization) + ', duration=' + toString(this.duration) + ')';
    };
    protoOf(Audio_0).hashCode = function () {
      var result = this.normalization == null ? 0 : hashCode(this.normalization);
      result = (imul(result, 31) + (this.duration == null ? 0 : this.duration.hashCode())) | 0;
      return result;
    };
    protoOf(Audio_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Audio_0)) return false;
      var tmp0_other_with_cast = other instanceof Audio_0 ? other : THROW_CCE();
      if (!equals(this.normalization, tmp0_other_with_cast.normalization)) return false;
      if (!equals(this.duration, tmp0_other_with_cast.duration)) return false;
      return true;
    };
    function Generic_0(name) {
      AssetMetadata.call(this);
      this.name = name;
    }
    protoOf(Generic_0).get_name_woqyms_k$ = function () {
      return this.name;
    };
    protoOf(Generic_0).component1_7eebsc_k$ = function () {
      return this.name;
    };
    protoOf(Generic_0).copy_q202ni_k$ = function (name) {
      return new Generic_0(name);
    };
    protoOf(Generic_0).copy = function (name, $super) {
      name = name === VOID ? this.name : name;
      return this.copy_q202ni_k$(name);
    };
    protoOf(Generic_0).toString = function () {
      return 'Generic(name=' + this.name + ')';
    };
    protoOf(Generic_0).hashCode = function () {
      return this.name == null ? 0 : getStringHashCode(this.name);
    };
    protoOf(Generic_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Generic_0)) return false;
      var tmp0_other_with_cast = other instanceof Generic_0 ? other : THROW_CCE();
      if (!(this.name == tmp0_other_with_cast.name)) return false;
      return true;
    };
    function EncryptionAlgorithm(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function AssetMetadata() {}
    function EncryptionAlgorithm_AES_GCM_getInstance() {
      EncryptionAlgorithm_initEntries();
      return EncryptionAlgorithm_AES_GCM_instance;
    }
    function EncryptionAlgorithm_AES_CBC_getInstance() {
      EncryptionAlgorithm_initEntries();
      return EncryptionAlgorithm_AES_CBC_instance;
    }
    function Text_0(text) {
      BackupMessageContent.call(this);
      this.text = text;
    }
    protoOf(Text_0).get_text_wouvsm_k$ = function () {
      return this.text;
    };
    protoOf(Text_0).component1_7eebsc_k$ = function () {
      return this.text;
    };
    protoOf(Text_0).copy_a35qlh_k$ = function (text) {
      return new Text_0(text);
    };
    protoOf(Text_0).copy = function (text, $super) {
      text = text === VOID ? this.text : text;
      return this.copy_a35qlh_k$(text);
    };
    protoOf(Text_0).toString = function () {
      return 'Text(text=' + this.text + ')';
    };
    protoOf(Text_0).hashCode = function () {
      return getStringHashCode(this.text);
    };
    protoOf(Text_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Text_0)) return false;
      var tmp0_other_with_cast = other instanceof Text_0 ? other : THROW_CCE();
      if (!(this.text === tmp0_other_with_cast.text)) return false;
      return true;
    };
    function Asset_0(mimeType, size, name, otrKey, sha256, assetId, assetToken, assetDomain, encryption, metaData) {
      BackupMessageContent.call(this);
      this.mimeType = mimeType;
      this.size = size;
      this.name = name;
      this.otrKey = otrKey;
      this.sha256 = sha256;
      this.assetId = assetId;
      this.assetToken = assetToken;
      this.assetDomain = assetDomain;
      this.encryption = encryption;
      this.metaData = metaData;
    }
    protoOf(Asset_0).get_mimeType_g7ccbb_k$ = function () {
      return this.mimeType;
    };
    protoOf(Asset_0).get_size_woubt6_k$ = function () {
      return this.size;
    };
    protoOf(Asset_0).get_name_woqyms_k$ = function () {
      return this.name;
    };
    protoOf(Asset_0).get_otrKey_hriosb_k$ = function () {
      return this.otrKey;
    };
    protoOf(Asset_0).get_sha256_jgs8q8_k$ = function () {
      return this.sha256;
    };
    protoOf(Asset_0).get_assetId_ae1upq_k$ = function () {
      return this.assetId;
    };
    protoOf(Asset_0).get_assetToken_evm1rm_k$ = function () {
      return this.assetToken;
    };
    protoOf(Asset_0).get_assetDomain_rgmfl7_k$ = function () {
      return this.assetDomain;
    };
    protoOf(Asset_0).get_encryption_pua0p8_k$ = function () {
      return this.encryption;
    };
    protoOf(Asset_0).get_metaData_vroqag_k$ = function () {
      return this.metaData;
    };
    protoOf(Asset_0).equals = function (other) {
      if (this === other) return true;
      if (other == null ? true : !getKClassFromExpression(this).equals(getKClassFromExpression(other))) return false;
      if (!(other instanceof Asset_0)) THROW_CCE();
      if (!contentEquals(this.otrKey, other.otrKey)) return false;
      if (!contentEquals(this.sha256, other.sha256)) return false;
      if (!(this.assetId === other.assetId)) return false;
      if (!(this.assetToken == other.assetToken)) return false;
      if (!(this.assetDomain == other.assetDomain)) return false;
      if (!equals(this.encryption, other.encryption)) return false;
      if (!equals(this.metaData, other.metaData)) return false;
      return true;
    };
    protoOf(Asset_0).hashCode = function () {
      var result = contentHashCode(this.otrKey);
      result = (imul(31, result) + contentHashCode(this.sha256)) | 0;
      result = (imul(31, result) + getStringHashCode(this.assetId)) | 0;
      var tmp = imul(31, result);
      var tmp0_safe_receiver = this.assetToken;
      var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : getStringHashCode(tmp0_safe_receiver);
      result = (tmp + (tmp1_elvis_lhs == null ? 0 : tmp1_elvis_lhs)) | 0;
      var tmp_0 = imul(31, result);
      var tmp2_safe_receiver = this.assetDomain;
      var tmp3_elvis_lhs = tmp2_safe_receiver == null ? null : getStringHashCode(tmp2_safe_receiver);
      result = (tmp_0 + (tmp3_elvis_lhs == null ? 0 : tmp3_elvis_lhs)) | 0;
      var tmp_1 = imul(31, result);
      var tmp4_safe_receiver = this.encryption;
      var tmp5_elvis_lhs = tmp4_safe_receiver == null ? null : tmp4_safe_receiver.hashCode();
      result = (tmp_1 + (tmp5_elvis_lhs == null ? 0 : tmp5_elvis_lhs)) | 0;
      var tmp_2 = imul(31, result);
      var tmp6_safe_receiver = this.metaData;
      var tmp7_elvis_lhs = tmp6_safe_receiver == null ? null : hashCode(tmp6_safe_receiver);
      result = (tmp_2 + (tmp7_elvis_lhs == null ? 0 : tmp7_elvis_lhs)) | 0;
      return result;
    };
    protoOf(Asset_0).component1_7eebsc_k$ = function () {
      return this.mimeType;
    };
    protoOf(Asset_0).component2_7eebsb_k$ = function () {
      return this.size;
    };
    protoOf(Asset_0).component3_7eebsa_k$ = function () {
      return this.name;
    };
    protoOf(Asset_0).component4_7eebs9_k$ = function () {
      return this.otrKey;
    };
    protoOf(Asset_0).component5_7eebs8_k$ = function () {
      return this.sha256;
    };
    protoOf(Asset_0).component6_7eebs7_k$ = function () {
      return this.assetId;
    };
    protoOf(Asset_0).component7_7eebs6_k$ = function () {
      return this.assetToken;
    };
    protoOf(Asset_0).component8_7eebs5_k$ = function () {
      return this.assetDomain;
    };
    protoOf(Asset_0).component9_7eebs4_k$ = function () {
      return this.encryption;
    };
    protoOf(Asset_0).component10_gazzfo_k$ = function () {
      return this.metaData;
    };
    protoOf(Asset_0).copy_57e20h_k$ = function (
      mimeType,
      size,
      name,
      otrKey,
      sha256,
      assetId,
      assetToken,
      assetDomain,
      encryption,
      metaData,
    ) {
      return new Asset_0(mimeType, size, name, otrKey, sha256, assetId, assetToken, assetDomain, encryption, metaData);
    };
    protoOf(Asset_0).copy = function (
      mimeType,
      size,
      name,
      otrKey,
      sha256,
      assetId,
      assetToken,
      assetDomain,
      encryption,
      metaData,
      $super,
    ) {
      mimeType = mimeType === VOID ? this.mimeType : mimeType;
      size = size === VOID ? this.size : size;
      name = name === VOID ? this.name : name;
      otrKey = otrKey === VOID ? this.otrKey : otrKey;
      sha256 = sha256 === VOID ? this.sha256 : sha256;
      assetId = assetId === VOID ? this.assetId : assetId;
      assetToken = assetToken === VOID ? this.assetToken : assetToken;
      assetDomain = assetDomain === VOID ? this.assetDomain : assetDomain;
      encryption = encryption === VOID ? this.encryption : encryption;
      metaData = metaData === VOID ? this.metaData : metaData;
      return this.copy_57e20h_k$(
        mimeType,
        size,
        name,
        otrKey,
        sha256,
        assetId,
        assetToken,
        assetDomain,
        encryption,
        metaData,
      );
    };
    protoOf(Asset_0).toString = function () {
      return (
        'Asset(mimeType=' +
        this.mimeType +
        ', size=' +
        this.size +
        ', name=' +
        this.name +
        ', otrKey=' +
        toString_0(this.otrKey) +
        ', sha256=' +
        toString_0(this.sha256) +
        ', assetId=' +
        this.assetId +
        ', assetToken=' +
        this.assetToken +
        ', assetDomain=' +
        this.assetDomain +
        ', encryption=' +
        this.encryption +
        ', metaData=' +
        this.metaData +
        ')'
      );
    };
    function Location_0(longitude, latitude, name, zoom) {
      BackupMessageContent.call(this);
      this.longitude = longitude;
      this.latitude = latitude;
      this.name = name;
      this.zoom = zoom;
    }
    protoOf(Location_0).get_longitude_asb1fq_k$ = function () {
      return this.longitude;
    };
    protoOf(Location_0).get_latitude_feukvp_k$ = function () {
      return this.latitude;
    };
    protoOf(Location_0).get_name_woqyms_k$ = function () {
      return this.name;
    };
    protoOf(Location_0).get_zoom_woywws_k$ = function () {
      return this.zoom;
    };
    protoOf(Location_0).component1_7eebsc_k$ = function () {
      return this.longitude;
    };
    protoOf(Location_0).component2_7eebsb_k$ = function () {
      return this.latitude;
    };
    protoOf(Location_0).component3_7eebsa_k$ = function () {
      return this.name;
    };
    protoOf(Location_0).component4_7eebs9_k$ = function () {
      return this.zoom;
    };
    protoOf(Location_0).copy_f0zysj_k$ = function (longitude, latitude, name, zoom) {
      return new Location_0(longitude, latitude, name, zoom);
    };
    protoOf(Location_0).copy = function (longitude, latitude, name, zoom, $super) {
      longitude = longitude === VOID ? this.longitude : longitude;
      latitude = latitude === VOID ? this.latitude : latitude;
      name = name === VOID ? this.name : name;
      zoom = zoom === VOID ? this.zoom : zoom;
      return this.copy_f0zysj_k$(longitude, latitude, name, zoom);
    };
    protoOf(Location_0).toString = function () {
      return (
        'Location(longitude=' +
        this.longitude +
        ', latitude=' +
        this.latitude +
        ', name=' +
        this.name +
        ', zoom=' +
        this.zoom +
        ')'
      );
    };
    protoOf(Location_0).hashCode = function () {
      var result = getNumberHashCode(this.longitude);
      result = (imul(result, 31) + getNumberHashCode(this.latitude)) | 0;
      result = (imul(result, 31) + (this.name == null ? 0 : getStringHashCode(this.name))) | 0;
      result = (imul(result, 31) + (this.zoom == null ? 0 : this.zoom)) | 0;
      return result;
    };
    protoOf(Location_0).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Location_0)) return false;
      var tmp0_other_with_cast = other instanceof Location_0 ? other : THROW_CCE();
      if (!equals(this.longitude, tmp0_other_with_cast.longitude)) return false;
      if (!equals(this.latitude, tmp0_other_with_cast.latitude)) return false;
      if (!(this.name == tmp0_other_with_cast.name)) return false;
      if (!(this.zoom == tmp0_other_with_cast.zoom)) return false;
      return true;
    };
    function BackupMessageContent() {}
    function BackupMetadata(version, userId, creationTime, clientId) {
      this.version = version;
      this.userId = userId;
      this.creationTime = creationTime;
      this.clientId = clientId;
    }
    protoOf(BackupMetadata).get_version_72w4j3_k$ = function () {
      return this.version;
    };
    protoOf(BackupMetadata).get_userId_kl13yn_k$ = function () {
      return this.userId;
    };
    protoOf(BackupMetadata).get_creationTime_uru4d1_k$ = function () {
      return this.creationTime;
    };
    protoOf(BackupMetadata).get_clientId_gs3e9d_k$ = function () {
      return this.clientId;
    };
    protoOf(BackupMetadata).component1_7eebsc_k$ = function () {
      return this.version;
    };
    protoOf(BackupMetadata).component2_7eebsb_k$ = function () {
      return this.userId;
    };
    protoOf(BackupMetadata).component3_7eebsa_k$ = function () {
      return this.creationTime;
    };
    protoOf(BackupMetadata).component4_7eebs9_k$ = function () {
      return this.clientId;
    };
    protoOf(BackupMetadata).copy_ra46ma_k$ = function (version, userId, creationTime, clientId) {
      return new BackupMetadata(version, userId, creationTime, clientId);
    };
    protoOf(BackupMetadata).copy = function (version, userId, creationTime, clientId, $super) {
      version = version === VOID ? this.version : version;
      userId = userId === VOID ? this.userId : userId;
      creationTime = creationTime === VOID ? this.creationTime : creationTime;
      clientId = clientId === VOID ? this.clientId : clientId;
      return this.copy_ra46ma_k$(version, userId, creationTime, clientId);
    };
    protoOf(BackupMetadata).toString = function () {
      return (
        'BackupMetadata(version=' +
        this.version +
        ', userId=' +
        this.userId +
        ', creationTime=' +
        this.creationTime +
        ', clientId=' +
        this.clientId +
        ')'
      );
    };
    protoOf(BackupMetadata).hashCode = function () {
      var result = getStringHashCode(this.version);
      result = (imul(result, 31) + this.userId.hashCode()) | 0;
      result = (imul(result, 31) + this.creationTime.hashCode()) | 0;
      result = (imul(result, 31) + (this.clientId == null ? 0 : getStringHashCode(this.clientId))) | 0;
      return result;
    };
    protoOf(BackupMetadata).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupMetadata)) return false;
      var tmp0_other_with_cast = other instanceof BackupMetadata ? other : THROW_CCE();
      if (!(this.version === tmp0_other_with_cast.version)) return false;
      if (!this.userId.equals(tmp0_other_with_cast.userId)) return false;
      if (!this.creationTime.equals(tmp0_other_with_cast.creationTime)) return false;
      if (!(this.clientId == tmp0_other_with_cast.clientId)) return false;
      return true;
    };
    function toProtoModel(_this__u8e3s4) {
      return new ExportedQualifiedId(_this__u8e3s4.id, _this__u8e3s4.domain);
    }
    function toModel(_this__u8e3s4) {
      return new BackupQualifiedId(_this__u8e3s4.value, _this__u8e3s4.domain);
    }
    function _get_selfUserId__8ett09($this) {
      return $this.selfUserId_1;
    }
    function _get_mapper__jdtnva($this) {
      return $this.mapper_1;
    }
    function _get_allUsers__iaoa84($this) {
      return $this.allUsers_1;
    }
    function _get_allConversations__ih0nes($this) {
      return $this.allConversations_1;
    }
    function _get_allMessages__lmzu3o($this) {
      return $this.allMessages_1;
    }
    function CommonMPBackupExporter(selfUserId) {
      this.selfUserId_1 = selfUserId;
      this.mapper_1 = new MPBackupMapper();
      var tmp = this;
      // Inline function 'kotlin.collections.mutableListOf' call
      tmp.allUsers_1 = ArrayList_init_$Create$();
      var tmp_0 = this;
      // Inline function 'kotlin.collections.mutableListOf' call
      tmp_0.allConversations_1 = ArrayList_init_$Create$();
      var tmp_1 = this;
      // Inline function 'kotlin.collections.mutableListOf' call
      tmp_1.allMessages_1 = ArrayList_init_$Create$();
    }
    protoOf(CommonMPBackupExporter).addUser = function (user) {
      this.allUsers_1.add_utx5q5_k$(user);
    };
    protoOf(CommonMPBackupExporter).addConversation = function (conversation) {
      this.allConversations_1.add_utx5q5_k$(conversation);
    };
    protoOf(CommonMPBackupExporter).addMessage = function (message) {
      this.allMessages_1.add_utx5q5_k$(message);
    };
    protoOf(CommonMPBackupExporter).serialize = function () {
      var tmp = new BackupInfo(
        'Common',
        '1.0',
        toProtoModel(this.selfUserId_1),
        System_getInstance().now_2cba_k$().toEpochMilliseconds_82cfls_k$(),
        'lol',
      );
      // Inline function 'kotlin.collections.map' call
      var this_0 = this.allConversations_1;
      // Inline function 'kotlin.collections.mapTo' call
      var destination = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_0, 10));
      var tmp0_iterator = this_0.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var item = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.backup.dump.CommonMPBackupExporter.serialize.<anonymous>' call
        var tmp$ret$0 = this.mapper_1.mapConversationToProtobuf_sjz8yk_k$(item);
        destination.add_utx5q5_k$(tmp$ret$0);
      }
      var tmp_0 = destination;
      // Inline function 'kotlin.collections.map' call
      var this_1 = this.allMessages_1;
      // Inline function 'kotlin.collections.mapTo' call
      var destination_0 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_1, 10));
      var tmp0_iterator_0 = this_1.iterator_jk1svi_k$();
      while (tmp0_iterator_0.hasNext_bitz1p_k$()) {
        var item_0 = tmp0_iterator_0.next_20eer_k$();
        // Inline function 'com.wire.backup.dump.CommonMPBackupExporter.serialize.<anonymous>' call
        var tmp$ret$3 = this.mapper_1.mapMessageToProtobuf_a1fp5o_k$(item_0);
        destination_0.add_utx5q5_k$(tmp$ret$3);
      }
      var tmp_1 = destination_0;
      // Inline function 'kotlin.collections.map' call
      var this_2 = this.allUsers_1;
      // Inline function 'kotlin.collections.mapTo' call
      var destination_1 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_2, 10));
      var tmp0_iterator_1 = this_2.iterator_jk1svi_k$();
      while (tmp0_iterator_1.hasNext_bitz1p_k$()) {
        var item_1 = tmp0_iterator_1.next_20eer_k$();
        // Inline function 'com.wire.backup.dump.CommonMPBackupExporter.serialize.<anonymous>' call
        var tmp$ret$6 = this.mapper_1.mapUserToProtobuf_k4zmp8_k$(item_1);
        destination_1.add_utx5q5_k$(tmp$ret$6);
      }
      var backupData = new BackupData(tmp, tmp_0, tmp_1, destination_1);
      // Inline function 'kotlin.also' call
      var this_3 = encodeToByteArray(backupData);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.backup.dump.CommonMPBackupExporter.serialize.<anonymous>' call
      println('XPlatform Backup POC. Exported data bytes: ' + toHexString(this_3));
      return this_3;
    };
    function ParsingFailure() {
      ParsingFailure_instance = this;
      BackupImportResult.call(this);
    }
    protoOf(ParsingFailure).toString = function () {
      return 'ParsingFailure';
    };
    protoOf(ParsingFailure).hashCode = function () {
      return 1495002474;
    };
    protoOf(ParsingFailure).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof ParsingFailure)) return false;
      other instanceof ParsingFailure || THROW_CCE();
      return true;
    };
    var ParsingFailure_instance;
    function ParsingFailure_getInstance() {
      if (ParsingFailure_instance == null) new ParsingFailure();
      return ParsingFailure_instance;
    }
    function Success(backupData) {
      BackupImportResult.call(this);
      this.backupData = backupData;
    }
    protoOf(Success).get_backupData_zegp3p_k$ = function () {
      return this.backupData;
    };
    protoOf(Success).component1_7eebsc_k$ = function () {
      return this.backupData;
    };
    protoOf(Success).copy_ikc6zx_k$ = function (backupData) {
      return new Success(backupData);
    };
    protoOf(Success).copy = function (backupData, $super) {
      backupData = backupData === VOID ? this.backupData : backupData;
      return this.copy_ikc6zx_k$(backupData);
    };
    protoOf(Success).toString = function () {
      return 'Success(backupData=' + this.backupData + ')';
    };
    protoOf(Success).hashCode = function () {
      return hashCode(this.backupData);
    };
    protoOf(Success).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Success)) return false;
      var tmp0_other_with_cast = other instanceof Success ? other : THROW_CCE();
      if (!equals(this.backupData, tmp0_other_with_cast.backupData)) return false;
      return true;
    };
    function BackupImportResult() {}
    function _get_mapper__jdtnva_0($this) {
      return $this.mapper_1;
    }
    function CommonMPBackupImporter() {
      this.mapper_1 = new MPBackupMapper();
    }
    protoOf(CommonMPBackupImporter).importBackup = function (data) {
      var tmp;
      try {
        println('XPlatform Backup POC. Imported data bytes: ' + toHexString(data));
        tmp = new Success(
          this.mapper_1.fromProtoToBackupModel_fbxycs_k$(decodeFromByteArray(Companion_getInstance(), data)),
        );
      } catch ($p) {
        var tmp_0;
        if ($p instanceof Error) {
          var e = $p;
          printStackTrace(e);
          println(e);
          tmp_0 = ParsingFailure_getInstance();
        } else {
          throw $p;
        }
        tmp = tmp_0;
      }
      return tmp;
    };
    function fromMessageProtoToBackupModel($this, message) {
      var protoContent = message.content;
      var tmp;
      if (protoContent instanceof Text) {
        tmp = new Text_0(protoContent.get_value_j01efc_k$().content);
      } else {
        if (protoContent instanceof Asset) {
          var tmp_0 = protoContent.get_value_j01efc_k$().mimetype;
          var tmp_1 = protoContent.get_value_j01efc_k$().get_protoSize_1ekskg_k$();
          var tmp_2 = protoContent.get_value_j01efc_k$().name;
          var tmp_3 = protoContent.get_value_j01efc_k$().otrKey.array;
          var tmp_4 = protoContent.get_value_j01efc_k$().sha256.array;
          var tmp_5 = protoContent.get_value_j01efc_k$().assetId;
          var tmp_6 = protoContent.get_value_j01efc_k$().assetToken;
          var tmp_7 = protoContent.get_value_j01efc_k$().assetDomain;
          var tmp0_safe_receiver = protoContent.get_value_j01efc_k$().encryption;
          var tmp_8;
          if (tmp0_safe_receiver == null) {
            tmp_8 = null;
          } else {
            // Inline function 'kotlin.let' call
            // Inline function 'kotlin.contracts.contract' call
            // Inline function 'com.wire.backup.ingest.MPBackupMapper.fromMessageProtoToBackupModel.<anonymous>' call
            var tmp_9;
            if (tmp0_safe_receiver.equals(BACKUP_AES_CBC_getInstance())) {
              tmp_9 = EncryptionAlgorithm_AES_CBC_getInstance();
            } else {
              if (tmp0_safe_receiver.equals(BACKUP_AES_GCM_getInstance())) {
                tmp_9 = EncryptionAlgorithm_AES_GCM_getInstance();
              } else {
                if (tmp0_safe_receiver instanceof UNRECOGNIZED) {
                  tmp_9 = null;
                } else {
                  noWhenBranchMatchedException();
                }
              }
            }
            tmp_8 = tmp_9;
          }
          var tmp_10 = tmp_8;
          var tmp1_safe_receiver = protoContent.get_value_j01efc_k$().metaData;
          var tmp_11;
          if (tmp1_safe_receiver == null) {
            tmp_11 = null;
          } else {
            // Inline function 'kotlin.let' call
            // Inline function 'kotlin.contracts.contract' call
            // Inline function 'com.wire.backup.ingest.MPBackupMapper.fromMessageProtoToBackupModel.<anonymous>' call
            var tmp_12;
            if (tmp1_safe_receiver instanceof Audio) {
              var tmp1_safe_receiver_0 = tmp1_safe_receiver.get_value_j01efc_k$().normalizedLoudness;
              tmp_12 = new Audio_0(
                tmp1_safe_receiver_0 == null ? null : tmp1_safe_receiver_0.array,
                tmp1_safe_receiver.get_value_j01efc_k$().durationInMillis,
              );
            } else {
              if (tmp1_safe_receiver instanceof Image) {
                tmp_12 = new Image_0(
                  tmp1_safe_receiver.get_value_j01efc_k$().width,
                  tmp1_safe_receiver.get_value_j01efc_k$().height,
                  tmp1_safe_receiver.get_value_j01efc_k$().tag,
                );
              } else {
                if (tmp1_safe_receiver instanceof Video) {
                  tmp_12 = new Video_0(
                    tmp1_safe_receiver.get_value_j01efc_k$().width,
                    tmp1_safe_receiver.get_value_j01efc_k$().height,
                    tmp1_safe_receiver.get_value_j01efc_k$().durationInMillis,
                  );
                } else {
                  if (tmp1_safe_receiver instanceof Generic) {
                    tmp_12 = new Generic_0(tmp1_safe_receiver.get_value_j01efc_k$().name);
                  } else {
                    noWhenBranchMatchedException();
                  }
                }
              }
            }
            tmp_11 = tmp_12;
          }
          tmp = new Asset_0(tmp_0, tmp_1, tmp_2, tmp_3, tmp_4, tmp_5, tmp_6, tmp_7, tmp_10, tmp_11);
        } else {
          if (protoContent instanceof Location) {
            tmp = new Location_0(
              protoContent.get_value_j01efc_k$().longitude,
              protoContent.get_value_j01efc_k$().latitude,
              protoContent.get_value_j01efc_k$().name,
              protoContent.get_value_j01efc_k$().zoom,
            );
          } else {
            if (protoContent == null) {
              throw IllegalArgumentException_init_$Create$('Message content cannot be null!');
            } else {
              noWhenBranchMatchedException();
            }
          }
        }
      }
      var content = tmp;
      var tmp_13 = message.id;
      var tmp_14 = toModel(message.conversationId);
      var tmp_15 = toModel(message.senderUserId);
      var tmp_16 = message.senderClientId;
      var tmp_17 = BackupDateTime_0(message.timeIso);
      var tmp2_safe_receiver = message.webPk;
      return new BackupMessage(
        tmp_13,
        tmp_14,
        tmp_15,
        tmp_16,
        tmp_17,
        content,
        tmp2_safe_receiver == null ? null : tmp2_safe_receiver.toInt_1tsl84_k$(),
      );
    }
    function fromConversationProtoToBackupModel($this, conversation) {
      return new BackupConversation(toModel(conversation.id), conversation.name);
    }
    function fromUserProtoToBackupModel($this, user) {
      return new BackupUser(toModel(user.id), user.name, user.handle);
    }
    function MPBackupMapper$mapMessageToProtobuf$lambda($content) {
      return function () {
        return 'Mapping asset message to protobuf: ' + $content.metaData;
      };
    }
    function MPBackupMapper() {}
    protoOf(MPBackupMapper).mapUserToProtobuf_k4zmp8_k$ = function (it) {
      return new ExportUser(toProtoModel(it.id), it.name, it.handle);
    };
    protoOf(MPBackupMapper).mapMessageToProtobuf_a1fp5o_k$ = function (it) {
      var tmp3_id = it.id;
      var tmp4_timeIso = toLongMilliseconds(it.creationDate);
      var tmp5_senderUserId = toProtoModel(it.senderUserId);
      var tmp6_senderClientId = it.senderClientId;
      var tmp7_conversationId = toProtoModel(it.conversationId);
      var content = it.content;
      var tmp;
      if (content instanceof Asset_0) {
        var tmp_0 = Companion_getInstance_0();
        tmp_0.d$default_mucxl2_k$('MPBackupMapper', VOID, MPBackupMapper$mapMessageToProtobuf$lambda(content));
        var tmp_1 = content.mimeType;
        var tmp_2 = toLong(content.size);
        var tmp_3 = content.name;
        var tmp_4 = new ByteArr(content.otrKey);
        var tmp_5 = new ByteArr(content.sha256);
        var tmp_6 = content.assetId;
        var tmp_7 = content.assetToken;
        var tmp_8 = content.assetDomain;
        var tmp1_subject = content.encryption;
        var tmp_9;
        switch (tmp1_subject == null ? -1 : tmp1_subject.get_ordinal_ip24qg_k$()) {
          case 0:
            tmp_9 = BACKUP_AES_GCM_getInstance();
            break;
          case 1:
            tmp_9 = BACKUP_AES_CBC_getInstance();
            break;
          case -1:
            tmp_9 = null;
            break;
          default:
            noWhenBranchMatchedException();
            break;
        }
        var tmp_10 = tmp_9;
        var tmp2_safe_receiver = content.metaData;
        var tmp_11;
        if (tmp2_safe_receiver == null) {
          tmp_11 = null;
        } else {
          // Inline function 'kotlin.let' call
          // Inline function 'kotlin.contracts.contract' call
          // Inline function 'com.wire.backup.ingest.MPBackupMapper.mapMessageToProtobuf.<anonymous>' call
          var tmp_12;
          if (tmp2_safe_receiver instanceof Audio_0) {
            var tmp_13 = tmp2_safe_receiver.duration;
            var tmp1_safe_receiver = tmp2_safe_receiver.normalization;
            var tmp_14;
            if (tmp1_safe_receiver == null) {
              tmp_14 = null;
            } else {
              // Inline function 'kotlin.let' call
              // Inline function 'kotlin.contracts.contract' call
              // Inline function 'com.wire.backup.ingest.MPBackupMapper.mapMessageToProtobuf.<anonymous>.<anonymous>' call
              tmp_14 = new ByteArr(tmp1_safe_receiver);
            }
            tmp_12 = new Audio(new ExportedAudioMetaData(tmp_13, tmp_14));
          } else {
            if (tmp2_safe_receiver instanceof Image_0) {
              tmp_12 = new Image(
                new ExportedImageMetaData(tmp2_safe_receiver.width, tmp2_safe_receiver.height, tmp2_safe_receiver.tag),
              );
            } else {
              if (tmp2_safe_receiver instanceof Video_0) {
                tmp_12 = new Video(
                  new ExportedVideoMetaData(
                    tmp2_safe_receiver.width,
                    tmp2_safe_receiver.height,
                    tmp2_safe_receiver.duration,
                  ),
                );
              } else {
                if (tmp2_safe_receiver instanceof Generic_0) {
                  tmp_12 = new Generic(new ExportedGenericMetaData(tmp2_safe_receiver.name));
                } else {
                  noWhenBranchMatchedException();
                }
              }
            }
          }
          tmp_11 = tmp_12;
        }
        tmp = new Asset(new ExportedAsset(tmp_1, tmp_2, tmp_3, tmp_4, tmp_5, tmp_6, tmp_7, tmp_8, tmp_10, tmp_11));
      } else {
        if (content instanceof Text_0) {
          tmp = new Text(new ExportedText(content.text));
        } else {
          if (content instanceof Location_0) {
            tmp = new Location(new ExportedLocation(content.longitude, content.latitude, content.name, content.zoom));
          } else {
            noWhenBranchMatchedException();
          }
        }
      }
      var tmp8_content = tmp;
      var tmp0_safe_receiver = it.webPrimaryKey;
      var tmp9_webPk = tmp0_safe_receiver == null ? null : toLong(tmp0_safe_receiver);
      return new ExportedMessage(
        tmp3_id,
        tmp4_timeIso,
        tmp5_senderUserId,
        tmp6_senderClientId,
        tmp7_conversationId,
        tmp9_webPk,
        tmp8_content,
      );
    };
    protoOf(MPBackupMapper).mapConversationToProtobuf_sjz8yk_k$ = function (it) {
      return new ExportedConversation(toProtoModel(it.id), it.name);
    };
    protoOf(MPBackupMapper).fromProtoToBackupModel_fbxycs_k$ = function (protobufData) {
      // Inline function 'kotlin.run' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.backup.ingest.MPBackupMapper.fromProtoToBackupModel.<anonymous>' call
      var tmp = new BackupMetadata(
        protobufData.info.version,
        toModel(protobufData.info.userId),
        BackupDateTime_0(protobufData.info.creationTime),
        protobufData.info.clientId,
      );
      // Inline function 'kotlin.collections.toTypedArray' call
      // Inline function 'kotlin.collections.map' call
      var this_0 = protobufData.users;
      // Inline function 'kotlin.collections.mapTo' call
      var destination = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_0, 10));
      var tmp0_iterator = this_0.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var item = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.backup.ingest.MPBackupMapper.fromProtoToBackupModel.<anonymous>.<anonymous>' call
        var tmp$ret$0 = fromUserProtoToBackupModel(this, item);
        destination.add_utx5q5_k$(tmp$ret$0);
      }
      var tmp_0 = copyToArray(destination);
      // Inline function 'kotlin.collections.toTypedArray' call
      // Inline function 'kotlin.collections.map' call
      var this_1 = protobufData.conversations;
      // Inline function 'kotlin.collections.mapTo' call
      var destination_0 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_1, 10));
      var tmp0_iterator_0 = this_1.iterator_jk1svi_k$();
      while (tmp0_iterator_0.hasNext_bitz1p_k$()) {
        var item_0 = tmp0_iterator_0.next_20eer_k$();
        // Inline function 'com.wire.backup.ingest.MPBackupMapper.fromProtoToBackupModel.<anonymous>.<anonymous>' call
        var tmp$ret$4 = fromConversationProtoToBackupModel(this, item_0);
        destination_0.add_utx5q5_k$(tmp$ret$4);
      }
      var tmp_1 = copyToArray(destination_0);
      // Inline function 'kotlin.collections.toTypedArray' call
      // Inline function 'kotlin.collections.map' call
      var this_2 = protobufData.messages;
      // Inline function 'kotlin.collections.mapTo' call
      var destination_1 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_2, 10));
      var tmp0_iterator_1 = this_2.iterator_jk1svi_k$();
      while (tmp0_iterator_1.hasNext_bitz1p_k$()) {
        var item_1 = tmp0_iterator_1.next_20eer_k$();
        // Inline function 'com.wire.backup.ingest.MPBackupMapper.fromProtoToBackupModel.<anonymous>.<anonymous>' call
        var tmp$ret$8 = fromMessageProtoToBackupModel(this, item_1);
        destination_1.add_utx5q5_k$(tmp$ret$8);
      }
      var tmp$ret$11 = copyToArray(destination_1);
      return new BackupData_0(tmp, tmp_0, tmp_1, tmp$ret$11);
    };
    function BackupDateTime(date) {
      this.date = date;
    }
    protoOf(BackupDateTime).get_date_wokkxj_k$ = function () {
      return this.date;
    };
    protoOf(BackupDateTime).equals = function (other) {
      if (this === other) return true;
      if (other == null ? true : !(this.constructor == other.constructor)) return false;
      if (!(other instanceof BackupDateTime)) THROW_CCE();
      return toLongMilliseconds(this).equals(toLongMilliseconds(other));
    };
    protoOf(BackupDateTime).hashCode = function () {
      return hashCode(this.date);
    };
    protoOf(BackupDateTime).component1_7eebsc_k$ = function () {
      return this.date;
    };
    protoOf(BackupDateTime).copy_vsnir_k$ = function (date) {
      return new BackupDateTime(date);
    };
    protoOf(BackupDateTime).copy = function (date, $super) {
      date = date === VOID ? this.date : date;
      return this.copy_vsnir_k$(date);
    };
    protoOf(BackupDateTime).toString = function () {
      return 'BackupDateTime(date=' + this.date + ')';
    };
    function BackupDateTime_0(timestampMillis) {
      return new BackupDateTime(new Date(timestampMillis));
    }
    function toLongMilliseconds(_this__u8e3s4) {
      return numberToLong(_this__u8e3s4.date.getTime());
    }
    function MPBackupExporter(selfUserId) {
      CommonMPBackupExporter.call(this, selfUserId);
    }
    function MPBackupImporter() {
      CommonMPBackupImporter.call(this);
    }
    //region block: post-declaration
    defineProp(protoOf(BackupData_0), 'userList', protoOf(BackupData_0).get_userList_ytdm1e_k$);
    defineProp(protoOf(BackupData_0), 'conversationList', protoOf(BackupData_0).get_conversationList_mdhg96_k$);
    defineProp(protoOf(BackupData_0), 'messageList', protoOf(BackupData_0).get_messageList_jrlt0_k$);
    protoOf($serializer).typeParametersSerializers_fr94fx_k$ = typeParametersSerializers;
    defineProp(protoOf(EncryptionAlgorithm), 'name', protoOf(EncryptionAlgorithm).get_name_woqyms_k$);
    defineProp(protoOf(EncryptionAlgorithm), 'ordinal', protoOf(EncryptionAlgorithm).get_ordinal_ip24qg_k$);
    //endregion
    //region block: exports
    function $jsExportAll$(_) {
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      defineProp($com$wire$backup, 'MPBackup', MPBackup_getInstance);
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$data = $com$wire$backup.data || ($com$wire$backup.data = {});
      $com$wire$backup$data.BackupData = BackupData_0;
      $com$wire$backup$data.BackupQualifiedId = BackupQualifiedId;
      defineProp($com$wire$backup$data.BackupQualifiedId, 'Companion', Companion_getInstance_1);
      $com$wire$backup$data.BackupUser = BackupUser;
      $com$wire$backup$data.BackupConversation = BackupConversation;
      $com$wire$backup$data.BackupMessage = BackupMessage;
      $com$wire$backup$data.BackupMessageContent = BackupMessageContent;
      $com$wire$backup$data.BackupMessageContent.Text = Text_0;
      $com$wire$backup$data.BackupMessageContent.Asset = Asset_0;
      $com$wire$backup$data.BackupMessageContent.Asset.EncryptionAlgorithm = EncryptionAlgorithm;
      $com$wire$backup$data.BackupMessageContent.Asset.EncryptionAlgorithm.values = values;
      $com$wire$backup$data.BackupMessageContent.Asset.EncryptionAlgorithm.valueOf = valueOf;
      defineProp(
        $com$wire$backup$data.BackupMessageContent.Asset.EncryptionAlgorithm,
        'AES_GCM',
        EncryptionAlgorithm_AES_GCM_getInstance,
      );
      defineProp(
        $com$wire$backup$data.BackupMessageContent.Asset.EncryptionAlgorithm,
        'AES_CBC',
        EncryptionAlgorithm_AES_CBC_getInstance,
      );
      $com$wire$backup$data.BackupMessageContent.Asset.AssetMetadata = AssetMetadata;
      $com$wire$backup$data.BackupMessageContent.Asset.AssetMetadata.Image = Image_0;
      $com$wire$backup$data.BackupMessageContent.Asset.AssetMetadata.Video = Video_0;
      $com$wire$backup$data.BackupMessageContent.Asset.AssetMetadata.Audio = Audio_0;
      $com$wire$backup$data.BackupMessageContent.Asset.AssetMetadata.Generic = Generic_0;
      $com$wire$backup$data.BackupMessageContent.Location = Location_0;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$data = $com$wire$backup.data || ($com$wire$backup.data = {});
      $com$wire$backup$data.BackupMetadata = BackupMetadata;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$dump = $com$wire$backup.dump || ($com$wire$backup.dump = {});
      $com$wire$backup$dump.CommonMPBackupExporter = CommonMPBackupExporter;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$ingest = $com$wire$backup.ingest || ($com$wire$backup.ingest = {});
      $com$wire$backup$ingest.BackupImportResult = BackupImportResult;
      defineProp($com$wire$backup$ingest.BackupImportResult, 'ParsingFailure', ParsingFailure_getInstance);
      $com$wire$backup$ingest.BackupImportResult.Success = Success;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$ingest = $com$wire$backup.ingest || ($com$wire$backup.ingest = {});
      $com$wire$backup$ingest.CommonMPBackupImporter = CommonMPBackupImporter;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$data = $com$wire$backup.data || ($com$wire$backup.data = {});
      $com$wire$backup$data.BackupDateTime = BackupDateTime;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$dump = $com$wire$backup.dump || ($com$wire$backup.dump = {});
      $com$wire$backup$dump.MPBackupExporter = MPBackupExporter;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$ingest = $com$wire$backup.ingest || ($com$wire$backup.ingest = {});
      $com$wire$backup$ingest.MPBackupImporter = MPBackupImporter;
    }
    $jsExportAll$(_);
    kotlin_pro_streem_pbandk_pbandk_runtime.$jsExportAll$(_);
    kotlin_com_wire_protobuf.$jsExportAll$(_);
    //endregion
    return _;
  },
);

//# sourceMappingURL=kalium-backup.js.map
