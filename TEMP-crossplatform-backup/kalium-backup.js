(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define([
      'exports',
      './kotlin-kotlin-stdlib.js',
      './kalium-protobuf.js',
      './Kotlin-DateTime-library-kotlinx-datetime.js',
      './pbandk-pbandk-runtime.js',
    ], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlin-kotlin-stdlib.js'),
      require('./kalium-protobuf.js'),
      require('./Kotlin-DateTime-library-kotlinx-datetime.js'),
      require('./pbandk-pbandk-runtime.js'),
    );
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'com.wire:backup'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'com.wire:backup'.",
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
    root['com.wire:backup'] = factory(
      typeof this['com.wire:backup'] === 'undefined' ? {} : this['com.wire:backup'],
      this['kotlin-kotlin-stdlib'],
      this['kalium-protobuf'],
      this['Kotlin-DateTime-library-kotlinx-datetime'],
      this['pbandk-pbandk-runtime'],
    );
  }
})(
  this,
  function (
    _,
    kotlin_kotlin,
    kotlin_com_wire_protobuf,
    kotlin_org_jetbrains_kotlinx_kotlinx_datetime,
    kotlin_pro_streem_pbandk_pbandk_runtime,
  ) {
    'use strict';
    //region block: imports
    var imul = Math.imul;
    var protoOf = kotlin_kotlin.$_$.dc;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var defineProp = kotlin_kotlin.$_$.va;
    var classMeta = kotlin_kotlin.$_$.ta;
    var VOID = kotlin_kotlin.$_$.f;
    var getStringHashCode = kotlin_kotlin.$_$.eb;
    var THROW_CCE = kotlin_kotlin.$_$.rg;
    var hashCode = kotlin_kotlin.$_$.fb;
    var equals = kotlin_kotlin.$_$.xa;
    var ExportedQualifiedId = kotlin_com_wire_protobuf.$_$.g;
    var ArrayList_init_$Create$ = kotlin_kotlin.$_$.m;
    var System_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_datetime.$_$.b;
    var BackupInfo = kotlin_com_wire_protobuf.$_$.b;
    var collectionSizeOrDefault = kotlin_kotlin.$_$.p6;
    var ArrayList_init_$Create$_0 = kotlin_kotlin.$_$.l;
    var ExportedConversation = kotlin_com_wire_protobuf.$_$.d;
    var noWhenBranchMatchedException = kotlin_kotlin.$_$.ph;
    var ExportedText = kotlin_com_wire_protobuf.$_$.h;
    var Text = kotlin_com_wire_protobuf.$_$.e;
    var ExportedMessage = kotlin_com_wire_protobuf.$_$.f;
    var ExportUser = kotlin_com_wire_protobuf.$_$.c;
    var BackupData = kotlin_com_wire_protobuf.$_$.a;
    var encodeToByteArray = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.x;
    var toHexString = kotlin_kotlin.$_$.ff;
    var println = kotlin_kotlin.$_$.ja;
    var Companion_getInstance = kotlin_com_wire_protobuf.$_$.i;
    var decodeFromByteArray = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.w;
    var copyToArray = kotlin_kotlin.$_$.h7;
    var NotImplementedError = kotlin_kotlin.$_$.mg;
    var printStackTrace = kotlin_kotlin.$_$.rh;
    var Exception = kotlin_kotlin.$_$.gg;
    var numberToLong = kotlin_kotlin.$_$.ac;
    //endregion
    //region block: pre-declaration
    setMetadataFor(MPBackup, 'MPBackup', objectMeta);
    setMetadataFor(BackupData_0, 'BackupData', classMeta);
    setMetadataFor(BackupQualifiedId, 'BackupQualifiedId', classMeta);
    setMetadataFor(BackupUser, 'BackupUser', classMeta);
    setMetadataFor(BackupConversation, 'BackupConversation', classMeta);
    setMetadataFor(BackupMessage, 'BackupMessage', classMeta);
    setMetadataFor(BackupMessageContent, 'BackupMessageContent', classMeta);
    setMetadataFor(Text_0, 'Text', classMeta, BackupMessageContent);
    setMetadataFor(Asset, 'Asset', classMeta, BackupMessageContent);
    setMetadataFor(BackupMetadata, 'BackupMetadata', classMeta);
    setMetadataFor(MPBackupExporter, 'MPBackupExporter', classMeta);
    setMetadataFor(BackupImportResult, 'BackupImportResult', classMeta);
    setMetadataFor(ParsingFailure, 'ParsingFailure', objectMeta, BackupImportResult);
    setMetadataFor(Success, 'Success', classMeta, BackupImportResult);
    setMetadataFor(MPBackupImporter, 'MPBackupImporter', classMeta);
    setMetadataFor(BackupDateTime, 'BackupDateTime', classMeta);
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
    function BackupQualifiedId(id, domain) {
      this.id = id;
      this.domain = domain;
    }
    protoOf(BackupQualifiedId).get_id_kntnx8_k$ = function () {
      return this.id;
    };
    protoOf(BackupQualifiedId).get_domain_ch74y5_k$ = function () {
      return this.domain;
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
    protoOf(BackupQualifiedId).toString = function () {
      return 'BackupQualifiedId(id=' + this.id + ', domain=' + this.domain + ')';
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
    function BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, content) {
      this.id = id;
      this.conversationId = conversationId;
      this.senderUserId = senderUserId;
      this.senderClientId = senderClientId;
      this.creationDate = creationDate;
      this.content = content;
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
    protoOf(BackupMessage).copy_gmp0uw_k$ = function (
      id,
      conversationId,
      senderUserId,
      senderClientId,
      creationDate,
      content,
    ) {
      return new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, content);
    };
    protoOf(BackupMessage).copy = function (
      id,
      conversationId,
      senderUserId,
      senderClientId,
      creationDate,
      content,
      $super,
    ) {
      id = id === VOID ? this.id : id;
      conversationId = conversationId === VOID ? this.conversationId : conversationId;
      senderUserId = senderUserId === VOID ? this.senderUserId : senderUserId;
      senderClientId = senderClientId === VOID ? this.senderClientId : senderClientId;
      creationDate = creationDate === VOID ? this.creationDate : creationDate;
      content = content === VOID ? this.content : content;
      return this.copy_gmp0uw_k$(id, conversationId, senderUserId, senderClientId, creationDate, content);
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
      return true;
    };
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
    function Asset(TODO) {
      BackupMessageContent.call(this);
      this.TODO = TODO;
    }
    protoOf(Asset).get_TODO_wo9ymn_k$ = function () {
      return this.TODO;
    };
    protoOf(Asset).component1_7eebsc_k$ = function () {
      return this.TODO;
    };
    protoOf(Asset).copy_a35qlh_k$ = function (TODO) {
      return new Asset(TODO);
    };
    protoOf(Asset).copy = function (TODO, $super) {
      TODO = TODO === VOID ? this.TODO : TODO;
      return this.copy_a35qlh_k$(TODO);
    };
    protoOf(Asset).toString = function () {
      return 'Asset(TODO=' + this.TODO + ')';
    };
    protoOf(Asset).hashCode = function () {
      return getStringHashCode(this.TODO);
    };
    protoOf(Asset).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof Asset)) return false;
      var tmp0_other_with_cast = other instanceof Asset ? other : THROW_CCE();
      if (!(this.TODO === tmp0_other_with_cast.TODO)) return false;
      return true;
    };
    function BackupMessageContent() {}
    function BackupMetadata(platform, version, userId, creationTime, clientId) {
      this.platform = platform;
      this.version = version;
      this.userId = userId;
      this.creationTime = creationTime;
      this.clientId = clientId;
    }
    protoOf(BackupMetadata).get_platform_ssr7o_k$ = function () {
      return this.platform;
    };
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
      return this.platform;
    };
    protoOf(BackupMetadata).component2_7eebsb_k$ = function () {
      return this.version;
    };
    protoOf(BackupMetadata).component3_7eebsa_k$ = function () {
      return this.userId;
    };
    protoOf(BackupMetadata).component4_7eebs9_k$ = function () {
      return this.creationTime;
    };
    protoOf(BackupMetadata).component5_7eebs8_k$ = function () {
      return this.clientId;
    };
    protoOf(BackupMetadata).copy_dbcwem_k$ = function (platform, version, userId, creationTime, clientId) {
      return new BackupMetadata(platform, version, userId, creationTime, clientId);
    };
    protoOf(BackupMetadata).copy = function (platform, version, userId, creationTime, clientId, $super) {
      platform = platform === VOID ? this.platform : platform;
      version = version === VOID ? this.version : version;
      userId = userId === VOID ? this.userId : userId;
      creationTime = creationTime === VOID ? this.creationTime : creationTime;
      clientId = clientId === VOID ? this.clientId : clientId;
      return this.copy_dbcwem_k$(platform, version, userId, creationTime, clientId);
    };
    protoOf(BackupMetadata).toString = function () {
      return (
        'BackupMetadata(platform=' +
        this.platform +
        ', version=' +
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
      var result = getStringHashCode(this.platform);
      result = (imul(result, 31) + getStringHashCode(this.version)) | 0;
      result = (imul(result, 31) + this.userId.hashCode()) | 0;
      result = (imul(result, 31) + this.creationTime.hashCode()) | 0;
      result = (imul(result, 31) + (this.clientId == null ? 0 : getStringHashCode(this.clientId))) | 0;
      return result;
    };
    protoOf(BackupMetadata).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupMetadata)) return false;
      var tmp0_other_with_cast = other instanceof BackupMetadata ? other : THROW_CCE();
      if (!(this.platform === tmp0_other_with_cast.platform)) return false;
      if (!(this.version === tmp0_other_with_cast.version)) return false;
      if (!this.userId.equals(tmp0_other_with_cast.userId)) return false;
      if (!this.creationTime.equals(tmp0_other_with_cast.creationTime)) return false;
      if (!(this.clientId == tmp0_other_with_cast.clientId)) return false;
      return true;
    };
    function isWebBackup(_this__u8e3s4) {
      return _this__u8e3s4.platform === 'Web';
    }
    function toProtoModel(_this__u8e3s4) {
      return new ExportedQualifiedId(_this__u8e3s4.id, _this__u8e3s4.domain);
    }
    function toModel(_this__u8e3s4) {
      return new BackupQualifiedId(_this__u8e3s4.value, _this__u8e3s4.domain);
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
    function MPBackupExporter(selfUserId) {
      this.selfUserId = selfUserId;
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
    protoOf(MPBackupExporter).get_selfUserId_vigw8r_k$ = function () {
      return this.selfUserId;
    };
    protoOf(MPBackupExporter).addUser = function (user) {
      this.allUsers_1.add_utx5q5_k$(user);
    };
    protoOf(MPBackupExporter).addConversation = function (conversation) {
      this.allConversations_1.add_utx5q5_k$(conversation);
    };
    protoOf(MPBackupExporter).addMessage = function (message) {
      this.allMessages_1.add_utx5q5_k$(message);
    };
    protoOf(MPBackupExporter).serialize = function () {
      var tmp = new BackupInfo(
        'Common',
        '1.0',
        toProtoModel(this.selfUserId),
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
        // Inline function 'com.wire.backup.dump.MPBackupExporter.serialize.<anonymous>' call
        var tmp$ret$0 = new ExportedConversation(toProtoModel(item.id), item.name);
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
        // Inline function 'com.wire.backup.dump.MPBackupExporter.serialize.<anonymous>' call
        var tmp_1 = item_0.id;
        var tmp_2 = toLongMilliseconds(item_0.creationDate);
        var tmp_3 = toProtoModel(item_0.senderUserId);
        var tmp_4 = item_0.senderClientId;
        var tmp_5 = toProtoModel(item_0.conversationId);
        var content = item_0.content;
        var tmp_6;
        if (content instanceof Asset) {
          tmp_6 = new Text(new ExportedText('FAKE ASSET'));
        } else {
          if (content instanceof Text_0) {
            tmp_6 = new Text(new ExportedText(content.text));
          } else {
            noWhenBranchMatchedException();
          }
        }
        var tmp$ret$3 = new ExportedMessage(tmp_1, tmp_2, tmp_3, tmp_4, tmp_5, tmp_6);
        destination_0.add_utx5q5_k$(tmp$ret$3);
      }
      var tmp_7 = destination_0;
      // Inline function 'kotlin.collections.map' call
      var this_2 = this.allUsers_1;
      // Inline function 'kotlin.collections.mapTo' call
      var destination_1 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_2, 10));
      var tmp0_iterator_1 = this_2.iterator_jk1svi_k$();
      while (tmp0_iterator_1.hasNext_bitz1p_k$()) {
        var item_1 = tmp0_iterator_1.next_20eer_k$();
        // Inline function 'com.wire.backup.dump.MPBackupExporter.serialize.<anonymous>' call
        var tmp$ret$6 = new ExportUser(toProtoModel(item_1.id), item_1.name, item_1.handle);
        destination_1.add_utx5q5_k$(tmp$ret$6);
      }
      var backupData = new BackupData(tmp, tmp_0, tmp_7, destination_1);
      // Inline function 'kotlin.also' call
      var this_3 = encodeToByteArray(backupData);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.backup.dump.MPBackupExporter.serialize.<anonymous>' call
      println('!!!BACKUP: ' + toHexString(this_3));
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
    function MPBackupImporter(selfUserDomain) {
      this.selfUserDomain = selfUserDomain;
    }
    protoOf(MPBackupImporter).get_selfUserDomain_nzmq5g_k$ = function () {
      return this.selfUserDomain;
    };
    protoOf(MPBackupImporter).import = function (data) {
      var tmp;
      try {
        println('!!!BACKUP: ' + toHexString(data));
        // Inline function 'kotlin.run' call
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'com.wire.backup.ingest.MPBackupImporter.import.<anonymous>' call
        var $this$run = decodeFromByteArray(Companion_getInstance(), data);
        var tmp_0 = new BackupMetadata(
          $this$run.info.platform,
          $this$run.info.version,
          toModel($this$run.info.userId),
          BackupDateTime_0($this$run.info.creationTime),
          $this$run.info.clientId,
        );
        // Inline function 'kotlin.collections.toTypedArray' call
        // Inline function 'kotlin.collections.map' call
        var this_0 = $this$run.users;
        // Inline function 'kotlin.collections.mapTo' call
        var destination = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_0, 10));
        var tmp0_iterator = this_0.iterator_jk1svi_k$();
        while (tmp0_iterator.hasNext_bitz1p_k$()) {
          var item = tmp0_iterator.next_20eer_k$();
          // Inline function 'com.wire.backup.ingest.MPBackupImporter.import.<anonymous>.<anonymous>' call
          var tmp$ret$0 = new BackupUser(toModel(item.id), item.name, item.handle);
          destination.add_utx5q5_k$(tmp$ret$0);
        }
        var tmp_1 = copyToArray(destination);
        // Inline function 'kotlin.collections.toTypedArray' call
        // Inline function 'kotlin.collections.map' call
        var this_1 = $this$run.conversations;
        // Inline function 'kotlin.collections.mapTo' call
        var destination_0 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_1, 10));
        var tmp0_iterator_0 = this_1.iterator_jk1svi_k$();
        while (tmp0_iterator_0.hasNext_bitz1p_k$()) {
          var item_0 = tmp0_iterator_0.next_20eer_k$();
          // Inline function 'com.wire.backup.ingest.MPBackupImporter.import.<anonymous>.<anonymous>' call
          var tmp$ret$4 = new BackupConversation(toModel(item_0.id), item_0.name);
          destination_0.add_utx5q5_k$(tmp$ret$4);
        }
        var tmp_2 = copyToArray(destination_0);
        // Inline function 'kotlin.collections.toTypedArray' call
        // Inline function 'kotlin.collections.map' call
        var this_2 = $this$run.messages;
        // Inline function 'kotlin.collections.mapTo' call
        var destination_1 = ArrayList_init_$Create$_0(collectionSizeOrDefault(this_2, 10));
        var tmp0_iterator_1 = this_2.iterator_jk1svi_k$();
        while (tmp0_iterator_1.hasNext_bitz1p_k$()) {
          var item_1 = tmp0_iterator_1.next_20eer_k$();
          // Inline function 'com.wire.backup.ingest.MPBackupImporter.import.<anonymous>.<anonymous>' call
          var proContent = item_1.content;
          var tmp_3;
          if (proContent instanceof Text) {
            tmp_3 = new Text_0(proContent.get_value_j01efc_k$().content);
          } else {
            if (proContent == null) {
              throw new NotImplementedError();
            } else {
              noWhenBranchMatchedException();
            }
          }
          var content = tmp_3;
          var tmp$ret$8 = new BackupMessage(
            item_1.id,
            toModel(item_1.conversationId),
            toModel(item_1.senderUserId),
            item_1.senderClientId,
            BackupDateTime_0(item_1.timeIso),
            content,
          );
          destination_1.add_utx5q5_k$(tmp$ret$8);
        }
        var tmp$ret$11 = copyToArray(destination_1);
        var tmp$ret$13 = new BackupData_0(tmp_0, tmp_1, tmp_2, tmp$ret$11);
        tmp = new Success(tmp$ret$13);
      } catch ($p) {
        var tmp_4;
        if ($p instanceof Exception) {
          var e = $p;
          printStackTrace(e);
          println(e);
          tmp_4 = ParsingFailure_getInstance();
        } else {
          throw $p;
        }
        tmp = tmp_4;
      }
      return tmp;
    };
    function BackupDateTime(date) {
      this.date = date;
    }
    protoOf(BackupDateTime).get_date_wokkxj_k$ = function () {
      return this.date;
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
    protoOf(BackupDateTime).hashCode = function () {
      return hashCode(this.date);
    };
    protoOf(BackupDateTime).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof BackupDateTime)) return false;
      var tmp0_other_with_cast = other instanceof BackupDateTime ? other : THROW_CCE();
      if (!equals(this.date, tmp0_other_with_cast.date)) return false;
      return true;
    };
    function BackupDateTime_0(timestamp) {
      return new BackupDateTime(new Date(timestamp));
    }
    function toLongMilliseconds(_this__u8e3s4) {
      return numberToLong(_this__u8e3s4.date.getTime());
    }
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
      $com$wire$backup$data.BackupUser = BackupUser;
      $com$wire$backup$data.BackupConversation = BackupConversation;
      $com$wire$backup$data.BackupMessage = BackupMessage;
      $com$wire$backup$data.BackupMessageContent = BackupMessageContent;
      $com$wire$backup$data.BackupMessageContent.Text = Text_0;
      $com$wire$backup$data.BackupMessageContent.Asset = Asset;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$data = $com$wire$backup.data || ($com$wire$backup.data = {});
      $com$wire$backup$data.BackupMetadata = BackupMetadata;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$dump = $com$wire$backup.dump || ($com$wire$backup.dump = {});
      $com$wire$backup$dump.MPBackupExporter = MPBackupExporter;
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
      $com$wire$backup$ingest.MPBackupImporter = MPBackupImporter;
      var $com = _.com || (_.com = {});
      var $com$wire = $com.wire || ($com.wire = {});
      var $com$wire$backup = $com$wire.backup || ($com$wire.backup = {});
      var $com$wire$backup$data = $com$wire$backup.data || ($com$wire$backup.data = {});
      $com$wire$backup$data.BackupDateTime = BackupDateTime;
    }
    $jsExportAll$(_);
    kotlin_pro_streem_pbandk_pbandk_runtime.$jsExportAll$(_);
    kotlin_com_wire_protobuf.$jsExportAll$(_);
    //endregion
    return _;
  },
);

//# sourceMappingURL=kalium-backup.js.map
