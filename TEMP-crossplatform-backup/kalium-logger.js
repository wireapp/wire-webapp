(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './Kermit-kermit-core.js', './kotlin-kotlin-stdlib.js', './Kermit-kermit.js'], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./Kermit-kermit-core.js'),
      require('./kotlin-kotlin-stdlib.js'),
      require('./Kermit-kermit.js'),
    );
  else {
    if (typeof this['Kermit-kermit-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-logger'. Its dependency 'Kermit-kermit-core' was not found. Please, check whether 'Kermit-kermit-core' is loaded prior to 'kalium-logger'.",
      );
    }
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-logger'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'kalium-logger'.",
      );
    }
    if (typeof this['Kermit-kermit'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-logger'. Its dependency 'Kermit-kermit' was not found. Please, check whether 'Kermit-kermit' is loaded prior to 'kalium-logger'.",
      );
    }
    root['kalium-logger'] = factory(
      typeof this['kalium-logger'] === 'undefined' ? {} : this['kalium-logger'],
      this['Kermit-kermit-core'],
      this['kotlin-kotlin-stdlib'],
      this['Kermit-kermit'],
    );
  }
})(this, function (_, kotlin_co_touchlab_kermit_core, kotlin_kotlin, kotlin_co_touchlab_kermit) {
  'use strict';
  //region block: imports
  var imul = Math.imul;
  var platformLogWriter = kotlin_co_touchlab_kermit_core.$_$.d;
  var listOf = kotlin_kotlin.$_$.f8;
  var protoOf = kotlin_kotlin.$_$.dc;
  var objectMeta = kotlin_kotlin.$_$.cc;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var MutableLoggerConfig = kotlin_co_touchlab_kermit_core.$_$.b;
  var classMeta = kotlin_kotlin.$_$.ta;
  var VOID = kotlin_kotlin.$_$.f;
  var getStringHashCode = kotlin_kotlin.$_$.eb;
  var THROW_CCE = kotlin_kotlin.$_$.qg;
  var hashCode = kotlin_kotlin.$_$.fb;
  var equals = kotlin_kotlin.$_$.xa;
  var Regex_init_$Create$ = kotlin_kotlin.$_$.d1;
  var substringBefore = kotlin_kotlin.$_$.xe;
  var substringAfterLast = kotlin_kotlin.$_$.ue;
  var split = kotlin_kotlin.$_$.qe;
  var THROW_IAE = kotlin_kotlin.$_$.rg;
  var enumEntries = kotlin_kotlin.$_$.ia;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var Enum = kotlin_kotlin.$_$.eg;
  var objectCreate = kotlin_kotlin.$_$.bc;
  var Logger = kotlin_co_touchlab_kermit.$_$.a;
  var noWhenBranchMatchedException = kotlin_kotlin.$_$.oh;
  var Severity_Verbose_getInstance = kotlin_co_touchlab_kermit_core.$_$.i;
  var Severity_Debug_getInstance = kotlin_co_touchlab_kermit_core.$_$.f;
  var Severity_Info_getInstance = kotlin_co_touchlab_kermit_core.$_$.h;
  var Severity_Warn_getInstance = kotlin_co_touchlab_kermit_core.$_$.j;
  var Severity_Error_getInstance = kotlin_co_touchlab_kermit_core.$_$.g;
  var Severity_Assert_getInstance = kotlin_co_touchlab_kermit_core.$_$.e;
  //endregion
  //region block: pre-declaration
  setMetadataFor(Companion, 'Companion', objectMeta);
  setMetadataFor(KaliumLogger$Config$mutableKermitConfig$1, VOID, classMeta, VOID, [MutableLoggerConfig]);
  setMetadataFor(Tag, 'Tag', classMeta);
  setMetadataFor(Text, 'Text', classMeta, Tag);
  setMetadataFor(UserClientText, 'UserClientText', classMeta, Tag);
  setMetadataFor(Companion_0, 'Companion', objectMeta);
  setMetadataFor(ApplicationFlow, 'ApplicationFlow', classMeta, Enum);
  setMetadataFor(Config, 'Config', classMeta);
  setMetadataFor(LogAttributes, 'LogAttributes', classMeta);
  setMetadataFor(UserClientData, 'UserClientData', classMeta);
  setMetadataFor(Companion_1, 'Companion', objectMeta);
  setMetadataFor(KaliumLogger, 'KaliumLogger', classMeta);
  setMetadataFor(KaliumLogLevel, 'KaliumLogLevel', classMeta, Enum);
  //endregion
  function obfuscateId(_this__u8e3s4) {
    var tmp;
    if (_this__u8e3s4.length >= 7) {
      // Inline function 'kotlin.text.substring' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp = _this__u8e3s4.substring(0, 7) + '***';
    } else {
      tmp = _this__u8e3s4;
    }
    return tmp;
  }
  function obfuscateDomain(_this__u8e3s4) {
    var tmp;
    if (_this__u8e3s4.length >= 3) {
      // Inline function 'kotlin.text.substring' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp = _this__u8e3s4.substring(0, 3) + '***';
    } else {
      tmp = _this__u8e3s4;
    }
    return tmp;
  }
  function get_END_INDEX_ID() {
    return END_INDEX_ID;
  }
  var END_INDEX_ID;
  function get_START_INDEX() {
    return START_INDEX;
  }
  var START_INDEX;
  function get_END_INDEX_DOMAIN() {
    return END_INDEX_DOMAIN;
  }
  var END_INDEX_DOMAIN;
  function _get_mutableKermitConfig__bl0sfd($this) {
    return $this.mutableKermitConfig_1;
  }
  function Companion() {
    Companion_instance = this;
    this.DISABLED_1 = new Config(KaliumLogLevel_DISABLED_getInstance(), listOf(platformLogWriter()));
  }
  protoOf(Companion).get_DISABLED_edo4or_k$ = function () {
    return this.DISABLED_1;
  };
  var Companion_instance;
  function Companion_getInstance() {
    if (Companion_instance == null) new Companion();
    return Companion_instance;
  }
  function KaliumLogger$Config$mutableKermitConfig$1(this$0) {
    this.logWriterList_1 = this$0.initialLogWriterList_1;
    this.minSeverity_1 = toMinSeverity(this$0.initialLevel_1);
  }
  protoOf(KaliumLogger$Config$mutableKermitConfig$1).set_logWriterList_wxbs3s_k$ = function (_set____db54di) {
    this.logWriterList_1 = _set____db54di;
  };
  protoOf(KaliumLogger$Config$mutableKermitConfig$1).get_logWriterList_bvp2p8_k$ = function () {
    return this.logWriterList_1;
  };
  protoOf(KaliumLogger$Config$mutableKermitConfig$1).set_minSeverity_ogutg0_k$ = function (_set____db54di) {
    this.minSeverity_1 = _set____db54di;
  };
  protoOf(KaliumLogger$Config$mutableKermitConfig$1).get_minSeverity_aa48vu_k$ = function () {
    return this.minSeverity_1;
  };
  function Text(text) {
    Tag.call(this);
    this.text_1 = text;
  }
  protoOf(Text).get_text_wouvsm_k$ = function () {
    return this.text_1;
  };
  protoOf(Text).tagString_swpt8r_k$ = function () {
    return this.text_1;
  };
  protoOf(Text).component1_7eebsc_k$ = function () {
    return this.text_1;
  };
  protoOf(Text).copy_a35qlh_k$ = function (text) {
    return new Text(text);
  };
  protoOf(Text).copy$default_oaafys_k$ = function (text, $super) {
    text = text === VOID ? this.text_1 : text;
    return $super === VOID ? this.copy_a35qlh_k$(text) : $super.copy_a35qlh_k$.call(this, text);
  };
  protoOf(Text).toString = function () {
    return 'Text(text=' + this.text_1 + ')';
  };
  protoOf(Text).hashCode = function () {
    return getStringHashCode(this.text_1);
  };
  protoOf(Text).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Text)) return false;
    var tmp0_other_with_cast = other instanceof Text ? other : THROW_CCE();
    if (!(this.text_1 === tmp0_other_with_cast.text_1)) return false;
    return true;
  };
  function UserClientText(prefix, data) {
    Tag.call(this);
    this.prefix_1 = prefix;
    this.data_1 = data;
  }
  protoOf(UserClientText).get_prefix_i78za3_k$ = function () {
    return this.prefix_1;
  };
  protoOf(UserClientText).get_data_wokkxf_k$ = function () {
    return this.data_1;
  };
  protoOf(UserClientText).tagString_swpt8r_k$ = function () {
    // Inline function 'kotlin.let' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.logger.UserClientText.tagString.<anonymous>' call
    var it = this.data_1();
    return this.prefix_1 + '[' + it.userId_1 + '|' + it.clientId_1 + ']';
  };
  protoOf(UserClientText).component1_7eebsc_k$ = function () {
    return this.prefix_1;
  };
  protoOf(UserClientText).component2_7eebsb_k$ = function () {
    return this.data_1;
  };
  protoOf(UserClientText).copy_k4tpab_k$ = function (prefix, data) {
    return new UserClientText(prefix, data);
  };
  protoOf(UserClientText).copy$default_96hz13_k$ = function (prefix, data, $super) {
    prefix = prefix === VOID ? this.prefix_1 : prefix;
    data = data === VOID ? this.data_1 : data;
    return $super === VOID ? this.copy_k4tpab_k$(prefix, data) : $super.copy_k4tpab_k$.call(this, prefix, data);
  };
  protoOf(UserClientText).toString = function () {
    return 'UserClientText(prefix=' + this.prefix_1 + ', data=' + this.data_1 + ')';
  };
  protoOf(UserClientText).hashCode = function () {
    var result = getStringHashCode(this.prefix_1);
    result = (imul(result, 31) + hashCode(this.data_1)) | 0;
    return result;
  };
  protoOf(UserClientText).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof UserClientText)) return false;
    var tmp0_other_with_cast = other instanceof UserClientText ? other : THROW_CCE();
    if (!(this.prefix_1 === tmp0_other_with_cast.prefix_1)) return false;
    if (!equals(this.data_1, tmp0_other_with_cast.data_1)) return false;
    return true;
  };
  function _get_regex__by6cnq($this) {
    return $this.regex_1;
  }
  function Companion_0() {
    Companion_instance_0 = this;
    this.regex_1 = Regex_init_$Create$('^.*\\[.+\\|.*\\]$');
  }
  protoOf(Companion_0).getInfoFromTagString_yvya1p_k$ = function (tag) {
    var tmp;
    // Inline function 'kotlin.text.matches' call
    if (this.regex_1.matches_evli6i_k$(tag)) {
      var prefix = substringBefore(tag, '[');
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.logger.Companion.getInfoFromTagString.<anonymous>' call
      var data = split(substringBefore(substringAfterLast(tag, '['), ']'), ['|']);
      var userClientData = new UserClientData(data.get_c1px32_k$(0), data.get_c1px32_k$(1));
      tmp = new LogAttributes(userClientData, prefix);
    } else {
      tmp = new LogAttributes(null, tag);
    }
    return tmp;
  };
  var Companion_instance_0;
  function Companion_getInstance_0() {
    if (Companion_instance_0 == null) new Companion_0();
    return Companion_instance_0;
  }
  var ApplicationFlow_SYNC_instance;
  var ApplicationFlow_EVENT_RECEIVER_instance;
  var ApplicationFlow_CONVERSATIONS_instance;
  var ApplicationFlow_CONNECTIONS_instance;
  var ApplicationFlow_MESSAGES_instance;
  var ApplicationFlow_SEARCH_instance;
  var ApplicationFlow_SESSION_instance;
  var ApplicationFlow_REGISTER_instance;
  var ApplicationFlow_CLIENTS_instance;
  var ApplicationFlow_CALLING_instance;
  var ApplicationFlow_ASSETS_instance;
  var ApplicationFlow_LOCAL_STORAGE_instance;
  var ApplicationFlow_ANALYTICS_instance;
  var ApplicationFlow_CONVERSATIONS_FOLDERS_instance;
  function values() {
    return [
      ApplicationFlow_SYNC_getInstance(),
      ApplicationFlow_EVENT_RECEIVER_getInstance(),
      ApplicationFlow_CONVERSATIONS_getInstance(),
      ApplicationFlow_CONNECTIONS_getInstance(),
      ApplicationFlow_MESSAGES_getInstance(),
      ApplicationFlow_SEARCH_getInstance(),
      ApplicationFlow_SESSION_getInstance(),
      ApplicationFlow_REGISTER_getInstance(),
      ApplicationFlow_CLIENTS_getInstance(),
      ApplicationFlow_CALLING_getInstance(),
      ApplicationFlow_ASSETS_getInstance(),
      ApplicationFlow_LOCAL_STORAGE_getInstance(),
      ApplicationFlow_ANALYTICS_getInstance(),
      ApplicationFlow_CONVERSATIONS_FOLDERS_getInstance(),
    ];
  }
  function valueOf(value) {
    switch (value) {
      case 'SYNC':
        return ApplicationFlow_SYNC_getInstance();
      case 'EVENT_RECEIVER':
        return ApplicationFlow_EVENT_RECEIVER_getInstance();
      case 'CONVERSATIONS':
        return ApplicationFlow_CONVERSATIONS_getInstance();
      case 'CONNECTIONS':
        return ApplicationFlow_CONNECTIONS_getInstance();
      case 'MESSAGES':
        return ApplicationFlow_MESSAGES_getInstance();
      case 'SEARCH':
        return ApplicationFlow_SEARCH_getInstance();
      case 'SESSION':
        return ApplicationFlow_SESSION_getInstance();
      case 'REGISTER':
        return ApplicationFlow_REGISTER_getInstance();
      case 'CLIENTS':
        return ApplicationFlow_CLIENTS_getInstance();
      case 'CALLING':
        return ApplicationFlow_CALLING_getInstance();
      case 'ASSETS':
        return ApplicationFlow_ASSETS_getInstance();
      case 'LOCAL_STORAGE':
        return ApplicationFlow_LOCAL_STORAGE_getInstance();
      case 'ANALYTICS':
        return ApplicationFlow_ANALYTICS_getInstance();
      case 'CONVERSATIONS_FOLDERS':
        return ApplicationFlow_CONVERSATIONS_FOLDERS_getInstance();
      default:
        ApplicationFlow_initEntries();
        THROW_IAE('No enum constant value.');
        break;
    }
  }
  function get_entries() {
    if ($ENTRIES == null) $ENTRIES = enumEntries(values());
    return $ENTRIES;
  }
  var ApplicationFlow_entriesInitialized;
  function ApplicationFlow_initEntries() {
    if (ApplicationFlow_entriesInitialized) return Unit_getInstance();
    ApplicationFlow_entriesInitialized = true;
    ApplicationFlow_SYNC_instance = new ApplicationFlow('SYNC', 0);
    ApplicationFlow_EVENT_RECEIVER_instance = new ApplicationFlow('EVENT_RECEIVER', 1);
    ApplicationFlow_CONVERSATIONS_instance = new ApplicationFlow('CONVERSATIONS', 2);
    ApplicationFlow_CONNECTIONS_instance = new ApplicationFlow('CONNECTIONS', 3);
    ApplicationFlow_MESSAGES_instance = new ApplicationFlow('MESSAGES', 4);
    ApplicationFlow_SEARCH_instance = new ApplicationFlow('SEARCH', 5);
    ApplicationFlow_SESSION_instance = new ApplicationFlow('SESSION', 6);
    ApplicationFlow_REGISTER_instance = new ApplicationFlow('REGISTER', 7);
    ApplicationFlow_CLIENTS_instance = new ApplicationFlow('CLIENTS', 8);
    ApplicationFlow_CALLING_instance = new ApplicationFlow('CALLING', 9);
    ApplicationFlow_ASSETS_instance = new ApplicationFlow('ASSETS', 10);
    ApplicationFlow_LOCAL_STORAGE_instance = new ApplicationFlow('LOCAL_STORAGE', 11);
    ApplicationFlow_ANALYTICS_instance = new ApplicationFlow('ANALYTICS', 12);
    ApplicationFlow_CONVERSATIONS_FOLDERS_instance = new ApplicationFlow('CONVERSATIONS_FOLDERS', 13);
  }
  var $ENTRIES;
  function ApplicationFlow(name, ordinal) {
    Enum.call(this, name, ordinal);
  }
  function ApplicationFlow_SYNC_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_SYNC_instance;
  }
  function ApplicationFlow_EVENT_RECEIVER_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_EVENT_RECEIVER_instance;
  }
  function ApplicationFlow_CONVERSATIONS_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_CONVERSATIONS_instance;
  }
  function ApplicationFlow_CONNECTIONS_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_CONNECTIONS_instance;
  }
  function ApplicationFlow_MESSAGES_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_MESSAGES_instance;
  }
  function ApplicationFlow_SEARCH_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_SEARCH_instance;
  }
  function ApplicationFlow_SESSION_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_SESSION_instance;
  }
  function ApplicationFlow_REGISTER_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_REGISTER_instance;
  }
  function ApplicationFlow_CLIENTS_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_CLIENTS_instance;
  }
  function ApplicationFlow_CALLING_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_CALLING_instance;
  }
  function ApplicationFlow_ASSETS_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_ASSETS_instance;
  }
  function ApplicationFlow_LOCAL_STORAGE_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_LOCAL_STORAGE_instance;
  }
  function ApplicationFlow_ANALYTICS_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_ANALYTICS_instance;
  }
  function ApplicationFlow_CONVERSATIONS_FOLDERS_getInstance() {
    ApplicationFlow_initEntries();
    return ApplicationFlow_CONVERSATIONS_FOLDERS_instance;
  }
  function _get_config__hi7kzb($this) {
    return $this.config_1;
  }
  function _get_tag__e6h4qf($this) {
    return $this.tag_1;
  }
  function KaliumLogger_init_$Init$(config, tag, $this) {
    config = config === VOID ? Companion_getInstance().DISABLED_1 : config;
    tag = tag === VOID ? 'KaliumLogger' : tag;
    KaliumLogger.call($this, config, new Text(tag));
    return $this;
  }
  function KaliumLogger_init_$Create$(config, tag) {
    return KaliumLogger_init_$Init$(config, tag, objectCreate(protoOf(KaliumLogger)));
  }
  function _get_kermitLogger__nmuly3($this) {
    return $this.kermitLogger_1;
  }
  function tag($this) {
    return $this.tag_1.tagString_swpt8r_k$();
  }
  function Config(initialLevel, initialLogWriterList) {
    Companion_getInstance();
    initialLogWriterList = initialLogWriterList === VOID ? listOf(platformLogWriter()) : initialLogWriterList;
    this.initialLevel_1 = initialLevel;
    this.initialLogWriterList_1 = initialLogWriterList;
    var tmp = this;
    tmp.mutableKermitConfig_1 = new KaliumLogger$Config$mutableKermitConfig$1(this);
  }
  protoOf(Config).get_initialLevel_2ixzbr_k$ = function () {
    return this.initialLevel_1;
  };
  protoOf(Config).get_initialLogWriterList_52ssqi_k$ = function () {
    return this.initialLogWriterList_1;
  };
  protoOf(Config).set_logLevel_ajy7ml_k$ = function (value) {
    this.mutableKermitConfig_1.minSeverity_1 = toMinSeverity(value);
  };
  protoOf(Config).get_logLevel_179ppl_k$ = function () {
    return toKaliumLogLevel(this.mutableKermitConfig_1.minSeverity_1);
  };
  protoOf(Config).get_kermitConfig_13rg45_k$ = function () {
    return this.mutableKermitConfig_1;
  };
  protoOf(Config).component1_7eebsc_k$ = function () {
    return this.initialLevel_1;
  };
  protoOf(Config).component2_7eebsb_k$ = function () {
    return this.initialLogWriterList_1;
  };
  protoOf(Config).copy_ggf0o5_k$ = function (initialLevel, initialLogWriterList) {
    return new Config(initialLevel, initialLogWriterList);
  };
  protoOf(Config).copy$default_p22suj_k$ = function (initialLevel, initialLogWriterList, $super) {
    initialLevel = initialLevel === VOID ? this.initialLevel_1 : initialLevel;
    initialLogWriterList = initialLogWriterList === VOID ? this.initialLogWriterList_1 : initialLogWriterList;
    return $super === VOID
      ? this.copy_ggf0o5_k$(initialLevel, initialLogWriterList)
      : $super.copy_ggf0o5_k$.call(this, initialLevel, initialLogWriterList);
  };
  protoOf(Config).toString = function () {
    return 'Config(initialLevel=' + this.initialLevel_1 + ', initialLogWriterList=' + this.initialLogWriterList_1 + ')';
  };
  protoOf(Config).hashCode = function () {
    var result = this.initialLevel_1.hashCode();
    result = (imul(result, 31) + hashCode(this.initialLogWriterList_1)) | 0;
    return result;
  };
  protoOf(Config).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Config)) return false;
    var tmp0_other_with_cast = other instanceof Config ? other : THROW_CCE();
    if (!this.initialLevel_1.equals(tmp0_other_with_cast.initialLevel_1)) return false;
    if (!equals(this.initialLogWriterList_1, tmp0_other_with_cast.initialLogWriterList_1)) return false;
    return true;
  };
  function Tag() {}
  function LogAttributes(userClientData, textTag) {
    Companion_getInstance_0();
    this.userClientData_1 = userClientData;
    this.textTag_1 = textTag;
  }
  protoOf(LogAttributes).get_userClientData_6yuw1j_k$ = function () {
    return this.userClientData_1;
  };
  protoOf(LogAttributes).get_textTag_m6lha4_k$ = function () {
    return this.textTag_1;
  };
  protoOf(LogAttributes).component1_7eebsc_k$ = function () {
    return this.userClientData_1;
  };
  protoOf(LogAttributes).component2_7eebsb_k$ = function () {
    return this.textTag_1;
  };
  protoOf(LogAttributes).copy_dlbhkg_k$ = function (userClientData, textTag) {
    return new LogAttributes(userClientData, textTag);
  };
  protoOf(LogAttributes).copy$default_b2p7qd_k$ = function (userClientData, textTag, $super) {
    userClientData = userClientData === VOID ? this.userClientData_1 : userClientData;
    textTag = textTag === VOID ? this.textTag_1 : textTag;
    return $super === VOID
      ? this.copy_dlbhkg_k$(userClientData, textTag)
      : $super.copy_dlbhkg_k$.call(this, userClientData, textTag);
  };
  protoOf(LogAttributes).toString = function () {
    return 'LogAttributes(userClientData=' + this.userClientData_1 + ', textTag=' + this.textTag_1 + ')';
  };
  protoOf(LogAttributes).hashCode = function () {
    var result = this.userClientData_1 == null ? 0 : this.userClientData_1.hashCode();
    result = (imul(result, 31) + getStringHashCode(this.textTag_1)) | 0;
    return result;
  };
  protoOf(LogAttributes).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof LogAttributes)) return false;
    var tmp0_other_with_cast = other instanceof LogAttributes ? other : THROW_CCE();
    if (!equals(this.userClientData_1, tmp0_other_with_cast.userClientData_1)) return false;
    if (!(this.textTag_1 === tmp0_other_with_cast.textTag_1)) return false;
    return true;
  };
  function UserClientData(userId, clientId) {
    this.userId_1 = userId;
    this.clientId_1 = clientId;
  }
  protoOf(UserClientData).get_userId_kl13yn_k$ = function () {
    return this.userId_1;
  };
  protoOf(UserClientData).get_clientId_gs3e9d_k$ = function () {
    return this.clientId_1;
  };
  protoOf(UserClientData).component1_7eebsc_k$ = function () {
    return this.userId_1;
  };
  protoOf(UserClientData).component2_7eebsb_k$ = function () {
    return this.clientId_1;
  };
  protoOf(UserClientData).copy_9ze9y6_k$ = function (userId, clientId) {
    return new UserClientData(userId, clientId);
  };
  protoOf(UserClientData).copy$default_soo6ts_k$ = function (userId, clientId, $super) {
    userId = userId === VOID ? this.userId_1 : userId;
    clientId = clientId === VOID ? this.clientId_1 : clientId;
    return $super === VOID ? this.copy_9ze9y6_k$(userId, clientId) : $super.copy_9ze9y6_k$.call(this, userId, clientId);
  };
  protoOf(UserClientData).toString = function () {
    return 'UserClientData(userId=' + this.userId_1 + ', clientId=' + this.clientId_1 + ')';
  };
  protoOf(UserClientData).hashCode = function () {
    var result = getStringHashCode(this.userId_1);
    result = (imul(result, 31) + (this.clientId_1 == null ? 0 : getStringHashCode(this.clientId_1))) | 0;
    return result;
  };
  protoOf(UserClientData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof UserClientData)) return false;
    var tmp0_other_with_cast = other instanceof UserClientData ? other : THROW_CCE();
    if (!(this.userId_1 === tmp0_other_with_cast.userId_1)) return false;
    if (!(this.clientId_1 == tmp0_other_with_cast.clientId_1)) return false;
    return true;
  };
  function Companion_1() {
    Companion_instance_1 = this;
  }
  protoOf(Companion_1).disabled_4hb798_k$ = function () {
    return KaliumLogger_init_$Create$(Companion_getInstance().DISABLED_1, 'KaliumLogger');
  };
  var Companion_instance_1;
  function Companion_getInstance_1() {
    if (Companion_instance_1 == null) new Companion_1();
    return Companion_instance_1;
  }
  function KaliumLogger(config, tag) {
    Companion_getInstance_1();
    config = config === VOID ? Companion_getInstance().DISABLED_1 : config;
    tag = tag === VOID ? new Text('KaliumLogger') : tag;
    this.config_1 = config;
    this.tag_1 = tag;
    this.kermitLogger_1 = new Logger(this.config_1.get_kermitConfig_13rg45_k$());
  }
  protoOf(KaliumLogger).get_logLevel_179ppl_k$ = function () {
    return this.config_1.get_logLevel_179ppl_k$();
  };
  protoOf(KaliumLogger).withFeatureId_ga7c3h_k$ = function (featureId) {
    // Inline function 'kotlin.text.lowercase' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$1 = featureId.get_name_woqyms_k$().toLowerCase();
    return this.withTextTag_izjekz_k$(tmp$ret$1);
  };
  protoOf(KaliumLogger).withTextTag_izjekz_k$ = function (textTag) {
    // Inline function 'kotlin.let' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.logger.KaliumLogger.withTextTag.<anonymous>' call
    var it = 'featureId:' + textTag;
    var tmp0_subject = this.tag_1;
    var tmp;
    if (tmp0_subject instanceof Text) {
      tmp = new Text(it);
    } else {
      if (tmp0_subject instanceof UserClientText) {
        tmp = new UserClientText(it, this.tag_1.data_1);
      } else {
        noWhenBranchMatchedException();
      }
    }
    var tmp$ret$1 = tmp;
    return new KaliumLogger(this.config_1, tmp$ret$1);
  };
  protoOf(KaliumLogger).withUserDeviceData_adu4c7_k$ = function (data) {
    var tmp0_subject = this.tag_1;
    var tmp;
    if (tmp0_subject instanceof Text) {
      tmp = new UserClientText(this.tag_1.text_1, data);
    } else {
      if (tmp0_subject instanceof UserClientText) {
        tmp = new UserClientText(this.tag_1.prefix_1, data);
      } else {
        noWhenBranchMatchedException();
      }
    }
    return new KaliumLogger(this.config_1, tmp);
  };
  protoOf(KaliumLogger).v_8rcltk_k$ = function (message, throwable, tag) {
    var this_0 = this.kermitLogger_1;
    var severity = Severity_Verbose_getInstance();
    var tmp;
    if (this_0.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this_0.processLog_byo4oh_k$(severity, tag, throwable, message);
      tmp = Unit_getInstance();
    }
    return tmp;
  };
  protoOf(KaliumLogger).v$default_gg95ss_k$ = function (message, throwable, tag_0, $super) {
    throwable = throwable === VOID ? null : throwable;
    tag_0 = tag_0 === VOID ? tag(this) : tag_0;
    var tmp;
    if ($super === VOID) {
      this.v_8rcltk_k$(message, throwable, tag_0);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.v_8rcltk_k$.call(this, message, throwable, tag_0);
    }
    return tmp;
  };
  protoOf(KaliumLogger).d_9hhrd6_k$ = function (message, throwable, tag) {
    var this_0 = this.kermitLogger_1;
    var severity = Severity_Debug_getInstance();
    var tmp;
    if (this_0.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this_0.processLog_byo4oh_k$(severity, tag, throwable, message);
      tmp = Unit_getInstance();
    }
    return tmp;
  };
  protoOf(KaliumLogger).d$default_10deum_k$ = function (message, throwable, tag_0, $super) {
    throwable = throwable === VOID ? null : throwable;
    tag_0 = tag_0 === VOID ? tag(this) : tag_0;
    var tmp;
    if ($super === VOID) {
      this.d_9hhrd6_k$(message, throwable, tag_0);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.d_9hhrd6_k$.call(this, message, throwable, tag_0);
    }
    return tmp;
  };
  protoOf(KaliumLogger).i_t0jgdh_k$ = function (message, throwable, tag) {
    var this_0 = this.kermitLogger_1;
    var severity = Severity_Info_getInstance();
    var tmp;
    if (this_0.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this_0.processLog_byo4oh_k$(severity, tag, throwable, message);
      tmp = Unit_getInstance();
    }
    return tmp;
  };
  protoOf(KaliumLogger).i$default_sz5kzt_k$ = function (message, throwable, tag_0, $super) {
    throwable = throwable === VOID ? null : throwable;
    tag_0 = tag_0 === VOID ? tag(this) : tag_0;
    var tmp;
    if ($super === VOID) {
      this.i_t0jgdh_k$(message, throwable, tag_0);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.i_t0jgdh_k$.call(this, message, throwable, tag_0);
    }
    return tmp;
  };
  protoOf(KaliumLogger).w_cnyjmf_k$ = function (message, throwable, tag) {
    var this_0 = this.kermitLogger_1;
    var severity = Severity_Warn_getInstance();
    var tmp;
    if (this_0.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this_0.processLog_byo4oh_k$(severity, tag, throwable, message);
      tmp = Unit_getInstance();
    }
    return tmp;
  };
  protoOf(KaliumLogger).w$default_6d8fd1_k$ = function (message, throwable, tag_0, $super) {
    throwable = throwable === VOID ? null : throwable;
    tag_0 = tag_0 === VOID ? tag(this) : tag_0;
    var tmp;
    if ($super === VOID) {
      this.w_cnyjmf_k$(message, throwable, tag_0);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.w_cnyjmf_k$.call(this, message, throwable, tag_0);
    }
    return tmp;
  };
  protoOf(KaliumLogger).e_de3p61_k$ = function (message, throwable, tag) {
    var this_0 = this.kermitLogger_1;
    var severity = Severity_Error_getInstance();
    var tmp;
    if (this_0.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this_0.processLog_byo4oh_k$(severity, tag, throwable, message);
      tmp = Unit_getInstance();
    }
    return tmp;
  };
  protoOf(KaliumLogger).e$default_lt46b7_k$ = function (message, throwable, tag_0, $super) {
    throwable = throwable === VOID ? null : throwable;
    tag_0 = tag_0 === VOID ? tag(this) : tag_0;
    var tmp;
    if ($super === VOID) {
      this.e_de3p61_k$(message, throwable, tag_0);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.e_de3p61_k$.call(this, message, throwable, tag_0);
    }
    return tmp;
  };
  var KaliumLogLevel_VERBOSE_instance;
  var KaliumLogLevel_DEBUG_instance;
  var KaliumLogLevel_INFO_instance;
  var KaliumLogLevel_WARN_instance;
  var KaliumLogLevel_ERROR_instance;
  var KaliumLogLevel_DISABLED_instance;
  function values_0() {
    return [
      KaliumLogLevel_VERBOSE_getInstance(),
      KaliumLogLevel_DEBUG_getInstance(),
      KaliumLogLevel_INFO_getInstance(),
      KaliumLogLevel_WARN_getInstance(),
      KaliumLogLevel_ERROR_getInstance(),
      KaliumLogLevel_DISABLED_getInstance(),
    ];
  }
  function valueOf_0(value) {
    switch (value) {
      case 'VERBOSE':
        return KaliumLogLevel_VERBOSE_getInstance();
      case 'DEBUG':
        return KaliumLogLevel_DEBUG_getInstance();
      case 'INFO':
        return KaliumLogLevel_INFO_getInstance();
      case 'WARN':
        return KaliumLogLevel_WARN_getInstance();
      case 'ERROR':
        return KaliumLogLevel_ERROR_getInstance();
      case 'DISABLED':
        return KaliumLogLevel_DISABLED_getInstance();
      default:
        KaliumLogLevel_initEntries();
        THROW_IAE('No enum constant value.');
        break;
    }
  }
  function get_entries_0() {
    if ($ENTRIES_0 == null) $ENTRIES_0 = enumEntries(values_0());
    return $ENTRIES_0;
  }
  var KaliumLogLevel_entriesInitialized;
  function KaliumLogLevel_initEntries() {
    if (KaliumLogLevel_entriesInitialized) return Unit_getInstance();
    KaliumLogLevel_entriesInitialized = true;
    KaliumLogLevel_VERBOSE_instance = new KaliumLogLevel('VERBOSE', 0);
    KaliumLogLevel_DEBUG_instance = new KaliumLogLevel('DEBUG', 1);
    KaliumLogLevel_INFO_instance = new KaliumLogLevel('INFO', 2);
    KaliumLogLevel_WARN_instance = new KaliumLogLevel('WARN', 3);
    KaliumLogLevel_ERROR_instance = new KaliumLogLevel('ERROR', 4);
    KaliumLogLevel_DISABLED_instance = new KaliumLogLevel('DISABLED', 5);
  }
  var $ENTRIES_0;
  function KaliumLogLevel(name, ordinal) {
    Enum.call(this, name, ordinal);
  }
  function toMinSeverity(_this__u8e3s4) {
    var tmp;
    switch (_this__u8e3s4.get_ordinal_ip24qg_k$()) {
      case 0:
        tmp = Severity_Verbose_getInstance();
        break;
      case 1:
        tmp = Severity_Debug_getInstance();
        break;
      case 2:
        tmp = Severity_Info_getInstance();
        break;
      case 3:
        tmp = Severity_Warn_getInstance();
        break;
      case 4:
        tmp = Severity_Error_getInstance();
        break;
      case 5:
        tmp = Severity_Assert_getInstance();
        break;
      default:
        noWhenBranchMatchedException();
        break;
    }
    return tmp;
  }
  function toKaliumLogLevel(_this__u8e3s4) {
    var tmp;
    switch (_this__u8e3s4.get_ordinal_ip24qg_k$()) {
      case 0:
        tmp = KaliumLogLevel_VERBOSE_getInstance();
        break;
      case 1:
        tmp = KaliumLogLevel_DEBUG_getInstance();
        break;
      case 2:
        tmp = KaliumLogLevel_INFO_getInstance();
        break;
      case 3:
        tmp = KaliumLogLevel_WARN_getInstance();
        break;
      case 4:
        tmp = KaliumLogLevel_ERROR_getInstance();
        break;
      case 5:
        tmp = KaliumLogLevel_DISABLED_getInstance();
        break;
      default:
        noWhenBranchMatchedException();
        break;
    }
    return tmp;
  }
  function KaliumLogLevel_VERBOSE_getInstance() {
    KaliumLogLevel_initEntries();
    return KaliumLogLevel_VERBOSE_instance;
  }
  function KaliumLogLevel_DEBUG_getInstance() {
    KaliumLogLevel_initEntries();
    return KaliumLogLevel_DEBUG_instance;
  }
  function KaliumLogLevel_INFO_getInstance() {
    KaliumLogLevel_initEntries();
    return KaliumLogLevel_INFO_instance;
  }
  function KaliumLogLevel_WARN_getInstance() {
    KaliumLogLevel_initEntries();
    return KaliumLogLevel_WARN_instance;
  }
  function KaliumLogLevel_ERROR_getInstance() {
    KaliumLogLevel_initEntries();
    return KaliumLogLevel_ERROR_instance;
  }
  function KaliumLogLevel_DISABLED_getInstance() {
    KaliumLogLevel_initEntries();
    return KaliumLogLevel_DISABLED_instance;
  }
  //region block: init
  END_INDEX_ID = 7;
  START_INDEX = 0;
  END_INDEX_DOMAIN = 3;
  //endregion
  //region block: exports
  _.$_$ = _.$_$ || {};
  _.$_$.a = obfuscateDomain;
  _.$_$.b = obfuscateId;
  _.$_$.c = Companion_getInstance_1;
  //endregion
  return _;
});

//# sourceMappingURL=kalium-logger.js.map
