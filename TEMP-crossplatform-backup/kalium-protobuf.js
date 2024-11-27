(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './kotlin-kotlin-stdlib.js', './pbandk-pbandk-runtime.js'], factory);
  else if (typeof exports === 'object')
    factory(module.exports, require('./kotlin-kotlin-stdlib.js'), require('./pbandk-pbandk-runtime.js'));
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-protobuf'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'kalium-protobuf'.",
      );
    }
    if (typeof this['pbandk-pbandk-runtime'] === 'undefined') {
      throw new Error(
        "Error loading module 'kalium-protobuf'. Its dependency 'pbandk-pbandk-runtime' was not found. Please, check whether 'pbandk-pbandk-runtime' is loaded prior to 'kalium-protobuf'.",
      );
    }
    root['kalium-protobuf'] = factory(
      typeof this['kalium-protobuf'] === 'undefined' ? {} : this['kalium-protobuf'],
      this['kotlin-kotlin-stdlib'],
      this['pbandk-pbandk-runtime'],
    );
  }
})(this, function (_, kotlin_kotlin, kotlin_pro_streem_pbandk_pbandk_runtime) {
  'use strict';
  //region block: imports
  var imul = Math.imul;
  var listOf = kotlin_kotlin.$_$.g8;
  var protoOf = kotlin_kotlin.$_$.dc;
  var objectMeta = kotlin_kotlin.$_$.cc;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var classMeta = kotlin_kotlin.$_$.ta;
  var lazy = kotlin_kotlin.$_$.nh;
  var IllegalArgumentException_init_$Create$ = kotlin_kotlin.$_$.r1;
  var defineProp = kotlin_kotlin.$_$.va;
  var Companion = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.q;
  var VOID = kotlin_kotlin.$_$.f;
  var Enum = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.r;
  var getKClass = kotlin_kotlin.$_$.d;
  var checkBuilderCapacity = kotlin_kotlin.$_$.n6;
  var ArrayList_init_$Create$ = kotlin_kotlin.$_$.l;
  var Message = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.f;
  var FieldDescriptor = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.o;
  var Repeated = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.n;
  var MessageDescriptor = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.u;
  var Companion_0 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.p;
  var get_protoSize = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.t;
  var emptyList = kotlin_kotlin.$_$.j7;
  var emptyMap = kotlin_kotlin.$_$.k7;
  var hashCode = kotlin_kotlin.$_$.fb;
  var THROW_CCE = kotlin_kotlin.$_$.qg;
  var equals = kotlin_kotlin.$_$.xa;
  var Message_0 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.v;
  var String_0 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.l;
  var Int64 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.k;
  var getStringHashCode = kotlin_kotlin.$_$.eb;
  var OneOf = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.s;
  var toString = kotlin_kotlin.$_$.wh;
  var Bytes = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.h;
  var Enum_0 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.e;
  var Int32 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.j;
  var UInt64 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.m;
  var Float = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.i;
  var getNumberHashCode = kotlin_kotlin.$_$.cb;
  var plus = kotlin_kotlin.$_$.q8;
  var plus_0 = kotlin_kotlin.$_$.m8;
  var Companion_getInstance = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.b;
  var ensureNotNull = kotlin_kotlin.$_$.hh;
  var Companion_getInstance_0 = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.c;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var init = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.a;
  var Sequence = kotlin_kotlin.$_$.zc;
  var isInterface = kotlin_kotlin.$_$.pb;
  var addAll = kotlin_kotlin.$_$.h6;
  var Long = kotlin_kotlin.$_$.kg;
  var ByteArr = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.d;
  var KProperty1 = kotlin_kotlin.$_$.wc;
  var getPropertyCallableRef = kotlin_kotlin.$_$.db;
  var KProperty0 = kotlin_kotlin.$_$.vc;
  var listOf_0 = kotlin_kotlin.$_$.f8;
  var Bool = kotlin_pro_streem_pbandk_pbandk_runtime.$_$.g;
  var getBooleanHashCode = kotlin_kotlin.$_$.bb;
  //endregion
  //region block: pre-declaration
  setMetadataFor(ExportedEncryptionAlgorithm, 'ExportedEncryptionAlgorithm', classMeta, VOID, [Enum]);
  setMetadataFor(BACKUP_AES_CBC, 'BACKUP_AES_CBC', objectMeta, ExportedEncryptionAlgorithm);
  setMetadataFor(BACKUP_AES_GCM, 'BACKUP_AES_GCM', objectMeta, ExportedEncryptionAlgorithm);
  setMetadataFor(UNRECOGNIZED, 'UNRECOGNIZED', classMeta, ExportedEncryptionAlgorithm);
  setMetadataFor(Companion_1, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(Companion_2, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(BackupData, 'BackupData', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_3, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(BackupInfo, 'BackupInfo', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_4, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportUser, 'ExportUser', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_5, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedQualifiedId, 'ExportedQualifiedId', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_6, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedConversation, 'ExportedConversation', classMeta, VOID, [Message_0]);
  setMetadataFor(Content, 'Content', classMeta, OneOf);
  setMetadataFor(Text, 'Text', classMeta, Content);
  setMetadataFor(Asset, 'Asset', classMeta, Content);
  setMetadataFor(Location, 'Location', classMeta, Content);
  setMetadataFor(Companion_7, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedMessage, 'ExportedMessage', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_8, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedText, 'ExportedText', classMeta, VOID, [Message_0]);
  setMetadataFor(MetaData, 'MetaData', classMeta, OneOf);
  setMetadataFor(Image, 'Image', classMeta, MetaData);
  setMetadataFor(Video, 'Video', classMeta, MetaData);
  setMetadataFor(Audio, 'Audio', classMeta, MetaData);
  setMetadataFor(Generic, 'Generic', classMeta, MetaData);
  setMetadataFor(Companion_9, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedAsset, 'ExportedAsset', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_10, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedImageMetaData, 'ExportedImageMetaData', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_11, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedVideoMetaData, 'ExportedVideoMetaData', classMeta, VOID, [Message_0], ExportedVideoMetaData);
  setMetadataFor(Companion_12, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedAudioMetaData, 'ExportedAudioMetaData', classMeta, VOID, [Message_0], ExportedAudioMetaData);
  setMetadataFor(Companion_13, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(
    ExportedGenericMetaData,
    'ExportedGenericMetaData',
    classMeta,
    VOID,
    [Message_0],
    ExportedGenericMetaData,
  );
  setMetadataFor(Companion_14, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ExportedLocation, 'ExportedLocation', classMeta, VOID, [Message_0]);
  setMetadataFor(ClientAction, 'ClientAction', classMeta, VOID, [Enum]);
  setMetadataFor(RESET_SESSION, 'RESET_SESSION', objectMeta, ClientAction);
  setMetadataFor(UNRECOGNIZED_0, 'UNRECOGNIZED', classMeta, ClientAction);
  setMetadataFor(Companion_15, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(EncryptionAlgorithm, 'EncryptionAlgorithm', classMeta, VOID, [Enum]);
  setMetadataFor(AES_CBC, 'AES_CBC', objectMeta, EncryptionAlgorithm);
  setMetadataFor(AES_GCM, 'AES_GCM', objectMeta, EncryptionAlgorithm);
  setMetadataFor(UNRECOGNIZED_1, 'UNRECOGNIZED', classMeta, EncryptionAlgorithm);
  setMetadataFor(Companion_16, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(LegalHoldStatus, 'LegalHoldStatus', classMeta, VOID, [Enum]);
  setMetadataFor(UNKNOWN, 'UNKNOWN', objectMeta, LegalHoldStatus);
  setMetadataFor(DISABLED, 'DISABLED', objectMeta, LegalHoldStatus);
  setMetadataFor(ENABLED, 'ENABLED', objectMeta, LegalHoldStatus);
  setMetadataFor(UNRECOGNIZED_2, 'UNRECOGNIZED', classMeta, LegalHoldStatus);
  setMetadataFor(Companion_17, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(UnknownStrategy, 'UnknownStrategy', classMeta, VOID, [Enum]);
  setMetadataFor(IGNORE, 'IGNORE', objectMeta, UnknownStrategy);
  setMetadataFor(DISCARD_AND_WARN, 'DISCARD_AND_WARN', objectMeta, UnknownStrategy);
  setMetadataFor(WARN_USER_ALLOW_RETRY, 'WARN_USER_ALLOW_RETRY', objectMeta, UnknownStrategy);
  setMetadataFor(UNRECOGNIZED_3, 'UNRECOGNIZED', classMeta, UnknownStrategy);
  setMetadataFor(Companion_18, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(Content_0, 'Content', classMeta, OneOf);
  setMetadataFor(Text_0, 'Text', classMeta, Content_0);
  setMetadataFor(Image_0, 'Image', classMeta, Content_0);
  setMetadataFor(Knock, 'Knock', classMeta, Content_0);
  setMetadataFor(LastRead, 'LastRead', classMeta, Content_0);
  setMetadataFor(Cleared, 'Cleared', classMeta, Content_0);
  setMetadataFor(External, 'External', classMeta, Content_0);
  setMetadataFor(ClientAction_0, 'ClientAction', classMeta, Content_0, VOID, ClientAction_0);
  setMetadataFor(Calling, 'Calling', classMeta, Content_0);
  setMetadataFor(Asset_0, 'Asset', classMeta, Content_0);
  setMetadataFor(Hidden, 'Hidden', classMeta, Content_0);
  setMetadataFor(Location_0, 'Location', classMeta, Content_0);
  setMetadataFor(Deleted, 'Deleted', classMeta, Content_0);
  setMetadataFor(Edited, 'Edited', classMeta, Content_0);
  setMetadataFor(Confirmation, 'Confirmation', classMeta, Content_0);
  setMetadataFor(Reaction, 'Reaction', classMeta, Content_0);
  setMetadataFor(Ephemeral, 'Ephemeral', classMeta, Content_0);
  setMetadataFor(Availability, 'Availability', classMeta, Content_0);
  setMetadataFor(Composite, 'Composite', classMeta, Content_0);
  setMetadataFor(ButtonAction, 'ButtonAction', classMeta, Content_0);
  setMetadataFor(ButtonActionConfirmation, 'ButtonActionConfirmation', classMeta, Content_0);
  setMetadataFor(DataTransfer, 'DataTransfer', classMeta, Content_0);
  setMetadataFor(Companion_19, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(GenericMessage, 'GenericMessage', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_20, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(QualifiedUserId, 'QualifiedUserId', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_21, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(QualifiedConversationId, 'QualifiedConversationId', classMeta, VOID, [Message_0]);
  setMetadataFor(Content_1, 'Content', classMeta, OneOf);
  setMetadataFor(Text_1, 'Text', classMeta, Content_1);
  setMetadataFor(Button, 'Button', classMeta, Content_1);
  setMetadataFor(Companion_22, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_23, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Item, 'Item', classMeta, VOID, [Message_0], Item);
  setMetadataFor(Composite_0, 'Composite', classMeta, VOID, [Message_0], Composite_0);
  setMetadataFor(Companion_24, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Button_0, 'Button', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_25, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ButtonAction_0, 'ButtonAction', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_26, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ButtonActionConfirmation_0, 'ButtonActionConfirmation', classMeta, VOID, [Message_0]);
  setMetadataFor(Type, 'Type', classMeta, VOID, [Enum]);
  setMetadataFor(NONE, 'NONE', objectMeta, Type);
  setMetadataFor(AVAILABLE, 'AVAILABLE', objectMeta, Type);
  setMetadataFor(AWAY, 'AWAY', objectMeta, Type);
  setMetadataFor(BUSY, 'BUSY', objectMeta, Type);
  setMetadataFor(UNRECOGNIZED_4, 'UNRECOGNIZED', classMeta, Type);
  setMetadataFor(Companion_27, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(Companion_28, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Availability_0, 'Availability', classMeta, VOID, [Message_0]);
  setMetadataFor(Content_2, 'Content', classMeta, OneOf);
  setMetadataFor(Text_2, 'Text', classMeta, Content_2);
  setMetadataFor(Image_1, 'Image', classMeta, Content_2);
  setMetadataFor(Knock_0, 'Knock', classMeta, Content_2);
  setMetadataFor(Asset_1, 'Asset', classMeta, Content_2);
  setMetadataFor(Location_1, 'Location', classMeta, Content_2);
  setMetadataFor(Companion_29, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Ephemeral_0, 'Ephemeral', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_30, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Text_3, 'Text', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_31, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Knock_1, 'Knock', classMeta, VOID, [Message_0]);
  setMetadataFor(Preview, 'Preview', classMeta, OneOf);
  setMetadataFor(Article, 'Article', classMeta, Preview);
  setMetadataFor(MetaData_0, 'MetaData', classMeta, OneOf);
  setMetadataFor(Tweet, 'Tweet', classMeta, MetaData_0);
  setMetadataFor(Companion_32, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(LinkPreview, 'LinkPreview', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_33, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Tweet_0, 'Tweet', classMeta, VOID, [Message_0], Tweet_0);
  setMetadataFor(Companion_34, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Article_0, 'Article', classMeta, VOID, [Message_0]);
  setMetadataFor(MentionType, 'MentionType', classMeta, OneOf);
  setMetadataFor(UserId, 'UserId', classMeta, MentionType, VOID, UserId);
  setMetadataFor(Companion_35, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Mention, 'Mention', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_36, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(LastRead_0, 'LastRead', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_37, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Cleared_0, 'Cleared', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_38, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(MessageHide, 'MessageHide', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_39, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(MessageDelete, 'MessageDelete', classMeta, VOID, [Message_0]);
  setMetadataFor(Content_3, 'Content', classMeta, OneOf);
  setMetadataFor(Text_4, 'Text', classMeta, Content_3);
  setMetadataFor(Composite_1, 'Composite', classMeta, Content_3);
  setMetadataFor(Companion_40, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(MessageEdit, 'MessageEdit', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_41, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Quote, 'Quote', classMeta, VOID, [Message_0]);
  setMetadataFor(Type_0, 'Type', classMeta, VOID, [Enum]);
  setMetadataFor(DELIVERED, 'DELIVERED', objectMeta, Type_0);
  setMetadataFor(READ, 'READ', objectMeta, Type_0);
  setMetadataFor(UNRECOGNIZED_5, 'UNRECOGNIZED', classMeta, Type_0);
  setMetadataFor(Companion_42, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(Companion_43, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Confirmation_0, 'Confirmation', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_44, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Location_2, 'Location', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_45, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ImageAsset, 'ImageAsset', classMeta, VOID, [Message_0]);
  setMetadataFor(Status, 'Status', classMeta, OneOf);
  setMetadataFor(NotUploaded, 'NotUploaded', classMeta, Status, VOID, NotUploaded);
  setMetadataFor(Uploaded, 'Uploaded', classMeta, Status);
  setMetadataFor(NotUploaded_0, 'NotUploaded', classMeta, VOID, [Enum]);
  setMetadataFor(CANCELLED, 'CANCELLED', objectMeta, NotUploaded_0);
  setMetadataFor(FAILED, 'FAILED', objectMeta, NotUploaded_0);
  setMetadataFor(UNRECOGNIZED_6, 'UNRECOGNIZED', classMeta, NotUploaded_0);
  setMetadataFor(Companion_46, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(MetaData_1, 'MetaData', classMeta, OneOf);
  setMetadataFor(Image_2, 'Image', classMeta, MetaData_1);
  setMetadataFor(Video_0, 'Video', classMeta, MetaData_1);
  setMetadataFor(Audio_0, 'Audio', classMeta, MetaData_1);
  setMetadataFor(Companion_47, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(MetaData_2, 'MetaData', classMeta, OneOf);
  setMetadataFor(Image_3, 'Image', classMeta, MetaData_2);
  setMetadataFor(Companion_48, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_49, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_50, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_51, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_52, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_53, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Original, 'Original', classMeta, VOID, [Message_0]);
  setMetadataFor(Preview_0, 'Preview', classMeta, VOID, [Message_0]);
  setMetadataFor(ImageMetaData, 'ImageMetaData', classMeta, VOID, [Message_0]);
  setMetadataFor(VideoMetaData, 'VideoMetaData', classMeta, VOID, [Message_0], VideoMetaData);
  setMetadataFor(AudioMetaData, 'AudioMetaData', classMeta, VOID, [Message_0], AudioMetaData);
  setMetadataFor(RemoteData, 'RemoteData', classMeta, VOID, [Message_0]);
  setMetadataFor(Asset_2, 'Asset', classMeta, VOID, [Message_0], Asset_2);
  setMetadataFor(Companion_54, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(External_0, 'External', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_55, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Reaction_0, 'Reaction', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_56, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Calling_0, 'Calling', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_57, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(DataTransfer_0, 'DataTransfer', classMeta, VOID, [Message_0], DataTransfer_0);
  setMetadataFor(Companion_58, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(TrackingIdentifier, 'TrackingIdentifier', classMeta, VOID, [Message_0]);
  setMetadataFor(GroupInfoType, 'GroupInfoType', classMeta, VOID, [Enum]);
  setMetadataFor(PUBLIC_GROUP_STATE, 'PUBLIC_GROUP_STATE', objectMeta, GroupInfoType);
  setMetadataFor(GROUP_INFO, 'GROUP_INFO', objectMeta, GroupInfoType);
  setMetadataFor(GROUP_INFO_JWE, 'GROUP_INFO_JWE', objectMeta, GroupInfoType);
  setMetadataFor(UNRECOGNIZED_7, 'UNRECOGNIZED', classMeta, GroupInfoType);
  setMetadataFor(Companion_59, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(RatchetTreeType, 'RatchetTreeType', classMeta, VOID, [Enum]);
  setMetadataFor(FULL, 'FULL', objectMeta, RatchetTreeType);
  setMetadataFor(DELTA, 'DELTA', objectMeta, RatchetTreeType);
  setMetadataFor(REFERENCE, 'REFERENCE', objectMeta, RatchetTreeType);
  setMetadataFor(UNRECOGNIZED_8, 'UNRECOGNIZED', classMeta, RatchetTreeType);
  setMetadataFor(Companion_60, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(Companion_61, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(GroupInfoBundle, 'GroupInfoBundle', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_62, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(CommitBundle, 'CommitBundle', classMeta, VOID, [Message_0]);
  setMetadataFor(Priority, 'Priority', classMeta, VOID, [Enum]);
  setMetadataFor(LOW_PRIORITY, 'LOW_PRIORITY', objectMeta, Priority);
  setMetadataFor(HIGH_PRIORITY, 'HIGH_PRIORITY', objectMeta, Priority);
  setMetadataFor(UNRECOGNIZED_9, 'UNRECOGNIZED', classMeta, Priority);
  setMetadataFor(Companion_63, 'Companion', objectMeta, VOID, [Companion]);
  setMetadataFor(Companion_64, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(UserId_0, 'UserId', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_65, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(QualifiedUserId_0, 'QualifiedUserId', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_66, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ClientId, 'ClientId', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_67, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ClientEntry, 'ClientEntry', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_68, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(UserEntry, 'UserEntry', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_69, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(QualifiedUserEntry, 'QualifiedUserEntry', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_70, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(NewOtrMessage, 'NewOtrMessage', classMeta, VOID, [Message_0]);
  setMetadataFor(ClientMismatchStrategy, 'ClientMismatchStrategy', classMeta, OneOf);
  setMetadataFor(ReportAll, 'ReportAll', classMeta, ClientMismatchStrategy);
  setMetadataFor(IgnoreAll, 'IgnoreAll', classMeta, ClientMismatchStrategy);
  setMetadataFor(ReportOnly, 'ReportOnly', classMeta, ClientMismatchStrategy);
  setMetadataFor(IgnoreOnly, 'IgnoreOnly', classMeta, ClientMismatchStrategy);
  setMetadataFor(Companion_71, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(QualifiedNewOtrMessage, 'QualifiedNewOtrMessage', classMeta, VOID, [Message_0]);
  setMetadataFor(Companion_72, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_73, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_74, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_75, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(Companion_76, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(ReportAll_0, 'ReportAll', classMeta, VOID, [Message_0], ReportAll_0);
  setMetadataFor(IgnoreAll_0, 'IgnoreAll', classMeta, VOID, [Message_0], IgnoreAll_0);
  setMetadataFor(ReportOnly_0, 'ReportOnly', classMeta, VOID, [Message_0], ReportOnly_0);
  setMetadataFor(IgnoreOnly_0, 'IgnoreOnly', classMeta, VOID, [Message_0], IgnoreOnly_0);
  setMetadataFor(
    ClientMismatchStrategy_0,
    'ClientMismatchStrategy',
    classMeta,
    VOID,
    [Message_0],
    ClientMismatchStrategy_0,
  );
  setMetadataFor(Companion_77, 'Companion', objectMeta, VOID, [Companion_0]);
  setMetadataFor(OtrAssetMeta, 'OtrAssetMeta', classMeta, VOID, [Message_0]);
  //endregion
  function ExportedEncryptionAlgorithm$Companion$values$delegate$lambda() {
    return listOf([BACKUP_AES_CBC_getInstance(), BACKUP_AES_GCM_getInstance()]);
  }
  function BACKUP_AES_CBC() {
    BACKUP_AES_CBC_instance = this;
    ExportedEncryptionAlgorithm.call(this, 0, 'BACKUP_AES_CBC');
  }
  var BACKUP_AES_CBC_instance;
  function BACKUP_AES_CBC_getInstance() {
    if (BACKUP_AES_CBC_instance == null) new BACKUP_AES_CBC();
    return BACKUP_AES_CBC_instance;
  }
  function BACKUP_AES_GCM() {
    BACKUP_AES_GCM_instance = this;
    ExportedEncryptionAlgorithm.call(this, 1, 'BACKUP_AES_GCM');
  }
  var BACKUP_AES_GCM_instance;
  function BACKUP_AES_GCM_getInstance() {
    if (BACKUP_AES_GCM_instance == null) new BACKUP_AES_GCM();
    return BACKUP_AES_GCM_instance;
  }
  function UNRECOGNIZED(value) {
    ExportedEncryptionAlgorithm.call(this, value);
  }
  function Companion_1() {
    Companion_instance = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(ExportedEncryptionAlgorithm$Companion$values$delegate$lambda);
  }
  protoOf(Companion_1).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_1).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.backup.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_1).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.backup.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No ExportedEncryptionAlgorithm with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance;
  function Companion_getInstance_1() {
    if (Companion_instance == null) new Companion_1();
    return Companion_instance;
  }
  function ExportedEncryptionAlgorithm(value, name) {
    Companion_getInstance_1();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(ExportedEncryptionAlgorithm).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(ExportedEncryptionAlgorithm).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(ExportedEncryptionAlgorithm).equals = function (other) {
    var tmp;
    if (other instanceof ExportedEncryptionAlgorithm) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(ExportedEncryptionAlgorithm).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(ExportedEncryptionAlgorithm).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'ExportedEncryptionAlgorithm.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Companion_2() {
    Companion_instance_0 = this;
    var tmp = this;
    var tmp_0 = getKClass(BackupData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(4);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(4);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory(this);
    var tmp1_type = new Message(Companion_getInstance_3());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'info', 1, tmp1_type, info$factory(), VOID, 'info'),
    );
    var tmp2_messageDescriptor = descriptor$factory_0(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_6()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'conversations',
        2,
        tmp3_type,
        conversations$factory(),
        VOID,
        'conversations',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_1(this);
    var tmp5_type = new Repeated(new Message(Companion_getInstance_7()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'messages', 3, tmp5_type, messages$factory(), VOID, 'messages'),
    );
    var tmp6_messageDescriptor = descriptor$factory_2(this);
    var tmp7_type = new Repeated(new Message(Companion_getInstance_4()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'users', 4, tmp7_type, users$factory(), VOID, 'users'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('BackupData', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_2).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl(Companion_getInstance_2(), u);
  };
  protoOf(Companion_2).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_0;
  function Companion_getInstance_2() {
    if (Companion_instance_0 == null) new Companion_2();
    return Companion_instance_0;
  }
  function BackupData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function BackupData(info, conversations, messages, users, unknownFields) {
    Companion_getInstance_2();
    conversations = conversations === VOID ? emptyList() : conversations;
    messages = messages === VOID ? emptyList() : messages;
    users = users === VOID ? emptyList() : users;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.info = info;
    this.conversations = conversations;
    this.messages = messages;
    this.users = users;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(BackupData$protoSize$delegate$lambda(this));
  }
  protoOf(BackupData).get_info_woo16f_k$ = function () {
    return this.info;
  };
  protoOf(BackupData).get_conversations_n3fbjb_k$ = function () {
    return this.conversations;
  };
  protoOf(BackupData).get_messages_vl21at_k$ = function () {
    return this.messages;
  };
  protoOf(BackupData).get_users_izsycf_k$ = function () {
    return this.users;
  };
  protoOf(BackupData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(BackupData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl(this, other);
  };
  protoOf(BackupData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_2().descriptor_1;
  };
  protoOf(BackupData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(BackupData).component1_7eebsc_k$ = function () {
    return this.info;
  };
  protoOf(BackupData).component2_7eebsb_k$ = function () {
    return this.conversations;
  };
  protoOf(BackupData).component3_7eebsa_k$ = function () {
    return this.messages;
  };
  protoOf(BackupData).component4_7eebs9_k$ = function () {
    return this.users;
  };
  protoOf(BackupData).component5_7eebs8_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(BackupData).copy_htxznq_k$ = function (info, conversations, messages, users, unknownFields) {
    return new BackupData(info, conversations, messages, users, unknownFields);
  };
  protoOf(BackupData).copy = function (info, conversations, messages, users, unknownFields, $super) {
    info = info === VOID ? this.info : info;
    conversations = conversations === VOID ? this.conversations : conversations;
    messages = messages === VOID ? this.messages : messages;
    users = users === VOID ? this.users : users;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_htxznq_k$(info, conversations, messages, users, unknownFields);
  };
  protoOf(BackupData).toString = function () {
    return (
      'BackupData(info=' +
      this.info +
      ', conversations=' +
      this.conversations +
      ', messages=' +
      this.messages +
      ', users=' +
      this.users +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(BackupData).hashCode = function () {
    var result = this.info.hashCode();
    result = (imul(result, 31) + hashCode(this.conversations)) | 0;
    result = (imul(result, 31) + hashCode(this.messages)) | 0;
    result = (imul(result, 31) + hashCode(this.users)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(BackupData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof BackupData)) return false;
    var tmp0_other_with_cast = other instanceof BackupData ? other : THROW_CCE();
    if (!this.info.equals(tmp0_other_with_cast.info)) return false;
    if (!equals(this.conversations, tmp0_other_with_cast.conversations)) return false;
    if (!equals(this.messages, tmp0_other_with_cast.messages)) return false;
    if (!equals(this.users, tmp0_other_with_cast.users)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_3() {
    Companion_instance_1 = this;
    var tmp = this;
    var tmp_0 = getKClass(BackupInfo);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(5);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(5);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_3(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'platform', 1, tmp1_type, platform$factory(), VOID, 'platform'),
    );
    var tmp2_messageDescriptor = descriptor$factory_4(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'version', 2, tmp3_type, version$factory(), VOID, 'version'),
    );
    var tmp4_messageDescriptor = descriptor$factory_5(this);
    var tmp5_type = new Message(Companion_getInstance_5());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'userId', 3, tmp5_type, userId$factory(), VOID, 'userId'),
    );
    var tmp6_messageDescriptor = descriptor$factory_6(this);
    var tmp7_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'creation_time',
        4,
        tmp7_type,
        creationTime$factory(),
        VOID,
        'creationTime',
      ),
    );
    var tmp8_messageDescriptor = descriptor$factory_7(this);
    var tmp9_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp8_messageDescriptor, 'clientId', 5, tmp9_type, clientId$factory(), VOID, 'clientId'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('BackupInfo', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_3).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_0(Companion_getInstance_3(), u);
  };
  protoOf(Companion_3).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_1;
  function Companion_getInstance_3() {
    if (Companion_instance_1 == null) new Companion_3();
    return Companion_instance_1;
  }
  function BackupInfo$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function BackupInfo(platform, version, userId, creationTime, clientId, unknownFields) {
    Companion_getInstance_3();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.platform = platform;
    this.version = version;
    this.userId = userId;
    this.creationTime = creationTime;
    this.clientId = clientId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(BackupInfo$protoSize$delegate$lambda(this));
  }
  protoOf(BackupInfo).get_platform_ssr7o_k$ = function () {
    return this.platform;
  };
  protoOf(BackupInfo).get_version_72w4j3_k$ = function () {
    return this.version;
  };
  protoOf(BackupInfo).get_userId_kl13yn_k$ = function () {
    return this.userId;
  };
  protoOf(BackupInfo).get_creationTime_uru4d1_k$ = function () {
    return this.creationTime;
  };
  protoOf(BackupInfo).get_clientId_gs3e9d_k$ = function () {
    return this.clientId;
  };
  protoOf(BackupInfo).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(BackupInfo).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_0(this, other);
  };
  protoOf(BackupInfo).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_3().descriptor_1;
  };
  protoOf(BackupInfo).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_0();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(BackupInfo).component1_7eebsc_k$ = function () {
    return this.platform;
  };
  protoOf(BackupInfo).component2_7eebsb_k$ = function () {
    return this.version;
  };
  protoOf(BackupInfo).component3_7eebsa_k$ = function () {
    return this.userId;
  };
  protoOf(BackupInfo).component4_7eebs9_k$ = function () {
    return this.creationTime;
  };
  protoOf(BackupInfo).component5_7eebs8_k$ = function () {
    return this.clientId;
  };
  protoOf(BackupInfo).component6_7eebs7_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(BackupInfo).copy_yodahu_k$ = function (platform, version, userId, creationTime, clientId, unknownFields) {
    return new BackupInfo(platform, version, userId, creationTime, clientId, unknownFields);
  };
  protoOf(BackupInfo).copy = function (platform, version, userId, creationTime, clientId, unknownFields, $super) {
    platform = platform === VOID ? this.platform : platform;
    version = version === VOID ? this.version : version;
    userId = userId === VOID ? this.userId : userId;
    creationTime = creationTime === VOID ? this.creationTime : creationTime;
    clientId = clientId === VOID ? this.clientId : clientId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_yodahu_k$(platform, version, userId, creationTime, clientId, unknownFields);
  };
  protoOf(BackupInfo).toString = function () {
    return (
      'BackupInfo(platform=' +
      this.platform +
      ', version=' +
      this.version +
      ', userId=' +
      this.userId +
      ', creationTime=' +
      this.creationTime.toString() +
      ', clientId=' +
      this.clientId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(BackupInfo).hashCode = function () {
    var result = getStringHashCode(this.platform);
    result = (imul(result, 31) + getStringHashCode(this.version)) | 0;
    result = (imul(result, 31) + this.userId.hashCode()) | 0;
    result = (imul(result, 31) + this.creationTime.hashCode()) | 0;
    result = (imul(result, 31) + getStringHashCode(this.clientId)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(BackupInfo).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof BackupInfo)) return false;
    var tmp0_other_with_cast = other instanceof BackupInfo ? other : THROW_CCE();
    if (!(this.platform === tmp0_other_with_cast.platform)) return false;
    if (!(this.version === tmp0_other_with_cast.version)) return false;
    if (!this.userId.equals(tmp0_other_with_cast.userId)) return false;
    if (!this.creationTime.equals(tmp0_other_with_cast.creationTime)) return false;
    if (!(this.clientId === tmp0_other_with_cast.clientId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_4() {
    Companion_instance_2 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportUser);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_8(this);
    var tmp1_type = new Message(Companion_getInstance_5());
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'id', 1, tmp1_type, id$factory(), VOID, 'id'));
    var tmp2_messageDescriptor = descriptor$factory_9(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'name', 2, tmp3_type, name$factory(), VOID, 'name'),
    );
    var tmp4_messageDescriptor = descriptor$factory_10(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'handle', 3, tmp5_type, handle$factory(), VOID, 'handle'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportUser', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_4).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_1(Companion_getInstance_4(), u);
  };
  protoOf(Companion_4).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_2;
  function Companion_getInstance_4() {
    if (Companion_instance_2 == null) new Companion_4();
    return Companion_instance_2;
  }
  function ExportUser$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportUser(id, name, handle, unknownFields) {
    Companion_getInstance_4();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.id = id;
    this.name = name;
    this.handle = handle;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportUser$protoSize$delegate$lambda(this));
  }
  protoOf(ExportUser).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(ExportUser).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(ExportUser).get_handle_e5p7ht_k$ = function () {
    return this.handle;
  };
  protoOf(ExportUser).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportUser).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_1(this, other);
  };
  protoOf(ExportUser).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_4().descriptor_1;
  };
  protoOf(ExportUser).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_1();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportUser).component1_7eebsc_k$ = function () {
    return this.id;
  };
  protoOf(ExportUser).component2_7eebsb_k$ = function () {
    return this.name;
  };
  protoOf(ExportUser).component3_7eebsa_k$ = function () {
    return this.handle;
  };
  protoOf(ExportUser).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportUser).copy_9vyqza_k$ = function (id, name, handle, unknownFields) {
    return new ExportUser(id, name, handle, unknownFields);
  };
  protoOf(ExportUser).copy = function (id, name, handle, unknownFields, $super) {
    id = id === VOID ? this.id : id;
    name = name === VOID ? this.name : name;
    handle = handle === VOID ? this.handle : handle;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_9vyqza_k$(id, name, handle, unknownFields);
  };
  protoOf(ExportUser).toString = function () {
    return (
      'ExportUser(id=' +
      this.id +
      ', name=' +
      this.name +
      ', handle=' +
      this.handle +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportUser).hashCode = function () {
    var result = this.id.hashCode();
    result = (imul(result, 31) + getStringHashCode(this.name)) | 0;
    result = (imul(result, 31) + getStringHashCode(this.handle)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportUser).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportUser)) return false;
    var tmp0_other_with_cast = other instanceof ExportUser ? other : THROW_CCE();
    if (!this.id.equals(tmp0_other_with_cast.id)) return false;
    if (!(this.name === tmp0_other_with_cast.name)) return false;
    if (!(this.handle === tmp0_other_with_cast.handle)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_5() {
    Companion_instance_3 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedQualifiedId);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_11(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'value', 1, tmp1_type, value$factory(), VOID, 'value'),
    );
    var tmp2_messageDescriptor = descriptor$factory_12(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'domain', 2, tmp3_type, domain$factory(), VOID, 'domain'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedQualifiedId', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_5).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_2(Companion_getInstance_5(), u);
  };
  protoOf(Companion_5).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_3;
  function Companion_getInstance_5() {
    if (Companion_instance_3 == null) new Companion_5();
    return Companion_instance_3;
  }
  function ExportedQualifiedId$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedQualifiedId(value, domain, unknownFields) {
    Companion_getInstance_5();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.value = value;
    this.domain = domain;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedQualifiedId$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedQualifiedId).get_value_j01efc_k$ = function () {
    return this.value;
  };
  protoOf(ExportedQualifiedId).get_domain_ch74y5_k$ = function () {
    return this.domain;
  };
  protoOf(ExportedQualifiedId).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedQualifiedId).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_2(this, other);
  };
  protoOf(ExportedQualifiedId).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_5().descriptor_1;
  };
  protoOf(ExportedQualifiedId).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_2();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedQualifiedId).component1_7eebsc_k$ = function () {
    return this.value;
  };
  protoOf(ExportedQualifiedId).component2_7eebsb_k$ = function () {
    return this.domain;
  };
  protoOf(ExportedQualifiedId).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedQualifiedId).copy_5bhor2_k$ = function (value, domain, unknownFields) {
    return new ExportedQualifiedId(value, domain, unknownFields);
  };
  protoOf(ExportedQualifiedId).copy = function (value, domain, unknownFields, $super) {
    value = value === VOID ? this.value : value;
    domain = domain === VOID ? this.domain : domain;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5bhor2_k$(value, domain, unknownFields);
  };
  protoOf(ExportedQualifiedId).toString = function () {
    return (
      'ExportedQualifiedId(value=' +
      this.value +
      ', domain=' +
      this.domain +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedQualifiedId).hashCode = function () {
    var result = getStringHashCode(this.value);
    result = (imul(result, 31) + getStringHashCode(this.domain)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedQualifiedId).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedQualifiedId)) return false;
    var tmp0_other_with_cast = other instanceof ExportedQualifiedId ? other : THROW_CCE();
    if (!(this.value === tmp0_other_with_cast.value)) return false;
    if (!(this.domain === tmp0_other_with_cast.domain)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_6() {
    Companion_instance_4 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedConversation);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_13(this);
    var tmp1_type = new Message(Companion_getInstance_5());
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'id', 1, tmp1_type, id$factory_0(), VOID, 'id'));
    var tmp2_messageDescriptor = descriptor$factory_14(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'name', 2, tmp3_type, name$factory_0(), VOID, 'name'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedConversation', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_6).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_3(Companion_getInstance_6(), u);
  };
  protoOf(Companion_6).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_4;
  function Companion_getInstance_6() {
    if (Companion_instance_4 == null) new Companion_6();
    return Companion_instance_4;
  }
  function ExportedConversation$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedConversation(id, name, unknownFields) {
    Companion_getInstance_6();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.id = id;
    this.name = name;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedConversation$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedConversation).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(ExportedConversation).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(ExportedConversation).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedConversation).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_3(this, other);
  };
  protoOf(ExportedConversation).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_6().descriptor_1;
  };
  protoOf(ExportedConversation).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_3();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedConversation).component1_7eebsc_k$ = function () {
    return this.id;
  };
  protoOf(ExportedConversation).component2_7eebsb_k$ = function () {
    return this.name;
  };
  protoOf(ExportedConversation).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedConversation).copy_8p72da_k$ = function (id, name, unknownFields) {
    return new ExportedConversation(id, name, unknownFields);
  };
  protoOf(ExportedConversation).copy = function (id, name, unknownFields, $super) {
    id = id === VOID ? this.id : id;
    name = name === VOID ? this.name : name;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_8p72da_k$(id, name, unknownFields);
  };
  protoOf(ExportedConversation).toString = function () {
    return (
      'ExportedConversation(id=' + this.id + ', name=' + this.name + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(ExportedConversation).hashCode = function () {
    var result = this.id.hashCode();
    result = (imul(result, 31) + getStringHashCode(this.name)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedConversation).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedConversation)) return false;
    var tmp0_other_with_cast = other instanceof ExportedConversation ? other : THROW_CCE();
    if (!this.id.equals(tmp0_other_with_cast.id)) return false;
    if (!(this.name === tmp0_other_with_cast.name)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Text(text) {
    Content.call(this, text);
  }
  function Asset(asset) {
    Content.call(this, asset);
  }
  function Location(location) {
    Content.call(this, location);
  }
  function Content(value) {
    OneOf.call(this, value);
  }
  function Companion_7() {
    Companion_instance_5 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedMessage);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(9);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(9);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_15(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'id', 1, tmp1_type, id$factory_1(), VOID, 'id'));
    var tmp2_messageDescriptor = descriptor$factory_16(this);
    var tmp3_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'time_iso', 2, tmp3_type, timeIso$factory(), VOID, 'timeIso'),
    );
    var tmp4_messageDescriptor = descriptor$factory_17(this);
    var tmp5_type = new Message(Companion_getInstance_5());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'sender_user_id',
        3,
        tmp5_type,
        senderUserId$factory(),
        VOID,
        'senderUserId',
      ),
    );
    var tmp6_messageDescriptor = descriptor$factory_18(this);
    var tmp7_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'sender_client_id',
        4,
        tmp7_type,
        senderClientId$factory(),
        VOID,
        'senderClientId',
      ),
    );
    var tmp8_messageDescriptor = descriptor$factory_19(this);
    var tmp9_type = new Message(Companion_getInstance_5());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'conversation_id',
        5,
        tmp9_type,
        conversationId$factory(),
        VOID,
        'conversationId',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_20(this);
    var tmp11_type = new Message(Companion_getInstance_8());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'text', 6, tmp11_type, text$factory(), true, 'text'),
    );
    var tmp12_messageDescriptor = descriptor$factory_21(this);
    var tmp13_type = new Message(Companion_getInstance_9());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp12_messageDescriptor, 'asset', 7, tmp13_type, asset$factory(), true, 'asset'),
    );
    var tmp14_messageDescriptor = descriptor$factory_22(this);
    var tmp15_type = new Message(Companion_getInstance_14());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp14_messageDescriptor, 'location', 8, tmp15_type, location$factory(), true, 'location'),
    );
    var tmp16_messageDescriptor = descriptor$factory_23(this);
    var tmp17_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp16_messageDescriptor, 'web_pk', 9, tmp17_type, webPk$factory(), VOID, 'webPk'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedMessage', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_7).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_4(Companion_getInstance_7(), u);
  };
  protoOf(Companion_7).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_5;
  function Companion_getInstance_7() {
    if (Companion_instance_5 == null) new Companion_7();
    return Companion_instance_5;
  }
  function ExportedMessage$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedMessage(id, timeIso, senderUserId, senderClientId, conversationId, webPk, content, unknownFields) {
    Companion_getInstance_7();
    webPk = webPk === VOID ? null : webPk;
    content = content === VOID ? null : content;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.id = id;
    this.timeIso = timeIso;
    this.senderUserId = senderUserId;
    this.senderClientId = senderClientId;
    this.conversationId = conversationId;
    this.webPk = webPk;
    this.content = content;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedMessage$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedMessage).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(ExportedMessage).get_timeIso_kgqir5_k$ = function () {
    return this.timeIso;
  };
  protoOf(ExportedMessage).get_senderUserId_jvef50_k$ = function () {
    return this.senderUserId;
  };
  protoOf(ExportedMessage).get_senderClientId_9ccias_k$ = function () {
    return this.senderClientId;
  };
  protoOf(ExportedMessage).get_conversationId_5n2cxz_k$ = function () {
    return this.conversationId;
  };
  protoOf(ExportedMessage).get_webPk_j0nio6_k$ = function () {
    return this.webPk;
  };
  protoOf(ExportedMessage).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(ExportedMessage).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedMessage).get_text_wouvsm_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Text ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedMessage).get_asset_iotcjr_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Asset ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedMessage).get_location_d3s02_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Location ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedMessage).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_4(this, other);
  };
  protoOf(ExportedMessage).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_7().descriptor_1;
  };
  protoOf(ExportedMessage).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_4();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedMessage).component1_7eebsc_k$ = function () {
    return this.id;
  };
  protoOf(ExportedMessage).component2_7eebsb_k$ = function () {
    return this.timeIso;
  };
  protoOf(ExportedMessage).component3_7eebsa_k$ = function () {
    return this.senderUserId;
  };
  protoOf(ExportedMessage).component4_7eebs9_k$ = function () {
    return this.senderClientId;
  };
  protoOf(ExportedMessage).component5_7eebs8_k$ = function () {
    return this.conversationId;
  };
  protoOf(ExportedMessage).component6_7eebs7_k$ = function () {
    return this.webPk;
  };
  protoOf(ExportedMessage).component7_7eebs6_k$ = function () {
    return this.content;
  };
  protoOf(ExportedMessage).component8_7eebs5_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedMessage).copy_dlsck2_k$ = function (
    id,
    timeIso,
    senderUserId,
    senderClientId,
    conversationId,
    webPk,
    content,
    unknownFields,
  ) {
    return new ExportedMessage(
      id,
      timeIso,
      senderUserId,
      senderClientId,
      conversationId,
      webPk,
      content,
      unknownFields,
    );
  };
  protoOf(ExportedMessage).copy = function (
    id,
    timeIso,
    senderUserId,
    senderClientId,
    conversationId,
    webPk,
    content,
    unknownFields,
    $super,
  ) {
    id = id === VOID ? this.id : id;
    timeIso = timeIso === VOID ? this.timeIso : timeIso;
    senderUserId = senderUserId === VOID ? this.senderUserId : senderUserId;
    senderClientId = senderClientId === VOID ? this.senderClientId : senderClientId;
    conversationId = conversationId === VOID ? this.conversationId : conversationId;
    webPk = webPk === VOID ? this.webPk : webPk;
    content = content === VOID ? this.content : content;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_dlsck2_k$(
      id,
      timeIso,
      senderUserId,
      senderClientId,
      conversationId,
      webPk,
      content,
      unknownFields,
    );
  };
  protoOf(ExportedMessage).toString = function () {
    return (
      'ExportedMessage(id=' +
      this.id +
      ', timeIso=' +
      this.timeIso.toString() +
      ', senderUserId=' +
      this.senderUserId +
      ', senderClientId=' +
      this.senderClientId +
      ', conversationId=' +
      this.conversationId +
      ', webPk=' +
      toString(this.webPk) +
      ', content=' +
      this.content +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedMessage).hashCode = function () {
    var result = getStringHashCode(this.id);
    result = (imul(result, 31) + this.timeIso.hashCode()) | 0;
    result = (imul(result, 31) + this.senderUserId.hashCode()) | 0;
    result = (imul(result, 31) + getStringHashCode(this.senderClientId)) | 0;
    result = (imul(result, 31) + this.conversationId.hashCode()) | 0;
    result = (imul(result, 31) + (this.webPk == null ? 0 : this.webPk.hashCode())) | 0;
    result = (imul(result, 31) + (this.content == null ? 0 : this.content.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedMessage).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedMessage)) return false;
    var tmp0_other_with_cast = other instanceof ExportedMessage ? other : THROW_CCE();
    if (!(this.id === tmp0_other_with_cast.id)) return false;
    if (!this.timeIso.equals(tmp0_other_with_cast.timeIso)) return false;
    if (!this.senderUserId.equals(tmp0_other_with_cast.senderUserId)) return false;
    if (!(this.senderClientId === tmp0_other_with_cast.senderClientId)) return false;
    if (!this.conversationId.equals(tmp0_other_with_cast.conversationId)) return false;
    if (!equals(this.webPk, tmp0_other_with_cast.webPk)) return false;
    if (!equals(this.content, tmp0_other_with_cast.content)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_8() {
    Companion_instance_6 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedText);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_24(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'content', 1, tmp1_type, content$factory(), VOID, 'content'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedText', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_8).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_5(Companion_getInstance_8(), u);
  };
  protoOf(Companion_8).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_6;
  function Companion_getInstance_8() {
    if (Companion_instance_6 == null) new Companion_8();
    return Companion_instance_6;
  }
  function ExportedText$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedText(content, unknownFields) {
    Companion_getInstance_8();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.content = content;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedText$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedText).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(ExportedText).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedText).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_5(this, other);
  };
  protoOf(ExportedText).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_8().descriptor_1;
  };
  protoOf(ExportedText).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_5();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedText).component1_7eebsc_k$ = function () {
    return this.content;
  };
  protoOf(ExportedText).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedText).copy_m2jrby_k$ = function (content, unknownFields) {
    return new ExportedText(content, unknownFields);
  };
  protoOf(ExportedText).copy = function (content, unknownFields, $super) {
    content = content === VOID ? this.content : content;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_m2jrby_k$(content, unknownFields);
  };
  protoOf(ExportedText).toString = function () {
    return 'ExportedText(content=' + this.content + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(ExportedText).hashCode = function () {
    var result = getStringHashCode(this.content);
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedText).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedText)) return false;
    var tmp0_other_with_cast = other instanceof ExportedText ? other : THROW_CCE();
    if (!(this.content === tmp0_other_with_cast.content)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Image(image) {
    MetaData.call(this, image);
  }
  function Video(video) {
    MetaData.call(this, video);
  }
  function Audio(audio) {
    MetaData.call(this, audio);
  }
  function Generic(generic) {
    MetaData.call(this, generic);
  }
  function MetaData(value) {
    OneOf.call(this, value);
  }
  function Companion_9() {
    Companion_instance_7 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedAsset);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(13);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(13);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_25(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'mimetype', 1, tmp1_type, mimetype$factory(), VOID, 'mimetype'),
    );
    var tmp2_messageDescriptor = descriptor$factory_26(this);
    var tmp3_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'size', 2, tmp3_type, size$factory(), VOID, 'size'),
    );
    var tmp4_messageDescriptor = descriptor$factory_27(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'name', 3, tmp5_type, name$factory_1(), VOID, 'name'),
    );
    var tmp6_messageDescriptor = descriptor$factory_28(this);
    var tmp7_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'otr_key', 4, tmp7_type, otrKey$factory(), VOID, 'otrKey'),
    );
    var tmp8_messageDescriptor = descriptor$factory_29(this);
    var tmp9_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp8_messageDescriptor, 'sha256', 5, tmp9_type, sha256$factory(), VOID, 'sha256'),
    );
    var tmp10_messageDescriptor = descriptor$factory_30(this);
    var tmp11_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'asset_id', 6, tmp11_type, assetId$factory(), VOID, 'assetId'),
    );
    var tmp12_messageDescriptor = descriptor$factory_31(this);
    var tmp13_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp12_messageDescriptor,
        'asset_token',
        7,
        tmp13_type,
        assetToken$factory(),
        VOID,
        'assetToken',
      ),
    );
    var tmp14_messageDescriptor = descriptor$factory_32(this);
    var tmp15_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp14_messageDescriptor,
        'asset_domain',
        8,
        tmp15_type,
        assetDomain$factory(),
        VOID,
        'assetDomain',
      ),
    );
    var tmp16_messageDescriptor = descriptor$factory_33(this);
    var tmp17_type = new Enum_0(Companion_getInstance_1(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp16_messageDescriptor,
        'encryption',
        9,
        tmp17_type,
        encryption$factory(),
        VOID,
        'encryption',
      ),
    );
    var tmp18_messageDescriptor = descriptor$factory_34(this);
    var tmp19_type = new Message(Companion_getInstance_10());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp18_messageDescriptor, 'image', 10, tmp19_type, image$factory(), true, 'image'),
    );
    var tmp20_messageDescriptor = descriptor$factory_35(this);
    var tmp21_type = new Message(Companion_getInstance_11());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp20_messageDescriptor, 'video', 11, tmp21_type, video$factory(), true, 'video'),
    );
    var tmp22_messageDescriptor = descriptor$factory_36(this);
    var tmp23_type = new Message(Companion_getInstance_12());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp22_messageDescriptor, 'audio', 12, tmp23_type, audio$factory(), true, 'audio'),
    );
    var tmp24_messageDescriptor = descriptor$factory_37(this);
    var tmp25_type = new Message(Companion_getInstance_13());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp24_messageDescriptor, 'generic', 13, tmp25_type, generic$factory(), true, 'generic'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedAsset', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_9).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_6(Companion_getInstance_9(), u);
  };
  protoOf(Companion_9).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_7;
  function Companion_getInstance_9() {
    if (Companion_instance_7 == null) new Companion_9();
    return Companion_instance_7;
  }
  function ExportedAsset$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedAsset(
    mimetype,
    size,
    name,
    otrKey,
    sha256,
    assetId,
    assetToken,
    assetDomain,
    encryption,
    metaData,
    unknownFields,
  ) {
    Companion_getInstance_9();
    name = name === VOID ? null : name;
    assetToken = assetToken === VOID ? null : assetToken;
    assetDomain = assetDomain === VOID ? null : assetDomain;
    encryption = encryption === VOID ? null : encryption;
    metaData = metaData === VOID ? null : metaData;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.mimetype = mimetype;
    this.size = size;
    this.name = name;
    this.otrKey = otrKey;
    this.sha256 = sha256;
    this.assetId = assetId;
    this.assetToken = assetToken;
    this.assetDomain = assetDomain;
    this.encryption = encryption;
    this.metaData = metaData;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedAsset$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedAsset).get_mimetype_g7wrw7_k$ = function () {
    return this.mimetype;
  };
  protoOf(ExportedAsset).get_size_woubt6_k$ = function () {
    return this.size;
  };
  protoOf(ExportedAsset).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(ExportedAsset).get_otrKey_hriosb_k$ = function () {
    return this.otrKey;
  };
  protoOf(ExportedAsset).get_sha256_jgs8q8_k$ = function () {
    return this.sha256;
  };
  protoOf(ExportedAsset).get_assetId_ae1upq_k$ = function () {
    return this.assetId;
  };
  protoOf(ExportedAsset).get_assetToken_evm1rm_k$ = function () {
    return this.assetToken;
  };
  protoOf(ExportedAsset).get_assetDomain_rgmfl7_k$ = function () {
    return this.assetDomain;
  };
  protoOf(ExportedAsset).get_encryption_pua0p8_k$ = function () {
    return this.encryption;
  };
  protoOf(ExportedAsset).get_metaData_vroqag_k$ = function () {
    return this.metaData;
  };
  protoOf(ExportedAsset).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedAsset).get_image_it3i2a_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Image ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedAsset).get_video_j06c0i_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Video ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedAsset).get_audio_ioubhp_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Audio ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedAsset).get_generic_25wk2_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Generic ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(ExportedAsset).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_6(this, other);
  };
  protoOf(ExportedAsset).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_9().descriptor_1;
  };
  protoOf(ExportedAsset).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_6();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedAsset).component1_7eebsc_k$ = function () {
    return this.mimetype;
  };
  protoOf(ExportedAsset).component2_7eebsb_k$ = function () {
    return this.size;
  };
  protoOf(ExportedAsset).component3_7eebsa_k$ = function () {
    return this.name;
  };
  protoOf(ExportedAsset).component4_7eebs9_k$ = function () {
    return this.otrKey;
  };
  protoOf(ExportedAsset).component5_7eebs8_k$ = function () {
    return this.sha256;
  };
  protoOf(ExportedAsset).component6_7eebs7_k$ = function () {
    return this.assetId;
  };
  protoOf(ExportedAsset).component7_7eebs6_k$ = function () {
    return this.assetToken;
  };
  protoOf(ExportedAsset).component8_7eebs5_k$ = function () {
    return this.assetDomain;
  };
  protoOf(ExportedAsset).component9_7eebs4_k$ = function () {
    return this.encryption;
  };
  protoOf(ExportedAsset).component10_gazzfo_k$ = function () {
    return this.metaData;
  };
  protoOf(ExportedAsset).component11_gazzfn_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedAsset).copy_sc0s40_k$ = function (
    mimetype,
    size,
    name,
    otrKey,
    sha256,
    assetId,
    assetToken,
    assetDomain,
    encryption,
    metaData,
    unknownFields,
  ) {
    return new ExportedAsset(
      mimetype,
      size,
      name,
      otrKey,
      sha256,
      assetId,
      assetToken,
      assetDomain,
      encryption,
      metaData,
      unknownFields,
    );
  };
  protoOf(ExportedAsset).copy = function (
    mimetype,
    size,
    name,
    otrKey,
    sha256,
    assetId,
    assetToken,
    assetDomain,
    encryption,
    metaData,
    unknownFields,
    $super,
  ) {
    mimetype = mimetype === VOID ? this.mimetype : mimetype;
    size = size === VOID ? this.size : size;
    name = name === VOID ? this.name : name;
    otrKey = otrKey === VOID ? this.otrKey : otrKey;
    sha256 = sha256 === VOID ? this.sha256 : sha256;
    assetId = assetId === VOID ? this.assetId : assetId;
    assetToken = assetToken === VOID ? this.assetToken : assetToken;
    assetDomain = assetDomain === VOID ? this.assetDomain : assetDomain;
    encryption = encryption === VOID ? this.encryption : encryption;
    metaData = metaData === VOID ? this.metaData : metaData;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_sc0s40_k$(
      mimetype,
      size,
      name,
      otrKey,
      sha256,
      assetId,
      assetToken,
      assetDomain,
      encryption,
      metaData,
      unknownFields,
    );
  };
  protoOf(ExportedAsset).toString = function () {
    return (
      'ExportedAsset(mimetype=' +
      this.mimetype +
      ', size=' +
      this.size.toString() +
      ', name=' +
      this.name +
      ', otrKey=' +
      this.otrKey +
      ', sha256=' +
      this.sha256 +
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
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedAsset).hashCode = function () {
    var result = getStringHashCode(this.mimetype);
    result = (imul(result, 31) + this.size.hashCode()) | 0;
    result = (imul(result, 31) + (this.name == null ? 0 : getStringHashCode(this.name))) | 0;
    result = (imul(result, 31) + this.otrKey.hashCode()) | 0;
    result = (imul(result, 31) + this.sha256.hashCode()) | 0;
    result = (imul(result, 31) + getStringHashCode(this.assetId)) | 0;
    result = (imul(result, 31) + (this.assetToken == null ? 0 : getStringHashCode(this.assetToken))) | 0;
    result = (imul(result, 31) + (this.assetDomain == null ? 0 : getStringHashCode(this.assetDomain))) | 0;
    result = (imul(result, 31) + (this.encryption == null ? 0 : this.encryption.hashCode())) | 0;
    result = (imul(result, 31) + (this.metaData == null ? 0 : this.metaData.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedAsset).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedAsset)) return false;
    var tmp0_other_with_cast = other instanceof ExportedAsset ? other : THROW_CCE();
    if (!(this.mimetype === tmp0_other_with_cast.mimetype)) return false;
    if (!this.size.equals(tmp0_other_with_cast.size)) return false;
    if (!(this.name == tmp0_other_with_cast.name)) return false;
    if (!this.otrKey.equals(tmp0_other_with_cast.otrKey)) return false;
    if (!this.sha256.equals(tmp0_other_with_cast.sha256)) return false;
    if (!(this.assetId === tmp0_other_with_cast.assetId)) return false;
    if (!(this.assetToken == tmp0_other_with_cast.assetToken)) return false;
    if (!(this.assetDomain == tmp0_other_with_cast.assetDomain)) return false;
    if (!equals(this.encryption, tmp0_other_with_cast.encryption)) return false;
    if (!equals(this.metaData, tmp0_other_with_cast.metaData)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_10() {
    Companion_instance_8 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedImageMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_38(this);
    var tmp1_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'width', 1, tmp1_type, width$factory(), VOID, 'width'),
    );
    var tmp2_messageDescriptor = descriptor$factory_39(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'height', 2, tmp3_type, height$factory(), VOID, 'height'),
    );
    var tmp4_messageDescriptor = descriptor$factory_40(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp4_messageDescriptor, 'tag', 3, tmp5_type, tag$factory(), VOID, 'tag'));
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedImageMetaData', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_10).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_7(Companion_getInstance_10(), u);
  };
  protoOf(Companion_10).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_8;
  function Companion_getInstance_10() {
    if (Companion_instance_8 == null) new Companion_10();
    return Companion_instance_8;
  }
  function ExportedImageMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedImageMetaData(width, height, tag, unknownFields) {
    Companion_getInstance_10();
    tag = tag === VOID ? null : tag;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.width = width;
    this.height = height;
    this.tag = tag;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedImageMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedImageMetaData).get_width_j0q4yl_k$ = function () {
    return this.width;
  };
  protoOf(ExportedImageMetaData).get_height_e7t92o_k$ = function () {
    return this.height;
  };
  protoOf(ExportedImageMetaData).get_tag_18ivnz_k$ = function () {
    return this.tag;
  };
  protoOf(ExportedImageMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedImageMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_7(this, other);
  };
  protoOf(ExportedImageMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_10().descriptor_1;
  };
  protoOf(ExportedImageMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_7();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedImageMetaData).component1_7eebsc_k$ = function () {
    return this.width;
  };
  protoOf(ExportedImageMetaData).component2_7eebsb_k$ = function () {
    return this.height;
  };
  protoOf(ExportedImageMetaData).component3_7eebsa_k$ = function () {
    return this.tag;
  };
  protoOf(ExportedImageMetaData).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedImageMetaData).copy_4ijz4l_k$ = function (width, height, tag, unknownFields) {
    return new ExportedImageMetaData(width, height, tag, unknownFields);
  };
  protoOf(ExportedImageMetaData).copy = function (width, height, tag, unknownFields, $super) {
    width = width === VOID ? this.width : width;
    height = height === VOID ? this.height : height;
    tag = tag === VOID ? this.tag : tag;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_4ijz4l_k$(width, height, tag, unknownFields);
  };
  protoOf(ExportedImageMetaData).toString = function () {
    return (
      'ExportedImageMetaData(width=' +
      this.width +
      ', height=' +
      this.height +
      ', tag=' +
      this.tag +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedImageMetaData).hashCode = function () {
    var result = this.width;
    result = (imul(result, 31) + this.height) | 0;
    result = (imul(result, 31) + (this.tag == null ? 0 : getStringHashCode(this.tag))) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedImageMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedImageMetaData)) return false;
    var tmp0_other_with_cast = other instanceof ExportedImageMetaData ? other : THROW_CCE();
    if (!(this.width === tmp0_other_with_cast.width)) return false;
    if (!(this.height === tmp0_other_with_cast.height)) return false;
    if (!(this.tag == tmp0_other_with_cast.tag)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ExportedVideoMetaData$Companion$defaultInstance$delegate$lambda() {
    return new ExportedVideoMetaData();
  }
  function Companion_11() {
    Companion_instance_9 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ExportedVideoMetaData$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(ExportedVideoMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_41(this);
    var tmp1_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'width', 1, tmp1_type, width$factory_0(), VOID, 'width'),
    );
    var tmp2_messageDescriptor = descriptor$factory_42(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'height', 2, tmp3_type, height$factory_0(), VOID, 'height'),
    );
    var tmp4_messageDescriptor = descriptor$factory_43(this);
    var tmp5_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'duration_in_millis',
        3,
        tmp5_type,
        durationInMillis$factory(),
        VOID,
        'durationInMillis',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('ExportedVideoMetaData', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_11).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_11).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_8(Companion_getInstance_11(), u);
  };
  protoOf(Companion_11).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_9;
  function Companion_getInstance_11() {
    if (Companion_instance_9 == null) new Companion_11();
    return Companion_instance_9;
  }
  function ExportedVideoMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedVideoMetaData(width, height, durationInMillis, unknownFields) {
    Companion_getInstance_11();
    width = width === VOID ? null : width;
    height = height === VOID ? null : height;
    durationInMillis = durationInMillis === VOID ? null : durationInMillis;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.width = width;
    this.height = height;
    this.durationInMillis = durationInMillis;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedVideoMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedVideoMetaData).get_width_j0q4yl_k$ = function () {
    return this.width;
  };
  protoOf(ExportedVideoMetaData).get_height_e7t92o_k$ = function () {
    return this.height;
  };
  protoOf(ExportedVideoMetaData).get_durationInMillis_vuodko_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(ExportedVideoMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedVideoMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_8(this, other);
  };
  protoOf(ExportedVideoMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_11().descriptor_1;
  };
  protoOf(ExportedVideoMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_8();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedVideoMetaData).component1_7eebsc_k$ = function () {
    return this.width;
  };
  protoOf(ExportedVideoMetaData).component2_7eebsb_k$ = function () {
    return this.height;
  };
  protoOf(ExportedVideoMetaData).component3_7eebsa_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(ExportedVideoMetaData).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedVideoMetaData).copy_hbafz3_k$ = function (width, height, durationInMillis, unknownFields) {
    return new ExportedVideoMetaData(width, height, durationInMillis, unknownFields);
  };
  protoOf(ExportedVideoMetaData).copy = function (width, height, durationInMillis, unknownFields, $super) {
    width = width === VOID ? this.width : width;
    height = height === VOID ? this.height : height;
    durationInMillis = durationInMillis === VOID ? this.durationInMillis : durationInMillis;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_hbafz3_k$(width, height, durationInMillis, unknownFields);
  };
  protoOf(ExportedVideoMetaData).toString = function () {
    return (
      'ExportedVideoMetaData(width=' +
      this.width +
      ', height=' +
      this.height +
      ', durationInMillis=' +
      toString(this.durationInMillis) +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedVideoMetaData).hashCode = function () {
    var result = this.width == null ? 0 : this.width;
    result = (imul(result, 31) + (this.height == null ? 0 : this.height)) | 0;
    result = (imul(result, 31) + (this.durationInMillis == null ? 0 : this.durationInMillis.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedVideoMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedVideoMetaData)) return false;
    var tmp0_other_with_cast = other instanceof ExportedVideoMetaData ? other : THROW_CCE();
    if (!(this.width == tmp0_other_with_cast.width)) return false;
    if (!(this.height == tmp0_other_with_cast.height)) return false;
    if (!equals(this.durationInMillis, tmp0_other_with_cast.durationInMillis)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ExportedAudioMetaData$Companion$defaultInstance$delegate$lambda() {
    return new ExportedAudioMetaData();
  }
  function Companion_12() {
    Companion_instance_10 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ExportedAudioMetaData$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(ExportedAudioMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_44(this);
    var tmp1_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'duration_in_millis',
        1,
        tmp1_type,
        durationInMillis$factory_0(),
        VOID,
        'durationInMillis',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_45(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'normalized_loudness',
        2,
        tmp3_type,
        normalizedLoudness$factory(),
        VOID,
        'normalizedLoudness',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('ExportedAudioMetaData', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_12).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_0();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_12).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_9(Companion_getInstance_12(), u);
  };
  protoOf(Companion_12).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_10;
  function Companion_getInstance_12() {
    if (Companion_instance_10 == null) new Companion_12();
    return Companion_instance_10;
  }
  function ExportedAudioMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedAudioMetaData(durationInMillis, normalizedLoudness, unknownFields) {
    Companion_getInstance_12();
    durationInMillis = durationInMillis === VOID ? null : durationInMillis;
    normalizedLoudness = normalizedLoudness === VOID ? null : normalizedLoudness;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.durationInMillis = durationInMillis;
    this.normalizedLoudness = normalizedLoudness;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedAudioMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedAudioMetaData).get_durationInMillis_vuodko_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(ExportedAudioMetaData).get_normalizedLoudness_kftkfr_k$ = function () {
    return this.normalizedLoudness;
  };
  protoOf(ExportedAudioMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedAudioMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_9(this, other);
  };
  protoOf(ExportedAudioMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_12().descriptor_1;
  };
  protoOf(ExportedAudioMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_9();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedAudioMetaData).component1_7eebsc_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(ExportedAudioMetaData).component2_7eebsb_k$ = function () {
    return this.normalizedLoudness;
  };
  protoOf(ExportedAudioMetaData).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedAudioMetaData).copy_6tzd1m_k$ = function (durationInMillis, normalizedLoudness, unknownFields) {
    return new ExportedAudioMetaData(durationInMillis, normalizedLoudness, unknownFields);
  };
  protoOf(ExportedAudioMetaData).copy = function (durationInMillis, normalizedLoudness, unknownFields, $super) {
    durationInMillis = durationInMillis === VOID ? this.durationInMillis : durationInMillis;
    normalizedLoudness = normalizedLoudness === VOID ? this.normalizedLoudness : normalizedLoudness;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_6tzd1m_k$(durationInMillis, normalizedLoudness, unknownFields);
  };
  protoOf(ExportedAudioMetaData).toString = function () {
    return (
      'ExportedAudioMetaData(durationInMillis=' +
      toString(this.durationInMillis) +
      ', normalizedLoudness=' +
      this.normalizedLoudness +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedAudioMetaData).hashCode = function () {
    var result = this.durationInMillis == null ? 0 : this.durationInMillis.hashCode();
    result = (imul(result, 31) + (this.normalizedLoudness == null ? 0 : this.normalizedLoudness.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedAudioMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedAudioMetaData)) return false;
    var tmp0_other_with_cast = other instanceof ExportedAudioMetaData ? other : THROW_CCE();
    if (!equals(this.durationInMillis, tmp0_other_with_cast.durationInMillis)) return false;
    if (!equals(this.normalizedLoudness, tmp0_other_with_cast.normalizedLoudness)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ExportedGenericMetaData$Companion$defaultInstance$delegate$lambda() {
    return new ExportedGenericMetaData();
  }
  function Companion_13() {
    Companion_instance_11 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ExportedGenericMetaData$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(ExportedGenericMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_46(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'name', 1, tmp1_type, name$factory_2(), VOID, 'name'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('ExportedGenericMetaData', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_13).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_1();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_13).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_10(Companion_getInstance_13(), u);
  };
  protoOf(Companion_13).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_11;
  function Companion_getInstance_13() {
    if (Companion_instance_11 == null) new Companion_13();
    return Companion_instance_11;
  }
  function ExportedGenericMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedGenericMetaData(name, unknownFields) {
    Companion_getInstance_13();
    name = name === VOID ? null : name;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.name = name;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedGenericMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedGenericMetaData).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(ExportedGenericMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedGenericMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_10(this, other);
  };
  protoOf(ExportedGenericMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_13().descriptor_1;
  };
  protoOf(ExportedGenericMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_10();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedGenericMetaData).component1_7eebsc_k$ = function () {
    return this.name;
  };
  protoOf(ExportedGenericMetaData).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedGenericMetaData).copy_m7ofu3_k$ = function (name, unknownFields) {
    return new ExportedGenericMetaData(name, unknownFields);
  };
  protoOf(ExportedGenericMetaData).copy = function (name, unknownFields, $super) {
    name = name === VOID ? this.name : name;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_m7ofu3_k$(name, unknownFields);
  };
  protoOf(ExportedGenericMetaData).toString = function () {
    return 'ExportedGenericMetaData(name=' + this.name + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(ExportedGenericMetaData).hashCode = function () {
    var result = this.name == null ? 0 : getStringHashCode(this.name);
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedGenericMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedGenericMetaData)) return false;
    var tmp0_other_with_cast = other instanceof ExportedGenericMetaData ? other : THROW_CCE();
    if (!(this.name == tmp0_other_with_cast.name)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_14() {
    Companion_instance_12 = this;
    var tmp = this;
    var tmp_0 = getKClass(ExportedLocation);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(4);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(4);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.backup.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_47(this);
    var tmp1_type = new Float(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'longitude', 1, tmp1_type, longitude$factory(), VOID, 'longitude'),
    );
    var tmp2_messageDescriptor = descriptor$factory_48(this);
    var tmp3_type = new Float(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'latitude', 2, tmp3_type, latitude$factory(), VOID, 'latitude'),
    );
    var tmp4_messageDescriptor = descriptor$factory_49(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'name', 3, tmp5_type, name$factory_3(), VOID, 'name'),
    );
    var tmp6_messageDescriptor = descriptor$factory_50(this);
    var tmp7_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'zoom', 4, tmp7_type, zoom$factory(), VOID, 'zoom'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ExportedLocation', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_14).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_11(Companion_getInstance_14(), u);
  };
  protoOf(Companion_14).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_12;
  function Companion_getInstance_14() {
    if (Companion_instance_12 == null) new Companion_14();
    return Companion_instance_12;
  }
  function ExportedLocation$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ExportedLocation(longitude, latitude, name, zoom, unknownFields) {
    Companion_getInstance_14();
    name = name === VOID ? null : name;
    zoom = zoom === VOID ? null : zoom;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.zoom = zoom;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ExportedLocation$protoSize$delegate$lambda(this));
  }
  protoOf(ExportedLocation).get_longitude_asb1fq_k$ = function () {
    return this.longitude;
  };
  protoOf(ExportedLocation).get_latitude_feukvp_k$ = function () {
    return this.latitude;
  };
  protoOf(ExportedLocation).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(ExportedLocation).get_zoom_woywws_k$ = function () {
    return this.zoom;
  };
  protoOf(ExportedLocation).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedLocation).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_11(this, other);
  };
  protoOf(ExportedLocation).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_14().descriptor_1;
  };
  protoOf(ExportedLocation).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_11();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ExportedLocation).component1_7eebsc_k$ = function () {
    return this.longitude;
  };
  protoOf(ExportedLocation).component2_7eebsb_k$ = function () {
    return this.latitude;
  };
  protoOf(ExportedLocation).component3_7eebsa_k$ = function () {
    return this.name;
  };
  protoOf(ExportedLocation).component4_7eebs9_k$ = function () {
    return this.zoom;
  };
  protoOf(ExportedLocation).component5_7eebs8_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ExportedLocation).copy_qdh5sw_k$ = function (longitude, latitude, name, zoom, unknownFields) {
    return new ExportedLocation(longitude, latitude, name, zoom, unknownFields);
  };
  protoOf(ExportedLocation).copy = function (longitude, latitude, name, zoom, unknownFields, $super) {
    longitude = longitude === VOID ? this.longitude : longitude;
    latitude = latitude === VOID ? this.latitude : latitude;
    name = name === VOID ? this.name : name;
    zoom = zoom === VOID ? this.zoom : zoom;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_qdh5sw_k$(longitude, latitude, name, zoom, unknownFields);
  };
  protoOf(ExportedLocation).toString = function () {
    return (
      'ExportedLocation(longitude=' +
      this.longitude +
      ', latitude=' +
      this.latitude +
      ', name=' +
      this.name +
      ', zoom=' +
      this.zoom +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ExportedLocation).hashCode = function () {
    var result = getNumberHashCode(this.longitude);
    result = (imul(result, 31) + getNumberHashCode(this.latitude)) | 0;
    result = (imul(result, 31) + (this.name == null ? 0 : getStringHashCode(this.name))) | 0;
    result = (imul(result, 31) + (this.zoom == null ? 0 : this.zoom)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ExportedLocation).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ExportedLocation)) return false;
    var tmp0_other_with_cast = other instanceof ExportedLocation ? other : THROW_CCE();
    if (!equals(this.longitude, tmp0_other_with_cast.longitude)) return false;
    if (!equals(this.latitude, tmp0_other_with_cast.latitude)) return false;
    if (!(this.name == tmp0_other_with_cast.name)) return false;
    if (!(this.zoom == tmp0_other_with_cast.zoom)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function orDefaultForExportedVideoMetaData(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_11().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForExportedAudioMetaData(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_12().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForExportedGenericMetaData(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_13().defaultInstance : _this__u8e3s4;
  }
  function protoMergeImpl(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof BackupData ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        _this__u8e3s4.info.plus_fj0q1z_k$(plus_1.info),
        plus(_this__u8e3s4.conversations, plus_1.conversations),
        plus(_this__u8e3s4.messages, plus_1.messages),
        plus(_this__u8e3s4.users, plus_1.users),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl(_this__u8e3s4, u) {
    var info = {_v: null};
    var conversations = {_v: null};
    var messages = {_v: null};
    var users = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda(info, conversations, messages, users),
    );
    if (info._v == null) {
      throw Companion_getInstance().missingRequiredField('info');
    }
    return new BackupData(
      ensureNotNull(info._v),
      Companion_getInstance_0().fixed(conversations._v),
      Companion_getInstance_0().fixed(messages._v),
      Companion_getInstance_0().fixed(users._v),
      unknownFields,
    );
  }
  function protoMergeImpl_0(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof BackupInfo ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        _this__u8e3s4.userId.plus_fj0q1z_k$(plus.userId),
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_0(_this__u8e3s4, u) {
    var platform = {_v: null};
    var version = {_v: null};
    var userId = {_v: null};
    var creationTime = {_v: null};
    var clientId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_0(platform, version, userId, creationTime, clientId),
    );
    if (platform._v == null) {
      throw Companion_getInstance().missingRequiredField('platform');
    }
    if (version._v == null) {
      throw Companion_getInstance().missingRequiredField('version');
    }
    if (userId._v == null) {
      throw Companion_getInstance().missingRequiredField('userId');
    }
    if (creationTime._v == null) {
      throw Companion_getInstance().missingRequiredField('creation_time');
    }
    if (clientId._v == null) {
      throw Companion_getInstance().missingRequiredField('clientId');
    }
    return new BackupInfo(
      ensureNotNull(platform._v),
      ensureNotNull(version._v),
      ensureNotNull(userId._v),
      ensureNotNull(creationTime._v),
      ensureNotNull(clientId._v),
      unknownFields,
    );
  }
  function protoMergeImpl_1(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportUser ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        _this__u8e3s4.id.plus_fj0q1z_k$(plus.id),
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_1(_this__u8e3s4, u) {
    var id = {_v: null};
    var name = {_v: null};
    var handle = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_1(id, name, handle));
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    if (name._v == null) {
      throw Companion_getInstance().missingRequiredField('name');
    }
    if (handle._v == null) {
      throw Companion_getInstance().missingRequiredField('handle');
    }
    return new ExportUser(ensureNotNull(id._v), ensureNotNull(name._v), ensureNotNull(handle._v), unknownFields);
  }
  function protoMergeImpl_2(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedQualifiedId ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_2(_this__u8e3s4, u) {
    var value = {_v: null};
    var domain = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_2(value, domain));
    if (value._v == null) {
      throw Companion_getInstance().missingRequiredField('value');
    }
    if (domain._v == null) {
      throw Companion_getInstance().missingRequiredField('domain');
    }
    return new ExportedQualifiedId(ensureNotNull(value._v), ensureNotNull(domain._v), unknownFields);
  }
  function protoMergeImpl_3(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedConversation ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        _this__u8e3s4.id.plus_fj0q1z_k$(plus.id),
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_3(_this__u8e3s4, u) {
    var id = {_v: null};
    var name = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_3(id, name));
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    if (name._v == null) {
      throw Companion_getInstance().missingRequiredField('name');
    }
    return new ExportedConversation(ensureNotNull(id._v), ensureNotNull(name._v), unknownFields);
  }
  function protoMergeImpl_4(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedMessage ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp_0 = _this__u8e3s4.senderUserId.plus_fj0q1z_k$(plus.senderUserId);
      var tmp_1 = _this__u8e3s4.conversationId.plus_fj0q1z_k$(plus.conversationId);
      var tmp0_elvis_lhs = plus.webPk;
      var tmp_2 = tmp0_elvis_lhs == null ? _this__u8e3s4.webPk : tmp0_elvis_lhs;
      var tmp_3;
      var tmp_4;
      var tmp_5 = _this__u8e3s4.content;
      if (tmp_5 instanceof Text) {
        var tmp_6 = plus.content;
        tmp_4 = tmp_6 instanceof Text;
      } else {
        tmp_4 = false;
      }
      if (tmp_4) {
        tmp_3 = new Text(
          _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
        );
      } else {
        var tmp_7;
        var tmp_8 = _this__u8e3s4.content;
        if (tmp_8 instanceof Asset) {
          var tmp_9 = plus.content;
          tmp_7 = tmp_9 instanceof Asset;
        } else {
          tmp_7 = false;
        }
        if (tmp_7) {
          tmp_3 = new Asset(
            _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
          );
        } else {
          var tmp_10;
          var tmp_11 = _this__u8e3s4.content;
          if (tmp_11 instanceof Location) {
            var tmp_12 = plus.content;
            tmp_10 = tmp_12 instanceof Location;
          } else {
            tmp_10 = false;
          }
          if (tmp_10) {
            tmp_3 = new Location(
              _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
            );
          } else {
            var tmp1_elvis_lhs = plus.content;
            tmp_3 = tmp1_elvis_lhs == null ? _this__u8e3s4.content : tmp1_elvis_lhs;
          }
        }
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        VOID,
        tmp_1,
        tmp_2,
        tmp_3,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_4(_this__u8e3s4, u) {
    var id = {_v: null};
    var timeIso = {_v: null};
    var senderUserId = {_v: null};
    var senderClientId = {_v: null};
    var conversationId = {_v: null};
    var webPk = {_v: null};
    var content = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_4(id, timeIso, senderUserId, senderClientId, conversationId, content, webPk),
    );
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    if (timeIso._v == null) {
      throw Companion_getInstance().missingRequiredField('time_iso');
    }
    if (senderUserId._v == null) {
      throw Companion_getInstance().missingRequiredField('sender_user_id');
    }
    if (senderClientId._v == null) {
      throw Companion_getInstance().missingRequiredField('sender_client_id');
    }
    if (conversationId._v == null) {
      throw Companion_getInstance().missingRequiredField('conversation_id');
    }
    return new ExportedMessage(
      ensureNotNull(id._v),
      ensureNotNull(timeIso._v),
      ensureNotNull(senderUserId._v),
      ensureNotNull(senderClientId._v),
      ensureNotNull(conversationId._v),
      webPk._v,
      content._v,
      unknownFields,
    );
  }
  function protoMergeImpl_5(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedText ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(VOID, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_5(_this__u8e3s4, u) {
    var content = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_5(content));
    if (content._v == null) {
      throw Companion_getInstance().missingRequiredField('content');
    }
    return new ExportedText(ensureNotNull(content._v), unknownFields);
  }
  function protoMergeImpl_6(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedAsset ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.name;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.name : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.assetToken;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.assetToken : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.assetDomain;
      var tmp_2 = tmp2_elvis_lhs == null ? _this__u8e3s4.assetDomain : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus.encryption;
      var tmp_3 = tmp3_elvis_lhs == null ? _this__u8e3s4.encryption : tmp3_elvis_lhs;
      var tmp_4;
      var tmp_5;
      var tmp_6 = _this__u8e3s4.metaData;
      if (tmp_6 instanceof Image) {
        var tmp_7 = plus.metaData;
        tmp_5 = tmp_7 instanceof Image;
      } else {
        tmp_5 = false;
      }
      if (tmp_5) {
        tmp_4 = new Image(
          _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
        );
      } else {
        var tmp_8;
        var tmp_9 = _this__u8e3s4.metaData;
        if (tmp_9 instanceof Video) {
          var tmp_10 = plus.metaData;
          tmp_8 = tmp_10 instanceof Video;
        } else {
          tmp_8 = false;
        }
        if (tmp_8) {
          tmp_4 = new Video(
            _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
          );
        } else {
          var tmp_11;
          var tmp_12 = _this__u8e3s4.metaData;
          if (tmp_12 instanceof Audio) {
            var tmp_13 = plus.metaData;
            tmp_11 = tmp_13 instanceof Audio;
          } else {
            tmp_11 = false;
          }
          if (tmp_11) {
            tmp_4 = new Audio(
              _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
            );
          } else {
            var tmp_14;
            var tmp_15 = _this__u8e3s4.metaData;
            if (tmp_15 instanceof Generic) {
              var tmp_16 = plus.metaData;
              tmp_14 = tmp_16 instanceof Generic;
            } else {
              tmp_14 = false;
            }
            if (tmp_14) {
              tmp_4 = new Generic(
                _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
              );
            } else {
              var tmp4_elvis_lhs = plus.metaData;
              tmp_4 = tmp4_elvis_lhs == null ? _this__u8e3s4.metaData : tmp4_elvis_lhs;
            }
          }
        }
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        VOID,
        VOID,
        VOID,
        tmp_1,
        tmp_2,
        tmp_3,
        tmp_4,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_6(_this__u8e3s4, u) {
    var mimetype = {_v: null};
    var size = {_v: null};
    var name = {_v: null};
    var otrKey = {_v: null};
    var sha256 = {_v: null};
    var assetId = {_v: null};
    var assetToken = {_v: null};
    var assetDomain = {_v: null};
    var encryption = {_v: null};
    var metaData = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_6(
        mimetype,
        size,
        name,
        otrKey,
        sha256,
        assetId,
        assetToken,
        assetDomain,
        encryption,
        metaData,
      ),
    );
    if (mimetype._v == null) {
      throw Companion_getInstance().missingRequiredField('mimetype');
    }
    if (size._v == null) {
      throw Companion_getInstance().missingRequiredField('size');
    }
    if (otrKey._v == null) {
      throw Companion_getInstance().missingRequiredField('otr_key');
    }
    if (sha256._v == null) {
      throw Companion_getInstance().missingRequiredField('sha256');
    }
    if (assetId._v == null) {
      throw Companion_getInstance().missingRequiredField('asset_id');
    }
    return new ExportedAsset(
      ensureNotNull(mimetype._v),
      ensureNotNull(size._v),
      name._v,
      ensureNotNull(otrKey._v),
      ensureNotNull(sha256._v),
      ensureNotNull(assetId._v),
      assetToken._v,
      assetDomain._v,
      encryption._v,
      metaData._v,
      unknownFields,
    );
  }
  function protoMergeImpl_7(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedImageMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.tag;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp0_elvis_lhs == null ? _this__u8e3s4.tag : tmp0_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_7(_this__u8e3s4, u) {
    var width = {_v: null};
    var height = {_v: null};
    var tag = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_7(width, height, tag));
    if (width._v == null) {
      throw Companion_getInstance().missingRequiredField('width');
    }
    if (height._v == null) {
      throw Companion_getInstance().missingRequiredField('height');
    }
    return new ExportedImageMetaData(ensureNotNull(width._v), ensureNotNull(height._v), tag._v, unknownFields);
  }
  function protoMergeImpl_8(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedVideoMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.width;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.width : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.height;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.height : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.durationInMillis;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp2_elvis_lhs == null ? _this__u8e3s4.durationInMillis : tmp2_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_8(_this__u8e3s4, u) {
    var width = {_v: null};
    var height = {_v: null};
    var durationInMillis = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_8(width, height, durationInMillis),
    );
    return new ExportedVideoMetaData(width._v, height._v, durationInMillis._v, unknownFields);
  }
  function protoMergeImpl_9(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedAudioMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.durationInMillis;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.durationInMillis : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.normalizedLoudness;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp1_elvis_lhs == null ? _this__u8e3s4.normalizedLoudness : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_9(_this__u8e3s4, u) {
    var durationInMillis = {_v: null};
    var normalizedLoudness = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_9(durationInMillis, normalizedLoudness),
    );
    return new ExportedAudioMetaData(durationInMillis._v, normalizedLoudness._v, unknownFields);
  }
  function protoMergeImpl_10(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedGenericMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.name;
      tmp = tmp0_safe_receiver.copy(
        tmp0_elvis_lhs == null ? _this__u8e3s4.name : tmp0_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_10(_this__u8e3s4, u) {
    var name = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_10(name));
    return new ExportedGenericMetaData(name._v, unknownFields);
  }
  function protoMergeImpl_11(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ExportedLocation ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.backup.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.name;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.name : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.zoom;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp1_elvis_lhs == null ? _this__u8e3s4.zoom : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_11(_this__u8e3s4, u) {
    var longitude = {_v: null};
    var latitude = {_v: null};
    var name = {_v: null};
    var zoom = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_11(longitude, latitude, name, zoom),
    );
    if (longitude._v == null) {
      throw Companion_getInstance().missingRequiredField('longitude');
    }
    if (latitude._v == null) {
      throw Companion_getInstance().missingRequiredField('latitude');
    }
    return new ExportedLocation(
      ensureNotNull(longitude._v),
      ensureNotNull(latitude._v),
      name._v,
      zoom._v,
      unknownFields,
    );
  }
  function decodeWithImpl$lambda($info, $conversations, $messages, $users) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $info._v = _fieldValue instanceof BackupInfo ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $conversations._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.backup.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $conversations._v = this_0;
          tmp = Unit_getInstance();
          break;
        case 3:
          // Inline function 'kotlin.apply' call

          var tmp2_elvis_lhs = $messages._v;
          var this_1 = tmp2_elvis_lhs == null ? init() : tmp2_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.backup.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements_0 = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_1, elements_0);
          $messages._v = this_1;
          tmp = Unit_getInstance();
          break;
        case 4:
          // Inline function 'kotlin.apply' call

          var tmp3_elvis_lhs = $users._v;
          var this_2 = tmp3_elvis_lhs == null ? init() : tmp3_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.backup.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements_1 = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_2, elements_1);
          $users._v = this_2;
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_0($platform, $version, $userId, $creationTime, $clientId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $platform._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $version._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $userId._v = _fieldValue instanceof ExportedQualifiedId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $creationTime._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $clientId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_1($id, $name, $handle) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $id._v = _fieldValue instanceof ExportedQualifiedId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $handle._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_2($value, $domain) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $value._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $domain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_3($id, $name) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $id._v = _fieldValue instanceof ExportedQualifiedId ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_4($id, $timeIso, $senderUserId, $senderClientId, $conversationId, $content, $webPk) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $id._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $timeIso._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $senderUserId._v = _fieldValue instanceof ExportedQualifiedId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $senderClientId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $conversationId._v = _fieldValue instanceof ExportedQualifiedId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $content._v = new Text(_fieldValue instanceof ExportedText ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 7:
          $content._v = new Asset(_fieldValue instanceof ExportedAsset ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 8:
          $content._v = new Location(_fieldValue instanceof ExportedLocation ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 9:
          $webPk._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_5($content) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $content._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_6(
    $mimetype,
    $size,
    $name,
    $otrKey,
    $sha256,
    $assetId,
    $assetToken,
    $assetDomain,
    $encryption,
    $metaData,
  ) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $mimetype._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $size._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $otrKey._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $sha256._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $assetId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $assetToken._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 8:
          $assetDomain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 9:
          $encryption._v = _fieldValue instanceof ExportedEncryptionAlgorithm ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 10:
          $metaData._v = new Image(_fieldValue instanceof ExportedImageMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 11:
          $metaData._v = new Video(_fieldValue instanceof ExportedVideoMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 12:
          $metaData._v = new Audio(_fieldValue instanceof ExportedAudioMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 13:
          $metaData._v = new Generic(_fieldValue instanceof ExportedGenericMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_7($width, $height, $tag) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $width._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $height._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $tag._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_8($width, $height, $durationInMillis) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $width._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $height._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $durationInMillis._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_9($durationInMillis, $normalizedLoudness) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $durationInMillis._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $normalizedLoudness._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_10($name) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_11($longitude, $latitude, $name, $zoom) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $longitude._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $latitude._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $zoom._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function values$factory() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function info$factory() {
    return getPropertyCallableRef(
      'info',
      1,
      KProperty1,
      function (receiver) {
        return receiver.info;
      },
      null,
    );
  }
  function descriptor$factory_0($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function conversations$factory() {
    return getPropertyCallableRef(
      'conversations',
      1,
      KProperty1,
      function (receiver) {
        return receiver.conversations;
      },
      null,
    );
  }
  function descriptor$factory_1($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function messages$factory() {
    return getPropertyCallableRef(
      'messages',
      1,
      KProperty1,
      function (receiver) {
        return receiver.messages;
      },
      null,
    );
  }
  function descriptor$factory_2($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function users$factory() {
    return getPropertyCallableRef(
      'users',
      1,
      KProperty1,
      function (receiver) {
        return receiver.users;
      },
      null,
    );
  }
  function protoSize$factory_0() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_3($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function platform$factory() {
    return getPropertyCallableRef(
      'platform',
      1,
      KProperty1,
      function (receiver) {
        return receiver.platform;
      },
      null,
    );
  }
  function descriptor$factory_4($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function version$factory() {
    return getPropertyCallableRef(
      'version',
      1,
      KProperty1,
      function (receiver) {
        return receiver.version;
      },
      null,
    );
  }
  function descriptor$factory_5($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function userId$factory() {
    return getPropertyCallableRef(
      'userId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.userId;
      },
      null,
    );
  }
  function descriptor$factory_6($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function creationTime$factory() {
    return getPropertyCallableRef(
      'creationTime',
      1,
      KProperty1,
      function (receiver) {
        return receiver.creationTime;
      },
      null,
    );
  }
  function descriptor$factory_7($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function clientId$factory() {
    return getPropertyCallableRef(
      'clientId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.clientId;
      },
      null,
    );
  }
  function protoSize$factory_1() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_8($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function descriptor$factory_9($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function descriptor$factory_10($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function handle$factory() {
    return getPropertyCallableRef(
      'handle',
      1,
      KProperty1,
      function (receiver) {
        return receiver.handle;
      },
      null,
    );
  }
  function protoSize$factory_2() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_11($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function value$factory() {
    return getPropertyCallableRef(
      'value',
      1,
      KProperty1,
      function (receiver) {
        return receiver.value;
      },
      null,
    );
  }
  function descriptor$factory_12($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function domain$factory() {
    return getPropertyCallableRef(
      'domain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.domain;
      },
      null,
    );
  }
  function protoSize$factory_3() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_13($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory_0() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function descriptor$factory_14($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory_0() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function protoSize$factory_4() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_15($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory_1() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function descriptor$factory_16($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function timeIso$factory() {
    return getPropertyCallableRef(
      'timeIso',
      1,
      KProperty1,
      function (receiver) {
        return receiver.timeIso;
      },
      null,
    );
  }
  function descriptor$factory_17($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function senderUserId$factory() {
    return getPropertyCallableRef(
      'senderUserId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.senderUserId;
      },
      null,
    );
  }
  function descriptor$factory_18($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function senderClientId$factory() {
    return getPropertyCallableRef(
      'senderClientId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.senderClientId;
      },
      null,
    );
  }
  function descriptor$factory_19($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function conversationId$factory() {
    return getPropertyCallableRef(
      'conversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.conversationId;
      },
      null,
    );
  }
  function descriptor$factory_20($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function descriptor$factory_21($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function asset$factory() {
    return getPropertyCallableRef(
      'asset',
      1,
      KProperty1,
      function (receiver) {
        return receiver.asset;
      },
      null,
    );
  }
  function descriptor$factory_22($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function location$factory() {
    return getPropertyCallableRef(
      'location',
      1,
      KProperty1,
      function (receiver) {
        return receiver.location;
      },
      null,
    );
  }
  function descriptor$factory_23($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function webPk$factory() {
    return getPropertyCallableRef(
      'webPk',
      1,
      KProperty1,
      function (receiver) {
        return receiver.webPk;
      },
      null,
    );
  }
  function protoSize$factory_5() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_24($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function content$factory() {
    return getPropertyCallableRef(
      'content',
      1,
      KProperty1,
      function (receiver) {
        return receiver.content;
      },
      null,
    );
  }
  function protoSize$factory_6() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_25($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function mimetype$factory() {
    return getPropertyCallableRef(
      'mimetype',
      1,
      KProperty1,
      function (receiver) {
        return receiver.mimetype;
      },
      null,
    );
  }
  function descriptor$factory_26($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function size$factory() {
    return getPropertyCallableRef(
      'size',
      1,
      KProperty1,
      function (receiver) {
        return receiver.size;
      },
      null,
    );
  }
  function descriptor$factory_27($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory_1() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function descriptor$factory_28($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function otrKey$factory() {
    return getPropertyCallableRef(
      'otrKey',
      1,
      KProperty1,
      function (receiver) {
        return receiver.otrKey;
      },
      null,
    );
  }
  function descriptor$factory_29($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sha256$factory() {
    return getPropertyCallableRef(
      'sha256',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sha256;
      },
      null,
    );
  }
  function descriptor$factory_30($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function assetId$factory() {
    return getPropertyCallableRef(
      'assetId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.assetId;
      },
      null,
    );
  }
  function descriptor$factory_31($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function assetToken$factory() {
    return getPropertyCallableRef(
      'assetToken',
      1,
      KProperty1,
      function (receiver) {
        return receiver.assetToken;
      },
      null,
    );
  }
  function descriptor$factory_32($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function assetDomain$factory() {
    return getPropertyCallableRef(
      'assetDomain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.assetDomain;
      },
      null,
    );
  }
  function descriptor$factory_33($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function encryption$factory() {
    return getPropertyCallableRef(
      'encryption',
      1,
      KProperty1,
      function (receiver) {
        return receiver.encryption;
      },
      null,
    );
  }
  function descriptor$factory_34($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function descriptor$factory_35($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function video$factory() {
    return getPropertyCallableRef(
      'video',
      1,
      KProperty1,
      function (receiver) {
        return receiver.video;
      },
      null,
    );
  }
  function descriptor$factory_36($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function audio$factory() {
    return getPropertyCallableRef(
      'audio',
      1,
      KProperty1,
      function (receiver) {
        return receiver.audio;
      },
      null,
    );
  }
  function descriptor$factory_37($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function generic$factory() {
    return getPropertyCallableRef(
      'generic',
      1,
      KProperty1,
      function (receiver) {
        return receiver.generic;
      },
      null,
    );
  }
  function protoSize$factory_7() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_38($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function width$factory() {
    return getPropertyCallableRef(
      'width',
      1,
      KProperty1,
      function (receiver) {
        return receiver.width;
      },
      null,
    );
  }
  function descriptor$factory_39($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function height$factory() {
    return getPropertyCallableRef(
      'height',
      1,
      KProperty1,
      function (receiver) {
        return receiver.height;
      },
      null,
    );
  }
  function descriptor$factory_40($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function tag$factory() {
    return getPropertyCallableRef(
      'tag',
      1,
      KProperty1,
      function (receiver) {
        return receiver.tag;
      },
      null,
    );
  }
  function protoSize$factory_8() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_41($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function width$factory_0() {
    return getPropertyCallableRef(
      'width',
      1,
      KProperty1,
      function (receiver) {
        return receiver.width;
      },
      null,
    );
  }
  function descriptor$factory_42($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function height$factory_0() {
    return getPropertyCallableRef(
      'height',
      1,
      KProperty1,
      function (receiver) {
        return receiver.height;
      },
      null,
    );
  }
  function descriptor$factory_43($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function durationInMillis$factory() {
    return getPropertyCallableRef(
      'durationInMillis',
      1,
      KProperty1,
      function (receiver) {
        return receiver.durationInMillis;
      },
      null,
    );
  }
  function defaultInstance$factory() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_9() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_44($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function durationInMillis$factory_0() {
    return getPropertyCallableRef(
      'durationInMillis',
      1,
      KProperty1,
      function (receiver) {
        return receiver.durationInMillis;
      },
      null,
    );
  }
  function descriptor$factory_45($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function normalizedLoudness$factory() {
    return getPropertyCallableRef(
      'normalizedLoudness',
      1,
      KProperty1,
      function (receiver) {
        return receiver.normalizedLoudness;
      },
      null,
    );
  }
  function defaultInstance$factory_0() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_10() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_46($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory_2() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function defaultInstance$factory_1() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_11() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_47($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function longitude$factory() {
    return getPropertyCallableRef(
      'longitude',
      1,
      KProperty1,
      function (receiver) {
        return receiver.longitude;
      },
      null,
    );
  }
  function descriptor$factory_48($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function latitude$factory() {
    return getPropertyCallableRef(
      'latitude',
      1,
      KProperty1,
      function (receiver) {
        return receiver.latitude;
      },
      null,
    );
  }
  function descriptor$factory_49($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory_3() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function descriptor$factory_50($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function zoom$factory() {
    return getPropertyCallableRef(
      'zoom',
      1,
      KProperty1,
      function (receiver) {
        return receiver.zoom;
      },
      null,
    );
  }
  function ClientAction$Companion$values$delegate$lambda() {
    return listOf_0(RESET_SESSION_getInstance());
  }
  function RESET_SESSION() {
    RESET_SESSION_instance = this;
    ClientAction.call(this, 0, 'RESET_SESSION');
  }
  var RESET_SESSION_instance;
  function RESET_SESSION_getInstance() {
    if (RESET_SESSION_instance == null) new RESET_SESSION();
    return RESET_SESSION_instance;
  }
  function UNRECOGNIZED_0(value) {
    ClientAction.call(this, value);
  }
  function Companion_15() {
    Companion_instance_13 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(ClientAction$Companion$values$delegate$lambda);
  }
  protoOf(Companion_15).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_0();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_15).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_0(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_15).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No ClientAction with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_13;
  function Companion_getInstance_15() {
    if (Companion_instance_13 == null) new Companion_15();
    return Companion_instance_13;
  }
  function ClientAction(value, name) {
    Companion_getInstance_15();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(ClientAction).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(ClientAction).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(ClientAction).equals = function (other) {
    var tmp;
    if (other instanceof ClientAction) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(ClientAction).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(ClientAction).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'ClientAction.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function EncryptionAlgorithm$Companion$values$delegate$lambda() {
    return listOf([AES_CBC_getInstance(), AES_GCM_getInstance()]);
  }
  function AES_CBC() {
    AES_CBC_instance = this;
    EncryptionAlgorithm.call(this, 0, 'AES_CBC');
  }
  var AES_CBC_instance;
  function AES_CBC_getInstance() {
    if (AES_CBC_instance == null) new AES_CBC();
    return AES_CBC_instance;
  }
  function AES_GCM() {
    AES_GCM_instance = this;
    EncryptionAlgorithm.call(this, 1, 'AES_GCM');
  }
  var AES_GCM_instance;
  function AES_GCM_getInstance() {
    if (AES_GCM_instance == null) new AES_GCM();
    return AES_GCM_instance;
  }
  function UNRECOGNIZED_1(value) {
    EncryptionAlgorithm.call(this, value);
  }
  function Companion_16() {
    Companion_instance_14 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(EncryptionAlgorithm$Companion$values$delegate$lambda);
  }
  protoOf(Companion_16).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_1();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_16).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_1(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_16).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No EncryptionAlgorithm with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_14;
  function Companion_getInstance_16() {
    if (Companion_instance_14 == null) new Companion_16();
    return Companion_instance_14;
  }
  function EncryptionAlgorithm(value, name) {
    Companion_getInstance_16();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(EncryptionAlgorithm).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(EncryptionAlgorithm).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(EncryptionAlgorithm).equals = function (other) {
    var tmp;
    if (other instanceof EncryptionAlgorithm) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(EncryptionAlgorithm).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(EncryptionAlgorithm).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'EncryptionAlgorithm.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function LegalHoldStatus$Companion$values$delegate$lambda() {
    return listOf([UNKNOWN_getInstance(), DISABLED_getInstance(), ENABLED_getInstance()]);
  }
  function UNKNOWN() {
    UNKNOWN_instance = this;
    LegalHoldStatus.call(this, 0, 'UNKNOWN');
  }
  var UNKNOWN_instance;
  function UNKNOWN_getInstance() {
    if (UNKNOWN_instance == null) new UNKNOWN();
    return UNKNOWN_instance;
  }
  function DISABLED() {
    DISABLED_instance = this;
    LegalHoldStatus.call(this, 1, 'DISABLED');
  }
  var DISABLED_instance;
  function DISABLED_getInstance() {
    if (DISABLED_instance == null) new DISABLED();
    return DISABLED_instance;
  }
  function ENABLED() {
    ENABLED_instance = this;
    LegalHoldStatus.call(this, 2, 'ENABLED');
  }
  var ENABLED_instance;
  function ENABLED_getInstance() {
    if (ENABLED_instance == null) new ENABLED();
    return ENABLED_instance;
  }
  function UNRECOGNIZED_2(value) {
    LegalHoldStatus.call(this, value);
  }
  function Companion_17() {
    Companion_instance_15 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(LegalHoldStatus$Companion$values$delegate$lambda);
  }
  protoOf(Companion_17).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_2();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_17).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_2(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_17).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No LegalHoldStatus with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_15;
  function Companion_getInstance_17() {
    if (Companion_instance_15 == null) new Companion_17();
    return Companion_instance_15;
  }
  function LegalHoldStatus(value, name) {
    Companion_getInstance_17();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(LegalHoldStatus).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(LegalHoldStatus).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(LegalHoldStatus).equals = function (other) {
    var tmp;
    if (other instanceof LegalHoldStatus) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(LegalHoldStatus).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(LegalHoldStatus).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'LegalHoldStatus.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function UnknownStrategy$Companion$values$delegate$lambda() {
    return listOf([IGNORE_getInstance(), DISCARD_AND_WARN_getInstance(), WARN_USER_ALLOW_RETRY_getInstance()]);
  }
  function IGNORE() {
    IGNORE_instance = this;
    UnknownStrategy.call(this, 0, 'IGNORE');
  }
  var IGNORE_instance;
  function IGNORE_getInstance() {
    if (IGNORE_instance == null) new IGNORE();
    return IGNORE_instance;
  }
  function DISCARD_AND_WARN() {
    DISCARD_AND_WARN_instance = this;
    UnknownStrategy.call(this, 1, 'DISCARD_AND_WARN');
  }
  var DISCARD_AND_WARN_instance;
  function DISCARD_AND_WARN_getInstance() {
    if (DISCARD_AND_WARN_instance == null) new DISCARD_AND_WARN();
    return DISCARD_AND_WARN_instance;
  }
  function WARN_USER_ALLOW_RETRY() {
    WARN_USER_ALLOW_RETRY_instance = this;
    UnknownStrategy.call(this, 2, 'WARN_USER_ALLOW_RETRY');
  }
  var WARN_USER_ALLOW_RETRY_instance;
  function WARN_USER_ALLOW_RETRY_getInstance() {
    if (WARN_USER_ALLOW_RETRY_instance == null) new WARN_USER_ALLOW_RETRY();
    return WARN_USER_ALLOW_RETRY_instance;
  }
  function UNRECOGNIZED_3(value) {
    UnknownStrategy.call(this, value);
  }
  function Companion_18() {
    Companion_instance_16 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(UnknownStrategy$Companion$values$delegate$lambda);
  }
  protoOf(Companion_18).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_3();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_18).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_3(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_18).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No UnknownStrategy with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_16;
  function Companion_getInstance_18() {
    if (Companion_instance_16 == null) new Companion_18();
    return Companion_instance_16;
  }
  function UnknownStrategy(value, name) {
    Companion_getInstance_18();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(UnknownStrategy).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(UnknownStrategy).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(UnknownStrategy).equals = function (other) {
    var tmp;
    if (other instanceof UnknownStrategy) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(UnknownStrategy).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(UnknownStrategy).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'UnknownStrategy.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Text_0(text) {
    Content_0.call(this, text);
  }
  function Image_0(image) {
    Content_0.call(this, image);
  }
  function Knock(knock) {
    Content_0.call(this, knock);
  }
  function LastRead(lastRead) {
    Content_0.call(this, lastRead);
  }
  function Cleared(cleared) {
    Content_0.call(this, cleared);
  }
  function External(external) {
    Content_0.call(this, external);
  }
  function ClientAction_0(clientAction) {
    clientAction = clientAction === VOID ? Companion_getInstance_15().fromValue_lljhin_k$(0) : clientAction;
    Content_0.call(this, clientAction);
  }
  function Calling(calling) {
    Content_0.call(this, calling);
  }
  function Asset_0(asset) {
    Content_0.call(this, asset);
  }
  function Hidden(hidden) {
    Content_0.call(this, hidden);
  }
  function Location_0(location) {
    Content_0.call(this, location);
  }
  function Deleted(deleted) {
    Content_0.call(this, deleted);
  }
  function Edited(edited) {
    Content_0.call(this, edited);
  }
  function Confirmation(confirmation) {
    Content_0.call(this, confirmation);
  }
  function Reaction(reaction) {
    Content_0.call(this, reaction);
  }
  function Ephemeral(ephemeral) {
    Content_0.call(this, ephemeral);
  }
  function Availability(availability) {
    Content_0.call(this, availability);
  }
  function Composite(composite) {
    Content_0.call(this, composite);
  }
  function ButtonAction(buttonAction) {
    Content_0.call(this, buttonAction);
  }
  function ButtonActionConfirmation(buttonActionConfirmation) {
    Content_0.call(this, buttonActionConfirmation);
  }
  function DataTransfer(dataTransfer) {
    Content_0.call(this, dataTransfer);
  }
  function Content_0(value) {
    OneOf.call(this, value);
  }
  function Companion_19() {
    Companion_instance_17 = this;
    var tmp = this;
    var tmp_0 = getKClass(GenericMessage);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(23);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(23);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_51(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'message_id', 1, tmp1_type, messageId$factory(), VOID, 'messageId'),
    );
    var tmp2_messageDescriptor = descriptor$factory_52(this);
    var tmp3_type = new Message(Companion_getInstance_30());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'text', 2, tmp3_type, text$factory_0(), true, 'text'),
    );
    var tmp4_messageDescriptor = descriptor$factory_53(this);
    var tmp5_type = new Message(Companion_getInstance_45());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'image', 3, tmp5_type, image$factory_0(), true, 'image'),
    );
    var tmp6_messageDescriptor = descriptor$factory_54(this);
    var tmp7_type = new Message(Companion_getInstance_31());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'knock', 4, tmp7_type, knock$factory(), true, 'knock'),
    );
    var tmp8_messageDescriptor = descriptor$factory_55(this);
    var tmp9_type = new Message(Companion_getInstance_36());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp8_messageDescriptor, 'lastRead', 6, tmp9_type, lastRead$factory(), true, 'lastRead'),
    );
    var tmp10_messageDescriptor = descriptor$factory_56(this);
    var tmp11_type = new Message(Companion_getInstance_37());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'cleared', 7, tmp11_type, cleared$factory(), true, 'cleared'),
    );
    var tmp12_messageDescriptor = descriptor$factory_57(this);
    var tmp13_type = new Message(Companion_getInstance_54());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp12_messageDescriptor, 'external', 8, tmp13_type, external$factory(), true, 'external'),
    );
    var tmp14_messageDescriptor = descriptor$factory_58(this);
    var tmp15_type = new Enum_0(Companion_getInstance_15(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp14_messageDescriptor,
        'clientAction',
        9,
        tmp15_type,
        clientAction$factory(),
        true,
        'clientAction',
      ),
    );
    var tmp16_messageDescriptor = descriptor$factory_59(this);
    var tmp17_type = new Message(Companion_getInstance_56());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp16_messageDescriptor, 'calling', 10, tmp17_type, calling$factory(), true, 'calling'),
    );
    var tmp18_messageDescriptor = descriptor$factory_60(this);
    var tmp19_type = new Message(Companion_getInstance_53());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp18_messageDescriptor, 'asset', 11, tmp19_type, asset$factory_0(), true, 'asset'),
    );
    var tmp20_messageDescriptor = descriptor$factory_61(this);
    var tmp21_type = new Message(Companion_getInstance_38());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp20_messageDescriptor, 'hidden', 12, tmp21_type, hidden$factory(), true, 'hidden'),
    );
    var tmp22_messageDescriptor = descriptor$factory_62(this);
    var tmp23_type = new Message(Companion_getInstance_44());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp22_messageDescriptor, 'location', 13, tmp23_type, location$factory_0(), true, 'location'),
    );
    var tmp24_messageDescriptor = descriptor$factory_63(this);
    var tmp25_type = new Message(Companion_getInstance_39());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp24_messageDescriptor, 'deleted', 14, tmp25_type, deleted$factory(), true, 'deleted'),
    );
    var tmp26_messageDescriptor = descriptor$factory_64(this);
    var tmp27_type = new Message(Companion_getInstance_40());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp26_messageDescriptor, 'edited', 15, tmp27_type, edited$factory(), true, 'edited'),
    );
    var tmp28_messageDescriptor = descriptor$factory_65(this);
    var tmp29_type = new Message(Companion_getInstance_43());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp28_messageDescriptor,
        'confirmation',
        16,
        tmp29_type,
        confirmation$factory(),
        true,
        'confirmation',
      ),
    );
    var tmp30_messageDescriptor = descriptor$factory_66(this);
    var tmp31_type = new Message(Companion_getInstance_55());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp30_messageDescriptor, 'reaction', 17, tmp31_type, reaction$factory(), true, 'reaction'),
    );
    var tmp32_messageDescriptor = descriptor$factory_67(this);
    var tmp33_type = new Message(Companion_getInstance_29());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp32_messageDescriptor, 'ephemeral', 18, tmp33_type, ephemeral$factory(), true, 'ephemeral'),
    );
    var tmp34_messageDescriptor = descriptor$factory_68(this);
    var tmp35_type = new Message(Companion_getInstance_28());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp34_messageDescriptor,
        'availability',
        19,
        tmp35_type,
        availability$factory(),
        true,
        'availability',
      ),
    );
    var tmp36_messageDescriptor = descriptor$factory_69(this);
    var tmp37_type = new Message(Companion_getInstance_23());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp36_messageDescriptor, 'composite', 20, tmp37_type, composite$factory(), true, 'composite'),
    );
    var tmp38_messageDescriptor = descriptor$factory_70(this);
    var tmp39_type = new Message(Companion_getInstance_25());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp38_messageDescriptor,
        'buttonAction',
        21,
        tmp39_type,
        buttonAction$factory(),
        true,
        'buttonAction',
      ),
    );
    var tmp40_messageDescriptor = descriptor$factory_71(this);
    var tmp41_type = new Message(Companion_getInstance_26());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp40_messageDescriptor,
        'buttonActionConfirmation',
        22,
        tmp41_type,
        buttonActionConfirmation$factory(),
        true,
        'buttonActionConfirmation',
      ),
    );
    var tmp42_messageDescriptor = descriptor$factory_72(this);
    var tmp43_type = new Message(Companion_getInstance_57());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp42_messageDescriptor,
        'dataTransfer',
        23,
        tmp43_type,
        dataTransfer$factory(),
        true,
        'dataTransfer',
      ),
    );
    var tmp44_messageDescriptor = descriptor$factory_73(this);
    var tmp45_type = new Enum_0(Companion_getInstance_18(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp44_messageDescriptor,
        'unknownStrategy',
        24,
        tmp45_type,
        unknownStrategy$factory(),
        VOID,
        'unknownStrategy',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('GenericMessage', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_19).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_12(Companion_getInstance_19(), u);
  };
  protoOf(Companion_19).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_17;
  function Companion_getInstance_19() {
    if (Companion_instance_17 == null) new Companion_19();
    return Companion_instance_17;
  }
  function GenericMessage$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function GenericMessage(messageId, unknownStrategy, content, unknownFields) {
    Companion_getInstance_19();
    unknownStrategy = unknownStrategy === VOID ? null : unknownStrategy;
    content = content === VOID ? null : content;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.messageId = messageId;
    this.unknownStrategy = unknownStrategy;
    this.content = content;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(GenericMessage$protoSize$delegate$lambda(this));
  }
  protoOf(GenericMessage).get_messageId_fato9z_k$ = function () {
    return this.messageId;
  };
  protoOf(GenericMessage).get_unknownStrategy_4zqx3g_k$ = function () {
    return this.unknownStrategy;
  };
  protoOf(GenericMessage).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(GenericMessage).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(GenericMessage).get_text_wouvsm_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Text_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_image_it3i2a_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Image_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_knock_iu80iz_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Knock ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_lastRead_f38nit_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof LastRead ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_cleared_ffnnwj_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Cleared ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_external_945310_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof External ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_clientAction_rxi3me_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof ClientAction_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_calling_ac784b_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Calling ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_asset_iotcjr_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Asset_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_hidden_e9x67n_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Hidden ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_location_d3s02_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Location_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_deleted_qwnqy8_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Deleted ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_edited_cs4uuq_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Edited ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_confirmation_vrrloi_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Confirmation ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_reaction_ovokj6_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Reaction ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_ephemeral_hty584_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Ephemeral ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_availability_xg9hek_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Availability ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_composite_emurz6_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Composite ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_buttonAction_bgujip_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof ButtonAction ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_buttonActionConfirmation_pvbmee_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof ButtonActionConfirmation ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).get_dataTransfer_ncqosi_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof DataTransfer ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_12(this, other);
  };
  protoOf(GenericMessage).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_19().descriptor_1;
  };
  protoOf(GenericMessage).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_12();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(GenericMessage).component1_7eebsc_k$ = function () {
    return this.messageId;
  };
  protoOf(GenericMessage).component2_7eebsb_k$ = function () {
    return this.unknownStrategy;
  };
  protoOf(GenericMessage).component3_7eebsa_k$ = function () {
    return this.content;
  };
  protoOf(GenericMessage).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(GenericMessage).copy_z3ggzy_k$ = function (messageId, unknownStrategy, content, unknownFields) {
    return new GenericMessage(messageId, unknownStrategy, content, unknownFields);
  };
  protoOf(GenericMessage).copy = function (messageId, unknownStrategy, content, unknownFields, $super) {
    messageId = messageId === VOID ? this.messageId : messageId;
    unknownStrategy = unknownStrategy === VOID ? this.unknownStrategy : unknownStrategy;
    content = content === VOID ? this.content : content;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_z3ggzy_k$(messageId, unknownStrategy, content, unknownFields);
  };
  protoOf(GenericMessage).toString = function () {
    return (
      'GenericMessage(messageId=' +
      this.messageId +
      ', unknownStrategy=' +
      this.unknownStrategy +
      ', content=' +
      this.content +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(GenericMessage).hashCode = function () {
    var result = getStringHashCode(this.messageId);
    result = (imul(result, 31) + (this.unknownStrategy == null ? 0 : this.unknownStrategy.hashCode())) | 0;
    result = (imul(result, 31) + (this.content == null ? 0 : this.content.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(GenericMessage).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof GenericMessage)) return false;
    var tmp0_other_with_cast = other instanceof GenericMessage ? other : THROW_CCE();
    if (!(this.messageId === tmp0_other_with_cast.messageId)) return false;
    if (!equals(this.unknownStrategy, tmp0_other_with_cast.unknownStrategy)) return false;
    if (!equals(this.content, tmp0_other_with_cast.content)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_20() {
    Companion_instance_18 = this;
    var tmp = this;
    var tmp_0 = getKClass(QualifiedUserId);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_74(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'id', 1, tmp1_type, id$factory_2(), VOID, 'id'));
    var tmp2_messageDescriptor = descriptor$factory_75(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'domain', 2, tmp3_type, domain$factory_0(), VOID, 'domain'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('QualifiedUserId', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_20).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_13(Companion_getInstance_20(), u);
  };
  protoOf(Companion_20).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_18;
  function Companion_getInstance_20() {
    if (Companion_instance_18 == null) new Companion_20();
    return Companion_instance_18;
  }
  function QualifiedUserId$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function QualifiedUserId(id, domain, unknownFields) {
    Companion_getInstance_20();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.id = id;
    this.domain = domain;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(QualifiedUserId$protoSize$delegate$lambda(this));
  }
  protoOf(QualifiedUserId).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(QualifiedUserId).get_domain_ch74y5_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedUserId).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedUserId).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_13(this, other);
  };
  protoOf(QualifiedUserId).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_20().descriptor_1;
  };
  protoOf(QualifiedUserId).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_13();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(QualifiedUserId).component1_7eebsc_k$ = function () {
    return this.id;
  };
  protoOf(QualifiedUserId).component2_7eebsb_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedUserId).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedUserId).copy_5bhor2_k$ = function (id, domain, unknownFields) {
    return new QualifiedUserId(id, domain, unknownFields);
  };
  protoOf(QualifiedUserId).copy = function (id, domain, unknownFields, $super) {
    id = id === VOID ? this.id : id;
    domain = domain === VOID ? this.domain : domain;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5bhor2_k$(id, domain, unknownFields);
  };
  protoOf(QualifiedUserId).toString = function () {
    return (
      'QualifiedUserId(id=' + this.id + ', domain=' + this.domain + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(QualifiedUserId).hashCode = function () {
    var result = getStringHashCode(this.id);
    result = (imul(result, 31) + getStringHashCode(this.domain)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(QualifiedUserId).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof QualifiedUserId)) return false;
    var tmp0_other_with_cast = other instanceof QualifiedUserId ? other : THROW_CCE();
    if (!(this.id === tmp0_other_with_cast.id)) return false;
    if (!(this.domain === tmp0_other_with_cast.domain)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_21() {
    Companion_instance_19 = this;
    var tmp = this;
    var tmp_0 = getKClass(QualifiedConversationId);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_76(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'id', 1, tmp1_type, id$factory_3(), VOID, 'id'));
    var tmp2_messageDescriptor = descriptor$factory_77(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'domain', 2, tmp3_type, domain$factory_1(), VOID, 'domain'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('QualifiedConversationId', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_21).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_14(Companion_getInstance_21(), u);
  };
  protoOf(Companion_21).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_19;
  function Companion_getInstance_21() {
    if (Companion_instance_19 == null) new Companion_21();
    return Companion_instance_19;
  }
  function QualifiedConversationId$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function QualifiedConversationId(id, domain, unknownFields) {
    Companion_getInstance_21();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.id = id;
    this.domain = domain;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(QualifiedConversationId$protoSize$delegate$lambda(this));
  }
  protoOf(QualifiedConversationId).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(QualifiedConversationId).get_domain_ch74y5_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedConversationId).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedConversationId).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_14(this, other);
  };
  protoOf(QualifiedConversationId).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_21().descriptor_1;
  };
  protoOf(QualifiedConversationId).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_14();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(QualifiedConversationId).component1_7eebsc_k$ = function () {
    return this.id;
  };
  protoOf(QualifiedConversationId).component2_7eebsb_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedConversationId).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedConversationId).copy_5bhor2_k$ = function (id, domain, unknownFields) {
    return new QualifiedConversationId(id, domain, unknownFields);
  };
  protoOf(QualifiedConversationId).copy = function (id, domain, unknownFields, $super) {
    id = id === VOID ? this.id : id;
    domain = domain === VOID ? this.domain : domain;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5bhor2_k$(id, domain, unknownFields);
  };
  protoOf(QualifiedConversationId).toString = function () {
    return (
      'QualifiedConversationId(id=' +
      this.id +
      ', domain=' +
      this.domain +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(QualifiedConversationId).hashCode = function () {
    var result = getStringHashCode(this.id);
    result = (imul(result, 31) + getStringHashCode(this.domain)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(QualifiedConversationId).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof QualifiedConversationId)) return false;
    var tmp0_other_with_cast = other instanceof QualifiedConversationId ? other : THROW_CCE();
    if (!(this.id === tmp0_other_with_cast.id)) return false;
    if (!(this.domain === tmp0_other_with_cast.domain)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Composite$Companion$defaultInstance$delegate$lambda() {
    return new Composite_0();
  }
  function Text_1(text) {
    Content_1.call(this, text);
  }
  function Button(button) {
    Content_1.call(this, button);
  }
  function Composite$Item$Companion$defaultInstance$delegate$lambda() {
    return new Item();
  }
  function Content_1(value) {
    OneOf.call(this, value);
  }
  function Companion_22() {
    Companion_instance_20 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(Composite$Item$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(Item);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_81(this);
    var tmp1_type = new Message(Companion_getInstance_30());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'text', 1, tmp1_type, text$factory_1(), true, 'text'),
    );
    var tmp2_messageDescriptor = descriptor$factory_82(this);
    var tmp3_type = new Message(Companion_getInstance_24());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'button', 2, tmp3_type, button$factory(), true, 'button'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('Composite.Item', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_22).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_3();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_22).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_16(Companion_getInstance_22(), u);
  };
  protoOf(Companion_22).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_20;
  function Companion_getInstance_22() {
    if (Companion_instance_20 == null) new Companion_22();
    return Companion_instance_20;
  }
  function Composite$Item$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Companion_23() {
    Companion_instance_21 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(Composite$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(Composite_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_78(this);
    var tmp1_type = new Repeated(new Message(Companion_getInstance_22()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'items', 1, tmp1_type, items$factory(), VOID, 'items'),
    );
    var tmp2_messageDescriptor = descriptor$factory_79(this);
    var tmp3_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'expects_read_confirmation',
        2,
        tmp3_type,
        expectsReadConfirmation$factory(),
        VOID,
        'expectsReadConfirmation',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_80(this);
    var tmp5_type = new Enum_0(Companion_getInstance_17(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'legal_hold_status',
        3,
        tmp5_type,
        legalHoldStatus$factory(),
        VOID,
        'legalHoldStatus',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('Composite', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_23).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_2();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_23).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_15(Companion_getInstance_23(), u);
  };
  protoOf(Companion_23).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_21;
  function Companion_getInstance_23() {
    if (Companion_instance_21 == null) new Companion_23();
    return Companion_instance_21;
  }
  function Item(content, unknownFields) {
    Companion_getInstance_22();
    content = content === VOID ? null : content;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.content = content;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Composite$Item$protoSize$delegate$lambda(this));
  }
  protoOf(Item).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(Item).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Item).get_text_wouvsm_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Text_1 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Item).get_button_bmjiuz_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Button ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Item).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_16(this, other);
  };
  protoOf(Item).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_22().descriptor_1;
  };
  protoOf(Item).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_16();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Item).component1_7eebsc_k$ = function () {
    return this.content;
  };
  protoOf(Item).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Item).copy_admill_k$ = function (content, unknownFields) {
    return new Item(content, unknownFields);
  };
  protoOf(Item).copy = function (content, unknownFields, $super) {
    content = content === VOID ? this.content : content;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_admill_k$(content, unknownFields);
  };
  protoOf(Item).toString = function () {
    return 'Item(content=' + this.content + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(Item).hashCode = function () {
    var result = this.content == null ? 0 : this.content.hashCode();
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Item).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Item)) return false;
    var tmp0_other_with_cast = other instanceof Item ? other : THROW_CCE();
    if (!equals(this.content, tmp0_other_with_cast.content)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Composite$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Composite_0(items, expectsReadConfirmation, legalHoldStatus, unknownFields) {
    Companion_getInstance_23();
    items = items === VOID ? emptyList() : items;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? null : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? null : legalHoldStatus;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.items = items;
    this.expectsReadConfirmation = expectsReadConfirmation;
    this.legalHoldStatus = legalHoldStatus;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Composite$protoSize$delegate$lambda(this));
  }
  protoOf(Composite_0).get_items_it823b_k$ = function () {
    return this.items;
  };
  protoOf(Composite_0).get_expectsReadConfirmation_i6xil8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Composite_0).get_legalHoldStatus_nngzep_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Composite_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Composite_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_15(this, other);
  };
  protoOf(Composite_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_23().descriptor_1;
  };
  protoOf(Composite_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_15();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Composite_0).component1_7eebsc_k$ = function () {
    return this.items;
  };
  protoOf(Composite_0).component2_7eebsb_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Composite_0).component3_7eebsa_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Composite_0).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Composite_0).copy_292dz5_k$ = function (items, expectsReadConfirmation, legalHoldStatus, unknownFields) {
    return new Composite_0(items, expectsReadConfirmation, legalHoldStatus, unknownFields);
  };
  protoOf(Composite_0).copy = function (items, expectsReadConfirmation, legalHoldStatus, unknownFields, $super) {
    items = items === VOID ? this.items : items;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? this.expectsReadConfirmation : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus : legalHoldStatus;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_292dz5_k$(items, expectsReadConfirmation, legalHoldStatus, unknownFields);
  };
  protoOf(Composite_0).toString = function () {
    return (
      'Composite(items=' +
      this.items +
      ', expectsReadConfirmation=' +
      this.expectsReadConfirmation +
      ', legalHoldStatus=' +
      this.legalHoldStatus +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Composite_0).hashCode = function () {
    var result = hashCode(this.items);
    result =
      (imul(result, 31) +
        (this.expectsReadConfirmation == null ? 0 : getBooleanHashCode(this.expectsReadConfirmation))) |
      0;
    result = (imul(result, 31) + (this.legalHoldStatus == null ? 0 : this.legalHoldStatus.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Composite_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Composite_0)) return false;
    var tmp0_other_with_cast = other instanceof Composite_0 ? other : THROW_CCE();
    if (!equals(this.items, tmp0_other_with_cast.items)) return false;
    if (!(this.expectsReadConfirmation == tmp0_other_with_cast.expectsReadConfirmation)) return false;
    if (!equals(this.legalHoldStatus, tmp0_other_with_cast.legalHoldStatus)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_24() {
    Companion_instance_22 = this;
    var tmp = this;
    var tmp_0 = getKClass(Button_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_83(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'text', 1, tmp1_type, text$factory_2(), VOID, 'text'),
    );
    var tmp2_messageDescriptor = descriptor$factory_84(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp2_messageDescriptor, 'id', 2, tmp3_type, id$factory_4(), VOID, 'id'));
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Button', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_24).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_17(Companion_getInstance_24(), u);
  };
  protoOf(Companion_24).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_22;
  function Companion_getInstance_24() {
    if (Companion_instance_22 == null) new Companion_24();
    return Companion_instance_22;
  }
  function Button$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Button_0(text, id, unknownFields) {
    Companion_getInstance_24();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.text = text;
    this.id = id;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Button$protoSize$delegate$lambda(this));
  }
  protoOf(Button_0).get_text_wouvsm_k$ = function () {
    return this.text;
  };
  protoOf(Button_0).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(Button_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Button_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_17(this, other);
  };
  protoOf(Button_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_24().descriptor_1;
  };
  protoOf(Button_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_17();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Button_0).component1_7eebsc_k$ = function () {
    return this.text;
  };
  protoOf(Button_0).component2_7eebsb_k$ = function () {
    return this.id;
  };
  protoOf(Button_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Button_0).copy_5bhor2_k$ = function (text, id, unknownFields) {
    return new Button_0(text, id, unknownFields);
  };
  protoOf(Button_0).copy = function (text, id, unknownFields, $super) {
    text = text === VOID ? this.text : text;
    id = id === VOID ? this.id : id;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5bhor2_k$(text, id, unknownFields);
  };
  protoOf(Button_0).toString = function () {
    return 'Button(text=' + this.text + ', id=' + this.id + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(Button_0).hashCode = function () {
    var result = getStringHashCode(this.text);
    result = (imul(result, 31) + getStringHashCode(this.id)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Button_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Button_0)) return false;
    var tmp0_other_with_cast = other instanceof Button_0 ? other : THROW_CCE();
    if (!(this.text === tmp0_other_with_cast.text)) return false;
    if (!(this.id === tmp0_other_with_cast.id)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_25() {
    Companion_instance_23 = this;
    var tmp = this;
    var tmp_0 = getKClass(ButtonAction_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_85(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'button_id', 1, tmp1_type, buttonId$factory(), VOID, 'buttonId'),
    );
    var tmp2_messageDescriptor = descriptor$factory_86(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'reference_message_id',
        2,
        tmp3_type,
        referenceMessageId$factory(),
        VOID,
        'referenceMessageId',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ButtonAction', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_25).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_18(Companion_getInstance_25(), u);
  };
  protoOf(Companion_25).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_23;
  function Companion_getInstance_25() {
    if (Companion_instance_23 == null) new Companion_25();
    return Companion_instance_23;
  }
  function ButtonAction$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ButtonAction_0(buttonId, referenceMessageId, unknownFields) {
    Companion_getInstance_25();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.buttonId = buttonId;
    this.referenceMessageId = referenceMessageId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ButtonAction$protoSize$delegate$lambda(this));
  }
  protoOf(ButtonAction_0).get_buttonId_kwhwhi_k$ = function () {
    return this.buttonId;
  };
  protoOf(ButtonAction_0).get_referenceMessageId_9rlz40_k$ = function () {
    return this.referenceMessageId;
  };
  protoOf(ButtonAction_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ButtonAction_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_18(this, other);
  };
  protoOf(ButtonAction_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_25().descriptor_1;
  };
  protoOf(ButtonAction_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_18();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ButtonAction_0).component1_7eebsc_k$ = function () {
    return this.buttonId;
  };
  protoOf(ButtonAction_0).component2_7eebsb_k$ = function () {
    return this.referenceMessageId;
  };
  protoOf(ButtonAction_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ButtonAction_0).copy_5bhor2_k$ = function (buttonId, referenceMessageId, unknownFields) {
    return new ButtonAction_0(buttonId, referenceMessageId, unknownFields);
  };
  protoOf(ButtonAction_0).copy = function (buttonId, referenceMessageId, unknownFields, $super) {
    buttonId = buttonId === VOID ? this.buttonId : buttonId;
    referenceMessageId = referenceMessageId === VOID ? this.referenceMessageId : referenceMessageId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5bhor2_k$(buttonId, referenceMessageId, unknownFields);
  };
  protoOf(ButtonAction_0).toString = function () {
    return (
      'ButtonAction(buttonId=' +
      this.buttonId +
      ', referenceMessageId=' +
      this.referenceMessageId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ButtonAction_0).hashCode = function () {
    var result = getStringHashCode(this.buttonId);
    result = (imul(result, 31) + getStringHashCode(this.referenceMessageId)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ButtonAction_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ButtonAction_0)) return false;
    var tmp0_other_with_cast = other instanceof ButtonAction_0 ? other : THROW_CCE();
    if (!(this.buttonId === tmp0_other_with_cast.buttonId)) return false;
    if (!(this.referenceMessageId === tmp0_other_with_cast.referenceMessageId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_26() {
    Companion_instance_24 = this;
    var tmp = this;
    var tmp_0 = getKClass(ButtonActionConfirmation_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_87(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'reference_message_id',
        1,
        tmp1_type,
        referenceMessageId$factory_0(),
        VOID,
        'referenceMessageId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_88(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'button_id', 2, tmp3_type, buttonId$factory_0(), VOID, 'buttonId'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ButtonActionConfirmation', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_26).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_19(Companion_getInstance_26(), u);
  };
  protoOf(Companion_26).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_24;
  function Companion_getInstance_26() {
    if (Companion_instance_24 == null) new Companion_26();
    return Companion_instance_24;
  }
  function ButtonActionConfirmation$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ButtonActionConfirmation_0(referenceMessageId, buttonId, unknownFields) {
    Companion_getInstance_26();
    buttonId = buttonId === VOID ? null : buttonId;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.referenceMessageId = referenceMessageId;
    this.buttonId = buttonId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ButtonActionConfirmation$protoSize$delegate$lambda(this));
  }
  protoOf(ButtonActionConfirmation_0).get_referenceMessageId_9rlz40_k$ = function () {
    return this.referenceMessageId;
  };
  protoOf(ButtonActionConfirmation_0).get_buttonId_kwhwhi_k$ = function () {
    return this.buttonId;
  };
  protoOf(ButtonActionConfirmation_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ButtonActionConfirmation_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_19(this, other);
  };
  protoOf(ButtonActionConfirmation_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_26().descriptor_1;
  };
  protoOf(ButtonActionConfirmation_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_19();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ButtonActionConfirmation_0).component1_7eebsc_k$ = function () {
    return this.referenceMessageId;
  };
  protoOf(ButtonActionConfirmation_0).component2_7eebsb_k$ = function () {
    return this.buttonId;
  };
  protoOf(ButtonActionConfirmation_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ButtonActionConfirmation_0).copy_qqfrz9_k$ = function (referenceMessageId, buttonId, unknownFields) {
    return new ButtonActionConfirmation_0(referenceMessageId, buttonId, unknownFields);
  };
  protoOf(ButtonActionConfirmation_0).copy = function (referenceMessageId, buttonId, unknownFields, $super) {
    referenceMessageId = referenceMessageId === VOID ? this.referenceMessageId : referenceMessageId;
    buttonId = buttonId === VOID ? this.buttonId : buttonId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_qqfrz9_k$(referenceMessageId, buttonId, unknownFields);
  };
  protoOf(ButtonActionConfirmation_0).toString = function () {
    return (
      'ButtonActionConfirmation(referenceMessageId=' +
      this.referenceMessageId +
      ', buttonId=' +
      this.buttonId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ButtonActionConfirmation_0).hashCode = function () {
    var result = getStringHashCode(this.referenceMessageId);
    result = (imul(result, 31) + (this.buttonId == null ? 0 : getStringHashCode(this.buttonId))) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ButtonActionConfirmation_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ButtonActionConfirmation_0)) return false;
    var tmp0_other_with_cast = other instanceof ButtonActionConfirmation_0 ? other : THROW_CCE();
    if (!(this.referenceMessageId === tmp0_other_with_cast.referenceMessageId)) return false;
    if (!(this.buttonId == tmp0_other_with_cast.buttonId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Availability$Type$Companion$values$delegate$lambda() {
    return listOf([NONE_getInstance(), AVAILABLE_getInstance(), AWAY_getInstance(), BUSY_getInstance()]);
  }
  function NONE() {
    NONE_instance = this;
    Type.call(this, 0, 'NONE');
  }
  var NONE_instance;
  function NONE_getInstance() {
    if (NONE_instance == null) new NONE();
    return NONE_instance;
  }
  function AVAILABLE() {
    AVAILABLE_instance = this;
    Type.call(this, 1, 'AVAILABLE');
  }
  var AVAILABLE_instance;
  function AVAILABLE_getInstance() {
    if (AVAILABLE_instance == null) new AVAILABLE();
    return AVAILABLE_instance;
  }
  function AWAY() {
    AWAY_instance = this;
    Type.call(this, 2, 'AWAY');
  }
  var AWAY_instance;
  function AWAY_getInstance() {
    if (AWAY_instance == null) new AWAY();
    return AWAY_instance;
  }
  function BUSY() {
    BUSY_instance = this;
    Type.call(this, 3, 'BUSY');
  }
  var BUSY_instance;
  function BUSY_getInstance() {
    if (BUSY_instance == null) new BUSY();
    return BUSY_instance;
  }
  function UNRECOGNIZED_4(value) {
    Type.call(this, value);
  }
  function Companion_27() {
    Companion_instance_25 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(Availability$Type$Companion$values$delegate$lambda);
  }
  protoOf(Companion_27).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_4();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_27).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_4(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_27).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No Type with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_25;
  function Companion_getInstance_27() {
    if (Companion_instance_25 == null) new Companion_27();
    return Companion_instance_25;
  }
  function Companion_28() {
    Companion_instance_26 = this;
    var tmp = this;
    var tmp_0 = getKClass(Availability_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_89(this);
    var tmp1_type = new Enum_0(Companion_getInstance_27(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'type', 1, tmp1_type, type$factory(), VOID, 'type'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Availability', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_28).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_20(Companion_getInstance_28(), u);
  };
  protoOf(Companion_28).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_26;
  function Companion_getInstance_28() {
    if (Companion_instance_26 == null) new Companion_28();
    return Companion_instance_26;
  }
  function Type(value, name) {
    Companion_getInstance_27();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(Type).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(Type).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(Type).equals = function (other) {
    var tmp;
    if (other instanceof Type) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(Type).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(Type).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'Availability.Type.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Availability$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Availability_0(type, unknownFields) {
    Companion_getInstance_28();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.type = type;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Availability$protoSize$delegate$lambda(this));
  }
  protoOf(Availability_0).get_type_wovaf7_k$ = function () {
    return this.type;
  };
  protoOf(Availability_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Availability_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_20(this, other);
  };
  protoOf(Availability_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_28().descriptor_1;
  };
  protoOf(Availability_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_20();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Availability_0).component1_7eebsc_k$ = function () {
    return this.type;
  };
  protoOf(Availability_0).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Availability_0).copy_lav0rq_k$ = function (type, unknownFields) {
    return new Availability_0(type, unknownFields);
  };
  protoOf(Availability_0).copy = function (type, unknownFields, $super) {
    type = type === VOID ? this.type : type;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_lav0rq_k$(type, unknownFields);
  };
  protoOf(Availability_0).toString = function () {
    return 'Availability(type=' + this.type + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(Availability_0).hashCode = function () {
    var result = this.type.hashCode();
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Availability_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Availability_0)) return false;
    var tmp0_other_with_cast = other instanceof Availability_0 ? other : THROW_CCE();
    if (!this.type.equals(tmp0_other_with_cast.type)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Text_2(text) {
    Content_2.call(this, text);
  }
  function Image_1(image) {
    Content_2.call(this, image);
  }
  function Knock_0(knock) {
    Content_2.call(this, knock);
  }
  function Asset_1(asset) {
    Content_2.call(this, asset);
  }
  function Location_1(location) {
    Content_2.call(this, location);
  }
  function Content_2(value) {
    OneOf.call(this, value);
  }
  function Companion_29() {
    Companion_instance_27 = this;
    var tmp = this;
    var tmp_0 = getKClass(Ephemeral_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(6);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(6);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_90(this);
    var tmp1_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'expire_after_millis',
        1,
        tmp1_type,
        expireAfterMillis$factory(),
        VOID,
        'expireAfterMillis',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_91(this);
    var tmp3_type = new Message(Companion_getInstance_30());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'text', 2, tmp3_type, text$factory_3(), true, 'text'),
    );
    var tmp4_messageDescriptor = descriptor$factory_92(this);
    var tmp5_type = new Message(Companion_getInstance_45());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'image', 3, tmp5_type, image$factory_1(), true, 'image'),
    );
    var tmp6_messageDescriptor = descriptor$factory_93(this);
    var tmp7_type = new Message(Companion_getInstance_31());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'knock', 4, tmp7_type, knock$factory_0(), true, 'knock'),
    );
    var tmp8_messageDescriptor = descriptor$factory_94(this);
    var tmp9_type = new Message(Companion_getInstance_53());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp8_messageDescriptor, 'asset', 5, tmp9_type, asset$factory_1(), true, 'asset'),
    );
    var tmp10_messageDescriptor = descriptor$factory_95(this);
    var tmp11_type = new Message(Companion_getInstance_44());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'location', 6, tmp11_type, location$factory_1(), true, 'location'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Ephemeral', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_29).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_21(Companion_getInstance_29(), u);
  };
  protoOf(Companion_29).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_27;
  function Companion_getInstance_29() {
    if (Companion_instance_27 == null) new Companion_29();
    return Companion_instance_27;
  }
  function Ephemeral$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Ephemeral_0(expireAfterMillis, content, unknownFields) {
    Companion_getInstance_29();
    content = content === VOID ? null : content;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.expireAfterMillis = expireAfterMillis;
    this.content = content;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Ephemeral$protoSize$delegate$lambda(this));
  }
  protoOf(Ephemeral_0).get_expireAfterMillis_hlbbie_k$ = function () {
    return this.expireAfterMillis;
  };
  protoOf(Ephemeral_0).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(Ephemeral_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Ephemeral_0).get_text_wouvsm_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Text_2 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Ephemeral_0).get_image_it3i2a_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Image_1 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Ephemeral_0).get_knock_iu80iz_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Knock_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Ephemeral_0).get_asset_iotcjr_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Asset_1 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Ephemeral_0).get_location_d3s02_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Location_1 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Ephemeral_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_21(this, other);
  };
  protoOf(Ephemeral_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_29().descriptor_1;
  };
  protoOf(Ephemeral_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_21();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Ephemeral_0).component1_7eebsc_k$ = function () {
    return this.expireAfterMillis;
  };
  protoOf(Ephemeral_0).component2_7eebsb_k$ = function () {
    return this.content;
  };
  protoOf(Ephemeral_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Ephemeral_0).copy_gc6a5g_k$ = function (expireAfterMillis, content, unknownFields) {
    return new Ephemeral_0(expireAfterMillis, content, unknownFields);
  };
  protoOf(Ephemeral_0).copy = function (expireAfterMillis, content, unknownFields, $super) {
    expireAfterMillis = expireAfterMillis === VOID ? this.expireAfterMillis : expireAfterMillis;
    content = content === VOID ? this.content : content;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_gc6a5g_k$(expireAfterMillis, content, unknownFields);
  };
  protoOf(Ephemeral_0).toString = function () {
    return (
      'Ephemeral(expireAfterMillis=' +
      this.expireAfterMillis.toString() +
      ', content=' +
      this.content +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Ephemeral_0).hashCode = function () {
    var result = this.expireAfterMillis.hashCode();
    result = (imul(result, 31) + (this.content == null ? 0 : this.content.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Ephemeral_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Ephemeral_0)) return false;
    var tmp0_other_with_cast = other instanceof Ephemeral_0 ? other : THROW_CCE();
    if (!this.expireAfterMillis.equals(tmp0_other_with_cast.expireAfterMillis)) return false;
    if (!equals(this.content, tmp0_other_with_cast.content)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_30() {
    Companion_instance_28 = this;
    var tmp = this;
    var tmp_0 = getKClass(Text_3);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(6);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(6);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_96(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'content', 1, tmp1_type, content$factory_0(), VOID, 'content'),
    );
    var tmp2_messageDescriptor = descriptor$factory_97(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_32()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'link_preview',
        3,
        tmp3_type,
        linkPreview$factory(),
        VOID,
        'linkPreview',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_98(this);
    var tmp5_type = new Repeated(new Message(Companion_getInstance_35()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'mentions', 4, tmp5_type, mentions$factory(), VOID, 'mentions'),
    );
    var tmp6_messageDescriptor = descriptor$factory_99(this);
    var tmp7_type = new Message(Companion_getInstance_41());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'quote', 5, tmp7_type, quote$factory(), VOID, 'quote'),
    );
    var tmp8_messageDescriptor = descriptor$factory_100(this);
    var tmp9_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'expects_read_confirmation',
        6,
        tmp9_type,
        expectsReadConfirmation$factory_0(),
        VOID,
        'expectsReadConfirmation',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_101(this);
    var tmp11_type = new Enum_0(Companion_getInstance_17(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp10_messageDescriptor,
        'legal_hold_status',
        7,
        tmp11_type,
        legalHoldStatus$factory_0(),
        VOID,
        'legalHoldStatus',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Text', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_30).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_22(Companion_getInstance_30(), u);
  };
  protoOf(Companion_30).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_28;
  function Companion_getInstance_30() {
    if (Companion_instance_28 == null) new Companion_30();
    return Companion_instance_28;
  }
  function Text$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Text_3(content, linkPreview, mentions, quote, expectsReadConfirmation, legalHoldStatus, unknownFields) {
    Companion_getInstance_30();
    linkPreview = linkPreview === VOID ? emptyList() : linkPreview;
    mentions = mentions === VOID ? emptyList() : mentions;
    quote = quote === VOID ? null : quote;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? null : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? null : legalHoldStatus;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.content = content;
    this.linkPreview = linkPreview;
    this.mentions = mentions;
    this.quote = quote;
    this.expectsReadConfirmation = expectsReadConfirmation;
    this.legalHoldStatus = legalHoldStatus;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Text$protoSize$delegate$lambda(this));
  }
  protoOf(Text_3).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(Text_3).get_linkPreview_p4e7ej_k$ = function () {
    return this.linkPreview;
  };
  protoOf(Text_3).get_mentions_t8izyq_k$ = function () {
    return this.mentions;
  };
  protoOf(Text_3).get_quote_ixn9eb_k$ = function () {
    return this.quote;
  };
  protoOf(Text_3).get_expectsReadConfirmation_i6xil8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Text_3).get_legalHoldStatus_nngzep_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Text_3).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Text_3).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_22(this, other);
  };
  protoOf(Text_3).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_30().descriptor_1;
  };
  protoOf(Text_3).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_22();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Text_3).component1_7eebsc_k$ = function () {
    return this.content;
  };
  protoOf(Text_3).component2_7eebsb_k$ = function () {
    return this.linkPreview;
  };
  protoOf(Text_3).component3_7eebsa_k$ = function () {
    return this.mentions;
  };
  protoOf(Text_3).component4_7eebs9_k$ = function () {
    return this.quote;
  };
  protoOf(Text_3).component5_7eebs8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Text_3).component6_7eebs7_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Text_3).component7_7eebs6_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Text_3).copy_thmuy5_k$ = function (
    content,
    linkPreview,
    mentions,
    quote,
    expectsReadConfirmation,
    legalHoldStatus,
    unknownFields,
  ) {
    return new Text_3(content, linkPreview, mentions, quote, expectsReadConfirmation, legalHoldStatus, unknownFields);
  };
  protoOf(Text_3).copy = function (
    content,
    linkPreview,
    mentions,
    quote,
    expectsReadConfirmation,
    legalHoldStatus,
    unknownFields,
    $super,
  ) {
    content = content === VOID ? this.content : content;
    linkPreview = linkPreview === VOID ? this.linkPreview : linkPreview;
    mentions = mentions === VOID ? this.mentions : mentions;
    quote = quote === VOID ? this.quote : quote;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? this.expectsReadConfirmation : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus : legalHoldStatus;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_thmuy5_k$(
      content,
      linkPreview,
      mentions,
      quote,
      expectsReadConfirmation,
      legalHoldStatus,
      unknownFields,
    );
  };
  protoOf(Text_3).toString = function () {
    return (
      'Text(content=' +
      this.content +
      ', linkPreview=' +
      this.linkPreview +
      ', mentions=' +
      this.mentions +
      ', quote=' +
      this.quote +
      ', expectsReadConfirmation=' +
      this.expectsReadConfirmation +
      ', legalHoldStatus=' +
      this.legalHoldStatus +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Text_3).hashCode = function () {
    var result = getStringHashCode(this.content);
    result = (imul(result, 31) + hashCode(this.linkPreview)) | 0;
    result = (imul(result, 31) + hashCode(this.mentions)) | 0;
    result = (imul(result, 31) + (this.quote == null ? 0 : this.quote.hashCode())) | 0;
    result =
      (imul(result, 31) +
        (this.expectsReadConfirmation == null ? 0 : getBooleanHashCode(this.expectsReadConfirmation))) |
      0;
    result = (imul(result, 31) + (this.legalHoldStatus == null ? 0 : this.legalHoldStatus.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Text_3).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Text_3)) return false;
    var tmp0_other_with_cast = other instanceof Text_3 ? other : THROW_CCE();
    if (!(this.content === tmp0_other_with_cast.content)) return false;
    if (!equals(this.linkPreview, tmp0_other_with_cast.linkPreview)) return false;
    if (!equals(this.mentions, tmp0_other_with_cast.mentions)) return false;
    if (!equals(this.quote, tmp0_other_with_cast.quote)) return false;
    if (!(this.expectsReadConfirmation == tmp0_other_with_cast.expectsReadConfirmation)) return false;
    if (!equals(this.legalHoldStatus, tmp0_other_with_cast.legalHoldStatus)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_31() {
    Companion_instance_29 = this;
    var tmp = this;
    var tmp_0 = getKClass(Knock_1);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_102(this);
    var tmp1_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'hot_knock', 1, tmp1_type, hotKnock$factory(), VOID, 'hotKnock'),
    );
    var tmp2_messageDescriptor = descriptor$factory_103(this);
    var tmp3_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'expects_read_confirmation',
        2,
        tmp3_type,
        expectsReadConfirmation$factory_1(),
        VOID,
        'expectsReadConfirmation',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_104(this);
    var tmp5_type = new Enum_0(Companion_getInstance_17(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'legal_hold_status',
        3,
        tmp5_type,
        legalHoldStatus$factory_1(),
        VOID,
        'legalHoldStatus',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Knock', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_31).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_23(Companion_getInstance_31(), u);
  };
  protoOf(Companion_31).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_29;
  function Companion_getInstance_31() {
    if (Companion_instance_29 == null) new Companion_31();
    return Companion_instance_29;
  }
  function Knock$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Knock_1(hotKnock, expectsReadConfirmation, legalHoldStatus, unknownFields) {
    Companion_getInstance_31();
    expectsReadConfirmation = expectsReadConfirmation === VOID ? null : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? null : legalHoldStatus;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.hotKnock = hotKnock;
    this.expectsReadConfirmation = expectsReadConfirmation;
    this.legalHoldStatus = legalHoldStatus;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Knock$protoSize$delegate$lambda(this));
  }
  protoOf(Knock_1).get_hotKnock_y46tlc_k$ = function () {
    return this.hotKnock;
  };
  protoOf(Knock_1).get_expectsReadConfirmation_i6xil8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Knock_1).get_legalHoldStatus_nngzep_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Knock_1).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Knock_1).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_23(this, other);
  };
  protoOf(Knock_1).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_31().descriptor_1;
  };
  protoOf(Knock_1).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_23();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Knock_1).component1_7eebsc_k$ = function () {
    return this.hotKnock;
  };
  protoOf(Knock_1).component2_7eebsb_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Knock_1).component3_7eebsa_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Knock_1).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Knock_1).copy_naxlx7_k$ = function (hotKnock, expectsReadConfirmation, legalHoldStatus, unknownFields) {
    return new Knock_1(hotKnock, expectsReadConfirmation, legalHoldStatus, unknownFields);
  };
  protoOf(Knock_1).copy = function (hotKnock, expectsReadConfirmation, legalHoldStatus, unknownFields, $super) {
    hotKnock = hotKnock === VOID ? this.hotKnock : hotKnock;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? this.expectsReadConfirmation : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus : legalHoldStatus;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_naxlx7_k$(hotKnock, expectsReadConfirmation, legalHoldStatus, unknownFields);
  };
  protoOf(Knock_1).toString = function () {
    return (
      'Knock(hotKnock=' +
      this.hotKnock +
      ', expectsReadConfirmation=' +
      this.expectsReadConfirmation +
      ', legalHoldStatus=' +
      this.legalHoldStatus +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Knock_1).hashCode = function () {
    var result = getBooleanHashCode(this.hotKnock);
    result =
      (imul(result, 31) +
        (this.expectsReadConfirmation == null ? 0 : getBooleanHashCode(this.expectsReadConfirmation))) |
      0;
    result = (imul(result, 31) + (this.legalHoldStatus == null ? 0 : this.legalHoldStatus.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Knock_1).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Knock_1)) return false;
    var tmp0_other_with_cast = other instanceof Knock_1 ? other : THROW_CCE();
    if (!(this.hotKnock === tmp0_other_with_cast.hotKnock)) return false;
    if (!(this.expectsReadConfirmation == tmp0_other_with_cast.expectsReadConfirmation)) return false;
    if (!equals(this.legalHoldStatus, tmp0_other_with_cast.legalHoldStatus)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Article(article) {
    Preview.call(this, article);
  }
  function Tweet(tweet) {
    MetaData_0.call(this, tweet);
  }
  function Preview(value) {
    OneOf.call(this, value);
  }
  function MetaData_0(value) {
    OneOf.call(this, value);
  }
  function Companion_32() {
    Companion_instance_30 = this;
    var tmp = this;
    var tmp_0 = getKClass(LinkPreview);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(8);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(8);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_105(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'url', 1, tmp1_type, url$factory(), VOID, 'url'));
    var tmp2_messageDescriptor = descriptor$factory_106(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'url_offset', 2, tmp3_type, urlOffset$factory(), VOID, 'urlOffset'),
    );
    var tmp4_messageDescriptor = descriptor$factory_107(this);
    var tmp5_type = new Message(Companion_getInstance_34());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'article', 3, tmp5_type, article$factory(), true, 'article'),
    );
    var tmp6_messageDescriptor = descriptor$factory_108(this);
    var tmp7_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'permanent_url',
        5,
        tmp7_type,
        permanentUrl$factory(),
        VOID,
        'permanentUrl',
      ),
    );
    var tmp8_messageDescriptor = descriptor$factory_109(this);
    var tmp9_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp8_messageDescriptor, 'title', 6, tmp9_type, title$factory(), VOID, 'title'),
    );
    var tmp10_messageDescriptor = descriptor$factory_110(this);
    var tmp11_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'summary', 7, tmp11_type, summary$factory(), VOID, 'summary'),
    );
    var tmp12_messageDescriptor = descriptor$factory_111(this);
    var tmp13_type = new Message(Companion_getInstance_53());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp12_messageDescriptor, 'image', 8, tmp13_type, image$factory_2(), VOID, 'image'),
    );
    var tmp14_messageDescriptor = descriptor$factory_112(this);
    var tmp15_type = new Message(Companion_getInstance_33());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp14_messageDescriptor, 'tweet', 9, tmp15_type, tweet$factory(), true, 'tweet'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('LinkPreview', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_32).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_24(Companion_getInstance_32(), u);
  };
  protoOf(Companion_32).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_30;
  function Companion_getInstance_32() {
    if (Companion_instance_30 == null) new Companion_32();
    return Companion_instance_30;
  }
  function LinkPreview$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function LinkPreview(url, urlOffset, permanentUrl, title, summary, image, preview, metaData, unknownFields) {
    Companion_getInstance_32();
    permanentUrl = permanentUrl === VOID ? null : permanentUrl;
    title = title === VOID ? null : title;
    summary = summary === VOID ? null : summary;
    image = image === VOID ? null : image;
    preview = preview === VOID ? null : preview;
    metaData = metaData === VOID ? null : metaData;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.url = url;
    this.urlOffset = urlOffset;
    this.permanentUrl = permanentUrl;
    this.title = title;
    this.summary = summary;
    this.image = image;
    this.preview = preview;
    this.metaData = metaData;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(LinkPreview$protoSize$delegate$lambda(this));
  }
  protoOf(LinkPreview).get_url_18iuii_k$ = function () {
    return this.url;
  };
  protoOf(LinkPreview).get_urlOffset_jqkhl_k$ = function () {
    return this.urlOffset;
  };
  protoOf(LinkPreview).get_permanentUrl_8vcfdi_k$ = function () {
    return this.permanentUrl;
  };
  protoOf(LinkPreview).get_title_iz32un_k$ = function () {
    return this.title;
  };
  protoOf(LinkPreview).get_summary_tgfqkj_k$ = function () {
    return this.summary;
  };
  protoOf(LinkPreview).get_image_it3i2a_k$ = function () {
    return this.image;
  };
  protoOf(LinkPreview).get_preview_3zvuox_k$ = function () {
    return this.preview;
  };
  protoOf(LinkPreview).get_metaData_vroqag_k$ = function () {
    return this.metaData;
  };
  protoOf(LinkPreview).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(LinkPreview).get_article_auhgc3_k$ = function () {
    var tmp = this.preview;
    var tmp0_safe_receiver = tmp instanceof Article ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(LinkPreview).get_tweet_izbpe0_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Tweet ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(LinkPreview).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_24(this, other);
  };
  protoOf(LinkPreview).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_32().descriptor_1;
  };
  protoOf(LinkPreview).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_24();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(LinkPreview).component1_7eebsc_k$ = function () {
    return this.url;
  };
  protoOf(LinkPreview).component2_7eebsb_k$ = function () {
    return this.urlOffset;
  };
  protoOf(LinkPreview).component3_7eebsa_k$ = function () {
    return this.permanentUrl;
  };
  protoOf(LinkPreview).component4_7eebs9_k$ = function () {
    return this.title;
  };
  protoOf(LinkPreview).component5_7eebs8_k$ = function () {
    return this.summary;
  };
  protoOf(LinkPreview).component6_7eebs7_k$ = function () {
    return this.image;
  };
  protoOf(LinkPreview).component7_7eebs6_k$ = function () {
    return this.preview;
  };
  protoOf(LinkPreview).component8_7eebs5_k$ = function () {
    return this.metaData;
  };
  protoOf(LinkPreview).component9_7eebs4_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(LinkPreview).copy_nbifph_k$ = function (
    url,
    urlOffset,
    permanentUrl,
    title,
    summary,
    image,
    preview,
    metaData,
    unknownFields,
  ) {
    return new LinkPreview(url, urlOffset, permanentUrl, title, summary, image, preview, metaData, unknownFields);
  };
  protoOf(LinkPreview).copy = function (
    url,
    urlOffset,
    permanentUrl,
    title,
    summary,
    image,
    preview,
    metaData,
    unknownFields,
    $super,
  ) {
    url = url === VOID ? this.url : url;
    urlOffset = urlOffset === VOID ? this.urlOffset : urlOffset;
    permanentUrl = permanentUrl === VOID ? this.permanentUrl : permanentUrl;
    title = title === VOID ? this.title : title;
    summary = summary === VOID ? this.summary : summary;
    image = image === VOID ? this.image : image;
    preview = preview === VOID ? this.preview : preview;
    metaData = metaData === VOID ? this.metaData : metaData;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_nbifph_k$(url, urlOffset, permanentUrl, title, summary, image, preview, metaData, unknownFields);
  };
  protoOf(LinkPreview).toString = function () {
    return (
      'LinkPreview(url=' +
      this.url +
      ', urlOffset=' +
      this.urlOffset +
      ', permanentUrl=' +
      this.permanentUrl +
      ', title=' +
      this.title +
      ', summary=' +
      this.summary +
      ', image=' +
      this.image +
      ', preview=' +
      this.preview +
      ', metaData=' +
      this.metaData +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(LinkPreview).hashCode = function () {
    var result = getStringHashCode(this.url);
    result = (imul(result, 31) + this.urlOffset) | 0;
    result = (imul(result, 31) + (this.permanentUrl == null ? 0 : getStringHashCode(this.permanentUrl))) | 0;
    result = (imul(result, 31) + (this.title == null ? 0 : getStringHashCode(this.title))) | 0;
    result = (imul(result, 31) + (this.summary == null ? 0 : getStringHashCode(this.summary))) | 0;
    result = (imul(result, 31) + (this.image == null ? 0 : this.image.hashCode())) | 0;
    result = (imul(result, 31) + (this.preview == null ? 0 : this.preview.hashCode())) | 0;
    result = (imul(result, 31) + (this.metaData == null ? 0 : this.metaData.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(LinkPreview).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof LinkPreview)) return false;
    var tmp0_other_with_cast = other instanceof LinkPreview ? other : THROW_CCE();
    if (!(this.url === tmp0_other_with_cast.url)) return false;
    if (!(this.urlOffset === tmp0_other_with_cast.urlOffset)) return false;
    if (!(this.permanentUrl == tmp0_other_with_cast.permanentUrl)) return false;
    if (!(this.title == tmp0_other_with_cast.title)) return false;
    if (!(this.summary == tmp0_other_with_cast.summary)) return false;
    if (!equals(this.image, tmp0_other_with_cast.image)) return false;
    if (!equals(this.preview, tmp0_other_with_cast.preview)) return false;
    if (!equals(this.metaData, tmp0_other_with_cast.metaData)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Tweet$Companion$defaultInstance$delegate$lambda() {
    return new Tweet_0();
  }
  function Companion_33() {
    Companion_instance_31 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(Tweet$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(Tweet_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_113(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'author', 1, tmp1_type, author$factory(), VOID, 'author'),
    );
    var tmp2_messageDescriptor = descriptor$factory_114(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'username', 2, tmp3_type, username$factory(), VOID, 'username'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('Tweet', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_33).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_4();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_33).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_25(Companion_getInstance_33(), u);
  };
  protoOf(Companion_33).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_31;
  function Companion_getInstance_33() {
    if (Companion_instance_31 == null) new Companion_33();
    return Companion_instance_31;
  }
  function Tweet$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Tweet_0(author, username, unknownFields) {
    Companion_getInstance_33();
    author = author === VOID ? null : author;
    username = username === VOID ? null : username;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.author = author;
    this.username = username;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Tweet$protoSize$delegate$lambda(this));
  }
  protoOf(Tweet_0).get_author_b5hnkk_k$ = function () {
    return this.author;
  };
  protoOf(Tweet_0).get_username_ytz5i7_k$ = function () {
    return this.username;
  };
  protoOf(Tweet_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Tweet_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_25(this, other);
  };
  protoOf(Tweet_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_33().descriptor_1;
  };
  protoOf(Tweet_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_25();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Tweet_0).component1_7eebsc_k$ = function () {
    return this.author;
  };
  protoOf(Tweet_0).component2_7eebsb_k$ = function () {
    return this.username;
  };
  protoOf(Tweet_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Tweet_0).copy_qgfu5g_k$ = function (author, username, unknownFields) {
    return new Tweet_0(author, username, unknownFields);
  };
  protoOf(Tweet_0).copy = function (author, username, unknownFields, $super) {
    author = author === VOID ? this.author : author;
    username = username === VOID ? this.username : username;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_qgfu5g_k$(author, username, unknownFields);
  };
  protoOf(Tweet_0).toString = function () {
    return (
      'Tweet(author=' + this.author + ', username=' + this.username + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(Tweet_0).hashCode = function () {
    var result = this.author == null ? 0 : getStringHashCode(this.author);
    result = (imul(result, 31) + (this.username == null ? 0 : getStringHashCode(this.username))) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Tweet_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Tweet_0)) return false;
    var tmp0_other_with_cast = other instanceof Tweet_0 ? other : THROW_CCE();
    if (!(this.author == tmp0_other_with_cast.author)) return false;
    if (!(this.username == tmp0_other_with_cast.username)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_34() {
    Companion_instance_32 = this;
    var tmp = this;
    var tmp_0 = getKClass(Article_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(4);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(4);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_115(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'permanent_url',
        1,
        tmp1_type,
        permanentUrl$factory_0(),
        VOID,
        'permanentUrl',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_116(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'title', 2, tmp3_type, title$factory_0(), VOID, 'title'),
    );
    var tmp4_messageDescriptor = descriptor$factory_117(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'summary', 3, tmp5_type, summary$factory_0(), VOID, 'summary'),
    );
    var tmp6_messageDescriptor = descriptor$factory_118(this);
    var tmp7_type = new Message(Companion_getInstance_53());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'image', 4, tmp7_type, image$factory_3(), VOID, 'image'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Article', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_34).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_26(Companion_getInstance_34(), u);
  };
  protoOf(Companion_34).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_32;
  function Companion_getInstance_34() {
    if (Companion_instance_32 == null) new Companion_34();
    return Companion_instance_32;
  }
  function Article$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Article_0(permanentUrl, title, summary, image, unknownFields) {
    Companion_getInstance_34();
    title = title === VOID ? null : title;
    summary = summary === VOID ? null : summary;
    image = image === VOID ? null : image;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.permanentUrl = permanentUrl;
    this.title = title;
    this.summary = summary;
    this.image = image;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Article$protoSize$delegate$lambda(this));
  }
  protoOf(Article_0).get_permanentUrl_8vcfdi_k$ = function () {
    return this.permanentUrl;
  };
  protoOf(Article_0).get_title_iz32un_k$ = function () {
    return this.title;
  };
  protoOf(Article_0).get_summary_tgfqkj_k$ = function () {
    return this.summary;
  };
  protoOf(Article_0).get_image_it3i2a_k$ = function () {
    return this.image;
  };
  protoOf(Article_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Article_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_26(this, other);
  };
  protoOf(Article_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_34().descriptor_1;
  };
  protoOf(Article_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_26();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Article_0).component1_7eebsc_k$ = function () {
    return this.permanentUrl;
  };
  protoOf(Article_0).component2_7eebsb_k$ = function () {
    return this.title;
  };
  protoOf(Article_0).component3_7eebsa_k$ = function () {
    return this.summary;
  };
  protoOf(Article_0).component4_7eebs9_k$ = function () {
    return this.image;
  };
  protoOf(Article_0).component5_7eebs8_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Article_0).copy_s25tq7_k$ = function (permanentUrl, title, summary, image, unknownFields) {
    return new Article_0(permanentUrl, title, summary, image, unknownFields);
  };
  protoOf(Article_0).copy = function (permanentUrl, title, summary, image, unknownFields, $super) {
    permanentUrl = permanentUrl === VOID ? this.permanentUrl : permanentUrl;
    title = title === VOID ? this.title : title;
    summary = summary === VOID ? this.summary : summary;
    image = image === VOID ? this.image : image;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_s25tq7_k$(permanentUrl, title, summary, image, unknownFields);
  };
  protoOf(Article_0).toString = function () {
    return (
      'Article(permanentUrl=' +
      this.permanentUrl +
      ', title=' +
      this.title +
      ', summary=' +
      this.summary +
      ', image=' +
      this.image +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Article_0).hashCode = function () {
    var result = getStringHashCode(this.permanentUrl);
    result = (imul(result, 31) + (this.title == null ? 0 : getStringHashCode(this.title))) | 0;
    result = (imul(result, 31) + (this.summary == null ? 0 : getStringHashCode(this.summary))) | 0;
    result = (imul(result, 31) + (this.image == null ? 0 : this.image.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Article_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Article_0)) return false;
    var tmp0_other_with_cast = other instanceof Article_0 ? other : THROW_CCE();
    if (!(this.permanentUrl === tmp0_other_with_cast.permanentUrl)) return false;
    if (!(this.title == tmp0_other_with_cast.title)) return false;
    if (!(this.summary == tmp0_other_with_cast.summary)) return false;
    if (!equals(this.image, tmp0_other_with_cast.image)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function UserId(userId) {
    userId = userId === VOID ? '' : userId;
    MentionType.call(this, userId);
  }
  function MentionType(value) {
    OneOf.call(this, value);
  }
  function Companion_35() {
    Companion_instance_33 = this;
    var tmp = this;
    var tmp_0 = getKClass(Mention);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(4);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(4);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_119(this);
    var tmp1_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'start', 1, tmp1_type, start$factory(), VOID, 'start'),
    );
    var tmp2_messageDescriptor = descriptor$factory_120(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'length', 2, tmp3_type, length$factory(), VOID, 'length'),
    );
    var tmp4_messageDescriptor = descriptor$factory_121(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'user_id', 3, tmp5_type, userId$factory_0(), true, 'userId'),
    );
    var tmp6_messageDescriptor = descriptor$factory_122(this);
    var tmp7_type = new Message(Companion_getInstance_20());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'qualified_user_id',
        4,
        tmp7_type,
        qualifiedUserId$factory(),
        VOID,
        'qualifiedUserId',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Mention', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_35).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_27(Companion_getInstance_35(), u);
  };
  protoOf(Companion_35).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_33;
  function Companion_getInstance_35() {
    if (Companion_instance_33 == null) new Companion_35();
    return Companion_instance_33;
  }
  function Mention$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Mention(start, length, qualifiedUserId, mentionType, unknownFields) {
    Companion_getInstance_35();
    qualifiedUserId = qualifiedUserId === VOID ? null : qualifiedUserId;
    mentionType = mentionType === VOID ? null : mentionType;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.start = start;
    this.length = length;
    this.qualifiedUserId = qualifiedUserId;
    this.mentionType = mentionType;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Mention$protoSize$delegate$lambda(this));
  }
  protoOf(Mention).get_start_iypx6h_k$ = function () {
    return this.start;
  };
  protoOf(Mention).get_length_g42xv3_k$ = function () {
    return this.length;
  };
  protoOf(Mention).get_qualifiedUserId_xpstev_k$ = function () {
    return this.qualifiedUserId;
  };
  protoOf(Mention).get_mentionType_eyll97_k$ = function () {
    return this.mentionType;
  };
  protoOf(Mention).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Mention).get_userId_kl13yn_k$ = function () {
    var tmp = this.mentionType;
    var tmp0_safe_receiver = tmp instanceof UserId ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Mention).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_27(this, other);
  };
  protoOf(Mention).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_35().descriptor_1;
  };
  protoOf(Mention).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_27();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Mention).component1_7eebsc_k$ = function () {
    return this.start;
  };
  protoOf(Mention).component2_7eebsb_k$ = function () {
    return this.length;
  };
  protoOf(Mention).component3_7eebsa_k$ = function () {
    return this.qualifiedUserId;
  };
  protoOf(Mention).component4_7eebs9_k$ = function () {
    return this.mentionType;
  };
  protoOf(Mention).component5_7eebs8_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Mention).copy_2s0qdr_k$ = function (start, length, qualifiedUserId, mentionType, unknownFields) {
    return new Mention(start, length, qualifiedUserId, mentionType, unknownFields);
  };
  protoOf(Mention).copy = function (start, length, qualifiedUserId, mentionType, unknownFields, $super) {
    start = start === VOID ? this.start : start;
    length = length === VOID ? this.length : length;
    qualifiedUserId = qualifiedUserId === VOID ? this.qualifiedUserId : qualifiedUserId;
    mentionType = mentionType === VOID ? this.mentionType : mentionType;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_2s0qdr_k$(start, length, qualifiedUserId, mentionType, unknownFields);
  };
  protoOf(Mention).toString = function () {
    return (
      'Mention(start=' +
      this.start +
      ', length=' +
      this.length +
      ', qualifiedUserId=' +
      this.qualifiedUserId +
      ', mentionType=' +
      this.mentionType +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Mention).hashCode = function () {
    var result = this.start;
    result = (imul(result, 31) + this.length) | 0;
    result = (imul(result, 31) + (this.qualifiedUserId == null ? 0 : this.qualifiedUserId.hashCode())) | 0;
    result = (imul(result, 31) + (this.mentionType == null ? 0 : this.mentionType.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Mention).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Mention)) return false;
    var tmp0_other_with_cast = other instanceof Mention ? other : THROW_CCE();
    if (!(this.start === tmp0_other_with_cast.start)) return false;
    if (!(this.length === tmp0_other_with_cast.length)) return false;
    if (!equals(this.qualifiedUserId, tmp0_other_with_cast.qualifiedUserId)) return false;
    if (!equals(this.mentionType, tmp0_other_with_cast.mentionType)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_36() {
    Companion_instance_34 = this;
    var tmp = this;
    var tmp_0 = getKClass(LastRead_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_123(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'conversation_id',
        1,
        tmp1_type,
        conversationId$factory_0(),
        VOID,
        'conversationId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_124(this);
    var tmp3_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'last_read_timestamp',
        2,
        tmp3_type,
        lastReadTimestamp$factory(),
        VOID,
        'lastReadTimestamp',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_125(this);
    var tmp5_type = new Message(Companion_getInstance_21());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'qualified_conversation_id',
        3,
        tmp5_type,
        qualifiedConversationId$factory(),
        VOID,
        'qualifiedConversationId',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('LastRead', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_36).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_28(Companion_getInstance_36(), u);
  };
  protoOf(Companion_36).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_34;
  function Companion_getInstance_36() {
    if (Companion_instance_34 == null) new Companion_36();
    return Companion_instance_34;
  }
  function LastRead$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function LastRead_0(conversationId, lastReadTimestamp, qualifiedConversationId, unknownFields) {
    Companion_getInstance_36();
    qualifiedConversationId = qualifiedConversationId === VOID ? null : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.conversationId = conversationId;
    this.lastReadTimestamp = lastReadTimestamp;
    this.qualifiedConversationId = qualifiedConversationId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(LastRead$protoSize$delegate$lambda(this));
  }
  protoOf(LastRead_0).get_conversationId_5n2cxz_k$ = function () {
    return this.conversationId;
  };
  protoOf(LastRead_0).get_lastReadTimestamp_ve4tbz_k$ = function () {
    return this.lastReadTimestamp;
  };
  protoOf(LastRead_0).get_qualifiedConversationId_bhb8wh_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(LastRead_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(LastRead_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_28(this, other);
  };
  protoOf(LastRead_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_36().descriptor_1;
  };
  protoOf(LastRead_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_28();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(LastRead_0).component1_7eebsc_k$ = function () {
    return this.conversationId;
  };
  protoOf(LastRead_0).component2_7eebsb_k$ = function () {
    return this.lastReadTimestamp;
  };
  protoOf(LastRead_0).component3_7eebsa_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(LastRead_0).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(LastRead_0).copy_2yty03_k$ = function (
    conversationId,
    lastReadTimestamp,
    qualifiedConversationId,
    unknownFields,
  ) {
    return new LastRead_0(conversationId, lastReadTimestamp, qualifiedConversationId, unknownFields);
  };
  protoOf(LastRead_0).copy = function (
    conversationId,
    lastReadTimestamp,
    qualifiedConversationId,
    unknownFields,
    $super,
  ) {
    conversationId = conversationId === VOID ? this.conversationId : conversationId;
    lastReadTimestamp = lastReadTimestamp === VOID ? this.lastReadTimestamp : lastReadTimestamp;
    qualifiedConversationId = qualifiedConversationId === VOID ? this.qualifiedConversationId : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_2yty03_k$(conversationId, lastReadTimestamp, qualifiedConversationId, unknownFields);
  };
  protoOf(LastRead_0).toString = function () {
    return (
      'LastRead(conversationId=' +
      this.conversationId +
      ', lastReadTimestamp=' +
      this.lastReadTimestamp.toString() +
      ', qualifiedConversationId=' +
      this.qualifiedConversationId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(LastRead_0).hashCode = function () {
    var result = getStringHashCode(this.conversationId);
    result = (imul(result, 31) + this.lastReadTimestamp.hashCode()) | 0;
    result =
      (imul(result, 31) + (this.qualifiedConversationId == null ? 0 : this.qualifiedConversationId.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(LastRead_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof LastRead_0)) return false;
    var tmp0_other_with_cast = other instanceof LastRead_0 ? other : THROW_CCE();
    if (!(this.conversationId === tmp0_other_with_cast.conversationId)) return false;
    if (!this.lastReadTimestamp.equals(tmp0_other_with_cast.lastReadTimestamp)) return false;
    if (!equals(this.qualifiedConversationId, tmp0_other_with_cast.qualifiedConversationId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_37() {
    Companion_instance_35 = this;
    var tmp = this;
    var tmp_0 = getKClass(Cleared_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_126(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'conversation_id',
        1,
        tmp1_type,
        conversationId$factory_1(),
        VOID,
        'conversationId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_127(this);
    var tmp3_type = new Int64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'cleared_timestamp',
        2,
        tmp3_type,
        clearedTimestamp$factory(),
        VOID,
        'clearedTimestamp',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_128(this);
    var tmp5_type = new Message(Companion_getInstance_21());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'qualified_conversation_id',
        3,
        tmp5_type,
        qualifiedConversationId$factory_0(),
        VOID,
        'qualifiedConversationId',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Cleared', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_37).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_29(Companion_getInstance_37(), u);
  };
  protoOf(Companion_37).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_35;
  function Companion_getInstance_37() {
    if (Companion_instance_35 == null) new Companion_37();
    return Companion_instance_35;
  }
  function Cleared$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Cleared_0(conversationId, clearedTimestamp, qualifiedConversationId, unknownFields) {
    Companion_getInstance_37();
    qualifiedConversationId = qualifiedConversationId === VOID ? null : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.conversationId = conversationId;
    this.clearedTimestamp = clearedTimestamp;
    this.qualifiedConversationId = qualifiedConversationId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Cleared$protoSize$delegate$lambda(this));
  }
  protoOf(Cleared_0).get_conversationId_5n2cxz_k$ = function () {
    return this.conversationId;
  };
  protoOf(Cleared_0).get_clearedTimestamp_2vfogj_k$ = function () {
    return this.clearedTimestamp;
  };
  protoOf(Cleared_0).get_qualifiedConversationId_bhb8wh_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(Cleared_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Cleared_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_29(this, other);
  };
  protoOf(Cleared_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_37().descriptor_1;
  };
  protoOf(Cleared_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_29();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Cleared_0).component1_7eebsc_k$ = function () {
    return this.conversationId;
  };
  protoOf(Cleared_0).component2_7eebsb_k$ = function () {
    return this.clearedTimestamp;
  };
  protoOf(Cleared_0).component3_7eebsa_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(Cleared_0).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Cleared_0).copy_2yty03_k$ = function (
    conversationId,
    clearedTimestamp,
    qualifiedConversationId,
    unknownFields,
  ) {
    return new Cleared_0(conversationId, clearedTimestamp, qualifiedConversationId, unknownFields);
  };
  protoOf(Cleared_0).copy = function (
    conversationId,
    clearedTimestamp,
    qualifiedConversationId,
    unknownFields,
    $super,
  ) {
    conversationId = conversationId === VOID ? this.conversationId : conversationId;
    clearedTimestamp = clearedTimestamp === VOID ? this.clearedTimestamp : clearedTimestamp;
    qualifiedConversationId = qualifiedConversationId === VOID ? this.qualifiedConversationId : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_2yty03_k$(conversationId, clearedTimestamp, qualifiedConversationId, unknownFields);
  };
  protoOf(Cleared_0).toString = function () {
    return (
      'Cleared(conversationId=' +
      this.conversationId +
      ', clearedTimestamp=' +
      this.clearedTimestamp.toString() +
      ', qualifiedConversationId=' +
      this.qualifiedConversationId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Cleared_0).hashCode = function () {
    var result = getStringHashCode(this.conversationId);
    result = (imul(result, 31) + this.clearedTimestamp.hashCode()) | 0;
    result =
      (imul(result, 31) + (this.qualifiedConversationId == null ? 0 : this.qualifiedConversationId.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Cleared_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Cleared_0)) return false;
    var tmp0_other_with_cast = other instanceof Cleared_0 ? other : THROW_CCE();
    if (!(this.conversationId === tmp0_other_with_cast.conversationId)) return false;
    if (!this.clearedTimestamp.equals(tmp0_other_with_cast.clearedTimestamp)) return false;
    if (!equals(this.qualifiedConversationId, tmp0_other_with_cast.qualifiedConversationId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_38() {
    Companion_instance_36 = this;
    var tmp = this;
    var tmp_0 = getKClass(MessageHide);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_129(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'conversation_id',
        1,
        tmp1_type,
        conversationId$factory_2(),
        VOID,
        'conversationId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_130(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'message_id', 2, tmp3_type, messageId$factory_0(), VOID, 'messageId'),
    );
    var tmp4_messageDescriptor = descriptor$factory_131(this);
    var tmp5_type = new Message(Companion_getInstance_21());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'qualified_conversation_id',
        3,
        tmp5_type,
        qualifiedConversationId$factory_1(),
        VOID,
        'qualifiedConversationId',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('MessageHide', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_38).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_30(Companion_getInstance_38(), u);
  };
  protoOf(Companion_38).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_36;
  function Companion_getInstance_38() {
    if (Companion_instance_36 == null) new Companion_38();
    return Companion_instance_36;
  }
  function MessageHide$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function MessageHide(conversationId, messageId, qualifiedConversationId, unknownFields) {
    Companion_getInstance_38();
    qualifiedConversationId = qualifiedConversationId === VOID ? null : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.conversationId = conversationId;
    this.messageId = messageId;
    this.qualifiedConversationId = qualifiedConversationId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(MessageHide$protoSize$delegate$lambda(this));
  }
  protoOf(MessageHide).get_conversationId_5n2cxz_k$ = function () {
    return this.conversationId;
  };
  protoOf(MessageHide).get_messageId_fato9z_k$ = function () {
    return this.messageId;
  };
  protoOf(MessageHide).get_qualifiedConversationId_bhb8wh_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(MessageHide).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(MessageHide).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_30(this, other);
  };
  protoOf(MessageHide).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_38().descriptor_1;
  };
  protoOf(MessageHide).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_30();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(MessageHide).component1_7eebsc_k$ = function () {
    return this.conversationId;
  };
  protoOf(MessageHide).component2_7eebsb_k$ = function () {
    return this.messageId;
  };
  protoOf(MessageHide).component3_7eebsa_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(MessageHide).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(MessageHide).copy_am1f8p_k$ = function (conversationId, messageId, qualifiedConversationId, unknownFields) {
    return new MessageHide(conversationId, messageId, qualifiedConversationId, unknownFields);
  };
  protoOf(MessageHide).copy = function (conversationId, messageId, qualifiedConversationId, unknownFields, $super) {
    conversationId = conversationId === VOID ? this.conversationId : conversationId;
    messageId = messageId === VOID ? this.messageId : messageId;
    qualifiedConversationId = qualifiedConversationId === VOID ? this.qualifiedConversationId : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_am1f8p_k$(conversationId, messageId, qualifiedConversationId, unknownFields);
  };
  protoOf(MessageHide).toString = function () {
    return (
      'MessageHide(conversationId=' +
      this.conversationId +
      ', messageId=' +
      this.messageId +
      ', qualifiedConversationId=' +
      this.qualifiedConversationId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(MessageHide).hashCode = function () {
    var result = getStringHashCode(this.conversationId);
    result = (imul(result, 31) + getStringHashCode(this.messageId)) | 0;
    result =
      (imul(result, 31) + (this.qualifiedConversationId == null ? 0 : this.qualifiedConversationId.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(MessageHide).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof MessageHide)) return false;
    var tmp0_other_with_cast = other instanceof MessageHide ? other : THROW_CCE();
    if (!(this.conversationId === tmp0_other_with_cast.conversationId)) return false;
    if (!(this.messageId === tmp0_other_with_cast.messageId)) return false;
    if (!equals(this.qualifiedConversationId, tmp0_other_with_cast.qualifiedConversationId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_39() {
    Companion_instance_37 = this;
    var tmp = this;
    var tmp_0 = getKClass(MessageDelete);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_132(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'message_id', 1, tmp1_type, messageId$factory_1(), VOID, 'messageId'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('MessageDelete', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_39).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_31(Companion_getInstance_39(), u);
  };
  protoOf(Companion_39).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_37;
  function Companion_getInstance_39() {
    if (Companion_instance_37 == null) new Companion_39();
    return Companion_instance_37;
  }
  function MessageDelete$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function MessageDelete(messageId, unknownFields) {
    Companion_getInstance_39();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.messageId = messageId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(MessageDelete$protoSize$delegate$lambda(this));
  }
  protoOf(MessageDelete).get_messageId_fato9z_k$ = function () {
    return this.messageId;
  };
  protoOf(MessageDelete).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(MessageDelete).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_31(this, other);
  };
  protoOf(MessageDelete).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_39().descriptor_1;
  };
  protoOf(MessageDelete).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_31();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(MessageDelete).component1_7eebsc_k$ = function () {
    return this.messageId;
  };
  protoOf(MessageDelete).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(MessageDelete).copy_m2jrby_k$ = function (messageId, unknownFields) {
    return new MessageDelete(messageId, unknownFields);
  };
  protoOf(MessageDelete).copy = function (messageId, unknownFields, $super) {
    messageId = messageId === VOID ? this.messageId : messageId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_m2jrby_k$(messageId, unknownFields);
  };
  protoOf(MessageDelete).toString = function () {
    return 'MessageDelete(messageId=' + this.messageId + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(MessageDelete).hashCode = function () {
    var result = getStringHashCode(this.messageId);
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(MessageDelete).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof MessageDelete)) return false;
    var tmp0_other_with_cast = other instanceof MessageDelete ? other : THROW_CCE();
    if (!(this.messageId === tmp0_other_with_cast.messageId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Text_4(text) {
    Content_3.call(this, text);
  }
  function Composite_1(composite) {
    Content_3.call(this, composite);
  }
  function Content_3(value) {
    OneOf.call(this, value);
  }
  function Companion_40() {
    Companion_instance_38 = this;
    var tmp = this;
    var tmp_0 = getKClass(MessageEdit);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_133(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'replacing_message_id',
        1,
        tmp1_type,
        replacingMessageId$factory(),
        VOID,
        'replacingMessageId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_134(this);
    var tmp3_type = new Message(Companion_getInstance_30());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'text', 2, tmp3_type, text$factory_4(), true, 'text'),
    );
    var tmp4_messageDescriptor = descriptor$factory_135(this);
    var tmp5_type = new Message(Companion_getInstance_23());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'composite', 3, tmp5_type, composite$factory_0(), true, 'composite'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('MessageEdit', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_40).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_32(Companion_getInstance_40(), u);
  };
  protoOf(Companion_40).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_38;
  function Companion_getInstance_40() {
    if (Companion_instance_38 == null) new Companion_40();
    return Companion_instance_38;
  }
  function MessageEdit$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function MessageEdit(replacingMessageId, content, unknownFields) {
    Companion_getInstance_40();
    content = content === VOID ? null : content;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.replacingMessageId = replacingMessageId;
    this.content = content;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(MessageEdit$protoSize$delegate$lambda(this));
  }
  protoOf(MessageEdit).get_replacingMessageId_lccuau_k$ = function () {
    return this.replacingMessageId;
  };
  protoOf(MessageEdit).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(MessageEdit).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(MessageEdit).get_text_wouvsm_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Text_4 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(MessageEdit).get_composite_emurz6_k$ = function () {
    var tmp = this.content;
    var tmp0_safe_receiver = tmp instanceof Composite_1 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(MessageEdit).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_32(this, other);
  };
  protoOf(MessageEdit).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_40().descriptor_1;
  };
  protoOf(MessageEdit).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_32();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(MessageEdit).component1_7eebsc_k$ = function () {
    return this.replacingMessageId;
  };
  protoOf(MessageEdit).component2_7eebsb_k$ = function () {
    return this.content;
  };
  protoOf(MessageEdit).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(MessageEdit).copy_8en1h8_k$ = function (replacingMessageId, content, unknownFields) {
    return new MessageEdit(replacingMessageId, content, unknownFields);
  };
  protoOf(MessageEdit).copy = function (replacingMessageId, content, unknownFields, $super) {
    replacingMessageId = replacingMessageId === VOID ? this.replacingMessageId : replacingMessageId;
    content = content === VOID ? this.content : content;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_8en1h8_k$(replacingMessageId, content, unknownFields);
  };
  protoOf(MessageEdit).toString = function () {
    return (
      'MessageEdit(replacingMessageId=' +
      this.replacingMessageId +
      ', content=' +
      this.content +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(MessageEdit).hashCode = function () {
    var result = getStringHashCode(this.replacingMessageId);
    result = (imul(result, 31) + (this.content == null ? 0 : this.content.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(MessageEdit).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof MessageEdit)) return false;
    var tmp0_other_with_cast = other instanceof MessageEdit ? other : THROW_CCE();
    if (!(this.replacingMessageId === tmp0_other_with_cast.replacingMessageId)) return false;
    if (!equals(this.content, tmp0_other_with_cast.content)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_41() {
    Companion_instance_39 = this;
    var tmp = this;
    var tmp_0 = getKClass(Quote);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_136(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'quoted_message_id',
        1,
        tmp1_type,
        quotedMessageId$factory(),
        VOID,
        'quotedMessageId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_137(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'quoted_message_sha256',
        2,
        tmp3_type,
        quotedMessageSha256$factory(),
        VOID,
        'quotedMessageSha256',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Quote', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_41).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_33(Companion_getInstance_41(), u);
  };
  protoOf(Companion_41).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_39;
  function Companion_getInstance_41() {
    if (Companion_instance_39 == null) new Companion_41();
    return Companion_instance_39;
  }
  function Quote$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Quote(quotedMessageId, quotedMessageSha256, unknownFields) {
    Companion_getInstance_41();
    quotedMessageSha256 = quotedMessageSha256 === VOID ? null : quotedMessageSha256;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.quotedMessageId = quotedMessageId;
    this.quotedMessageSha256 = quotedMessageSha256;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Quote$protoSize$delegate$lambda(this));
  }
  protoOf(Quote).get_quotedMessageId_omdecv_k$ = function () {
    return this.quotedMessageId;
  };
  protoOf(Quote).get_quotedMessageSha256_77dihv_k$ = function () {
    return this.quotedMessageSha256;
  };
  protoOf(Quote).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Quote).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_33(this, other);
  };
  protoOf(Quote).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_41().descriptor_1;
  };
  protoOf(Quote).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_33();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Quote).component1_7eebsc_k$ = function () {
    return this.quotedMessageId;
  };
  protoOf(Quote).component2_7eebsb_k$ = function () {
    return this.quotedMessageSha256;
  };
  protoOf(Quote).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Quote).copy_b68bsb_k$ = function (quotedMessageId, quotedMessageSha256, unknownFields) {
    return new Quote(quotedMessageId, quotedMessageSha256, unknownFields);
  };
  protoOf(Quote).copy = function (quotedMessageId, quotedMessageSha256, unknownFields, $super) {
    quotedMessageId = quotedMessageId === VOID ? this.quotedMessageId : quotedMessageId;
    quotedMessageSha256 = quotedMessageSha256 === VOID ? this.quotedMessageSha256 : quotedMessageSha256;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_b68bsb_k$(quotedMessageId, quotedMessageSha256, unknownFields);
  };
  protoOf(Quote).toString = function () {
    return (
      'Quote(quotedMessageId=' +
      this.quotedMessageId +
      ', quotedMessageSha256=' +
      this.quotedMessageSha256 +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Quote).hashCode = function () {
    var result = getStringHashCode(this.quotedMessageId);
    result = (imul(result, 31) + (this.quotedMessageSha256 == null ? 0 : this.quotedMessageSha256.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Quote).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Quote)) return false;
    var tmp0_other_with_cast = other instanceof Quote ? other : THROW_CCE();
    if (!(this.quotedMessageId === tmp0_other_with_cast.quotedMessageId)) return false;
    if (!equals(this.quotedMessageSha256, tmp0_other_with_cast.quotedMessageSha256)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Confirmation$Type$Companion$values$delegate$lambda() {
    return listOf([DELIVERED_getInstance(), READ_getInstance()]);
  }
  function DELIVERED() {
    DELIVERED_instance = this;
    Type_0.call(this, 0, 'DELIVERED');
  }
  var DELIVERED_instance;
  function DELIVERED_getInstance() {
    if (DELIVERED_instance == null) new DELIVERED();
    return DELIVERED_instance;
  }
  function READ() {
    READ_instance = this;
    Type_0.call(this, 1, 'READ');
  }
  var READ_instance;
  function READ_getInstance() {
    if (READ_instance == null) new READ();
    return READ_instance;
  }
  function UNRECOGNIZED_5(value) {
    Type_0.call(this, value);
  }
  function Companion_42() {
    Companion_instance_40 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(Confirmation$Type$Companion$values$delegate$lambda);
  }
  protoOf(Companion_42).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_5();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_42).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_5(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_42).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No Type with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_40;
  function Companion_getInstance_42() {
    if (Companion_instance_40 == null) new Companion_42();
    return Companion_instance_40;
  }
  function Companion_43() {
    Companion_instance_41 = this;
    var tmp = this;
    var tmp_0 = getKClass(Confirmation_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_138(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'first_message_id',
        1,
        tmp1_type,
        firstMessageId$factory(),
        VOID,
        'firstMessageId',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_139(this);
    var tmp3_type = new Enum_0(Companion_getInstance_42(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'type', 2, tmp3_type, type$factory_0(), VOID, 'type'),
    );
    var tmp4_messageDescriptor = descriptor$factory_140(this);
    var tmp5_type = new Repeated(new String_0());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'more_message_ids',
        3,
        tmp5_type,
        moreMessageIds$factory(),
        VOID,
        'moreMessageIds',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Confirmation', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_43).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_34(Companion_getInstance_43(), u);
  };
  protoOf(Companion_43).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_41;
  function Companion_getInstance_43() {
    if (Companion_instance_41 == null) new Companion_43();
    return Companion_instance_41;
  }
  function Type_0(value, name) {
    Companion_getInstance_42();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(Type_0).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(Type_0).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(Type_0).equals = function (other) {
    var tmp;
    if (other instanceof Type_0) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(Type_0).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(Type_0).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'Confirmation.Type.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Confirmation$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Confirmation_0(type, firstMessageId, moreMessageIds, unknownFields) {
    Companion_getInstance_43();
    moreMessageIds = moreMessageIds === VOID ? emptyList() : moreMessageIds;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.type = type;
    this.firstMessageId = firstMessageId;
    this.moreMessageIds = moreMessageIds;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Confirmation$protoSize$delegate$lambda(this));
  }
  protoOf(Confirmation_0).get_type_wovaf7_k$ = function () {
    return this.type;
  };
  protoOf(Confirmation_0).get_firstMessageId_u9jttn_k$ = function () {
    return this.firstMessageId;
  };
  protoOf(Confirmation_0).get_moreMessageIds_l1pwmn_k$ = function () {
    return this.moreMessageIds;
  };
  protoOf(Confirmation_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Confirmation_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_34(this, other);
  };
  protoOf(Confirmation_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_43().descriptor_1;
  };
  protoOf(Confirmation_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_34();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Confirmation_0).component1_7eebsc_k$ = function () {
    return this.type;
  };
  protoOf(Confirmation_0).component2_7eebsb_k$ = function () {
    return this.firstMessageId;
  };
  protoOf(Confirmation_0).component3_7eebsa_k$ = function () {
    return this.moreMessageIds;
  };
  protoOf(Confirmation_0).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Confirmation_0).copy_bij66e_k$ = function (type, firstMessageId, moreMessageIds, unknownFields) {
    return new Confirmation_0(type, firstMessageId, moreMessageIds, unknownFields);
  };
  protoOf(Confirmation_0).copy = function (type, firstMessageId, moreMessageIds, unknownFields, $super) {
    type = type === VOID ? this.type : type;
    firstMessageId = firstMessageId === VOID ? this.firstMessageId : firstMessageId;
    moreMessageIds = moreMessageIds === VOID ? this.moreMessageIds : moreMessageIds;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_bij66e_k$(type, firstMessageId, moreMessageIds, unknownFields);
  };
  protoOf(Confirmation_0).toString = function () {
    return (
      'Confirmation(type=' +
      this.type +
      ', firstMessageId=' +
      this.firstMessageId +
      ', moreMessageIds=' +
      this.moreMessageIds +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Confirmation_0).hashCode = function () {
    var result = this.type.hashCode();
    result = (imul(result, 31) + getStringHashCode(this.firstMessageId)) | 0;
    result = (imul(result, 31) + hashCode(this.moreMessageIds)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Confirmation_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Confirmation_0)) return false;
    var tmp0_other_with_cast = other instanceof Confirmation_0 ? other : THROW_CCE();
    if (!this.type.equals(tmp0_other_with_cast.type)) return false;
    if (!(this.firstMessageId === tmp0_other_with_cast.firstMessageId)) return false;
    if (!equals(this.moreMessageIds, tmp0_other_with_cast.moreMessageIds)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_44() {
    Companion_instance_42 = this;
    var tmp = this;
    var tmp_0 = getKClass(Location_2);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(6);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(6);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_141(this);
    var tmp1_type = new Float(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'longitude', 1, tmp1_type, longitude$factory_0(), VOID, 'longitude'),
    );
    var tmp2_messageDescriptor = descriptor$factory_142(this);
    var tmp3_type = new Float(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'latitude', 2, tmp3_type, latitude$factory_0(), VOID, 'latitude'),
    );
    var tmp4_messageDescriptor = descriptor$factory_143(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'name', 3, tmp5_type, name$factory_4(), VOID, 'name'),
    );
    var tmp6_messageDescriptor = descriptor$factory_144(this);
    var tmp7_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'zoom', 4, tmp7_type, zoom$factory_0(), VOID, 'zoom'),
    );
    var tmp8_messageDescriptor = descriptor$factory_145(this);
    var tmp9_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'expects_read_confirmation',
        5,
        tmp9_type,
        expectsReadConfirmation$factory_2(),
        VOID,
        'expectsReadConfirmation',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_146(this);
    var tmp11_type = new Enum_0(Companion_getInstance_17(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp10_messageDescriptor,
        'legal_hold_status',
        6,
        tmp11_type,
        legalHoldStatus$factory_2(),
        VOID,
        'legalHoldStatus',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Location', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_44).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_35(Companion_getInstance_44(), u);
  };
  protoOf(Companion_44).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_42;
  function Companion_getInstance_44() {
    if (Companion_instance_42 == null) new Companion_44();
    return Companion_instance_42;
  }
  function Location$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Location_2(longitude, latitude, name, zoom, expectsReadConfirmation, legalHoldStatus, unknownFields) {
    Companion_getInstance_44();
    name = name === VOID ? null : name;
    zoom = zoom === VOID ? null : zoom;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? null : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? null : legalHoldStatus;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.zoom = zoom;
    this.expectsReadConfirmation = expectsReadConfirmation;
    this.legalHoldStatus = legalHoldStatus;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Location$protoSize$delegate$lambda(this));
  }
  protoOf(Location_2).get_longitude_asb1fq_k$ = function () {
    return this.longitude;
  };
  protoOf(Location_2).get_latitude_feukvp_k$ = function () {
    return this.latitude;
  };
  protoOf(Location_2).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(Location_2).get_zoom_woywws_k$ = function () {
    return this.zoom;
  };
  protoOf(Location_2).get_expectsReadConfirmation_i6xil8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Location_2).get_legalHoldStatus_nngzep_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Location_2).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Location_2).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_35(this, other);
  };
  protoOf(Location_2).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_44().descriptor_1;
  };
  protoOf(Location_2).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_35();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Location_2).component1_7eebsc_k$ = function () {
    return this.longitude;
  };
  protoOf(Location_2).component2_7eebsb_k$ = function () {
    return this.latitude;
  };
  protoOf(Location_2).component3_7eebsa_k$ = function () {
    return this.name;
  };
  protoOf(Location_2).component4_7eebs9_k$ = function () {
    return this.zoom;
  };
  protoOf(Location_2).component5_7eebs8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Location_2).component6_7eebs7_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Location_2).component7_7eebs6_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Location_2).copy_sscpwu_k$ = function (
    longitude,
    latitude,
    name,
    zoom,
    expectsReadConfirmation,
    legalHoldStatus,
    unknownFields,
  ) {
    return new Location_2(longitude, latitude, name, zoom, expectsReadConfirmation, legalHoldStatus, unknownFields);
  };
  protoOf(Location_2).copy = function (
    longitude,
    latitude,
    name,
    zoom,
    expectsReadConfirmation,
    legalHoldStatus,
    unknownFields,
    $super,
  ) {
    longitude = longitude === VOID ? this.longitude : longitude;
    latitude = latitude === VOID ? this.latitude : latitude;
    name = name === VOID ? this.name : name;
    zoom = zoom === VOID ? this.zoom : zoom;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? this.expectsReadConfirmation : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus : legalHoldStatus;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_sscpwu_k$(
      longitude,
      latitude,
      name,
      zoom,
      expectsReadConfirmation,
      legalHoldStatus,
      unknownFields,
    );
  };
  protoOf(Location_2).toString = function () {
    return (
      'Location(longitude=' +
      this.longitude +
      ', latitude=' +
      this.latitude +
      ', name=' +
      this.name +
      ', zoom=' +
      this.zoom +
      ', expectsReadConfirmation=' +
      this.expectsReadConfirmation +
      ', legalHoldStatus=' +
      this.legalHoldStatus +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Location_2).hashCode = function () {
    var result = getNumberHashCode(this.longitude);
    result = (imul(result, 31) + getNumberHashCode(this.latitude)) | 0;
    result = (imul(result, 31) + (this.name == null ? 0 : getStringHashCode(this.name))) | 0;
    result = (imul(result, 31) + (this.zoom == null ? 0 : this.zoom)) | 0;
    result =
      (imul(result, 31) +
        (this.expectsReadConfirmation == null ? 0 : getBooleanHashCode(this.expectsReadConfirmation))) |
      0;
    result = (imul(result, 31) + (this.legalHoldStatus == null ? 0 : this.legalHoldStatus.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Location_2).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Location_2)) return false;
    var tmp0_other_with_cast = other instanceof Location_2 ? other : THROW_CCE();
    if (!equals(this.longitude, tmp0_other_with_cast.longitude)) return false;
    if (!equals(this.latitude, tmp0_other_with_cast.latitude)) return false;
    if (!(this.name == tmp0_other_with_cast.name)) return false;
    if (!(this.zoom == tmp0_other_with_cast.zoom)) return false;
    if (!(this.expectsReadConfirmation == tmp0_other_with_cast.expectsReadConfirmation)) return false;
    if (!equals(this.legalHoldStatus, tmp0_other_with_cast.legalHoldStatus)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_45() {
    Companion_instance_43 = this;
    var tmp = this;
    var tmp_0 = getKClass(ImageAsset);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(11);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(11);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_147(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'tag', 1, tmp1_type, tag$factory_0(), VOID, 'tag'),
    );
    var tmp2_messageDescriptor = descriptor$factory_148(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'width', 2, tmp3_type, width$factory_1(), VOID, 'width'),
    );
    var tmp4_messageDescriptor = descriptor$factory_149(this);
    var tmp5_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'height', 3, tmp5_type, height$factory_1(), VOID, 'height'),
    );
    var tmp6_messageDescriptor = descriptor$factory_150(this);
    var tmp7_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'original_width',
        4,
        tmp7_type,
        originalWidth$factory(),
        VOID,
        'originalWidth',
      ),
    );
    var tmp8_messageDescriptor = descriptor$factory_151(this);
    var tmp9_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'original_height',
        5,
        tmp9_type,
        originalHeight$factory(),
        VOID,
        'originalHeight',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_152(this);
    var tmp11_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'mime_type', 6, tmp11_type, mimeType$factory(), VOID, 'mimeType'),
    );
    var tmp12_messageDescriptor = descriptor$factory_153(this);
    var tmp13_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp12_messageDescriptor, 'size', 7, tmp13_type, size$factory_0(), VOID, 'size'),
    );
    var tmp14_messageDescriptor = descriptor$factory_154(this);
    var tmp15_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp14_messageDescriptor, 'otr_key', 8, tmp15_type, otrKey$factory_0(), VOID, 'otrKey'),
    );
    var tmp16_messageDescriptor = descriptor$factory_155(this);
    var tmp17_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp16_messageDescriptor, 'mac_key', 9, tmp17_type, macKey$factory(), VOID, 'macKey'),
    );
    var tmp18_messageDescriptor = descriptor$factory_156(this);
    var tmp19_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp18_messageDescriptor, 'mac', 10, tmp19_type, mac$factory(), VOID, 'mac'),
    );
    var tmp20_messageDescriptor = descriptor$factory_157(this);
    var tmp21_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp20_messageDescriptor, 'sha256', 11, tmp21_type, sha256$factory_0(), VOID, 'sha256'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('ImageAsset', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_45).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_36(Companion_getInstance_45(), u);
  };
  protoOf(Companion_45).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_43;
  function Companion_getInstance_45() {
    if (Companion_instance_43 == null) new Companion_45();
    return Companion_instance_43;
  }
  function ImageAsset$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ImageAsset(
    tag,
    width,
    height,
    originalWidth,
    originalHeight,
    mimeType,
    size,
    otrKey,
    macKey,
    mac,
    sha256,
    unknownFields,
  ) {
    Companion_getInstance_45();
    otrKey = otrKey === VOID ? null : otrKey;
    macKey = macKey === VOID ? null : macKey;
    mac = mac === VOID ? null : mac;
    sha256 = sha256 === VOID ? null : sha256;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.tag = tag;
    this.width = width;
    this.height = height;
    this.originalWidth = originalWidth;
    this.originalHeight = originalHeight;
    this.mimeType = mimeType;
    this.size = size;
    this.otrKey = otrKey;
    this.macKey = macKey;
    this.mac = mac;
    this.sha256 = sha256;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ImageAsset$protoSize$delegate$lambda(this));
  }
  protoOf(ImageAsset).get_tag_18ivnz_k$ = function () {
    return this.tag;
  };
  protoOf(ImageAsset).get_width_j0q4yl_k$ = function () {
    return this.width;
  };
  protoOf(ImageAsset).get_height_e7t92o_k$ = function () {
    return this.height;
  };
  protoOf(ImageAsset).get_originalWidth_th2frg_k$ = function () {
    return this.originalWidth;
  };
  protoOf(ImageAsset).get_originalHeight_gv5py7_k$ = function () {
    return this.originalHeight;
  };
  protoOf(ImageAsset).get_mimeType_g7ccbb_k$ = function () {
    return this.mimeType;
  };
  protoOf(ImageAsset).get_size_woubt6_k$ = function () {
    return this.size;
  };
  protoOf(ImageAsset).get_otrKey_hriosb_k$ = function () {
    return this.otrKey;
  };
  protoOf(ImageAsset).get_macKey_giprx5_k$ = function () {
    return this.macKey;
  };
  protoOf(ImageAsset).get_mac_18j0uy_k$ = function () {
    return this.mac;
  };
  protoOf(ImageAsset).get_sha256_jgs8q8_k$ = function () {
    return this.sha256;
  };
  protoOf(ImageAsset).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ImageAsset).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_36(this, other);
  };
  protoOf(ImageAsset).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_45().descriptor_1;
  };
  protoOf(ImageAsset).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_36();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ImageAsset).component1_7eebsc_k$ = function () {
    return this.tag;
  };
  protoOf(ImageAsset).component2_7eebsb_k$ = function () {
    return this.width;
  };
  protoOf(ImageAsset).component3_7eebsa_k$ = function () {
    return this.height;
  };
  protoOf(ImageAsset).component4_7eebs9_k$ = function () {
    return this.originalWidth;
  };
  protoOf(ImageAsset).component5_7eebs8_k$ = function () {
    return this.originalHeight;
  };
  protoOf(ImageAsset).component6_7eebs7_k$ = function () {
    return this.mimeType;
  };
  protoOf(ImageAsset).component7_7eebs6_k$ = function () {
    return this.size;
  };
  protoOf(ImageAsset).component8_7eebs5_k$ = function () {
    return this.otrKey;
  };
  protoOf(ImageAsset).component9_7eebs4_k$ = function () {
    return this.macKey;
  };
  protoOf(ImageAsset).component10_gazzfo_k$ = function () {
    return this.mac;
  };
  protoOf(ImageAsset).component11_gazzfn_k$ = function () {
    return this.sha256;
  };
  protoOf(ImageAsset).component12_gazzfm_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ImageAsset).copy_oaymm8_k$ = function (
    tag,
    width,
    height,
    originalWidth,
    originalHeight,
    mimeType,
    size,
    otrKey,
    macKey,
    mac,
    sha256,
    unknownFields,
  ) {
    return new ImageAsset(
      tag,
      width,
      height,
      originalWidth,
      originalHeight,
      mimeType,
      size,
      otrKey,
      macKey,
      mac,
      sha256,
      unknownFields,
    );
  };
  protoOf(ImageAsset).copy = function (
    tag,
    width,
    height,
    originalWidth,
    originalHeight,
    mimeType,
    size,
    otrKey,
    macKey,
    mac,
    sha256,
    unknownFields,
    $super,
  ) {
    tag = tag === VOID ? this.tag : tag;
    width = width === VOID ? this.width : width;
    height = height === VOID ? this.height : height;
    originalWidth = originalWidth === VOID ? this.originalWidth : originalWidth;
    originalHeight = originalHeight === VOID ? this.originalHeight : originalHeight;
    mimeType = mimeType === VOID ? this.mimeType : mimeType;
    size = size === VOID ? this.size : size;
    otrKey = otrKey === VOID ? this.otrKey : otrKey;
    macKey = macKey === VOID ? this.macKey : macKey;
    mac = mac === VOID ? this.mac : mac;
    sha256 = sha256 === VOID ? this.sha256 : sha256;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_oaymm8_k$(
      tag,
      width,
      height,
      originalWidth,
      originalHeight,
      mimeType,
      size,
      otrKey,
      macKey,
      mac,
      sha256,
      unknownFields,
    );
  };
  protoOf(ImageAsset).toString = function () {
    return (
      'ImageAsset(tag=' +
      this.tag +
      ', width=' +
      this.width +
      ', height=' +
      this.height +
      ', originalWidth=' +
      this.originalWidth +
      ', originalHeight=' +
      this.originalHeight +
      ', mimeType=' +
      this.mimeType +
      ', size=' +
      this.size +
      ', otrKey=' +
      this.otrKey +
      ', macKey=' +
      this.macKey +
      ', mac=' +
      this.mac +
      ', sha256=' +
      this.sha256 +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ImageAsset).hashCode = function () {
    var result = getStringHashCode(this.tag);
    result = (imul(result, 31) + this.width) | 0;
    result = (imul(result, 31) + this.height) | 0;
    result = (imul(result, 31) + this.originalWidth) | 0;
    result = (imul(result, 31) + this.originalHeight) | 0;
    result = (imul(result, 31) + getStringHashCode(this.mimeType)) | 0;
    result = (imul(result, 31) + this.size) | 0;
    result = (imul(result, 31) + (this.otrKey == null ? 0 : this.otrKey.hashCode())) | 0;
    result = (imul(result, 31) + (this.macKey == null ? 0 : this.macKey.hashCode())) | 0;
    result = (imul(result, 31) + (this.mac == null ? 0 : this.mac.hashCode())) | 0;
    result = (imul(result, 31) + (this.sha256 == null ? 0 : this.sha256.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ImageAsset).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ImageAsset)) return false;
    var tmp0_other_with_cast = other instanceof ImageAsset ? other : THROW_CCE();
    if (!(this.tag === tmp0_other_with_cast.tag)) return false;
    if (!(this.width === tmp0_other_with_cast.width)) return false;
    if (!(this.height === tmp0_other_with_cast.height)) return false;
    if (!(this.originalWidth === tmp0_other_with_cast.originalWidth)) return false;
    if (!(this.originalHeight === tmp0_other_with_cast.originalHeight)) return false;
    if (!(this.mimeType === tmp0_other_with_cast.mimeType)) return false;
    if (!(this.size === tmp0_other_with_cast.size)) return false;
    if (!equals(this.otrKey, tmp0_other_with_cast.otrKey)) return false;
    if (!equals(this.macKey, tmp0_other_with_cast.macKey)) return false;
    if (!equals(this.mac, tmp0_other_with_cast.mac)) return false;
    if (!equals(this.sha256, tmp0_other_with_cast.sha256)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function NotUploaded(notUploaded) {
    notUploaded = notUploaded === VOID ? Companion_getInstance_46().fromValue_lljhin_k$(0) : notUploaded;
    Status.call(this, notUploaded);
  }
  function Uploaded(uploaded) {
    Status.call(this, uploaded);
  }
  function Asset$Companion$defaultInstance$delegate$lambda() {
    return new Asset_2();
  }
  function Asset$NotUploaded$Companion$values$delegate$lambda() {
    return listOf([CANCELLED_getInstance(), FAILED_getInstance()]);
  }
  function CANCELLED() {
    CANCELLED_instance = this;
    NotUploaded_0.call(this, 0, 'CANCELLED');
  }
  var CANCELLED_instance;
  function CANCELLED_getInstance() {
    if (CANCELLED_instance == null) new CANCELLED();
    return CANCELLED_instance;
  }
  function FAILED() {
    FAILED_instance = this;
    NotUploaded_0.call(this, 1, 'FAILED');
  }
  var FAILED_instance;
  function FAILED_getInstance() {
    if (FAILED_instance == null) new FAILED();
    return FAILED_instance;
  }
  function UNRECOGNIZED_6(value) {
    NotUploaded_0.call(this, value);
  }
  function Companion_46() {
    Companion_instance_44 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(Asset$NotUploaded$Companion$values$delegate$lambda);
  }
  protoOf(Companion_46).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_6();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_46).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_6(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_46).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.messages.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No NotUploaded with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_44;
  function Companion_getInstance_46() {
    if (Companion_instance_44 == null) new Companion_46();
    return Companion_instance_44;
  }
  function Image_2(image) {
    MetaData_1.call(this, image);
  }
  function Video_0(video) {
    MetaData_1.call(this, video);
  }
  function Audio_0(audio) {
    MetaData_1.call(this, audio);
  }
  function MetaData_1(value) {
    OneOf.call(this, value);
  }
  function Companion_47() {
    Companion_instance_45 = this;
    var tmp = this;
    var tmp_0 = getKClass(Original);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(8);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(8);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_164(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'mime_type', 1, tmp1_type, mimeType$factory_0(), VOID, 'mimeType'),
    );
    var tmp2_messageDescriptor = descriptor$factory_165(this);
    var tmp3_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'size', 2, tmp3_type, size$factory_1(), VOID, 'size'),
    );
    var tmp4_messageDescriptor = descriptor$factory_166(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'name', 3, tmp5_type, name$factory_5(), VOID, 'name'),
    );
    var tmp6_messageDescriptor = descriptor$factory_167(this);
    var tmp7_type = new Message(Companion_getInstance_49());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'image', 4, tmp7_type, image$factory_4(), true, 'image'),
    );
    var tmp8_messageDescriptor = descriptor$factory_168(this);
    var tmp9_type = new Message(Companion_getInstance_50());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp8_messageDescriptor, 'video', 5, tmp9_type, video$factory_0(), true, 'video'),
    );
    var tmp10_messageDescriptor = descriptor$factory_169(this);
    var tmp11_type = new Message(Companion_getInstance_51());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'audio', 6, tmp11_type, audio$factory_0(), true, 'audio'),
    );
    var tmp12_messageDescriptor = descriptor$factory_170(this);
    var tmp13_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp12_messageDescriptor, 'source', 7, tmp13_type, source$factory(), VOID, 'source'),
    );
    var tmp14_messageDescriptor = descriptor$factory_171(this);
    var tmp15_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp14_messageDescriptor, 'caption', 8, tmp15_type, caption$factory(), VOID, 'caption'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Asset.Original', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_47).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_38(Companion_getInstance_47(), u);
  };
  protoOf(Companion_47).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_45;
  function Companion_getInstance_47() {
    if (Companion_instance_45 == null) new Companion_47();
    return Companion_instance_45;
  }
  function Asset$Original$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Image_3(image) {
    MetaData_2.call(this, image);
  }
  function MetaData_2(value) {
    OneOf.call(this, value);
  }
  function Companion_48() {
    Companion_instance_46 = this;
    var tmp = this;
    var tmp_0 = getKClass(Preview_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(4);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(4);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_172(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'mime_type', 1, tmp1_type, mimeType$factory_1(), VOID, 'mimeType'),
    );
    var tmp2_messageDescriptor = descriptor$factory_173(this);
    var tmp3_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'size', 2, tmp3_type, size$factory_2(), VOID, 'size'),
    );
    var tmp4_messageDescriptor = descriptor$factory_174(this);
    var tmp5_type = new Message(Companion_getInstance_52());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'remote', 3, tmp5_type, remote$factory(), VOID, 'remote'),
    );
    var tmp6_messageDescriptor = descriptor$factory_175(this);
    var tmp7_type = new Message(Companion_getInstance_49());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'image', 4, tmp7_type, image$factory_5(), true, 'image'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Asset.Preview', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_48).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_39(Companion_getInstance_48(), u);
  };
  protoOf(Companion_48).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_46;
  function Companion_getInstance_48() {
    if (Companion_instance_46 == null) new Companion_48();
    return Companion_instance_46;
  }
  function Asset$Preview$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Companion_49() {
    Companion_instance_47 = this;
    var tmp = this;
    var tmp_0 = getKClass(ImageMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_176(this);
    var tmp1_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'width', 1, tmp1_type, width$factory_2(), VOID, 'width'),
    );
    var tmp2_messageDescriptor = descriptor$factory_177(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'height', 2, tmp3_type, height$factory_2(), VOID, 'height'),
    );
    var tmp4_messageDescriptor = descriptor$factory_178(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'tag', 3, tmp5_type, tag$factory_1(), VOID, 'tag'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Asset.ImageMetaData', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_49).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_40(Companion_getInstance_49(), u);
  };
  protoOf(Companion_49).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_47;
  function Companion_getInstance_49() {
    if (Companion_instance_47 == null) new Companion_49();
    return Companion_instance_47;
  }
  function Asset$ImageMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Asset$VideoMetaData$Companion$defaultInstance$delegate$lambda() {
    return new VideoMetaData();
  }
  function Companion_50() {
    Companion_instance_48 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(Asset$VideoMetaData$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(VideoMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_179(this);
    var tmp1_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'width', 1, tmp1_type, width$factory_3(), VOID, 'width'),
    );
    var tmp2_messageDescriptor = descriptor$factory_180(this);
    var tmp3_type = new Int32(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'height', 2, tmp3_type, height$factory_3(), VOID, 'height'),
    );
    var tmp4_messageDescriptor = descriptor$factory_181(this);
    var tmp5_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'duration_in_millis',
        3,
        tmp5_type,
        durationInMillis$factory_1(),
        VOID,
        'durationInMillis',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('Asset.VideoMetaData', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_50).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_6();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_50).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_41(Companion_getInstance_50(), u);
  };
  protoOf(Companion_50).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_48;
  function Companion_getInstance_50() {
    if (Companion_instance_48 == null) new Companion_50();
    return Companion_instance_48;
  }
  function Asset$VideoMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Asset$AudioMetaData$Companion$defaultInstance$delegate$lambda() {
    return new AudioMetaData();
  }
  function Companion_51() {
    Companion_instance_49 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(Asset$AudioMetaData$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(AudioMetaData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_182(this);
    var tmp1_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'duration_in_millis',
        1,
        tmp1_type,
        durationInMillis$factory_2(),
        VOID,
        'durationInMillis',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_183(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'normalized_loudness',
        3,
        tmp3_type,
        normalizedLoudness$factory_0(),
        VOID,
        'normalizedLoudness',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('Asset.AudioMetaData', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_51).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_7();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_51).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_42(Companion_getInstance_51(), u);
  };
  protoOf(Companion_51).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_49;
  function Companion_getInstance_51() {
    if (Companion_instance_49 == null) new Companion_51();
    return Companion_instance_49;
  }
  function Asset$AudioMetaData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Companion_52() {
    Companion_instance_50 = this;
    var tmp = this;
    var tmp_0 = getKClass(RemoteData);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(6);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(6);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_184(this);
    var tmp1_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'otr_key', 1, tmp1_type, otrKey$factory_1(), VOID, 'otrKey'),
    );
    var tmp2_messageDescriptor = descriptor$factory_185(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'sha256', 2, tmp3_type, sha256$factory_1(), VOID, 'sha256'),
    );
    var tmp4_messageDescriptor = descriptor$factory_186(this);
    var tmp5_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'asset_id', 3, tmp5_type, assetId$factory_0(), VOID, 'assetId'),
    );
    var tmp6_messageDescriptor = descriptor$factory_187(this);
    var tmp7_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'asset_token',
        5,
        tmp7_type,
        assetToken$factory_0(),
        VOID,
        'assetToken',
      ),
    );
    var tmp8_messageDescriptor = descriptor$factory_188(this);
    var tmp9_type = new Enum_0(Companion_getInstance_16(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'encryption',
        6,
        tmp9_type,
        encryption$factory_0(),
        VOID,
        'encryption',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_189(this);
    var tmp11_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp10_messageDescriptor,
        'asset_domain',
        7,
        tmp11_type,
        assetDomain$factory_0(),
        VOID,
        'assetDomain',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Asset.RemoteData', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_52).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_43(Companion_getInstance_52(), u);
  };
  protoOf(Companion_52).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_50;
  function Companion_getInstance_52() {
    if (Companion_instance_50 == null) new Companion_52();
    return Companion_instance_50;
  }
  function Asset$RemoteData$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Status(value) {
    OneOf.call(this, value);
  }
  function Companion_53() {
    Companion_instance_51 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(Asset$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(Asset_2);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(6);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(6);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_158(this);
    var tmp1_type = new Message(Companion_getInstance_47());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'original', 1, tmp1_type, original$factory(), VOID, 'original'),
    );
    var tmp2_messageDescriptor = descriptor$factory_159(this);
    var tmp3_type = new Enum_0(Companion_getInstance_46(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'not_uploaded',
        3,
        tmp3_type,
        notUploaded$factory(),
        true,
        'notUploaded',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_160(this);
    var tmp5_type = new Message(Companion_getInstance_52());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'uploaded', 4, tmp5_type, uploaded$factory(), true, 'uploaded'),
    );
    var tmp6_messageDescriptor = descriptor$factory_161(this);
    var tmp7_type = new Message(Companion_getInstance_48());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'preview', 5, tmp7_type, preview$factory(), VOID, 'preview'),
    );
    var tmp8_messageDescriptor = descriptor$factory_162(this);
    var tmp9_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'expects_read_confirmation',
        6,
        tmp9_type,
        expectsReadConfirmation$factory_3(),
        VOID,
        'expectsReadConfirmation',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_163(this);
    var tmp11_type = new Enum_0(Companion_getInstance_17(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp10_messageDescriptor,
        'legal_hold_status',
        7,
        tmp11_type,
        legalHoldStatus$factory_3(),
        VOID,
        'legalHoldStatus',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('Asset', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_53).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_5();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_53).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_37(Companion_getInstance_53(), u);
  };
  protoOf(Companion_53).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_51;
  function Companion_getInstance_53() {
    if (Companion_instance_51 == null) new Companion_53();
    return Companion_instance_51;
  }
  function NotUploaded_0(value, name) {
    Companion_getInstance_46();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(NotUploaded_0).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(NotUploaded_0).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(NotUploaded_0).equals = function (other) {
    var tmp;
    if (other instanceof NotUploaded_0) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(NotUploaded_0).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(NotUploaded_0).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'Asset.NotUploaded.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Original(mimeType, size, name, source, caption, metaData, unknownFields) {
    Companion_getInstance_47();
    name = name === VOID ? null : name;
    source = source === VOID ? null : source;
    caption = caption === VOID ? null : caption;
    metaData = metaData === VOID ? null : metaData;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.mimeType = mimeType;
    this.size = size;
    this.name = name;
    this.source = source;
    this.caption = caption;
    this.metaData = metaData;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$Original$protoSize$delegate$lambda(this));
  }
  protoOf(Original).get_mimeType_g7ccbb_k$ = function () {
    return this.mimeType;
  };
  protoOf(Original).get_size_woubt6_k$ = function () {
    return this.size;
  };
  protoOf(Original).get_name_woqyms_k$ = function () {
    return this.name;
  };
  protoOf(Original).get_source_jl0x7o_k$ = function () {
    return this.source;
  };
  protoOf(Original).get_caption_aejif1_k$ = function () {
    return this.caption;
  };
  protoOf(Original).get_metaData_vroqag_k$ = function () {
    return this.metaData;
  };
  protoOf(Original).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Original).get_image_it3i2a_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Image_2 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Original).get_video_j06c0i_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Video_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Original).get_audio_ioubhp_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Audio_0 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Original).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_38(this, other);
  };
  protoOf(Original).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_47().descriptor_1;
  };
  protoOf(Original).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_38();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Original).component1_7eebsc_k$ = function () {
    return this.mimeType;
  };
  protoOf(Original).component2_7eebsb_k$ = function () {
    return this.size;
  };
  protoOf(Original).component3_7eebsa_k$ = function () {
    return this.name;
  };
  protoOf(Original).component4_7eebs9_k$ = function () {
    return this.source;
  };
  protoOf(Original).component5_7eebs8_k$ = function () {
    return this.caption;
  };
  protoOf(Original).component6_7eebs7_k$ = function () {
    return this.metaData;
  };
  protoOf(Original).component7_7eebs6_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Original).copy_v1mbh9_k$ = function (mimeType, size, name, source, caption, metaData, unknownFields) {
    return new Original(mimeType, size, name, source, caption, metaData, unknownFields);
  };
  protoOf(Original).copy = function (mimeType, size, name, source, caption, metaData, unknownFields, $super) {
    mimeType = mimeType === VOID ? this.mimeType : mimeType;
    size = size === VOID ? this.size : size;
    name = name === VOID ? this.name : name;
    source = source === VOID ? this.source : source;
    caption = caption === VOID ? this.caption : caption;
    metaData = metaData === VOID ? this.metaData : metaData;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_v1mbh9_k$(mimeType, size, name, source, caption, metaData, unknownFields);
  };
  protoOf(Original).toString = function () {
    return (
      'Original(mimeType=' +
      this.mimeType +
      ', size=' +
      this.size.toString() +
      ', name=' +
      this.name +
      ', source=' +
      this.source +
      ', caption=' +
      this.caption +
      ', metaData=' +
      this.metaData +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Original).hashCode = function () {
    var result = getStringHashCode(this.mimeType);
    result = (imul(result, 31) + this.size.hashCode()) | 0;
    result = (imul(result, 31) + (this.name == null ? 0 : getStringHashCode(this.name))) | 0;
    result = (imul(result, 31) + (this.source == null ? 0 : getStringHashCode(this.source))) | 0;
    result = (imul(result, 31) + (this.caption == null ? 0 : getStringHashCode(this.caption))) | 0;
    result = (imul(result, 31) + (this.metaData == null ? 0 : this.metaData.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Original).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Original)) return false;
    var tmp0_other_with_cast = other instanceof Original ? other : THROW_CCE();
    if (!(this.mimeType === tmp0_other_with_cast.mimeType)) return false;
    if (!this.size.equals(tmp0_other_with_cast.size)) return false;
    if (!(this.name == tmp0_other_with_cast.name)) return false;
    if (!(this.source == tmp0_other_with_cast.source)) return false;
    if (!(this.caption == tmp0_other_with_cast.caption)) return false;
    if (!equals(this.metaData, tmp0_other_with_cast.metaData)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Preview_0(mimeType, size, remote, metaData, unknownFields) {
    Companion_getInstance_48();
    remote = remote === VOID ? null : remote;
    metaData = metaData === VOID ? null : metaData;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.mimeType = mimeType;
    this.size = size;
    this.remote = remote;
    this.metaData = metaData;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$Preview$protoSize$delegate$lambda(this));
  }
  protoOf(Preview_0).get_mimeType_g7ccbb_k$ = function () {
    return this.mimeType;
  };
  protoOf(Preview_0).get_size_woubt6_k$ = function () {
    return this.size;
  };
  protoOf(Preview_0).get_remote_iyc767_k$ = function () {
    return this.remote;
  };
  protoOf(Preview_0).get_metaData_vroqag_k$ = function () {
    return this.metaData;
  };
  protoOf(Preview_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Preview_0).get_image_it3i2a_k$ = function () {
    var tmp = this.metaData;
    var tmp0_safe_receiver = tmp instanceof Image_3 ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Preview_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_39(this, other);
  };
  protoOf(Preview_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_48().descriptor_1;
  };
  protoOf(Preview_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_39();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Preview_0).component1_7eebsc_k$ = function () {
    return this.mimeType;
  };
  protoOf(Preview_0).component2_7eebsb_k$ = function () {
    return this.size;
  };
  protoOf(Preview_0).component3_7eebsa_k$ = function () {
    return this.remote;
  };
  protoOf(Preview_0).component4_7eebs9_k$ = function () {
    return this.metaData;
  };
  protoOf(Preview_0).component5_7eebs8_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Preview_0).copy_474ino_k$ = function (mimeType, size, remote, metaData, unknownFields) {
    return new Preview_0(mimeType, size, remote, metaData, unknownFields);
  };
  protoOf(Preview_0).copy = function (mimeType, size, remote, metaData, unknownFields, $super) {
    mimeType = mimeType === VOID ? this.mimeType : mimeType;
    size = size === VOID ? this.size : size;
    remote = remote === VOID ? this.remote : remote;
    metaData = metaData === VOID ? this.metaData : metaData;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_474ino_k$(mimeType, size, remote, metaData, unknownFields);
  };
  protoOf(Preview_0).toString = function () {
    return (
      'Preview(mimeType=' +
      this.mimeType +
      ', size=' +
      this.size.toString() +
      ', remote=' +
      this.remote +
      ', metaData=' +
      this.metaData +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Preview_0).hashCode = function () {
    var result = getStringHashCode(this.mimeType);
    result = (imul(result, 31) + this.size.hashCode()) | 0;
    result = (imul(result, 31) + (this.remote == null ? 0 : this.remote.hashCode())) | 0;
    result = (imul(result, 31) + (this.metaData == null ? 0 : this.metaData.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Preview_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Preview_0)) return false;
    var tmp0_other_with_cast = other instanceof Preview_0 ? other : THROW_CCE();
    if (!(this.mimeType === tmp0_other_with_cast.mimeType)) return false;
    if (!this.size.equals(tmp0_other_with_cast.size)) return false;
    if (!equals(this.remote, tmp0_other_with_cast.remote)) return false;
    if (!equals(this.metaData, tmp0_other_with_cast.metaData)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ImageMetaData(width, height, tag, unknownFields) {
    Companion_getInstance_49();
    tag = tag === VOID ? null : tag;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.width = width;
    this.height = height;
    this.tag = tag;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$ImageMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(ImageMetaData).get_width_j0q4yl_k$ = function () {
    return this.width;
  };
  protoOf(ImageMetaData).get_height_e7t92o_k$ = function () {
    return this.height;
  };
  protoOf(ImageMetaData).get_tag_18ivnz_k$ = function () {
    return this.tag;
  };
  protoOf(ImageMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ImageMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_40(this, other);
  };
  protoOf(ImageMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_49().descriptor_1;
  };
  protoOf(ImageMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_40();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ImageMetaData).component1_7eebsc_k$ = function () {
    return this.width;
  };
  protoOf(ImageMetaData).component2_7eebsb_k$ = function () {
    return this.height;
  };
  protoOf(ImageMetaData).component3_7eebsa_k$ = function () {
    return this.tag;
  };
  protoOf(ImageMetaData).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ImageMetaData).copy_4ijz4l_k$ = function (width, height, tag, unknownFields) {
    return new ImageMetaData(width, height, tag, unknownFields);
  };
  protoOf(ImageMetaData).copy = function (width, height, tag, unknownFields, $super) {
    width = width === VOID ? this.width : width;
    height = height === VOID ? this.height : height;
    tag = tag === VOID ? this.tag : tag;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_4ijz4l_k$(width, height, tag, unknownFields);
  };
  protoOf(ImageMetaData).toString = function () {
    return (
      'ImageMetaData(width=' +
      this.width +
      ', height=' +
      this.height +
      ', tag=' +
      this.tag +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(ImageMetaData).hashCode = function () {
    var result = this.width;
    result = (imul(result, 31) + this.height) | 0;
    result = (imul(result, 31) + (this.tag == null ? 0 : getStringHashCode(this.tag))) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ImageMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ImageMetaData)) return false;
    var tmp0_other_with_cast = other instanceof ImageMetaData ? other : THROW_CCE();
    if (!(this.width === tmp0_other_with_cast.width)) return false;
    if (!(this.height === tmp0_other_with_cast.height)) return false;
    if (!(this.tag == tmp0_other_with_cast.tag)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function VideoMetaData(width, height, durationInMillis, unknownFields) {
    Companion_getInstance_50();
    width = width === VOID ? null : width;
    height = height === VOID ? null : height;
    durationInMillis = durationInMillis === VOID ? null : durationInMillis;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.width = width;
    this.height = height;
    this.durationInMillis = durationInMillis;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$VideoMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(VideoMetaData).get_width_j0q4yl_k$ = function () {
    return this.width;
  };
  protoOf(VideoMetaData).get_height_e7t92o_k$ = function () {
    return this.height;
  };
  protoOf(VideoMetaData).get_durationInMillis_vuodko_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(VideoMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(VideoMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_41(this, other);
  };
  protoOf(VideoMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_50().descriptor_1;
  };
  protoOf(VideoMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_41();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(VideoMetaData).component1_7eebsc_k$ = function () {
    return this.width;
  };
  protoOf(VideoMetaData).component2_7eebsb_k$ = function () {
    return this.height;
  };
  protoOf(VideoMetaData).component3_7eebsa_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(VideoMetaData).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(VideoMetaData).copy_hbafz3_k$ = function (width, height, durationInMillis, unknownFields) {
    return new VideoMetaData(width, height, durationInMillis, unknownFields);
  };
  protoOf(VideoMetaData).copy = function (width, height, durationInMillis, unknownFields, $super) {
    width = width === VOID ? this.width : width;
    height = height === VOID ? this.height : height;
    durationInMillis = durationInMillis === VOID ? this.durationInMillis : durationInMillis;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_hbafz3_k$(width, height, durationInMillis, unknownFields);
  };
  protoOf(VideoMetaData).toString = function () {
    return (
      'VideoMetaData(width=' +
      this.width +
      ', height=' +
      this.height +
      ', durationInMillis=' +
      toString(this.durationInMillis) +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(VideoMetaData).hashCode = function () {
    var result = this.width == null ? 0 : this.width;
    result = (imul(result, 31) + (this.height == null ? 0 : this.height)) | 0;
    result = (imul(result, 31) + (this.durationInMillis == null ? 0 : this.durationInMillis.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(VideoMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof VideoMetaData)) return false;
    var tmp0_other_with_cast = other instanceof VideoMetaData ? other : THROW_CCE();
    if (!(this.width == tmp0_other_with_cast.width)) return false;
    if (!(this.height == tmp0_other_with_cast.height)) return false;
    if (!equals(this.durationInMillis, tmp0_other_with_cast.durationInMillis)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function AudioMetaData(durationInMillis, normalizedLoudness, unknownFields) {
    Companion_getInstance_51();
    durationInMillis = durationInMillis === VOID ? null : durationInMillis;
    normalizedLoudness = normalizedLoudness === VOID ? null : normalizedLoudness;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.durationInMillis = durationInMillis;
    this.normalizedLoudness = normalizedLoudness;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$AudioMetaData$protoSize$delegate$lambda(this));
  }
  protoOf(AudioMetaData).get_durationInMillis_vuodko_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(AudioMetaData).get_normalizedLoudness_kftkfr_k$ = function () {
    return this.normalizedLoudness;
  };
  protoOf(AudioMetaData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(AudioMetaData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_42(this, other);
  };
  protoOf(AudioMetaData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_51().descriptor_1;
  };
  protoOf(AudioMetaData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_42();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(AudioMetaData).component1_7eebsc_k$ = function () {
    return this.durationInMillis;
  };
  protoOf(AudioMetaData).component2_7eebsb_k$ = function () {
    return this.normalizedLoudness;
  };
  protoOf(AudioMetaData).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(AudioMetaData).copy_6tzd1m_k$ = function (durationInMillis, normalizedLoudness, unknownFields) {
    return new AudioMetaData(durationInMillis, normalizedLoudness, unknownFields);
  };
  protoOf(AudioMetaData).copy = function (durationInMillis, normalizedLoudness, unknownFields, $super) {
    durationInMillis = durationInMillis === VOID ? this.durationInMillis : durationInMillis;
    normalizedLoudness = normalizedLoudness === VOID ? this.normalizedLoudness : normalizedLoudness;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_6tzd1m_k$(durationInMillis, normalizedLoudness, unknownFields);
  };
  protoOf(AudioMetaData).toString = function () {
    return (
      'AudioMetaData(durationInMillis=' +
      toString(this.durationInMillis) +
      ', normalizedLoudness=' +
      this.normalizedLoudness +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(AudioMetaData).hashCode = function () {
    var result = this.durationInMillis == null ? 0 : this.durationInMillis.hashCode();
    result = (imul(result, 31) + (this.normalizedLoudness == null ? 0 : this.normalizedLoudness.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(AudioMetaData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof AudioMetaData)) return false;
    var tmp0_other_with_cast = other instanceof AudioMetaData ? other : THROW_CCE();
    if (!equals(this.durationInMillis, tmp0_other_with_cast.durationInMillis)) return false;
    if (!equals(this.normalizedLoudness, tmp0_other_with_cast.normalizedLoudness)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function RemoteData(otrKey, sha256, assetId, assetToken, assetDomain, encryption, unknownFields) {
    Companion_getInstance_52();
    assetId = assetId === VOID ? null : assetId;
    assetToken = assetToken === VOID ? null : assetToken;
    assetDomain = assetDomain === VOID ? null : assetDomain;
    encryption = encryption === VOID ? null : encryption;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.otrKey = otrKey;
    this.sha256 = sha256;
    this.assetId = assetId;
    this.assetToken = assetToken;
    this.assetDomain = assetDomain;
    this.encryption = encryption;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$RemoteData$protoSize$delegate$lambda(this));
  }
  protoOf(RemoteData).get_otrKey_hriosb_k$ = function () {
    return this.otrKey;
  };
  protoOf(RemoteData).get_sha256_jgs8q8_k$ = function () {
    return this.sha256;
  };
  protoOf(RemoteData).get_assetId_ae1upq_k$ = function () {
    return this.assetId;
  };
  protoOf(RemoteData).get_assetToken_evm1rm_k$ = function () {
    return this.assetToken;
  };
  protoOf(RemoteData).get_assetDomain_rgmfl7_k$ = function () {
    return this.assetDomain;
  };
  protoOf(RemoteData).get_encryption_pua0p8_k$ = function () {
    return this.encryption;
  };
  protoOf(RemoteData).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(RemoteData).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_43(this, other);
  };
  protoOf(RemoteData).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_52().descriptor_1;
  };
  protoOf(RemoteData).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_43();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(RemoteData).component1_7eebsc_k$ = function () {
    return this.otrKey;
  };
  protoOf(RemoteData).component2_7eebsb_k$ = function () {
    return this.sha256;
  };
  protoOf(RemoteData).component3_7eebsa_k$ = function () {
    return this.assetId;
  };
  protoOf(RemoteData).component4_7eebs9_k$ = function () {
    return this.assetToken;
  };
  protoOf(RemoteData).component5_7eebs8_k$ = function () {
    return this.assetDomain;
  };
  protoOf(RemoteData).component6_7eebs7_k$ = function () {
    return this.encryption;
  };
  protoOf(RemoteData).component7_7eebs6_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(RemoteData).copy_g4xozf_k$ = function (
    otrKey,
    sha256,
    assetId,
    assetToken,
    assetDomain,
    encryption,
    unknownFields,
  ) {
    return new RemoteData(otrKey, sha256, assetId, assetToken, assetDomain, encryption, unknownFields);
  };
  protoOf(RemoteData).copy = function (
    otrKey,
    sha256,
    assetId,
    assetToken,
    assetDomain,
    encryption,
    unknownFields,
    $super,
  ) {
    otrKey = otrKey === VOID ? this.otrKey : otrKey;
    sha256 = sha256 === VOID ? this.sha256 : sha256;
    assetId = assetId === VOID ? this.assetId : assetId;
    assetToken = assetToken === VOID ? this.assetToken : assetToken;
    assetDomain = assetDomain === VOID ? this.assetDomain : assetDomain;
    encryption = encryption === VOID ? this.encryption : encryption;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_g4xozf_k$(otrKey, sha256, assetId, assetToken, assetDomain, encryption, unknownFields);
  };
  protoOf(RemoteData).toString = function () {
    return (
      'RemoteData(otrKey=' +
      this.otrKey +
      ', sha256=' +
      this.sha256 +
      ', assetId=' +
      this.assetId +
      ', assetToken=' +
      this.assetToken +
      ', assetDomain=' +
      this.assetDomain +
      ', encryption=' +
      this.encryption +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(RemoteData).hashCode = function () {
    var result = this.otrKey.hashCode();
    result = (imul(result, 31) + this.sha256.hashCode()) | 0;
    result = (imul(result, 31) + (this.assetId == null ? 0 : getStringHashCode(this.assetId))) | 0;
    result = (imul(result, 31) + (this.assetToken == null ? 0 : getStringHashCode(this.assetToken))) | 0;
    result = (imul(result, 31) + (this.assetDomain == null ? 0 : getStringHashCode(this.assetDomain))) | 0;
    result = (imul(result, 31) + (this.encryption == null ? 0 : this.encryption.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(RemoteData).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof RemoteData)) return false;
    var tmp0_other_with_cast = other instanceof RemoteData ? other : THROW_CCE();
    if (!this.otrKey.equals(tmp0_other_with_cast.otrKey)) return false;
    if (!this.sha256.equals(tmp0_other_with_cast.sha256)) return false;
    if (!(this.assetId == tmp0_other_with_cast.assetId)) return false;
    if (!(this.assetToken == tmp0_other_with_cast.assetToken)) return false;
    if (!(this.assetDomain == tmp0_other_with_cast.assetDomain)) return false;
    if (!equals(this.encryption, tmp0_other_with_cast.encryption)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Asset$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Asset_2(original, preview, expectsReadConfirmation, legalHoldStatus, status, unknownFields) {
    Companion_getInstance_53();
    original = original === VOID ? null : original;
    preview = preview === VOID ? null : preview;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? null : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? null : legalHoldStatus;
    status = status === VOID ? null : status;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.original = original;
    this.preview = preview;
    this.expectsReadConfirmation = expectsReadConfirmation;
    this.legalHoldStatus = legalHoldStatus;
    this.status = status;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Asset$protoSize$delegate$lambda(this));
  }
  protoOf(Asset_2).get_original_8zw1nq_k$ = function () {
    return this.original;
  };
  protoOf(Asset_2).get_preview_3zvuox_k$ = function () {
    return this.preview;
  };
  protoOf(Asset_2).get_expectsReadConfirmation_i6xil8_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Asset_2).get_legalHoldStatus_nngzep_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Asset_2).get_status_jnf6d7_k$ = function () {
    return this.status;
  };
  protoOf(Asset_2).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Asset_2).get_notUploaded_oca97a_k$ = function () {
    var tmp = this.status;
    var tmp0_safe_receiver = tmp instanceof NotUploaded ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Asset_2).get_uploaded_5xryzb_k$ = function () {
    var tmp = this.status;
    var tmp0_safe_receiver = tmp instanceof Uploaded ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(Asset_2).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_37(this, other);
  };
  protoOf(Asset_2).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_53().descriptor_1;
  };
  protoOf(Asset_2).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_37();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Asset_2).component1_7eebsc_k$ = function () {
    return this.original;
  };
  protoOf(Asset_2).component2_7eebsb_k$ = function () {
    return this.preview;
  };
  protoOf(Asset_2).component3_7eebsa_k$ = function () {
    return this.expectsReadConfirmation;
  };
  protoOf(Asset_2).component4_7eebs9_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Asset_2).component5_7eebs8_k$ = function () {
    return this.status;
  };
  protoOf(Asset_2).component6_7eebs7_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Asset_2).copy_vs465z_k$ = function (
    original,
    preview,
    expectsReadConfirmation,
    legalHoldStatus,
    status,
    unknownFields,
  ) {
    return new Asset_2(original, preview, expectsReadConfirmation, legalHoldStatus, status, unknownFields);
  };
  protoOf(Asset_2).copy = function (
    original,
    preview,
    expectsReadConfirmation,
    legalHoldStatus,
    status,
    unknownFields,
    $super,
  ) {
    original = original === VOID ? this.original : original;
    preview = preview === VOID ? this.preview : preview;
    expectsReadConfirmation = expectsReadConfirmation === VOID ? this.expectsReadConfirmation : expectsReadConfirmation;
    legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus : legalHoldStatus;
    status = status === VOID ? this.status : status;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_vs465z_k$(original, preview, expectsReadConfirmation, legalHoldStatus, status, unknownFields);
  };
  protoOf(Asset_2).toString = function () {
    return (
      'Asset(original=' +
      this.original +
      ', preview=' +
      this.preview +
      ', expectsReadConfirmation=' +
      this.expectsReadConfirmation +
      ', legalHoldStatus=' +
      this.legalHoldStatus +
      ', status=' +
      this.status +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Asset_2).hashCode = function () {
    var result = this.original == null ? 0 : this.original.hashCode();
    result = (imul(result, 31) + (this.preview == null ? 0 : this.preview.hashCode())) | 0;
    result =
      (imul(result, 31) +
        (this.expectsReadConfirmation == null ? 0 : getBooleanHashCode(this.expectsReadConfirmation))) |
      0;
    result = (imul(result, 31) + (this.legalHoldStatus == null ? 0 : this.legalHoldStatus.hashCode())) | 0;
    result = (imul(result, 31) + (this.status == null ? 0 : this.status.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Asset_2).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Asset_2)) return false;
    var tmp0_other_with_cast = other instanceof Asset_2 ? other : THROW_CCE();
    if (!equals(this.original, tmp0_other_with_cast.original)) return false;
    if (!equals(this.preview, tmp0_other_with_cast.preview)) return false;
    if (!(this.expectsReadConfirmation == tmp0_other_with_cast.expectsReadConfirmation)) return false;
    if (!equals(this.legalHoldStatus, tmp0_other_with_cast.legalHoldStatus)) return false;
    if (!equals(this.status, tmp0_other_with_cast.status)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_54() {
    Companion_instance_52 = this;
    var tmp = this;
    var tmp_0 = getKClass(External_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_190(this);
    var tmp1_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'otr_key', 1, tmp1_type, otrKey$factory_2(), VOID, 'otrKey'),
    );
    var tmp2_messageDescriptor = descriptor$factory_191(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'sha256', 2, tmp3_type, sha256$factory_2(), VOID, 'sha256'),
    );
    var tmp4_messageDescriptor = descriptor$factory_192(this);
    var tmp5_type = new Enum_0(Companion_getInstance_16(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'encryption',
        3,
        tmp5_type,
        encryption$factory_1(),
        VOID,
        'encryption',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('External', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_54).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_44(Companion_getInstance_54(), u);
  };
  protoOf(Companion_54).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_52;
  function Companion_getInstance_54() {
    if (Companion_instance_52 == null) new Companion_54();
    return Companion_instance_52;
  }
  function External$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function External_0(otrKey, sha256, encryption, unknownFields) {
    Companion_getInstance_54();
    sha256 = sha256 === VOID ? null : sha256;
    encryption = encryption === VOID ? null : encryption;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.otrKey = otrKey;
    this.sha256 = sha256;
    this.encryption = encryption;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(External$protoSize$delegate$lambda(this));
  }
  protoOf(External_0).get_otrKey_hriosb_k$ = function () {
    return this.otrKey;
  };
  protoOf(External_0).get_sha256_jgs8q8_k$ = function () {
    return this.sha256;
  };
  protoOf(External_0).get_encryption_pua0p8_k$ = function () {
    return this.encryption;
  };
  protoOf(External_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(External_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_44(this, other);
  };
  protoOf(External_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_54().descriptor_1;
  };
  protoOf(External_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_44();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(External_0).component1_7eebsc_k$ = function () {
    return this.otrKey;
  };
  protoOf(External_0).component2_7eebsb_k$ = function () {
    return this.sha256;
  };
  protoOf(External_0).component3_7eebsa_k$ = function () {
    return this.encryption;
  };
  protoOf(External_0).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(External_0).copy_5p2qyh_k$ = function (otrKey, sha256, encryption, unknownFields) {
    return new External_0(otrKey, sha256, encryption, unknownFields);
  };
  protoOf(External_0).copy = function (otrKey, sha256, encryption, unknownFields, $super) {
    otrKey = otrKey === VOID ? this.otrKey : otrKey;
    sha256 = sha256 === VOID ? this.sha256 : sha256;
    encryption = encryption === VOID ? this.encryption : encryption;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5p2qyh_k$(otrKey, sha256, encryption, unknownFields);
  };
  protoOf(External_0).toString = function () {
    return (
      'External(otrKey=' +
      this.otrKey +
      ', sha256=' +
      this.sha256 +
      ', encryption=' +
      this.encryption +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(External_0).hashCode = function () {
    var result = this.otrKey.hashCode();
    result = (imul(result, 31) + (this.sha256 == null ? 0 : this.sha256.hashCode())) | 0;
    result = (imul(result, 31) + (this.encryption == null ? 0 : this.encryption.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(External_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof External_0)) return false;
    var tmp0_other_with_cast = other instanceof External_0 ? other : THROW_CCE();
    if (!this.otrKey.equals(tmp0_other_with_cast.otrKey)) return false;
    if (!equals(this.sha256, tmp0_other_with_cast.sha256)) return false;
    if (!equals(this.encryption, tmp0_other_with_cast.encryption)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_55() {
    Companion_instance_53 = this;
    var tmp = this;
    var tmp_0 = getKClass(Reaction_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_193(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'emoji', 1, tmp1_type, emoji$factory(), VOID, 'emoji'),
    );
    var tmp2_messageDescriptor = descriptor$factory_194(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'message_id', 2, tmp3_type, messageId$factory_2(), VOID, 'messageId'),
    );
    var tmp4_messageDescriptor = descriptor$factory_195(this);
    var tmp5_type = new Enum_0(Companion_getInstance_17(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'legal_hold_status',
        3,
        tmp5_type,
        legalHoldStatus$factory_4(),
        VOID,
        'legalHoldStatus',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Reaction', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_55).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_45(Companion_getInstance_55(), u);
  };
  protoOf(Companion_55).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_53;
  function Companion_getInstance_55() {
    if (Companion_instance_53 == null) new Companion_55();
    return Companion_instance_53;
  }
  function Reaction$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Reaction_0(emoji, messageId, legalHoldStatus, unknownFields) {
    Companion_getInstance_55();
    emoji = emoji === VOID ? null : emoji;
    legalHoldStatus = legalHoldStatus === VOID ? null : legalHoldStatus;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.emoji = emoji;
    this.messageId = messageId;
    this.legalHoldStatus = legalHoldStatus;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Reaction$protoSize$delegate$lambda(this));
  }
  protoOf(Reaction_0).get_emoji_iqwm59_k$ = function () {
    return this.emoji;
  };
  protoOf(Reaction_0).get_messageId_fato9z_k$ = function () {
    return this.messageId;
  };
  protoOf(Reaction_0).get_legalHoldStatus_nngzep_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Reaction_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Reaction_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_45(this, other);
  };
  protoOf(Reaction_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_55().descriptor_1;
  };
  protoOf(Reaction_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_45();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Reaction_0).component1_7eebsc_k$ = function () {
    return this.emoji;
  };
  protoOf(Reaction_0).component2_7eebsb_k$ = function () {
    return this.messageId;
  };
  protoOf(Reaction_0).component3_7eebsa_k$ = function () {
    return this.legalHoldStatus;
  };
  protoOf(Reaction_0).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Reaction_0).copy_fry2pz_k$ = function (emoji, messageId, legalHoldStatus, unknownFields) {
    return new Reaction_0(emoji, messageId, legalHoldStatus, unknownFields);
  };
  protoOf(Reaction_0).copy = function (emoji, messageId, legalHoldStatus, unknownFields, $super) {
    emoji = emoji === VOID ? this.emoji : emoji;
    messageId = messageId === VOID ? this.messageId : messageId;
    legalHoldStatus = legalHoldStatus === VOID ? this.legalHoldStatus : legalHoldStatus;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_fry2pz_k$(emoji, messageId, legalHoldStatus, unknownFields);
  };
  protoOf(Reaction_0).toString = function () {
    return (
      'Reaction(emoji=' +
      this.emoji +
      ', messageId=' +
      this.messageId +
      ', legalHoldStatus=' +
      this.legalHoldStatus +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Reaction_0).hashCode = function () {
    var result = this.emoji == null ? 0 : getStringHashCode(this.emoji);
    result = (imul(result, 31) + getStringHashCode(this.messageId)) | 0;
    result = (imul(result, 31) + (this.legalHoldStatus == null ? 0 : this.legalHoldStatus.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Reaction_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Reaction_0)) return false;
    var tmp0_other_with_cast = other instanceof Reaction_0 ? other : THROW_CCE();
    if (!(this.emoji == tmp0_other_with_cast.emoji)) return false;
    if (!(this.messageId === tmp0_other_with_cast.messageId)) return false;
    if (!equals(this.legalHoldStatus, tmp0_other_with_cast.legalHoldStatus)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_56() {
    Companion_instance_54 = this;
    var tmp = this;
    var tmp_0 = getKClass(Calling_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_196(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'content', 1, tmp1_type, content$factory_1(), VOID, 'content'),
    );
    var tmp2_messageDescriptor = descriptor$factory_197(this);
    var tmp3_type = new Message(Companion_getInstance_21());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'qualified_conversation_id',
        2,
        tmp3_type,
        qualifiedConversationId$factory_2(),
        VOID,
        'qualifiedConversationId',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('Calling', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_56).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_46(Companion_getInstance_56(), u);
  };
  protoOf(Companion_56).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_54;
  function Companion_getInstance_56() {
    if (Companion_instance_54 == null) new Companion_56();
    return Companion_instance_54;
  }
  function Calling$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Calling_0(content, qualifiedConversationId, unknownFields) {
    Companion_getInstance_56();
    qualifiedConversationId = qualifiedConversationId === VOID ? null : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.content = content;
    this.qualifiedConversationId = qualifiedConversationId;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(Calling$protoSize$delegate$lambda(this));
  }
  protoOf(Calling_0).get_content_h02jrk_k$ = function () {
    return this.content;
  };
  protoOf(Calling_0).get_qualifiedConversationId_bhb8wh_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(Calling_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Calling_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_46(this, other);
  };
  protoOf(Calling_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_56().descriptor_1;
  };
  protoOf(Calling_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_46();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Calling_0).component1_7eebsc_k$ = function () {
    return this.content;
  };
  protoOf(Calling_0).component2_7eebsb_k$ = function () {
    return this.qualifiedConversationId;
  };
  protoOf(Calling_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(Calling_0).copy_y8nfon_k$ = function (content, qualifiedConversationId, unknownFields) {
    return new Calling_0(content, qualifiedConversationId, unknownFields);
  };
  protoOf(Calling_0).copy = function (content, qualifiedConversationId, unknownFields, $super) {
    content = content === VOID ? this.content : content;
    qualifiedConversationId = qualifiedConversationId === VOID ? this.qualifiedConversationId : qualifiedConversationId;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_y8nfon_k$(content, qualifiedConversationId, unknownFields);
  };
  protoOf(Calling_0).toString = function () {
    return (
      'Calling(content=' +
      this.content +
      ', qualifiedConversationId=' +
      this.qualifiedConversationId +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(Calling_0).hashCode = function () {
    var result = getStringHashCode(this.content);
    result =
      (imul(result, 31) + (this.qualifiedConversationId == null ? 0 : this.qualifiedConversationId.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(Calling_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof Calling_0)) return false;
    var tmp0_other_with_cast = other instanceof Calling_0 ? other : THROW_CCE();
    if (!(this.content === tmp0_other_with_cast.content)) return false;
    if (!equals(this.qualifiedConversationId, tmp0_other_with_cast.qualifiedConversationId)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function DataTransfer$Companion$defaultInstance$delegate$lambda() {
    return new DataTransfer_0();
  }
  function Companion_57() {
    Companion_instance_55 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(DataTransfer$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(DataTransfer_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_198(this);
    var tmp1_type = new Message(Companion_getInstance_58());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'trackingIdentifier',
        1,
        tmp1_type,
        trackingIdentifier$factory(),
        VOID,
        'trackingIdentifier',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('DataTransfer', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_57).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_8();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_57).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_47(Companion_getInstance_57(), u);
  };
  protoOf(Companion_57).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_55;
  function Companion_getInstance_57() {
    if (Companion_instance_55 == null) new Companion_57();
    return Companion_instance_55;
  }
  function DataTransfer$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function DataTransfer_0(trackingIdentifier, unknownFields) {
    Companion_getInstance_57();
    trackingIdentifier = trackingIdentifier === VOID ? null : trackingIdentifier;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.trackingIdentifier = trackingIdentifier;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(DataTransfer$protoSize$delegate$lambda(this));
  }
  protoOf(DataTransfer_0).get_trackingIdentifier_88whu1_k$ = function () {
    return this.trackingIdentifier;
  };
  protoOf(DataTransfer_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(DataTransfer_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_47(this, other);
  };
  protoOf(DataTransfer_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_57().descriptor_1;
  };
  protoOf(DataTransfer_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_47();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(DataTransfer_0).component1_7eebsc_k$ = function () {
    return this.trackingIdentifier;
  };
  protoOf(DataTransfer_0).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(DataTransfer_0).copy_wx5bch_k$ = function (trackingIdentifier, unknownFields) {
    return new DataTransfer_0(trackingIdentifier, unknownFields);
  };
  protoOf(DataTransfer_0).copy = function (trackingIdentifier, unknownFields, $super) {
    trackingIdentifier = trackingIdentifier === VOID ? this.trackingIdentifier : trackingIdentifier;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_wx5bch_k$(trackingIdentifier, unknownFields);
  };
  protoOf(DataTransfer_0).toString = function () {
    return (
      'DataTransfer(trackingIdentifier=' + this.trackingIdentifier + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(DataTransfer_0).hashCode = function () {
    var result = this.trackingIdentifier == null ? 0 : this.trackingIdentifier.hashCode();
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(DataTransfer_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof DataTransfer_0)) return false;
    var tmp0_other_with_cast = other instanceof DataTransfer_0 ? other : THROW_CCE();
    if (!equals(this.trackingIdentifier, tmp0_other_with_cast.trackingIdentifier)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_58() {
    Companion_instance_56 = this;
    var tmp = this;
    var tmp_0 = getKClass(TrackingIdentifier);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.messages.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_199(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'identifier', 1, tmp1_type, identifier$factory(), VOID, 'identifier'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('TrackingIdentifier', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_58).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_48(Companion_getInstance_58(), u);
  };
  protoOf(Companion_58).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_56;
  function Companion_getInstance_58() {
    if (Companion_instance_56 == null) new Companion_58();
    return Companion_instance_56;
  }
  function TrackingIdentifier$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function TrackingIdentifier(identifier, unknownFields) {
    Companion_getInstance_58();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.identifier = identifier;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(TrackingIdentifier$protoSize$delegate$lambda(this));
  }
  protoOf(TrackingIdentifier).get_identifier_o3acky_k$ = function () {
    return this.identifier;
  };
  protoOf(TrackingIdentifier).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(TrackingIdentifier).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_48(this, other);
  };
  protoOf(TrackingIdentifier).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_58().descriptor_1;
  };
  protoOf(TrackingIdentifier).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_48();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(TrackingIdentifier).component1_7eebsc_k$ = function () {
    return this.identifier;
  };
  protoOf(TrackingIdentifier).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(TrackingIdentifier).copy_m2jrby_k$ = function (identifier, unknownFields) {
    return new TrackingIdentifier(identifier, unknownFields);
  };
  protoOf(TrackingIdentifier).copy = function (identifier, unknownFields, $super) {
    identifier = identifier === VOID ? this.identifier : identifier;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_m2jrby_k$(identifier, unknownFields);
  };
  protoOf(TrackingIdentifier).toString = function () {
    return 'TrackingIdentifier(identifier=' + this.identifier + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(TrackingIdentifier).hashCode = function () {
    var result = getStringHashCode(this.identifier);
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(TrackingIdentifier).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof TrackingIdentifier)) return false;
    var tmp0_other_with_cast = other instanceof TrackingIdentifier ? other : THROW_CCE();
    if (!(this.identifier === tmp0_other_with_cast.identifier)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function orDefaultForComposite(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_23().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForCompositeItem(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_22().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForTweet(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_33().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForAsset(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_53().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForAssetVideoMetaData(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_50().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForAssetAudioMetaData(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_51().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForDataTransfer(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_57().defaultInstance : _this__u8e3s4;
  }
  function protoMergeImpl_12(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof GenericMessage ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.unknownStrategy;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.unknownStrategy : tmp0_elvis_lhs;
      var tmp_1;
      var tmp_2;
      var tmp_3 = _this__u8e3s4.content;
      if (tmp_3 instanceof Text_0) {
        var tmp_4 = plus.content;
        tmp_2 = tmp_4 instanceof Text_0;
      } else {
        tmp_2 = false;
      }
      if (tmp_2) {
        tmp_1 = new Text_0(
          _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
        );
      } else {
        var tmp_5;
        var tmp_6 = _this__u8e3s4.content;
        if (tmp_6 instanceof Image_0) {
          var tmp_7 = plus.content;
          tmp_5 = tmp_7 instanceof Image_0;
        } else {
          tmp_5 = false;
        }
        if (tmp_5) {
          tmp_1 = new Image_0(
            _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
          );
        } else {
          var tmp_8;
          var tmp_9 = _this__u8e3s4.content;
          if (tmp_9 instanceof Knock) {
            var tmp_10 = plus.content;
            tmp_8 = tmp_10 instanceof Knock;
          } else {
            tmp_8 = false;
          }
          if (tmp_8) {
            tmp_1 = new Knock(
              _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
            );
          } else {
            var tmp_11;
            var tmp_12 = _this__u8e3s4.content;
            if (tmp_12 instanceof LastRead) {
              var tmp_13 = plus.content;
              tmp_11 = tmp_13 instanceof LastRead;
            } else {
              tmp_11 = false;
            }
            if (tmp_11) {
              tmp_1 = new LastRead(
                _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
              );
            } else {
              var tmp_14;
              var tmp_15 = _this__u8e3s4.content;
              if (tmp_15 instanceof Cleared) {
                var tmp_16 = plus.content;
                tmp_14 = tmp_16 instanceof Cleared;
              } else {
                tmp_14 = false;
              }
              if (tmp_14) {
                tmp_1 = new Cleared(
                  _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                );
              } else {
                var tmp_17;
                var tmp_18 = _this__u8e3s4.content;
                if (tmp_18 instanceof External) {
                  var tmp_19 = plus.content;
                  tmp_17 = tmp_19 instanceof External;
                } else {
                  tmp_17 = false;
                }
                if (tmp_17) {
                  tmp_1 = new External(
                    _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                  );
                } else {
                  var tmp_20;
                  var tmp_21 = _this__u8e3s4.content;
                  if (tmp_21 instanceof Calling) {
                    var tmp_22 = plus.content;
                    tmp_20 = tmp_22 instanceof Calling;
                  } else {
                    tmp_20 = false;
                  }
                  if (tmp_20) {
                    tmp_1 = new Calling(
                      _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                    );
                  } else {
                    var tmp_23;
                    var tmp_24 = _this__u8e3s4.content;
                    if (tmp_24 instanceof Asset_0) {
                      var tmp_25 = plus.content;
                      tmp_23 = tmp_25 instanceof Asset_0;
                    } else {
                      tmp_23 = false;
                    }
                    if (tmp_23) {
                      tmp_1 = new Asset_0(
                        _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                      );
                    } else {
                      var tmp_26;
                      var tmp_27 = _this__u8e3s4.content;
                      if (tmp_27 instanceof Hidden) {
                        var tmp_28 = plus.content;
                        tmp_26 = tmp_28 instanceof Hidden;
                      } else {
                        tmp_26 = false;
                      }
                      if (tmp_26) {
                        tmp_1 = new Hidden(
                          _this__u8e3s4.content
                            .get_value_j01efc_k$()
                            .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                        );
                      } else {
                        var tmp_29;
                        var tmp_30 = _this__u8e3s4.content;
                        if (tmp_30 instanceof Location_0) {
                          var tmp_31 = plus.content;
                          tmp_29 = tmp_31 instanceof Location_0;
                        } else {
                          tmp_29 = false;
                        }
                        if (tmp_29) {
                          tmp_1 = new Location_0(
                            _this__u8e3s4.content
                              .get_value_j01efc_k$()
                              .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                          );
                        } else {
                          var tmp_32;
                          var tmp_33 = _this__u8e3s4.content;
                          if (tmp_33 instanceof Deleted) {
                            var tmp_34 = plus.content;
                            tmp_32 = tmp_34 instanceof Deleted;
                          } else {
                            tmp_32 = false;
                          }
                          if (tmp_32) {
                            tmp_1 = new Deleted(
                              _this__u8e3s4.content
                                .get_value_j01efc_k$()
                                .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                            );
                          } else {
                            var tmp_35;
                            var tmp_36 = _this__u8e3s4.content;
                            if (tmp_36 instanceof Edited) {
                              var tmp_37 = plus.content;
                              tmp_35 = tmp_37 instanceof Edited;
                            } else {
                              tmp_35 = false;
                            }
                            if (tmp_35) {
                              tmp_1 = new Edited(
                                _this__u8e3s4.content
                                  .get_value_j01efc_k$()
                                  .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                              );
                            } else {
                              var tmp_38;
                              var tmp_39 = _this__u8e3s4.content;
                              if (tmp_39 instanceof Confirmation) {
                                var tmp_40 = plus.content;
                                tmp_38 = tmp_40 instanceof Confirmation;
                              } else {
                                tmp_38 = false;
                              }
                              if (tmp_38) {
                                tmp_1 = new Confirmation(
                                  _this__u8e3s4.content
                                    .get_value_j01efc_k$()
                                    .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                );
                              } else {
                                var tmp_41;
                                var tmp_42 = _this__u8e3s4.content;
                                if (tmp_42 instanceof Reaction) {
                                  var tmp_43 = plus.content;
                                  tmp_41 = tmp_43 instanceof Reaction;
                                } else {
                                  tmp_41 = false;
                                }
                                if (tmp_41) {
                                  tmp_1 = new Reaction(
                                    _this__u8e3s4.content
                                      .get_value_j01efc_k$()
                                      .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                  );
                                } else {
                                  var tmp_44;
                                  var tmp_45 = _this__u8e3s4.content;
                                  if (tmp_45 instanceof Ephemeral) {
                                    var tmp_46 = plus.content;
                                    tmp_44 = tmp_46 instanceof Ephemeral;
                                  } else {
                                    tmp_44 = false;
                                  }
                                  if (tmp_44) {
                                    tmp_1 = new Ephemeral(
                                      _this__u8e3s4.content
                                        .get_value_j01efc_k$()
                                        .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                    );
                                  } else {
                                    var tmp_47;
                                    var tmp_48 = _this__u8e3s4.content;
                                    if (tmp_48 instanceof Availability) {
                                      var tmp_49 = plus.content;
                                      tmp_47 = tmp_49 instanceof Availability;
                                    } else {
                                      tmp_47 = false;
                                    }
                                    if (tmp_47) {
                                      tmp_1 = new Availability(
                                        _this__u8e3s4.content
                                          .get_value_j01efc_k$()
                                          .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                      );
                                    } else {
                                      var tmp_50;
                                      var tmp_51 = _this__u8e3s4.content;
                                      if (tmp_51 instanceof Composite) {
                                        var tmp_52 = plus.content;
                                        tmp_50 = tmp_52 instanceof Composite;
                                      } else {
                                        tmp_50 = false;
                                      }
                                      if (tmp_50) {
                                        tmp_1 = new Composite(
                                          _this__u8e3s4.content
                                            .get_value_j01efc_k$()
                                            .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                        );
                                      } else {
                                        var tmp_53;
                                        var tmp_54 = _this__u8e3s4.content;
                                        if (tmp_54 instanceof ButtonAction) {
                                          var tmp_55 = plus.content;
                                          tmp_53 = tmp_55 instanceof ButtonAction;
                                        } else {
                                          tmp_53 = false;
                                        }
                                        if (tmp_53) {
                                          tmp_1 = new ButtonAction(
                                            _this__u8e3s4.content
                                              .get_value_j01efc_k$()
                                              .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                          );
                                        } else {
                                          var tmp_56;
                                          var tmp_57 = _this__u8e3s4.content;
                                          if (tmp_57 instanceof ButtonActionConfirmation) {
                                            var tmp_58 = plus.content;
                                            tmp_56 = tmp_58 instanceof ButtonActionConfirmation;
                                          } else {
                                            tmp_56 = false;
                                          }
                                          if (tmp_56) {
                                            tmp_1 = new ButtonActionConfirmation(
                                              _this__u8e3s4.content
                                                .get_value_j01efc_k$()
                                                .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                            );
                                          } else {
                                            var tmp_59;
                                            var tmp_60 = _this__u8e3s4.content;
                                            if (tmp_60 instanceof DataTransfer) {
                                              var tmp_61 = plus.content;
                                              tmp_59 = tmp_61 instanceof DataTransfer;
                                            } else {
                                              tmp_59 = false;
                                            }
                                            if (tmp_59) {
                                              tmp_1 = new DataTransfer(
                                                _this__u8e3s4.content
                                                  .get_value_j01efc_k$()
                                                  .plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                                              );
                                            } else {
                                              var tmp1_elvis_lhs = plus.content;
                                              tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.content : tmp1_elvis_lhs;
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        tmp_1,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_12(_this__u8e3s4, u) {
    var messageId = {_v: null};
    var unknownStrategy = {_v: null};
    var content = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_12(messageId, content, unknownStrategy),
    );
    if (messageId._v == null) {
      throw Companion_getInstance().missingRequiredField('message_id');
    }
    return new GenericMessage(ensureNotNull(messageId._v), unknownStrategy._v, content._v, unknownFields);
  }
  function protoMergeImpl_13(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof QualifiedUserId ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_13(_this__u8e3s4, u) {
    var id = {_v: null};
    var domain = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_13(id, domain));
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    if (domain._v == null) {
      throw Companion_getInstance().missingRequiredField('domain');
    }
    return new QualifiedUserId(ensureNotNull(id._v), ensureNotNull(domain._v), unknownFields);
  }
  function protoMergeImpl_14(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof QualifiedConversationId ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_14(_this__u8e3s4, u) {
    var id = {_v: null};
    var domain = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_14(id, domain));
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    if (domain._v == null) {
      throw Companion_getInstance().missingRequiredField('domain');
    }
    return new QualifiedConversationId(ensureNotNull(id._v), ensureNotNull(domain._v), unknownFields);
  }
  function protoMergeImpl_15(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof Composite_0 ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp_0 = plus(_this__u8e3s4.items, plus_1.items);
      var tmp0_elvis_lhs = plus_1.expectsReadConfirmation;
      var tmp_1 = tmp0_elvis_lhs == null ? _this__u8e3s4.expectsReadConfirmation : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus_1.legalHoldStatus;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp1_elvis_lhs == null ? _this__u8e3s4.legalHoldStatus : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_15(_this__u8e3s4, u) {
    var items = {_v: null};
    var expectsReadConfirmation = {_v: null};
    var legalHoldStatus = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_15(items, expectsReadConfirmation, legalHoldStatus),
    );
    return new Composite_0(
      Companion_getInstance_0().fixed(items._v),
      expectsReadConfirmation._v,
      legalHoldStatus._v,
      unknownFields,
    );
  }
  function protoMergeImpl_16(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Item ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp_0;
      var tmp_1;
      var tmp_2 = _this__u8e3s4.content;
      if (tmp_2 instanceof Text_1) {
        var tmp_3 = plus.content;
        tmp_1 = tmp_3 instanceof Text_1;
      } else {
        tmp_1 = false;
      }
      if (tmp_1) {
        tmp_0 = new Text_1(
          _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
        );
      } else {
        var tmp_4;
        var tmp_5 = _this__u8e3s4.content;
        if (tmp_5 instanceof Button) {
          var tmp_6 = plus.content;
          tmp_4 = tmp_6 instanceof Button;
        } else {
          tmp_4 = false;
        }
        if (tmp_4) {
          tmp_0 = new Button(
            _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
          );
        } else {
          var tmp0_elvis_lhs = plus.content;
          tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.content : tmp0_elvis_lhs;
        }
      }
      tmp = tmp0_safe_receiver.copy(tmp_0, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_16(_this__u8e3s4, u) {
    var content = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_16(content));
    return new Item(content._v, unknownFields);
  }
  function protoMergeImpl_17(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Button_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_17(_this__u8e3s4, u) {
    var text = {_v: null};
    var id = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_17(text, id));
    if (text._v == null) {
      throw Companion_getInstance().missingRequiredField('text');
    }
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    return new Button_0(ensureNotNull(text._v), ensureNotNull(id._v), unknownFields);
  }
  function protoMergeImpl_18(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ButtonAction_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_18(_this__u8e3s4, u) {
    var buttonId = {_v: null};
    var referenceMessageId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_18(buttonId, referenceMessageId));
    if (buttonId._v == null) {
      throw Companion_getInstance().missingRequiredField('button_id');
    }
    if (referenceMessageId._v == null) {
      throw Companion_getInstance().missingRequiredField('reference_message_id');
    }
    return new ButtonAction_0(ensureNotNull(buttonId._v), ensureNotNull(referenceMessageId._v), unknownFields);
  }
  function protoMergeImpl_19(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ButtonActionConfirmation_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.buttonId;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp0_elvis_lhs == null ? _this__u8e3s4.buttonId : tmp0_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_19(_this__u8e3s4, u) {
    var referenceMessageId = {_v: null};
    var buttonId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_19(referenceMessageId, buttonId));
    if (referenceMessageId._v == null) {
      throw Companion_getInstance().missingRequiredField('reference_message_id');
    }
    return new ButtonActionConfirmation_0(ensureNotNull(referenceMessageId._v), buttonId._v, unknownFields);
  }
  function protoMergeImpl_20(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Availability_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(VOID, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_20(_this__u8e3s4, u) {
    var type = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_20(type));
    if (type._v == null) {
      throw Companion_getInstance().missingRequiredField('type');
    }
    return new Availability_0(ensureNotNull(type._v), unknownFields);
  }
  function protoMergeImpl_21(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Ephemeral_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp_0;
      var tmp_1;
      var tmp_2 = _this__u8e3s4.content;
      if (tmp_2 instanceof Text_2) {
        var tmp_3 = plus.content;
        tmp_1 = tmp_3 instanceof Text_2;
      } else {
        tmp_1 = false;
      }
      if (tmp_1) {
        tmp_0 = new Text_2(
          _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
        );
      } else {
        var tmp_4;
        var tmp_5 = _this__u8e3s4.content;
        if (tmp_5 instanceof Image_1) {
          var tmp_6 = plus.content;
          tmp_4 = tmp_6 instanceof Image_1;
        } else {
          tmp_4 = false;
        }
        if (tmp_4) {
          tmp_0 = new Image_1(
            _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
          );
        } else {
          var tmp_7;
          var tmp_8 = _this__u8e3s4.content;
          if (tmp_8 instanceof Knock_0) {
            var tmp_9 = plus.content;
            tmp_7 = tmp_9 instanceof Knock_0;
          } else {
            tmp_7 = false;
          }
          if (tmp_7) {
            tmp_0 = new Knock_0(
              _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
            );
          } else {
            var tmp_10;
            var tmp_11 = _this__u8e3s4.content;
            if (tmp_11 instanceof Asset_1) {
              var tmp_12 = plus.content;
              tmp_10 = tmp_12 instanceof Asset_1;
            } else {
              tmp_10 = false;
            }
            if (tmp_10) {
              tmp_0 = new Asset_1(
                _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
              );
            } else {
              var tmp_13;
              var tmp_14 = _this__u8e3s4.content;
              if (tmp_14 instanceof Location_1) {
                var tmp_15 = plus.content;
                tmp_13 = tmp_15 instanceof Location_1;
              } else {
                tmp_13 = false;
              }
              if (tmp_13) {
                tmp_0 = new Location_1(
                  _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
                );
              } else {
                var tmp0_elvis_lhs = plus.content;
                tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.content : tmp0_elvis_lhs;
              }
            }
          }
        }
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_21(_this__u8e3s4, u) {
    var expireAfterMillis = {_v: null};
    var content = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_21(expireAfterMillis, content));
    if (expireAfterMillis._v == null) {
      throw Companion_getInstance().missingRequiredField('expire_after_millis');
    }
    return new Ephemeral_0(ensureNotNull(expireAfterMillis._v), content._v, unknownFields);
  }
  function protoMergeImpl_22(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof Text_3 ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp_0 = plus(_this__u8e3s4.linkPreview, plus_1.linkPreview);
      var tmp_1 = plus(_this__u8e3s4.mentions, plus_1.mentions);
      var tmp0_safe_receiver_0 = _this__u8e3s4.quote;
      var tmp1_elvis_lhs = tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus_1.quote);
      var tmp_2 = tmp1_elvis_lhs == null ? plus_1.quote : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus_1.expectsReadConfirmation;
      var tmp_3 = tmp2_elvis_lhs == null ? _this__u8e3s4.expectsReadConfirmation : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus_1.legalHoldStatus;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        tmp_1,
        tmp_2,
        tmp_3,
        tmp3_elvis_lhs == null ? _this__u8e3s4.legalHoldStatus : tmp3_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_22(_this__u8e3s4, u) {
    var content = {_v: null};
    var linkPreview = {_v: null};
    var mentions = {_v: null};
    var quote = {_v: null};
    var expectsReadConfirmation = {_v: null};
    var legalHoldStatus = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_22(content, linkPreview, mentions, quote, expectsReadConfirmation, legalHoldStatus),
    );
    if (content._v == null) {
      throw Companion_getInstance().missingRequiredField('content');
    }
    return new Text_3(
      ensureNotNull(content._v),
      Companion_getInstance_0().fixed(linkPreview._v),
      Companion_getInstance_0().fixed(mentions._v),
      quote._v,
      expectsReadConfirmation._v,
      legalHoldStatus._v,
      unknownFields,
    );
  }
  function protoMergeImpl_23(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Knock_1 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.expectsReadConfirmation;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.expectsReadConfirmation : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.legalHoldStatus;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        tmp1_elvis_lhs == null ? _this__u8e3s4.legalHoldStatus : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_23(_this__u8e3s4, u) {
    var hotKnock = {_v: null};
    var expectsReadConfirmation = {_v: null};
    var legalHoldStatus = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_23(hotKnock, expectsReadConfirmation, legalHoldStatus),
    );
    if (hotKnock._v == null) {
      throw Companion_getInstance().missingRequiredField('hot_knock');
    }
    return new Knock_1(ensureNotNull(hotKnock._v), expectsReadConfirmation._v, legalHoldStatus._v, unknownFields);
  }
  function protoMergeImpl_24(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof LinkPreview ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.permanentUrl;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.permanentUrl : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.title;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.title : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.summary;
      var tmp_2 = tmp2_elvis_lhs == null ? _this__u8e3s4.summary : tmp2_elvis_lhs;
      var tmp3_safe_receiver = _this__u8e3s4.image;
      var tmp4_elvis_lhs = tmp3_safe_receiver == null ? null : tmp3_safe_receiver.plus_fj0q1z_k$(plus.image);
      var tmp_3 = tmp4_elvis_lhs == null ? plus.image : tmp4_elvis_lhs;
      var tmp_4;
      var tmp_5;
      var tmp_6 = _this__u8e3s4.preview;
      if (tmp_6 instanceof Article) {
        var tmp_7 = plus.preview;
        tmp_5 = tmp_7 instanceof Article;
      } else {
        tmp_5 = false;
      }
      if (tmp_5) {
        tmp_4 = new Article(
          _this__u8e3s4.preview.get_value_j01efc_k$().plus_fj0q1z_k$(plus.preview.get_value_j01efc_k$()),
        );
      } else {
        var tmp5_elvis_lhs = plus.preview;
        tmp_4 = tmp5_elvis_lhs == null ? _this__u8e3s4.preview : tmp5_elvis_lhs;
      }
      var tmp_8 = tmp_4;
      var tmp_9;
      var tmp_10;
      var tmp_11 = _this__u8e3s4.metaData;
      if (tmp_11 instanceof Tweet) {
        var tmp_12 = plus.metaData;
        tmp_10 = tmp_12 instanceof Tweet;
      } else {
        tmp_10 = false;
      }
      if (tmp_10) {
        tmp_9 = new Tweet(
          _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
        );
      } else {
        var tmp6_elvis_lhs = plus.metaData;
        tmp_9 = tmp6_elvis_lhs == null ? _this__u8e3s4.metaData : tmp6_elvis_lhs;
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp_1,
        tmp_2,
        tmp_3,
        tmp_8,
        tmp_9,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_24(_this__u8e3s4, u) {
    var url = {_v: null};
    var urlOffset = {_v: null};
    var permanentUrl = {_v: null};
    var title = {_v: null};
    var summary = {_v: null};
    var image = {_v: null};
    var preview = {_v: null};
    var metaData = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_24(url, urlOffset, preview, permanentUrl, title, summary, image, metaData),
    );
    if (url._v == null) {
      throw Companion_getInstance().missingRequiredField('url');
    }
    if (urlOffset._v == null) {
      throw Companion_getInstance().missingRequiredField('url_offset');
    }
    return new LinkPreview(
      ensureNotNull(url._v),
      ensureNotNull(urlOffset._v),
      permanentUrl._v,
      title._v,
      summary._v,
      image._v,
      preview._v,
      metaData._v,
      unknownFields,
    );
  }
  function protoMergeImpl_25(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Tweet_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.author;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.author : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.username;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp1_elvis_lhs == null ? _this__u8e3s4.username : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_25(_this__u8e3s4, u) {
    var author = {_v: null};
    var username = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_25(author, username));
    return new Tweet_0(author._v, username._v, unknownFields);
  }
  function protoMergeImpl_26(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Article_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.title;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.title : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.summary;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.summary : tmp1_elvis_lhs;
      var tmp2_safe_receiver = _this__u8e3s4.image;
      var tmp3_elvis_lhs = tmp2_safe_receiver == null ? null : tmp2_safe_receiver.plus_fj0q1z_k$(plus.image);
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        tmp_1,
        tmp3_elvis_lhs == null ? plus.image : tmp3_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_26(_this__u8e3s4, u) {
    var permanentUrl = {_v: null};
    var title = {_v: null};
    var summary = {_v: null};
    var image = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_26(permanentUrl, title, summary, image),
    );
    if (permanentUrl._v == null) {
      throw Companion_getInstance().missingRequiredField('permanent_url');
    }
    return new Article_0(ensureNotNull(permanentUrl._v), title._v, summary._v, image._v, unknownFields);
  }
  function protoMergeImpl_27(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Mention ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.qualifiedUserId;
      var tmp1_elvis_lhs =
        tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.qualifiedUserId);
      var tmp_0 = tmp1_elvis_lhs == null ? plus.qualifiedUserId : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.mentionType;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp2_elvis_lhs == null ? _this__u8e3s4.mentionType : tmp2_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_27(_this__u8e3s4, u) {
    var start = {_v: null};
    var length = {_v: null};
    var qualifiedUserId = {_v: null};
    var mentionType = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_27(start, length, mentionType, qualifiedUserId),
    );
    if (start._v == null) {
      throw Companion_getInstance().missingRequiredField('start');
    }
    if (length._v == null) {
      throw Companion_getInstance().missingRequiredField('length');
    }
    return new Mention(
      ensureNotNull(start._v),
      ensureNotNull(length._v),
      qualifiedUserId._v,
      mentionType._v,
      unknownFields,
    );
  }
  function protoMergeImpl_28(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof LastRead_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.qualifiedConversationId;
      var tmp1_elvis_lhs =
        tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.qualifiedConversationId);
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp1_elvis_lhs == null ? plus.qualifiedConversationId : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_28(_this__u8e3s4, u) {
    var conversationId = {_v: null};
    var lastReadTimestamp = {_v: null};
    var qualifiedConversationId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_28(conversationId, lastReadTimestamp, qualifiedConversationId),
    );
    if (conversationId._v == null) {
      throw Companion_getInstance().missingRequiredField('conversation_id');
    }
    if (lastReadTimestamp._v == null) {
      throw Companion_getInstance().missingRequiredField('last_read_timestamp');
    }
    return new LastRead_0(
      ensureNotNull(conversationId._v),
      ensureNotNull(lastReadTimestamp._v),
      qualifiedConversationId._v,
      unknownFields,
    );
  }
  function protoMergeImpl_29(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Cleared_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.qualifiedConversationId;
      var tmp1_elvis_lhs =
        tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.qualifiedConversationId);
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp1_elvis_lhs == null ? plus.qualifiedConversationId : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_29(_this__u8e3s4, u) {
    var conversationId = {_v: null};
    var clearedTimestamp = {_v: null};
    var qualifiedConversationId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_29(conversationId, clearedTimestamp, qualifiedConversationId),
    );
    if (conversationId._v == null) {
      throw Companion_getInstance().missingRequiredField('conversation_id');
    }
    if (clearedTimestamp._v == null) {
      throw Companion_getInstance().missingRequiredField('cleared_timestamp');
    }
    return new Cleared_0(
      ensureNotNull(conversationId._v),
      ensureNotNull(clearedTimestamp._v),
      qualifiedConversationId._v,
      unknownFields,
    );
  }
  function protoMergeImpl_30(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof MessageHide ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.qualifiedConversationId;
      var tmp1_elvis_lhs =
        tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.qualifiedConversationId);
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp1_elvis_lhs == null ? plus.qualifiedConversationId : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_30(_this__u8e3s4, u) {
    var conversationId = {_v: null};
    var messageId = {_v: null};
    var qualifiedConversationId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_30(conversationId, messageId, qualifiedConversationId),
    );
    if (conversationId._v == null) {
      throw Companion_getInstance().missingRequiredField('conversation_id');
    }
    if (messageId._v == null) {
      throw Companion_getInstance().missingRequiredField('message_id');
    }
    return new MessageHide(
      ensureNotNull(conversationId._v),
      ensureNotNull(messageId._v),
      qualifiedConversationId._v,
      unknownFields,
    );
  }
  function protoMergeImpl_31(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof MessageDelete ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(VOID, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_31(_this__u8e3s4, u) {
    var messageId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_31(messageId));
    if (messageId._v == null) {
      throw Companion_getInstance().missingRequiredField('message_id');
    }
    return new MessageDelete(ensureNotNull(messageId._v), unknownFields);
  }
  function protoMergeImpl_32(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof MessageEdit ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp_0;
      var tmp_1;
      var tmp_2 = _this__u8e3s4.content;
      if (tmp_2 instanceof Text_4) {
        var tmp_3 = plus.content;
        tmp_1 = tmp_3 instanceof Text_4;
      } else {
        tmp_1 = false;
      }
      if (tmp_1) {
        tmp_0 = new Text_4(
          _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
        );
      } else {
        var tmp_4;
        var tmp_5 = _this__u8e3s4.content;
        if (tmp_5 instanceof Composite_1) {
          var tmp_6 = plus.content;
          tmp_4 = tmp_6 instanceof Composite_1;
        } else {
          tmp_4 = false;
        }
        if (tmp_4) {
          tmp_0 = new Composite_1(
            _this__u8e3s4.content.get_value_j01efc_k$().plus_fj0q1z_k$(plus.content.get_value_j01efc_k$()),
          );
        } else {
          var tmp0_elvis_lhs = plus.content;
          tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.content : tmp0_elvis_lhs;
        }
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_32(_this__u8e3s4, u) {
    var replacingMessageId = {_v: null};
    var content = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_32(replacingMessageId, content));
    if (replacingMessageId._v == null) {
      throw Companion_getInstance().missingRequiredField('replacing_message_id');
    }
    return new MessageEdit(ensureNotNull(replacingMessageId._v), content._v, unknownFields);
  }
  function protoMergeImpl_33(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Quote ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.quotedMessageSha256;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp0_elvis_lhs == null ? _this__u8e3s4.quotedMessageSha256 : tmp0_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_33(_this__u8e3s4, u) {
    var quotedMessageId = {_v: null};
    var quotedMessageSha256 = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_33(quotedMessageId, quotedMessageSha256),
    );
    if (quotedMessageId._v == null) {
      throw Companion_getInstance().missingRequiredField('quoted_message_id');
    }
    return new Quote(ensureNotNull(quotedMessageId._v), quotedMessageSha256._v, unknownFields);
  }
  function protoMergeImpl_34(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof Confirmation_0 ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus(_this__u8e3s4.moreMessageIds, plus_1.moreMessageIds),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_34(_this__u8e3s4, u) {
    var type = {_v: null};
    var firstMessageId = {_v: null};
    var moreMessageIds = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_34(firstMessageId, type, moreMessageIds),
    );
    if (type._v == null) {
      throw Companion_getInstance().missingRequiredField('type');
    }
    if (firstMessageId._v == null) {
      throw Companion_getInstance().missingRequiredField('first_message_id');
    }
    return new Confirmation_0(
      ensureNotNull(type._v),
      ensureNotNull(firstMessageId._v),
      Companion_getInstance_0().fixed(moreMessageIds._v),
      unknownFields,
    );
  }
  function protoMergeImpl_35(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Location_2 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.name;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.name : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.zoom;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.zoom : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.expectsReadConfirmation;
      var tmp_2 = tmp2_elvis_lhs == null ? _this__u8e3s4.expectsReadConfirmation : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus.legalHoldStatus;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp_1,
        tmp_2,
        tmp3_elvis_lhs == null ? _this__u8e3s4.legalHoldStatus : tmp3_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_35(_this__u8e3s4, u) {
    var longitude = {_v: null};
    var latitude = {_v: null};
    var name = {_v: null};
    var zoom = {_v: null};
    var expectsReadConfirmation = {_v: null};
    var legalHoldStatus = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_35(longitude, latitude, name, zoom, expectsReadConfirmation, legalHoldStatus),
    );
    if (longitude._v == null) {
      throw Companion_getInstance().missingRequiredField('longitude');
    }
    if (latitude._v == null) {
      throw Companion_getInstance().missingRequiredField('latitude');
    }
    return new Location_2(
      ensureNotNull(longitude._v),
      ensureNotNull(latitude._v),
      name._v,
      zoom._v,
      expectsReadConfirmation._v,
      legalHoldStatus._v,
      unknownFields,
    );
  }
  function protoMergeImpl_36(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ImageAsset ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.otrKey;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.otrKey : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.macKey;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.macKey : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.mac;
      var tmp_2 = tmp2_elvis_lhs == null ? _this__u8e3s4.mac : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus.sha256;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        VOID,
        VOID,
        VOID,
        VOID,
        VOID,
        tmp_0,
        tmp_1,
        tmp_2,
        tmp3_elvis_lhs == null ? _this__u8e3s4.sha256 : tmp3_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_36(_this__u8e3s4, u) {
    var tag = {_v: null};
    var width = {_v: null};
    var height = {_v: null};
    var originalWidth = {_v: null};
    var originalHeight = {_v: null};
    var mimeType = {_v: null};
    var size = {_v: null};
    var otrKey = {_v: null};
    var macKey = {_v: null};
    var mac = {_v: null};
    var sha256 = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_36(
        tag,
        width,
        height,
        originalWidth,
        originalHeight,
        mimeType,
        size,
        otrKey,
        macKey,
        mac,
        sha256,
      ),
    );
    if (tag._v == null) {
      throw Companion_getInstance().missingRequiredField('tag');
    }
    if (width._v == null) {
      throw Companion_getInstance().missingRequiredField('width');
    }
    if (height._v == null) {
      throw Companion_getInstance().missingRequiredField('height');
    }
    if (originalWidth._v == null) {
      throw Companion_getInstance().missingRequiredField('original_width');
    }
    if (originalHeight._v == null) {
      throw Companion_getInstance().missingRequiredField('original_height');
    }
    if (mimeType._v == null) {
      throw Companion_getInstance().missingRequiredField('mime_type');
    }
    if (size._v == null) {
      throw Companion_getInstance().missingRequiredField('size');
    }
    return new ImageAsset(
      ensureNotNull(tag._v),
      ensureNotNull(width._v),
      ensureNotNull(height._v),
      ensureNotNull(originalWidth._v),
      ensureNotNull(originalHeight._v),
      ensureNotNull(mimeType._v),
      ensureNotNull(size._v),
      otrKey._v,
      macKey._v,
      mac._v,
      sha256._v,
      unknownFields,
    );
  }
  function protoMergeImpl_37(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Asset_2 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.original;
      var tmp1_elvis_lhs = tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.original);
      var tmp_0 = tmp1_elvis_lhs == null ? plus.original : tmp1_elvis_lhs;
      var tmp2_safe_receiver = _this__u8e3s4.preview;
      var tmp3_elvis_lhs = tmp2_safe_receiver == null ? null : tmp2_safe_receiver.plus_fj0q1z_k$(plus.preview);
      var tmp_1 = tmp3_elvis_lhs == null ? plus.preview : tmp3_elvis_lhs;
      var tmp4_elvis_lhs = plus.expectsReadConfirmation;
      var tmp_2 = tmp4_elvis_lhs == null ? _this__u8e3s4.expectsReadConfirmation : tmp4_elvis_lhs;
      var tmp5_elvis_lhs = plus.legalHoldStatus;
      var tmp_3 = tmp5_elvis_lhs == null ? _this__u8e3s4.legalHoldStatus : tmp5_elvis_lhs;
      var tmp_4;
      var tmp_5;
      var tmp_6 = _this__u8e3s4.status;
      if (tmp_6 instanceof Uploaded) {
        var tmp_7 = plus.status;
        tmp_5 = tmp_7 instanceof Uploaded;
      } else {
        tmp_5 = false;
      }
      if (tmp_5) {
        tmp_4 = new Uploaded(
          _this__u8e3s4.status.get_value_j01efc_k$().plus_fj0q1z_k$(plus.status.get_value_j01efc_k$()),
        );
      } else {
        var tmp6_elvis_lhs = plus.status;
        tmp_4 = tmp6_elvis_lhs == null ? _this__u8e3s4.status : tmp6_elvis_lhs;
      }
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp_2,
        tmp_3,
        tmp_4,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_37(_this__u8e3s4, u) {
    var original = {_v: null};
    var preview = {_v: null};
    var expectsReadConfirmation = {_v: null};
    var legalHoldStatus = {_v: null};
    var status = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_37(original, status, preview, expectsReadConfirmation, legalHoldStatus),
    );
    return new Asset_2(
      original._v,
      preview._v,
      expectsReadConfirmation._v,
      legalHoldStatus._v,
      status._v,
      unknownFields,
    );
  }
  function protoMergeImpl_38(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Original ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.name;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.name : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.source;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.source : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.caption;
      var tmp_2 = tmp2_elvis_lhs == null ? _this__u8e3s4.caption : tmp2_elvis_lhs;
      var tmp_3;
      var tmp_4;
      var tmp_5 = _this__u8e3s4.metaData;
      if (tmp_5 instanceof Image_2) {
        var tmp_6 = plus.metaData;
        tmp_4 = tmp_6 instanceof Image_2;
      } else {
        tmp_4 = false;
      }
      if (tmp_4) {
        tmp_3 = new Image_2(
          _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
        );
      } else {
        var tmp_7;
        var tmp_8 = _this__u8e3s4.metaData;
        if (tmp_8 instanceof Video_0) {
          var tmp_9 = plus.metaData;
          tmp_7 = tmp_9 instanceof Video_0;
        } else {
          tmp_7 = false;
        }
        if (tmp_7) {
          tmp_3 = new Video_0(
            _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
          );
        } else {
          var tmp_10;
          var tmp_11 = _this__u8e3s4.metaData;
          if (tmp_11 instanceof Audio_0) {
            var tmp_12 = plus.metaData;
            tmp_10 = tmp_12 instanceof Audio_0;
          } else {
            tmp_10 = false;
          }
          if (tmp_10) {
            tmp_3 = new Audio_0(
              _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
            );
          } else {
            var tmp3_elvis_lhs = plus.metaData;
            tmp_3 = tmp3_elvis_lhs == null ? _this__u8e3s4.metaData : tmp3_elvis_lhs;
          }
        }
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp_1,
        tmp_2,
        tmp_3,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_38(_this__u8e3s4, u) {
    var mimeType = {_v: null};
    var size = {_v: null};
    var name = {_v: null};
    var source = {_v: null};
    var caption = {_v: null};
    var metaData = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_38(mimeType, size, name, metaData, source, caption),
    );
    if (mimeType._v == null) {
      throw Companion_getInstance().missingRequiredField('mime_type');
    }
    if (size._v == null) {
      throw Companion_getInstance().missingRequiredField('size');
    }
    return new Original(
      ensureNotNull(mimeType._v),
      ensureNotNull(size._v),
      name._v,
      source._v,
      caption._v,
      metaData._v,
      unknownFields,
    );
  }
  function protoMergeImpl_39(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Preview_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.remote;
      var tmp1_elvis_lhs = tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.remote);
      var tmp_0 = tmp1_elvis_lhs == null ? plus.remote : tmp1_elvis_lhs;
      var tmp_1;
      var tmp_2;
      var tmp_3 = _this__u8e3s4.metaData;
      if (tmp_3 instanceof Image_3) {
        var tmp_4 = plus.metaData;
        tmp_2 = tmp_4 instanceof Image_3;
      } else {
        tmp_2 = false;
      }
      if (tmp_2) {
        tmp_1 = new Image_3(
          _this__u8e3s4.metaData.get_value_j01efc_k$().plus_fj0q1z_k$(plus.metaData.get_value_j01efc_k$()),
        );
      } else {
        var tmp2_elvis_lhs = plus.metaData;
        tmp_1 = tmp2_elvis_lhs == null ? _this__u8e3s4.metaData : tmp2_elvis_lhs;
      }
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp_1,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_39(_this__u8e3s4, u) {
    var mimeType = {_v: null};
    var size = {_v: null};
    var remote = {_v: null};
    var metaData = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_39(mimeType, size, remote, metaData),
    );
    if (mimeType._v == null) {
      throw Companion_getInstance().missingRequiredField('mime_type');
    }
    if (size._v == null) {
      throw Companion_getInstance().missingRequiredField('size');
    }
    return new Preview_0(ensureNotNull(mimeType._v), ensureNotNull(size._v), remote._v, metaData._v, unknownFields);
  }
  function protoMergeImpl_40(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ImageMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.tag;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp0_elvis_lhs == null ? _this__u8e3s4.tag : tmp0_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_40(_this__u8e3s4, u) {
    var width = {_v: null};
    var height = {_v: null};
    var tag = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_40(width, height, tag));
    if (width._v == null) {
      throw Companion_getInstance().missingRequiredField('width');
    }
    if (height._v == null) {
      throw Companion_getInstance().missingRequiredField('height');
    }
    return new ImageMetaData(ensureNotNull(width._v), ensureNotNull(height._v), tag._v, unknownFields);
  }
  function protoMergeImpl_41(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof VideoMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.width;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.width : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.height;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.height : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.durationInMillis;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp2_elvis_lhs == null ? _this__u8e3s4.durationInMillis : tmp2_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_41(_this__u8e3s4, u) {
    var width = {_v: null};
    var height = {_v: null};
    var durationInMillis = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_41(width, height, durationInMillis),
    );
    return new VideoMetaData(width._v, height._v, durationInMillis._v, unknownFields);
  }
  function protoMergeImpl_42(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof AudioMetaData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.durationInMillis;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.durationInMillis : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.normalizedLoudness;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp1_elvis_lhs == null ? _this__u8e3s4.normalizedLoudness : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_42(_this__u8e3s4, u) {
    var durationInMillis = {_v: null};
    var normalizedLoudness = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_42(durationInMillis, normalizedLoudness),
    );
    return new AudioMetaData(durationInMillis._v, normalizedLoudness._v, unknownFields);
  }
  function protoMergeImpl_43(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof RemoteData ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.assetId;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.assetId : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.assetToken;
      var tmp_1 = tmp1_elvis_lhs == null ? _this__u8e3s4.assetToken : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus.assetDomain;
      var tmp_2 = tmp2_elvis_lhs == null ? _this__u8e3s4.assetDomain : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus.encryption;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        tmp_0,
        tmp_1,
        tmp_2,
        tmp3_elvis_lhs == null ? _this__u8e3s4.encryption : tmp3_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_43(_this__u8e3s4, u) {
    var otrKey = {_v: null};
    var sha256 = {_v: null};
    var assetId = {_v: null};
    var assetToken = {_v: null};
    var assetDomain = {_v: null};
    var encryption = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_43(otrKey, sha256, assetId, assetToken, encryption, assetDomain),
    );
    if (otrKey._v == null) {
      throw Companion_getInstance().missingRequiredField('otr_key');
    }
    if (sha256._v == null) {
      throw Companion_getInstance().missingRequiredField('sha256');
    }
    return new RemoteData(
      ensureNotNull(otrKey._v),
      ensureNotNull(sha256._v),
      assetId._v,
      assetToken._v,
      assetDomain._v,
      encryption._v,
      unknownFields,
    );
  }
  function protoMergeImpl_44(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof External_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.sha256;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.sha256 : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.encryption;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp_0,
        tmp1_elvis_lhs == null ? _this__u8e3s4.encryption : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_44(_this__u8e3s4, u) {
    var otrKey = {_v: null};
    var sha256 = {_v: null};
    var encryption = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_44(otrKey, sha256, encryption));
    if (otrKey._v == null) {
      throw Companion_getInstance().missingRequiredField('otr_key');
    }
    return new External_0(ensureNotNull(otrKey._v), sha256._v, encryption._v, unknownFields);
  }
  function protoMergeImpl_45(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Reaction_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.emoji;
      var tmp_0 = tmp0_elvis_lhs == null ? _this__u8e3s4.emoji : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus.legalHoldStatus;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        VOID,
        tmp1_elvis_lhs == null ? _this__u8e3s4.legalHoldStatus : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_45(_this__u8e3s4, u) {
    var emoji = {_v: null};
    var messageId = {_v: null};
    var legalHoldStatus = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_45(emoji, messageId, legalHoldStatus),
    );
    if (messageId._v == null) {
      throw Companion_getInstance().missingRequiredField('message_id');
    }
    return new Reaction_0(emoji._v, ensureNotNull(messageId._v), legalHoldStatus._v, unknownFields);
  }
  function protoMergeImpl_46(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof Calling_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.qualifiedConversationId;
      var tmp1_elvis_lhs =
        tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.qualifiedConversationId);
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp1_elvis_lhs == null ? plus.qualifiedConversationId : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_46(_this__u8e3s4, u) {
    var content = {_v: null};
    var qualifiedConversationId = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_46(content, qualifiedConversationId),
    );
    if (content._v == null) {
      throw Companion_getInstance().missingRequiredField('content');
    }
    return new Calling_0(ensureNotNull(content._v), qualifiedConversationId._v, unknownFields);
  }
  function protoMergeImpl_47(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof DataTransfer_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      var tmp0_safe_receiver_0 = _this__u8e3s4.trackingIdentifier;
      var tmp1_elvis_lhs =
        tmp0_safe_receiver_0 == null ? null : tmp0_safe_receiver_0.plus_fj0q1z_k$(plus.trackingIdentifier);
      tmp = tmp0_safe_receiver.copy(
        tmp1_elvis_lhs == null ? plus.trackingIdentifier : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_47(_this__u8e3s4, u) {
    var trackingIdentifier = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_47(trackingIdentifier));
    return new DataTransfer_0(trackingIdentifier._v, unknownFields);
  }
  function protoMergeImpl_48(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof TrackingIdentifier ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.messages.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(VOID, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_48(_this__u8e3s4, u) {
    var identifier = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_48(identifier));
    if (identifier._v == null) {
      throw Companion_getInstance().missingRequiredField('identifier');
    }
    return new TrackingIdentifier(ensureNotNull(identifier._v), unknownFields);
  }
  function decodeWithImpl$lambda_12($messageId, $content, $unknownStrategy) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $messageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $content._v = new Text_0(_fieldValue instanceof Text_3 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 3:
          $content._v = new Image_0(_fieldValue instanceof ImageAsset ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 4:
          $content._v = new Knock(_fieldValue instanceof Knock_1 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 6:
          $content._v = new LastRead(_fieldValue instanceof LastRead_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 7:
          $content._v = new Cleared(_fieldValue instanceof Cleared_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 8:
          $content._v = new External(_fieldValue instanceof External_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 9:
          $content._v = new ClientAction_0(_fieldValue instanceof ClientAction ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 10:
          $content._v = new Calling(_fieldValue instanceof Calling_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 11:
          $content._v = new Asset_0(_fieldValue instanceof Asset_2 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 12:
          $content._v = new Hidden(_fieldValue instanceof MessageHide ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 13:
          $content._v = new Location_0(_fieldValue instanceof Location_2 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 14:
          $content._v = new Deleted(_fieldValue instanceof MessageDelete ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 15:
          $content._v = new Edited(_fieldValue instanceof MessageEdit ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 16:
          $content._v = new Confirmation(_fieldValue instanceof Confirmation_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 17:
          $content._v = new Reaction(_fieldValue instanceof Reaction_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 18:
          $content._v = new Ephemeral(_fieldValue instanceof Ephemeral_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 19:
          $content._v = new Availability(_fieldValue instanceof Availability_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 20:
          $content._v = new Composite(_fieldValue instanceof Composite_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 21:
          $content._v = new ButtonAction(_fieldValue instanceof ButtonAction_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 22:
          $content._v = new ButtonActionConfirmation(
            _fieldValue instanceof ButtonActionConfirmation_0 ? _fieldValue : THROW_CCE(),
          );
          tmp = Unit_getInstance();
          break;
        case 23:
          $content._v = new DataTransfer(_fieldValue instanceof DataTransfer_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 24:
          $unknownStrategy._v = _fieldValue instanceof UnknownStrategy ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_13($id, $domain) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $id._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $domain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_14($id, $domain) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $id._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $domain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_15($items, $expectsReadConfirmation, $legalHoldStatus) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $items._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.messages.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $items._v = this_0;
          tmp = Unit_getInstance();
          break;
        case 2:
          $expectsReadConfirmation._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $legalHoldStatus._v = _fieldValue instanceof LegalHoldStatus ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_16($content) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $content._v = new Text_1(_fieldValue instanceof Text_3 ? _fieldValue : THROW_CCE());
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $content._v = new Button(_fieldValue instanceof Button_0 ? _fieldValue : THROW_CCE());
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_17($text, $id) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $text._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $id._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_18($buttonId, $referenceMessageId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $buttonId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $referenceMessageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_19($referenceMessageId, $buttonId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $referenceMessageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $buttonId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_20($type) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $type._v = _fieldValue instanceof Type ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_21($expireAfterMillis, $content) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $expireAfterMillis._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $content._v = new Text_2(_fieldValue instanceof Text_3 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 3:
          $content._v = new Image_1(_fieldValue instanceof ImageAsset ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 4:
          $content._v = new Knock_0(_fieldValue instanceof Knock_1 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 5:
          $content._v = new Asset_1(_fieldValue instanceof Asset_2 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 6:
          $content._v = new Location_1(_fieldValue instanceof Location_2 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_22(
    $content,
    $linkPreview,
    $mentions,
    $quote,
    $expectsReadConfirmation,
    $legalHoldStatus,
  ) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $content._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $linkPreview._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.messages.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $linkPreview._v = this_0;
          tmp = Unit_getInstance();
          break;
        case 4:
          // Inline function 'kotlin.apply' call

          var tmp2_elvis_lhs = $mentions._v;
          var this_1 = tmp2_elvis_lhs == null ? init() : tmp2_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.messages.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements_0 = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_1, elements_0);
          $mentions._v = this_1;
          tmp = Unit_getInstance();
          break;
        case 5:
          $quote._v = _fieldValue instanceof Quote ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $expectsReadConfirmation._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $legalHoldStatus._v = _fieldValue instanceof LegalHoldStatus ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_23($hotKnock, $expectsReadConfirmation, $legalHoldStatus) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $hotKnock._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $expectsReadConfirmation._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $legalHoldStatus._v = _fieldValue instanceof LegalHoldStatus ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_24($url, $urlOffset, $preview, $permanentUrl, $title, $summary, $image, $metaData) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $url._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $urlOffset._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $preview._v = new Article(_fieldValue instanceof Article_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 5:
          $permanentUrl._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $title._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $summary._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 8:
          $image._v = _fieldValue instanceof Asset_2 ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 9:
          $metaData._v = new Tweet(_fieldValue instanceof Tweet_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_25($author, $username) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $author._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $username._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_26($permanentUrl, $title, $summary, $image) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $permanentUrl._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $title._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $summary._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $image._v = _fieldValue instanceof Asset_2 ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_27($start, $length, $mentionType, $qualifiedUserId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $start._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $length._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $mentionType._v = new UserId(typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 4:
          $qualifiedUserId._v = _fieldValue instanceof QualifiedUserId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_28($conversationId, $lastReadTimestamp, $qualifiedConversationId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $conversationId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $lastReadTimestamp._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $qualifiedConversationId._v = _fieldValue instanceof QualifiedConversationId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_29($conversationId, $clearedTimestamp, $qualifiedConversationId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $conversationId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $clearedTimestamp._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $qualifiedConversationId._v = _fieldValue instanceof QualifiedConversationId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_30($conversationId, $messageId, $qualifiedConversationId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $conversationId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $messageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $qualifiedConversationId._v = _fieldValue instanceof QualifiedConversationId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_31($messageId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $messageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_32($replacingMessageId, $content) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $replacingMessageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $content._v = new Text_4(_fieldValue instanceof Text_3 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 3:
          $content._v = new Composite_1(_fieldValue instanceof Composite_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_33($quotedMessageId, $quotedMessageSha256) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $quotedMessageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $quotedMessageSha256._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_34($firstMessageId, $type, $moreMessageIds) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $firstMessageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $type._v = _fieldValue instanceof Type_0 ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $moreMessageIds._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.messages.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $moreMessageIds._v = this_0;
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_35($longitude, $latitude, $name, $zoom, $expectsReadConfirmation, $legalHoldStatus) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $longitude._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $latitude._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $zoom._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $expectsReadConfirmation._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $legalHoldStatus._v = _fieldValue instanceof LegalHoldStatus ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_36(
    $tag,
    $width,
    $height,
    $originalWidth,
    $originalHeight,
    $mimeType,
    $size,
    $otrKey,
    $macKey,
    $mac,
    $sha256,
  ) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $tag._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $width._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $height._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $originalWidth._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $originalHeight._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $mimeType._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $size._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 8:
          $otrKey._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 9:
          $macKey._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 10:
          $mac._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 11:
          $sha256._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_37($original, $status, $preview, $expectsReadConfirmation, $legalHoldStatus) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $original._v = _fieldValue instanceof Original ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $status._v = new NotUploaded(_fieldValue instanceof NotUploaded_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 4:
          $status._v = new Uploaded(_fieldValue instanceof RemoteData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 5:
          $preview._v = _fieldValue instanceof Preview_0 ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $expectsReadConfirmation._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $legalHoldStatus._v = _fieldValue instanceof LegalHoldStatus ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_38($mimeType, $size, $name, $metaData, $source, $caption) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $mimeType._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $size._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $name._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $metaData._v = new Image_2(_fieldValue instanceof ImageMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 5:
          $metaData._v = new Video_0(_fieldValue instanceof VideoMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 6:
          $metaData._v = new Audio_0(_fieldValue instanceof AudioMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 7:
          $source._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 8:
          $caption._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_39($mimeType, $size, $remote, $metaData) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $mimeType._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $size._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $remote._v = _fieldValue instanceof RemoteData ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $metaData._v = new Image_3(_fieldValue instanceof ImageMetaData ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_40($width, $height, $tag) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $width._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $height._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $tag._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_41($width, $height, $durationInMillis) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $width._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $height._v = typeof _fieldValue === 'number' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $durationInMillis._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_42($durationInMillis, $normalizedLoudness) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $durationInMillis._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 3) {
        $normalizedLoudness._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_43($otrKey, $sha256, $assetId, $assetToken, $encryption, $assetDomain) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $otrKey._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $sha256._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $assetId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $assetToken._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $encryption._v = _fieldValue instanceof EncryptionAlgorithm ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $assetDomain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_44($otrKey, $sha256, $encryption) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $otrKey._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $sha256._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $encryption._v = _fieldValue instanceof EncryptionAlgorithm ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_45($emoji, $messageId, $legalHoldStatus) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $emoji._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $messageId._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $legalHoldStatus._v = _fieldValue instanceof LegalHoldStatus ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_46($content, $qualifiedConversationId) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $content._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $qualifiedConversationId._v = _fieldValue instanceof QualifiedConversationId ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_47($trackingIdentifier) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $trackingIdentifier._v = _fieldValue instanceof TrackingIdentifier ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_48($identifier) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $identifier._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function values$factory_0() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function values$factory_1() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function values$factory_2() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function values$factory_3() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory_12() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_51($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function messageId$factory() {
    return getPropertyCallableRef(
      'messageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.messageId;
      },
      null,
    );
  }
  function descriptor$factory_52($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory_0() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function descriptor$factory_53($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory_0() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function descriptor$factory_54($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function knock$factory() {
    return getPropertyCallableRef(
      'knock',
      1,
      KProperty1,
      function (receiver) {
        return receiver.knock;
      },
      null,
    );
  }
  function descriptor$factory_55($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function lastRead$factory() {
    return getPropertyCallableRef(
      'lastRead',
      1,
      KProperty1,
      function (receiver) {
        return receiver.lastRead;
      },
      null,
    );
  }
  function descriptor$factory_56($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function cleared$factory() {
    return getPropertyCallableRef(
      'cleared',
      1,
      KProperty1,
      function (receiver) {
        return receiver.cleared;
      },
      null,
    );
  }
  function descriptor$factory_57($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function external$factory() {
    return getPropertyCallableRef(
      'external',
      1,
      KProperty1,
      function (receiver) {
        return receiver.external;
      },
      null,
    );
  }
  function descriptor$factory_58($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function clientAction$factory() {
    return getPropertyCallableRef(
      'clientAction',
      1,
      KProperty1,
      function (receiver) {
        return receiver.clientAction;
      },
      null,
    );
  }
  function descriptor$factory_59($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function calling$factory() {
    return getPropertyCallableRef(
      'calling',
      1,
      KProperty1,
      function (receiver) {
        return receiver.calling;
      },
      null,
    );
  }
  function descriptor$factory_60($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function asset$factory_0() {
    return getPropertyCallableRef(
      'asset',
      1,
      KProperty1,
      function (receiver) {
        return receiver.asset;
      },
      null,
    );
  }
  function descriptor$factory_61($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function hidden$factory() {
    return getPropertyCallableRef(
      'hidden',
      1,
      KProperty1,
      function (receiver) {
        return receiver.hidden;
      },
      null,
    );
  }
  function descriptor$factory_62($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function location$factory_0() {
    return getPropertyCallableRef(
      'location',
      1,
      KProperty1,
      function (receiver) {
        return receiver.location;
      },
      null,
    );
  }
  function descriptor$factory_63($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function deleted$factory() {
    return getPropertyCallableRef(
      'deleted',
      1,
      KProperty1,
      function (receiver) {
        return receiver.deleted;
      },
      null,
    );
  }
  function descriptor$factory_64($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function edited$factory() {
    return getPropertyCallableRef(
      'edited',
      1,
      KProperty1,
      function (receiver) {
        return receiver.edited;
      },
      null,
    );
  }
  function descriptor$factory_65($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function confirmation$factory() {
    return getPropertyCallableRef(
      'confirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.confirmation;
      },
      null,
    );
  }
  function descriptor$factory_66($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function reaction$factory() {
    return getPropertyCallableRef(
      'reaction',
      1,
      KProperty1,
      function (receiver) {
        return receiver.reaction;
      },
      null,
    );
  }
  function descriptor$factory_67($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function ephemeral$factory() {
    return getPropertyCallableRef(
      'ephemeral',
      1,
      KProperty1,
      function (receiver) {
        return receiver.ephemeral;
      },
      null,
    );
  }
  function descriptor$factory_68($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function availability$factory() {
    return getPropertyCallableRef(
      'availability',
      1,
      KProperty1,
      function (receiver) {
        return receiver.availability;
      },
      null,
    );
  }
  function descriptor$factory_69($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function composite$factory() {
    return getPropertyCallableRef(
      'composite',
      1,
      KProperty1,
      function (receiver) {
        return receiver.composite;
      },
      null,
    );
  }
  function descriptor$factory_70($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function buttonAction$factory() {
    return getPropertyCallableRef(
      'buttonAction',
      1,
      KProperty1,
      function (receiver) {
        return receiver.buttonAction;
      },
      null,
    );
  }
  function descriptor$factory_71($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function buttonActionConfirmation$factory() {
    return getPropertyCallableRef(
      'buttonActionConfirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.buttonActionConfirmation;
      },
      null,
    );
  }
  function descriptor$factory_72($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function dataTransfer$factory() {
    return getPropertyCallableRef(
      'dataTransfer',
      1,
      KProperty1,
      function (receiver) {
        return receiver.dataTransfer;
      },
      null,
    );
  }
  function descriptor$factory_73($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function unknownStrategy$factory() {
    return getPropertyCallableRef(
      'unknownStrategy',
      1,
      KProperty1,
      function (receiver) {
        return receiver.unknownStrategy;
      },
      null,
    );
  }
  function protoSize$factory_13() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_74($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory_2() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function descriptor$factory_75($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function domain$factory_0() {
    return getPropertyCallableRef(
      'domain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.domain;
      },
      null,
    );
  }
  function protoSize$factory_14() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_76($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory_3() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function descriptor$factory_77($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function domain$factory_1() {
    return getPropertyCallableRef(
      'domain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.domain;
      },
      null,
    );
  }
  function protoSize$factory_15() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_78($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function items$factory() {
    return getPropertyCallableRef(
      'items',
      1,
      KProperty1,
      function (receiver) {
        return receiver.items;
      },
      null,
    );
  }
  function descriptor$factory_79($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function expectsReadConfirmation$factory() {
    return getPropertyCallableRef(
      'expectsReadConfirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.expectsReadConfirmation;
      },
      null,
    );
  }
  function descriptor$factory_80($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function legalHoldStatus$factory() {
    return getPropertyCallableRef(
      'legalHoldStatus',
      1,
      KProperty1,
      function (receiver) {
        return receiver.legalHoldStatus;
      },
      null,
    );
  }
  function defaultInstance$factory_2() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_16() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_81($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory_1() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function descriptor$factory_82($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function button$factory() {
    return getPropertyCallableRef(
      'button',
      1,
      KProperty1,
      function (receiver) {
        return receiver.button;
      },
      null,
    );
  }
  function defaultInstance$factory_3() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_17() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_83($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory_2() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function descriptor$factory_84($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory_4() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function protoSize$factory_18() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_85($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function buttonId$factory() {
    return getPropertyCallableRef(
      'buttonId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.buttonId;
      },
      null,
    );
  }
  function descriptor$factory_86($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function referenceMessageId$factory() {
    return getPropertyCallableRef(
      'referenceMessageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.referenceMessageId;
      },
      null,
    );
  }
  function protoSize$factory_19() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_87($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function referenceMessageId$factory_0() {
    return getPropertyCallableRef(
      'referenceMessageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.referenceMessageId;
      },
      null,
    );
  }
  function descriptor$factory_88($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function buttonId$factory_0() {
    return getPropertyCallableRef(
      'buttonId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.buttonId;
      },
      null,
    );
  }
  function protoSize$factory_20() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_89($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function type$factory() {
    return getPropertyCallableRef(
      'type',
      1,
      KProperty1,
      function (receiver) {
        return receiver.type;
      },
      null,
    );
  }
  function values$factory_4() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory_21() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_90($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function expireAfterMillis$factory() {
    return getPropertyCallableRef(
      'expireAfterMillis',
      1,
      KProperty1,
      function (receiver) {
        return receiver.expireAfterMillis;
      },
      null,
    );
  }
  function descriptor$factory_91($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory_3() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function descriptor$factory_92($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory_1() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function descriptor$factory_93($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function knock$factory_0() {
    return getPropertyCallableRef(
      'knock',
      1,
      KProperty1,
      function (receiver) {
        return receiver.knock;
      },
      null,
    );
  }
  function descriptor$factory_94($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function asset$factory_1() {
    return getPropertyCallableRef(
      'asset',
      1,
      KProperty1,
      function (receiver) {
        return receiver.asset;
      },
      null,
    );
  }
  function descriptor$factory_95($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function location$factory_1() {
    return getPropertyCallableRef(
      'location',
      1,
      KProperty1,
      function (receiver) {
        return receiver.location;
      },
      null,
    );
  }
  function protoSize$factory_22() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_96($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function content$factory_0() {
    return getPropertyCallableRef(
      'content',
      1,
      KProperty1,
      function (receiver) {
        return receiver.content;
      },
      null,
    );
  }
  function descriptor$factory_97($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function linkPreview$factory() {
    return getPropertyCallableRef(
      'linkPreview',
      1,
      KProperty1,
      function (receiver) {
        return receiver.linkPreview;
      },
      null,
    );
  }
  function descriptor$factory_98($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function mentions$factory() {
    return getPropertyCallableRef(
      'mentions',
      1,
      KProperty1,
      function (receiver) {
        return receiver.mentions;
      },
      null,
    );
  }
  function descriptor$factory_99($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function quote$factory() {
    return getPropertyCallableRef(
      'quote',
      1,
      KProperty1,
      function (receiver) {
        return receiver.quote;
      },
      null,
    );
  }
  function descriptor$factory_100($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function expectsReadConfirmation$factory_0() {
    return getPropertyCallableRef(
      'expectsReadConfirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.expectsReadConfirmation;
      },
      null,
    );
  }
  function descriptor$factory_101($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function legalHoldStatus$factory_0() {
    return getPropertyCallableRef(
      'legalHoldStatus',
      1,
      KProperty1,
      function (receiver) {
        return receiver.legalHoldStatus;
      },
      null,
    );
  }
  function protoSize$factory_23() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_102($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function hotKnock$factory() {
    return getPropertyCallableRef(
      'hotKnock',
      1,
      KProperty1,
      function (receiver) {
        return receiver.hotKnock;
      },
      null,
    );
  }
  function descriptor$factory_103($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function expectsReadConfirmation$factory_1() {
    return getPropertyCallableRef(
      'expectsReadConfirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.expectsReadConfirmation;
      },
      null,
    );
  }
  function descriptor$factory_104($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function legalHoldStatus$factory_1() {
    return getPropertyCallableRef(
      'legalHoldStatus',
      1,
      KProperty1,
      function (receiver) {
        return receiver.legalHoldStatus;
      },
      null,
    );
  }
  function protoSize$factory_24() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_105($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function url$factory() {
    return getPropertyCallableRef(
      'url',
      1,
      KProperty1,
      function (receiver) {
        return receiver.url;
      },
      null,
    );
  }
  function descriptor$factory_106($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function urlOffset$factory() {
    return getPropertyCallableRef(
      'urlOffset',
      1,
      KProperty1,
      function (receiver) {
        return receiver.urlOffset;
      },
      null,
    );
  }
  function descriptor$factory_107($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function article$factory() {
    return getPropertyCallableRef(
      'article',
      1,
      KProperty1,
      function (receiver) {
        return receiver.article;
      },
      null,
    );
  }
  function descriptor$factory_108($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function permanentUrl$factory() {
    return getPropertyCallableRef(
      'permanentUrl',
      1,
      KProperty1,
      function (receiver) {
        return receiver.permanentUrl;
      },
      null,
    );
  }
  function descriptor$factory_109($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function title$factory() {
    return getPropertyCallableRef(
      'title',
      1,
      KProperty1,
      function (receiver) {
        return receiver.title;
      },
      null,
    );
  }
  function descriptor$factory_110($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function summary$factory() {
    return getPropertyCallableRef(
      'summary',
      1,
      KProperty1,
      function (receiver) {
        return receiver.summary;
      },
      null,
    );
  }
  function descriptor$factory_111($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory_2() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function descriptor$factory_112($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function tweet$factory() {
    return getPropertyCallableRef(
      'tweet',
      1,
      KProperty1,
      function (receiver) {
        return receiver.tweet;
      },
      null,
    );
  }
  function protoSize$factory_25() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_113($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function author$factory() {
    return getPropertyCallableRef(
      'author',
      1,
      KProperty1,
      function (receiver) {
        return receiver.author;
      },
      null,
    );
  }
  function descriptor$factory_114($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function username$factory() {
    return getPropertyCallableRef(
      'username',
      1,
      KProperty1,
      function (receiver) {
        return receiver.username;
      },
      null,
    );
  }
  function defaultInstance$factory_4() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_26() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_115($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function permanentUrl$factory_0() {
    return getPropertyCallableRef(
      'permanentUrl',
      1,
      KProperty1,
      function (receiver) {
        return receiver.permanentUrl;
      },
      null,
    );
  }
  function descriptor$factory_116($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function title$factory_0() {
    return getPropertyCallableRef(
      'title',
      1,
      KProperty1,
      function (receiver) {
        return receiver.title;
      },
      null,
    );
  }
  function descriptor$factory_117($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function summary$factory_0() {
    return getPropertyCallableRef(
      'summary',
      1,
      KProperty1,
      function (receiver) {
        return receiver.summary;
      },
      null,
    );
  }
  function descriptor$factory_118($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory_3() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function protoSize$factory_27() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_119($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function start$factory() {
    return getPropertyCallableRef(
      'start',
      1,
      KProperty1,
      function (receiver) {
        return receiver.start;
      },
      null,
    );
  }
  function descriptor$factory_120($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function length$factory() {
    return getPropertyCallableRef(
      'length',
      1,
      KProperty1,
      function (receiver) {
        return receiver.length;
      },
      null,
    );
  }
  function descriptor$factory_121($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function userId$factory_0() {
    return getPropertyCallableRef(
      'userId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.userId;
      },
      null,
    );
  }
  function descriptor$factory_122($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function qualifiedUserId$factory() {
    return getPropertyCallableRef(
      'qualifiedUserId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.qualifiedUserId;
      },
      null,
    );
  }
  function protoSize$factory_28() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_123($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function conversationId$factory_0() {
    return getPropertyCallableRef(
      'conversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.conversationId;
      },
      null,
    );
  }
  function descriptor$factory_124($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function lastReadTimestamp$factory() {
    return getPropertyCallableRef(
      'lastReadTimestamp',
      1,
      KProperty1,
      function (receiver) {
        return receiver.lastReadTimestamp;
      },
      null,
    );
  }
  function descriptor$factory_125($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function qualifiedConversationId$factory() {
    return getPropertyCallableRef(
      'qualifiedConversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.qualifiedConversationId;
      },
      null,
    );
  }
  function protoSize$factory_29() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_126($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function conversationId$factory_1() {
    return getPropertyCallableRef(
      'conversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.conversationId;
      },
      null,
    );
  }
  function descriptor$factory_127($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function clearedTimestamp$factory() {
    return getPropertyCallableRef(
      'clearedTimestamp',
      1,
      KProperty1,
      function (receiver) {
        return receiver.clearedTimestamp;
      },
      null,
    );
  }
  function descriptor$factory_128($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function qualifiedConversationId$factory_0() {
    return getPropertyCallableRef(
      'qualifiedConversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.qualifiedConversationId;
      },
      null,
    );
  }
  function protoSize$factory_30() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_129($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function conversationId$factory_2() {
    return getPropertyCallableRef(
      'conversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.conversationId;
      },
      null,
    );
  }
  function descriptor$factory_130($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function messageId$factory_0() {
    return getPropertyCallableRef(
      'messageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.messageId;
      },
      null,
    );
  }
  function descriptor$factory_131($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function qualifiedConversationId$factory_1() {
    return getPropertyCallableRef(
      'qualifiedConversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.qualifiedConversationId;
      },
      null,
    );
  }
  function protoSize$factory_31() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_132($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function messageId$factory_1() {
    return getPropertyCallableRef(
      'messageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.messageId;
      },
      null,
    );
  }
  function protoSize$factory_32() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_133($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function replacingMessageId$factory() {
    return getPropertyCallableRef(
      'replacingMessageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.replacingMessageId;
      },
      null,
    );
  }
  function descriptor$factory_134($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory_4() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function descriptor$factory_135($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function composite$factory_0() {
    return getPropertyCallableRef(
      'composite',
      1,
      KProperty1,
      function (receiver) {
        return receiver.composite;
      },
      null,
    );
  }
  function protoSize$factory_33() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_136($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function quotedMessageId$factory() {
    return getPropertyCallableRef(
      'quotedMessageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.quotedMessageId;
      },
      null,
    );
  }
  function descriptor$factory_137($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function quotedMessageSha256$factory() {
    return getPropertyCallableRef(
      'quotedMessageSha256',
      1,
      KProperty1,
      function (receiver) {
        return receiver.quotedMessageSha256;
      },
      null,
    );
  }
  function protoSize$factory_34() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_138($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function firstMessageId$factory() {
    return getPropertyCallableRef(
      'firstMessageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.firstMessageId;
      },
      null,
    );
  }
  function descriptor$factory_139($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function type$factory_0() {
    return getPropertyCallableRef(
      'type',
      1,
      KProperty1,
      function (receiver) {
        return receiver.type;
      },
      null,
    );
  }
  function descriptor$factory_140($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function moreMessageIds$factory() {
    return getPropertyCallableRef(
      'moreMessageIds',
      1,
      KProperty1,
      function (receiver) {
        return receiver.moreMessageIds;
      },
      null,
    );
  }
  function values$factory_5() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory_35() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_141($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function longitude$factory_0() {
    return getPropertyCallableRef(
      'longitude',
      1,
      KProperty1,
      function (receiver) {
        return receiver.longitude;
      },
      null,
    );
  }
  function descriptor$factory_142($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function latitude$factory_0() {
    return getPropertyCallableRef(
      'latitude',
      1,
      KProperty1,
      function (receiver) {
        return receiver.latitude;
      },
      null,
    );
  }
  function descriptor$factory_143($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory_4() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function descriptor$factory_144($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function zoom$factory_0() {
    return getPropertyCallableRef(
      'zoom',
      1,
      KProperty1,
      function (receiver) {
        return receiver.zoom;
      },
      null,
    );
  }
  function descriptor$factory_145($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function expectsReadConfirmation$factory_2() {
    return getPropertyCallableRef(
      'expectsReadConfirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.expectsReadConfirmation;
      },
      null,
    );
  }
  function descriptor$factory_146($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function legalHoldStatus$factory_2() {
    return getPropertyCallableRef(
      'legalHoldStatus',
      1,
      KProperty1,
      function (receiver) {
        return receiver.legalHoldStatus;
      },
      null,
    );
  }
  function protoSize$factory_36() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_147($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function tag$factory_0() {
    return getPropertyCallableRef(
      'tag',
      1,
      KProperty1,
      function (receiver) {
        return receiver.tag;
      },
      null,
    );
  }
  function descriptor$factory_148($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function width$factory_1() {
    return getPropertyCallableRef(
      'width',
      1,
      KProperty1,
      function (receiver) {
        return receiver.width;
      },
      null,
    );
  }
  function descriptor$factory_149($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function height$factory_1() {
    return getPropertyCallableRef(
      'height',
      1,
      KProperty1,
      function (receiver) {
        return receiver.height;
      },
      null,
    );
  }
  function descriptor$factory_150($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function originalWidth$factory() {
    return getPropertyCallableRef(
      'originalWidth',
      1,
      KProperty1,
      function (receiver) {
        return receiver.originalWidth;
      },
      null,
    );
  }
  function descriptor$factory_151($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function originalHeight$factory() {
    return getPropertyCallableRef(
      'originalHeight',
      1,
      KProperty1,
      function (receiver) {
        return receiver.originalHeight;
      },
      null,
    );
  }
  function descriptor$factory_152($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function mimeType$factory() {
    return getPropertyCallableRef(
      'mimeType',
      1,
      KProperty1,
      function (receiver) {
        return receiver.mimeType;
      },
      null,
    );
  }
  function descriptor$factory_153($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function size$factory_0() {
    return getPropertyCallableRef(
      'size',
      1,
      KProperty1,
      function (receiver) {
        return receiver.size;
      },
      null,
    );
  }
  function descriptor$factory_154($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function otrKey$factory_0() {
    return getPropertyCallableRef(
      'otrKey',
      1,
      KProperty1,
      function (receiver) {
        return receiver.otrKey;
      },
      null,
    );
  }
  function descriptor$factory_155($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function macKey$factory() {
    return getPropertyCallableRef(
      'macKey',
      1,
      KProperty1,
      function (receiver) {
        return receiver.macKey;
      },
      null,
    );
  }
  function descriptor$factory_156($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function mac$factory() {
    return getPropertyCallableRef(
      'mac',
      1,
      KProperty1,
      function (receiver) {
        return receiver.mac;
      },
      null,
    );
  }
  function descriptor$factory_157($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sha256$factory_0() {
    return getPropertyCallableRef(
      'sha256',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sha256;
      },
      null,
    );
  }
  function protoSize$factory_37() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_158($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function original$factory() {
    return getPropertyCallableRef(
      'original',
      1,
      KProperty1,
      function (receiver) {
        return receiver.original;
      },
      null,
    );
  }
  function descriptor$factory_159($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function notUploaded$factory() {
    return getPropertyCallableRef(
      'notUploaded',
      1,
      KProperty1,
      function (receiver) {
        return receiver.notUploaded;
      },
      null,
    );
  }
  function descriptor$factory_160($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function uploaded$factory() {
    return getPropertyCallableRef(
      'uploaded',
      1,
      KProperty1,
      function (receiver) {
        return receiver.uploaded;
      },
      null,
    );
  }
  function descriptor$factory_161($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function preview$factory() {
    return getPropertyCallableRef(
      'preview',
      1,
      KProperty1,
      function (receiver) {
        return receiver.preview;
      },
      null,
    );
  }
  function descriptor$factory_162($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function expectsReadConfirmation$factory_3() {
    return getPropertyCallableRef(
      'expectsReadConfirmation',
      1,
      KProperty1,
      function (receiver) {
        return receiver.expectsReadConfirmation;
      },
      null,
    );
  }
  function descriptor$factory_163($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function legalHoldStatus$factory_3() {
    return getPropertyCallableRef(
      'legalHoldStatus',
      1,
      KProperty1,
      function (receiver) {
        return receiver.legalHoldStatus;
      },
      null,
    );
  }
  function defaultInstance$factory_5() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function values$factory_6() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory_38() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_164($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function mimeType$factory_0() {
    return getPropertyCallableRef(
      'mimeType',
      1,
      KProperty1,
      function (receiver) {
        return receiver.mimeType;
      },
      null,
    );
  }
  function descriptor$factory_165($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function size$factory_1() {
    return getPropertyCallableRef(
      'size',
      1,
      KProperty1,
      function (receiver) {
        return receiver.size;
      },
      null,
    );
  }
  function descriptor$factory_166($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function name$factory_5() {
    return getPropertyCallableRef(
      'name',
      1,
      KProperty1,
      function (receiver) {
        return receiver.name;
      },
      null,
    );
  }
  function descriptor$factory_167($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory_4() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function descriptor$factory_168($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function video$factory_0() {
    return getPropertyCallableRef(
      'video',
      1,
      KProperty1,
      function (receiver) {
        return receiver.video;
      },
      null,
    );
  }
  function descriptor$factory_169($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function audio$factory_0() {
    return getPropertyCallableRef(
      'audio',
      1,
      KProperty1,
      function (receiver) {
        return receiver.audio;
      },
      null,
    );
  }
  function descriptor$factory_170($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function source$factory() {
    return getPropertyCallableRef(
      'source',
      1,
      KProperty1,
      function (receiver) {
        return receiver.source;
      },
      null,
    );
  }
  function descriptor$factory_171($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function caption$factory() {
    return getPropertyCallableRef(
      'caption',
      1,
      KProperty1,
      function (receiver) {
        return receiver.caption;
      },
      null,
    );
  }
  function protoSize$factory_39() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_172($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function mimeType$factory_1() {
    return getPropertyCallableRef(
      'mimeType',
      1,
      KProperty1,
      function (receiver) {
        return receiver.mimeType;
      },
      null,
    );
  }
  function descriptor$factory_173($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function size$factory_2() {
    return getPropertyCallableRef(
      'size',
      1,
      KProperty1,
      function (receiver) {
        return receiver.size;
      },
      null,
    );
  }
  function descriptor$factory_174($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function remote$factory() {
    return getPropertyCallableRef(
      'remote',
      1,
      KProperty1,
      function (receiver) {
        return receiver.remote;
      },
      null,
    );
  }
  function descriptor$factory_175($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function image$factory_5() {
    return getPropertyCallableRef(
      'image',
      1,
      KProperty1,
      function (receiver) {
        return receiver.image;
      },
      null,
    );
  }
  function protoSize$factory_40() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_176($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function width$factory_2() {
    return getPropertyCallableRef(
      'width',
      1,
      KProperty1,
      function (receiver) {
        return receiver.width;
      },
      null,
    );
  }
  function descriptor$factory_177($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function height$factory_2() {
    return getPropertyCallableRef(
      'height',
      1,
      KProperty1,
      function (receiver) {
        return receiver.height;
      },
      null,
    );
  }
  function descriptor$factory_178($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function tag$factory_1() {
    return getPropertyCallableRef(
      'tag',
      1,
      KProperty1,
      function (receiver) {
        return receiver.tag;
      },
      null,
    );
  }
  function protoSize$factory_41() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_179($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function width$factory_3() {
    return getPropertyCallableRef(
      'width',
      1,
      KProperty1,
      function (receiver) {
        return receiver.width;
      },
      null,
    );
  }
  function descriptor$factory_180($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function height$factory_3() {
    return getPropertyCallableRef(
      'height',
      1,
      KProperty1,
      function (receiver) {
        return receiver.height;
      },
      null,
    );
  }
  function descriptor$factory_181($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function durationInMillis$factory_1() {
    return getPropertyCallableRef(
      'durationInMillis',
      1,
      KProperty1,
      function (receiver) {
        return receiver.durationInMillis;
      },
      null,
    );
  }
  function defaultInstance$factory_6() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_42() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_182($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function durationInMillis$factory_2() {
    return getPropertyCallableRef(
      'durationInMillis',
      1,
      KProperty1,
      function (receiver) {
        return receiver.durationInMillis;
      },
      null,
    );
  }
  function descriptor$factory_183($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function normalizedLoudness$factory_0() {
    return getPropertyCallableRef(
      'normalizedLoudness',
      1,
      KProperty1,
      function (receiver) {
        return receiver.normalizedLoudness;
      },
      null,
    );
  }
  function defaultInstance$factory_7() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_43() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_184($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function otrKey$factory_1() {
    return getPropertyCallableRef(
      'otrKey',
      1,
      KProperty1,
      function (receiver) {
        return receiver.otrKey;
      },
      null,
    );
  }
  function descriptor$factory_185($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sha256$factory_1() {
    return getPropertyCallableRef(
      'sha256',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sha256;
      },
      null,
    );
  }
  function descriptor$factory_186($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function assetId$factory_0() {
    return getPropertyCallableRef(
      'assetId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.assetId;
      },
      null,
    );
  }
  function descriptor$factory_187($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function assetToken$factory_0() {
    return getPropertyCallableRef(
      'assetToken',
      1,
      KProperty1,
      function (receiver) {
        return receiver.assetToken;
      },
      null,
    );
  }
  function descriptor$factory_188($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function encryption$factory_0() {
    return getPropertyCallableRef(
      'encryption',
      1,
      KProperty1,
      function (receiver) {
        return receiver.encryption;
      },
      null,
    );
  }
  function descriptor$factory_189($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function assetDomain$factory_0() {
    return getPropertyCallableRef(
      'assetDomain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.assetDomain;
      },
      null,
    );
  }
  function protoSize$factory_44() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_190($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function otrKey$factory_2() {
    return getPropertyCallableRef(
      'otrKey',
      1,
      KProperty1,
      function (receiver) {
        return receiver.otrKey;
      },
      null,
    );
  }
  function descriptor$factory_191($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sha256$factory_2() {
    return getPropertyCallableRef(
      'sha256',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sha256;
      },
      null,
    );
  }
  function descriptor$factory_192($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function encryption$factory_1() {
    return getPropertyCallableRef(
      'encryption',
      1,
      KProperty1,
      function (receiver) {
        return receiver.encryption;
      },
      null,
    );
  }
  function protoSize$factory_45() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_193($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function emoji$factory() {
    return getPropertyCallableRef(
      'emoji',
      1,
      KProperty1,
      function (receiver) {
        return receiver.emoji;
      },
      null,
    );
  }
  function descriptor$factory_194($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function messageId$factory_2() {
    return getPropertyCallableRef(
      'messageId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.messageId;
      },
      null,
    );
  }
  function descriptor$factory_195($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function legalHoldStatus$factory_4() {
    return getPropertyCallableRef(
      'legalHoldStatus',
      1,
      KProperty1,
      function (receiver) {
        return receiver.legalHoldStatus;
      },
      null,
    );
  }
  function protoSize$factory_46() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_196($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function content$factory_1() {
    return getPropertyCallableRef(
      'content',
      1,
      KProperty1,
      function (receiver) {
        return receiver.content;
      },
      null,
    );
  }
  function descriptor$factory_197($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function qualifiedConversationId$factory_2() {
    return getPropertyCallableRef(
      'qualifiedConversationId',
      1,
      KProperty1,
      function (receiver) {
        return receiver.qualifiedConversationId;
      },
      null,
    );
  }
  function protoSize$factory_47() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_198($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function trackingIdentifier$factory() {
    return getPropertyCallableRef(
      'trackingIdentifier',
      1,
      KProperty1,
      function (receiver) {
        return receiver.trackingIdentifier;
      },
      null,
    );
  }
  function defaultInstance$factory_8() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_48() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_199($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function identifier$factory() {
    return getPropertyCallableRef(
      'identifier',
      1,
      KProperty1,
      function (receiver) {
        return receiver.identifier;
      },
      null,
    );
  }
  function GroupInfoType$Companion$values$delegate$lambda() {
    return listOf([PUBLIC_GROUP_STATE_getInstance(), GROUP_INFO_getInstance(), GROUP_INFO_JWE_getInstance()]);
  }
  function PUBLIC_GROUP_STATE() {
    PUBLIC_GROUP_STATE_instance = this;
    GroupInfoType.call(this, 1, 'PUBLIC_GROUP_STATE');
  }
  var PUBLIC_GROUP_STATE_instance;
  function PUBLIC_GROUP_STATE_getInstance() {
    if (PUBLIC_GROUP_STATE_instance == null) new PUBLIC_GROUP_STATE();
    return PUBLIC_GROUP_STATE_instance;
  }
  function GROUP_INFO() {
    GROUP_INFO_instance = this;
    GroupInfoType.call(this, 2, 'GROUP_INFO');
  }
  var GROUP_INFO_instance;
  function GROUP_INFO_getInstance() {
    if (GROUP_INFO_instance == null) new GROUP_INFO();
    return GROUP_INFO_instance;
  }
  function GROUP_INFO_JWE() {
    GROUP_INFO_JWE_instance = this;
    GroupInfoType.call(this, 3, 'GROUP_INFO_JWE');
  }
  var GROUP_INFO_JWE_instance;
  function GROUP_INFO_JWE_getInstance() {
    if (GROUP_INFO_JWE_instance == null) new GROUP_INFO_JWE();
    return GROUP_INFO_JWE_instance;
  }
  function UNRECOGNIZED_7(value) {
    GroupInfoType.call(this, value);
  }
  function Companion_59() {
    Companion_instance_57 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(GroupInfoType$Companion$values$delegate$lambda);
  }
  protoOf(Companion_59).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_7();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_59).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.mls.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_7(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_59).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.mls.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No GroupInfoType with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_57;
  function Companion_getInstance_59() {
    if (Companion_instance_57 == null) new Companion_59();
    return Companion_instance_57;
  }
  function GroupInfoType(value, name) {
    Companion_getInstance_59();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(GroupInfoType).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(GroupInfoType).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(GroupInfoType).equals = function (other) {
    var tmp;
    if (other instanceof GroupInfoType) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(GroupInfoType).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(GroupInfoType).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'GroupInfoType.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function RatchetTreeType$Companion$values$delegate$lambda() {
    return listOf([FULL_getInstance(), DELTA_getInstance(), REFERENCE_getInstance()]);
  }
  function FULL() {
    FULL_instance = this;
    RatchetTreeType.call(this, 1, 'FULL');
  }
  var FULL_instance;
  function FULL_getInstance() {
    if (FULL_instance == null) new FULL();
    return FULL_instance;
  }
  function DELTA() {
    DELTA_instance = this;
    RatchetTreeType.call(this, 2, 'DELTA');
  }
  var DELTA_instance;
  function DELTA_getInstance() {
    if (DELTA_instance == null) new DELTA();
    return DELTA_instance;
  }
  function REFERENCE() {
    REFERENCE_instance = this;
    RatchetTreeType.call(this, 3, 'REFERENCE');
  }
  var REFERENCE_instance;
  function REFERENCE_getInstance() {
    if (REFERENCE_instance == null) new REFERENCE();
    return REFERENCE_instance;
  }
  function UNRECOGNIZED_8(value) {
    RatchetTreeType.call(this, value);
  }
  function Companion_60() {
    Companion_instance_58 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(RatchetTreeType$Companion$values$delegate$lambda);
  }
  protoOf(Companion_60).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_8();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_60).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.mls.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_8(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_60).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.mls.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No RatchetTreeType with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_58;
  function Companion_getInstance_60() {
    if (Companion_instance_58 == null) new Companion_60();
    return Companion_instance_58;
  }
  function RatchetTreeType(value, name) {
    Companion_getInstance_60();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(RatchetTreeType).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(RatchetTreeType).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(RatchetTreeType).equals = function (other) {
    var tmp;
    if (other instanceof RatchetTreeType) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(RatchetTreeType).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(RatchetTreeType).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'RatchetTreeType.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Companion_61() {
    Companion_instance_59 = this;
    var tmp = this;
    var tmp_0 = getKClass(GroupInfoBundle);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.mls.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_200(this);
    var tmp1_type = new Enum_0(Companion_getInstance_59(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp0_messageDescriptor,
        'group_info_type',
        1,
        tmp1_type,
        groupInfoType$factory(),
        VOID,
        'groupInfoType',
      ),
    );
    var tmp2_messageDescriptor = descriptor$factory_201(this);
    var tmp3_type = new Enum_0(Companion_getInstance_60(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'ratchet_tree_type',
        2,
        tmp3_type,
        ratchetTreeType$factory(),
        VOID,
        'ratchetTreeType',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_202(this);
    var tmp5_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'group_info', 3, tmp5_type, groupInfo$factory(), VOID, 'groupInfo'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('mls.GroupInfoBundle', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_61).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_49(Companion_getInstance_61(), u);
  };
  protoOf(Companion_61).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_59;
  function Companion_getInstance_61() {
    if (Companion_instance_59 == null) new Companion_61();
    return Companion_instance_59;
  }
  function GroupInfoBundle$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function GroupInfoBundle(groupInfoType, ratchetTreeType, groupInfo, unknownFields) {
    Companion_getInstance_61();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.groupInfoType = groupInfoType;
    this.ratchetTreeType = ratchetTreeType;
    this.groupInfo = groupInfo;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(GroupInfoBundle$protoSize$delegate$lambda(this));
  }
  protoOf(GroupInfoBundle).get_groupInfoType_zcu2ki_k$ = function () {
    return this.groupInfoType;
  };
  protoOf(GroupInfoBundle).get_ratchetTreeType_sqwm6w_k$ = function () {
    return this.ratchetTreeType;
  };
  protoOf(GroupInfoBundle).get_groupInfo_g0lp0c_k$ = function () {
    return this.groupInfo;
  };
  protoOf(GroupInfoBundle).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(GroupInfoBundle).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_49(this, other);
  };
  protoOf(GroupInfoBundle).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_61().descriptor_1;
  };
  protoOf(GroupInfoBundle).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_49();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(GroupInfoBundle).component1_7eebsc_k$ = function () {
    return this.groupInfoType;
  };
  protoOf(GroupInfoBundle).component2_7eebsb_k$ = function () {
    return this.ratchetTreeType;
  };
  protoOf(GroupInfoBundle).component3_7eebsa_k$ = function () {
    return this.groupInfo;
  };
  protoOf(GroupInfoBundle).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(GroupInfoBundle).copy_ya2g9c_k$ = function (groupInfoType, ratchetTreeType, groupInfo, unknownFields) {
    return new GroupInfoBundle(groupInfoType, ratchetTreeType, groupInfo, unknownFields);
  };
  protoOf(GroupInfoBundle).copy = function (groupInfoType, ratchetTreeType, groupInfo, unknownFields, $super) {
    groupInfoType = groupInfoType === VOID ? this.groupInfoType : groupInfoType;
    ratchetTreeType = ratchetTreeType === VOID ? this.ratchetTreeType : ratchetTreeType;
    groupInfo = groupInfo === VOID ? this.groupInfo : groupInfo;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_ya2g9c_k$(groupInfoType, ratchetTreeType, groupInfo, unknownFields);
  };
  protoOf(GroupInfoBundle).toString = function () {
    return (
      'GroupInfoBundle(groupInfoType=' +
      this.groupInfoType +
      ', ratchetTreeType=' +
      this.ratchetTreeType +
      ', groupInfo=' +
      this.groupInfo +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(GroupInfoBundle).hashCode = function () {
    var result = this.groupInfoType.hashCode();
    result = (imul(result, 31) + this.ratchetTreeType.hashCode()) | 0;
    result = (imul(result, 31) + this.groupInfo.hashCode()) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(GroupInfoBundle).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof GroupInfoBundle)) return false;
    var tmp0_other_with_cast = other instanceof GroupInfoBundle ? other : THROW_CCE();
    if (!this.groupInfoType.equals(tmp0_other_with_cast.groupInfoType)) return false;
    if (!this.ratchetTreeType.equals(tmp0_other_with_cast.ratchetTreeType)) return false;
    if (!this.groupInfo.equals(tmp0_other_with_cast.groupInfo)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_62() {
    Companion_instance_60 = this;
    var tmp = this;
    var tmp_0 = getKClass(CommitBundle);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(3);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(3);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.mls.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_203(this);
    var tmp1_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'commit', 1, tmp1_type, commit$factory(), VOID, 'commit'),
    );
    var tmp2_messageDescriptor = descriptor$factory_204(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'welcome', 2, tmp3_type, welcome$factory(), VOID, 'welcome'),
    );
    var tmp4_messageDescriptor = descriptor$factory_205(this);
    var tmp5_type = new Message(Companion_getInstance_61());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'group_info_bundle',
        3,
        tmp5_type,
        groupInfoBundle$factory(),
        VOID,
        'groupInfoBundle',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('mls.CommitBundle', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_62).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_50(Companion_getInstance_62(), u);
  };
  protoOf(Companion_62).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_60;
  function Companion_getInstance_62() {
    if (Companion_instance_60 == null) new Companion_62();
    return Companion_instance_60;
  }
  function CommitBundle$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function CommitBundle(commit, welcome, groupInfoBundle, unknownFields) {
    Companion_getInstance_62();
    welcome = welcome === VOID ? null : welcome;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.commit = commit;
    this.welcome = welcome;
    this.groupInfoBundle = groupInfoBundle;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(CommitBundle$protoSize$delegate$lambda(this));
  }
  protoOf(CommitBundle).get_commit_c05rgg_k$ = function () {
    return this.commit;
  };
  protoOf(CommitBundle).get_welcome_lnpjsp_k$ = function () {
    return this.welcome;
  };
  protoOf(CommitBundle).get_groupInfoBundle_xfxyka_k$ = function () {
    return this.groupInfoBundle;
  };
  protoOf(CommitBundle).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(CommitBundle).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_50(this, other);
  };
  protoOf(CommitBundle).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_62().descriptor_1;
  };
  protoOf(CommitBundle).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_50();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(CommitBundle).component1_7eebsc_k$ = function () {
    return this.commit;
  };
  protoOf(CommitBundle).component2_7eebsb_k$ = function () {
    return this.welcome;
  };
  protoOf(CommitBundle).component3_7eebsa_k$ = function () {
    return this.groupInfoBundle;
  };
  protoOf(CommitBundle).component4_7eebs9_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(CommitBundle).copy_4xs3bm_k$ = function (commit, welcome, groupInfoBundle, unknownFields) {
    return new CommitBundle(commit, welcome, groupInfoBundle, unknownFields);
  };
  protoOf(CommitBundle).copy = function (commit, welcome, groupInfoBundle, unknownFields, $super) {
    commit = commit === VOID ? this.commit : commit;
    welcome = welcome === VOID ? this.welcome : welcome;
    groupInfoBundle = groupInfoBundle === VOID ? this.groupInfoBundle : groupInfoBundle;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_4xs3bm_k$(commit, welcome, groupInfoBundle, unknownFields);
  };
  protoOf(CommitBundle).toString = function () {
    return (
      'CommitBundle(commit=' +
      this.commit +
      ', welcome=' +
      this.welcome +
      ', groupInfoBundle=' +
      this.groupInfoBundle +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(CommitBundle).hashCode = function () {
    var result = this.commit.hashCode();
    result = (imul(result, 31) + (this.welcome == null ? 0 : this.welcome.hashCode())) | 0;
    result = (imul(result, 31) + this.groupInfoBundle.hashCode()) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(CommitBundle).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof CommitBundle)) return false;
    var tmp0_other_with_cast = other instanceof CommitBundle ? other : THROW_CCE();
    if (!this.commit.equals(tmp0_other_with_cast.commit)) return false;
    if (!equals(this.welcome, tmp0_other_with_cast.welcome)) return false;
    if (!this.groupInfoBundle.equals(tmp0_other_with_cast.groupInfoBundle)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function protoMergeImpl_49(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof GroupInfoBundle ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.mls.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_49(_this__u8e3s4, u) {
    var groupInfoType = {_v: null};
    var ratchetTreeType = {_v: null};
    var groupInfo = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_49(groupInfoType, ratchetTreeType, groupInfo),
    );
    if (groupInfoType._v == null) {
      throw Companion_getInstance().missingRequiredField('group_info_type');
    }
    if (ratchetTreeType._v == null) {
      throw Companion_getInstance().missingRequiredField('ratchet_tree_type');
    }
    if (groupInfo._v == null) {
      throw Companion_getInstance().missingRequiredField('group_info');
    }
    return new GroupInfoBundle(
      ensureNotNull(groupInfoType._v),
      ensureNotNull(ratchetTreeType._v),
      ensureNotNull(groupInfo._v),
      unknownFields,
    );
  }
  function protoMergeImpl_50(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof CommitBundle ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.mls.protoMergeImpl.<anonymous>' call
      var tmp0_elvis_lhs = plus.welcome;
      tmp = tmp0_safe_receiver.copy(
        VOID,
        tmp0_elvis_lhs == null ? _this__u8e3s4.welcome : tmp0_elvis_lhs,
        _this__u8e3s4.groupInfoBundle.plus_fj0q1z_k$(plus.groupInfoBundle),
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_50(_this__u8e3s4, u) {
    var commit = {_v: null};
    var welcome = {_v: null};
    var groupInfoBundle = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_50(commit, welcome, groupInfoBundle),
    );
    if (commit._v == null) {
      throw Companion_getInstance().missingRequiredField('commit');
    }
    if (groupInfoBundle._v == null) {
      throw Companion_getInstance().missingRequiredField('group_info_bundle');
    }
    return new CommitBundle(ensureNotNull(commit._v), welcome._v, ensureNotNull(groupInfoBundle._v), unknownFields);
  }
  function decodeWithImpl$lambda_49($groupInfoType, $ratchetTreeType, $groupInfo) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $groupInfoType._v = _fieldValue instanceof GroupInfoType ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $ratchetTreeType._v = _fieldValue instanceof RatchetTreeType ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $groupInfo._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_50($commit, $welcome, $groupInfoBundle) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $commit._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          $welcome._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 3:
          $groupInfoBundle._v = _fieldValue instanceof GroupInfoBundle ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function values$factory_7() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function values$factory_8() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory_49() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_200($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function groupInfoType$factory() {
    return getPropertyCallableRef(
      'groupInfoType',
      1,
      KProperty1,
      function (receiver) {
        return receiver.groupInfoType;
      },
      null,
    );
  }
  function descriptor$factory_201($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function ratchetTreeType$factory() {
    return getPropertyCallableRef(
      'ratchetTreeType',
      1,
      KProperty1,
      function (receiver) {
        return receiver.ratchetTreeType;
      },
      null,
    );
  }
  function descriptor$factory_202($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function groupInfo$factory() {
    return getPropertyCallableRef(
      'groupInfo',
      1,
      KProperty1,
      function (receiver) {
        return receiver.groupInfo;
      },
      null,
    );
  }
  function protoSize$factory_50() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_203($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function commit$factory() {
    return getPropertyCallableRef(
      'commit',
      1,
      KProperty1,
      function (receiver) {
        return receiver.commit;
      },
      null,
    );
  }
  function descriptor$factory_204($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function welcome$factory() {
    return getPropertyCallableRef(
      'welcome',
      1,
      KProperty1,
      function (receiver) {
        return receiver.welcome;
      },
      null,
    );
  }
  function descriptor$factory_205($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function groupInfoBundle$factory() {
    return getPropertyCallableRef(
      'groupInfoBundle',
      1,
      KProperty1,
      function (receiver) {
        return receiver.groupInfoBundle;
      },
      null,
    );
  }
  function Priority$Companion$values$delegate$lambda() {
    return listOf([LOW_PRIORITY_getInstance(), HIGH_PRIORITY_getInstance()]);
  }
  function LOW_PRIORITY() {
    LOW_PRIORITY_instance = this;
    Priority.call(this, 1, 'LOW_PRIORITY');
  }
  var LOW_PRIORITY_instance;
  function LOW_PRIORITY_getInstance() {
    if (LOW_PRIORITY_instance == null) new LOW_PRIORITY();
    return LOW_PRIORITY_instance;
  }
  function HIGH_PRIORITY() {
    HIGH_PRIORITY_instance = this;
    Priority.call(this, 2, 'HIGH_PRIORITY');
  }
  var HIGH_PRIORITY_instance;
  function HIGH_PRIORITY_getInstance() {
    if (HIGH_PRIORITY_instance == null) new HIGH_PRIORITY();
    return HIGH_PRIORITY_instance;
  }
  function UNRECOGNIZED_9(value) {
    Priority.call(this, value);
  }
  function Companion_63() {
    Companion_instance_61 = this;
    var tmp = this;
    tmp.values$delegate_1 = lazy(Priority$Companion$values$delegate$lambda);
  }
  protoOf(Companion_63).get_values_ksazhn_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.values$delegate_1;
    values$factory_9();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_63).fromValue_lljhin_k$ = function (value) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.otr.Companion.fromValue.<anonymous>' call
        if (element.get_value_j01efc_k$() === value) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    return tmp0_elvis_lhs == null ? new UNRECOGNIZED_9(value) : tmp0_elvis_lhs;
  };
  protoOf(Companion_63).fromName_z4ts05_k$ = function (name) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var tmp0_iterator = this.values.iterator_jk1svi_k$();
      while (tmp0_iterator.hasNext_bitz1p_k$()) {
        var element = tmp0_iterator.next_20eer_k$();
        // Inline function 'com.wire.kalium.protobuf.otr.Companion.fromName.<anonymous>' call
        if (element.get_name_woqyms_k$() === name) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    var tmp0_elvis_lhs = tmp$ret$1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      throw IllegalArgumentException_init_$Create$('No Priority with name: ' + name);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  var Companion_instance_61;
  function Companion_getInstance_63() {
    if (Companion_instance_61 == null) new Companion_63();
    return Companion_instance_61;
  }
  function Priority(value, name) {
    Companion_getInstance_63();
    name = name === VOID ? null : name;
    this.value_1 = value;
    this.name_1 = name;
  }
  protoOf(Priority).get_value_j01efc_k$ = function () {
    return this.value_1;
  };
  protoOf(Priority).get_name_woqyms_k$ = function () {
    return this.name_1;
  };
  protoOf(Priority).equals = function (other) {
    var tmp;
    if (other instanceof Priority) {
      tmp = other.get_value_j01efc_k$() === this.get_value_j01efc_k$();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(Priority).hashCode = function () {
    return this.get_value_j01efc_k$();
  };
  protoOf(Priority).toString = function () {
    var tmp0_elvis_lhs = this.get_name_woqyms_k$();
    return (
      'Priority.' +
      (tmp0_elvis_lhs == null ? 'UNRECOGNIZED' : tmp0_elvis_lhs) +
      '(value=' +
      this.get_value_j01efc_k$() +
      ')'
    );
  };
  function Companion_64() {
    Companion_instance_62 = this;
    var tmp = this;
    var tmp_0 = getKClass(UserId_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_206(this);
    var tmp1_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'uuid', 1, tmp1_type, uuid$factory(), VOID, 'uuid'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.UserId', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_64).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_51(Companion_getInstance_64(), u);
  };
  protoOf(Companion_64).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_62;
  function Companion_getInstance_64() {
    if (Companion_instance_62 == null) new Companion_64();
    return Companion_instance_62;
  }
  function UserId$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function UserId_0(uuid, unknownFields) {
    Companion_getInstance_64();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.uuid = uuid;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(UserId$protoSize$delegate$lambda(this));
  }
  protoOf(UserId_0).get_uuid_wovu9w_k$ = function () {
    return this.uuid;
  };
  protoOf(UserId_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(UserId_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_51(this, other);
  };
  protoOf(UserId_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_64().descriptor_1;
  };
  protoOf(UserId_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_51();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(UserId_0).component1_7eebsc_k$ = function () {
    return this.uuid;
  };
  protoOf(UserId_0).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(UserId_0).copy_srz0sm_k$ = function (uuid, unknownFields) {
    return new UserId_0(uuid, unknownFields);
  };
  protoOf(UserId_0).copy = function (uuid, unknownFields, $super) {
    uuid = uuid === VOID ? this.uuid : uuid;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_srz0sm_k$(uuid, unknownFields);
  };
  protoOf(UserId_0).toString = function () {
    return 'UserId(uuid=' + this.uuid + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(UserId_0).hashCode = function () {
    var result = this.uuid.hashCode();
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(UserId_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof UserId_0)) return false;
    var tmp0_other_with_cast = other instanceof UserId_0 ? other : THROW_CCE();
    if (!this.uuid.equals(tmp0_other_with_cast.uuid)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_65() {
    Companion_instance_63 = this;
    var tmp = this;
    var tmp_0 = getKClass(QualifiedUserId_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_207(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(new FieldDescriptor(tmp0_messageDescriptor, 'id', 1, tmp1_type, id$factory_5(), VOID, 'id'));
    var tmp2_messageDescriptor = descriptor$factory_208(this);
    var tmp3_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'domain', 2, tmp3_type, domain$factory_2(), VOID, 'domain'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.QualifiedUserId', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_65).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_52(Companion_getInstance_65(), u);
  };
  protoOf(Companion_65).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_63;
  function Companion_getInstance_65() {
    if (Companion_instance_63 == null) new Companion_65();
    return Companion_instance_63;
  }
  function QualifiedUserId$protoSize$delegate$lambda_0(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function QualifiedUserId_0(id, domain, unknownFields) {
    Companion_getInstance_65();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.id = id;
    this.domain = domain;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(QualifiedUserId$protoSize$delegate$lambda_0(this));
  }
  protoOf(QualifiedUserId_0).get_id_kntnx8_k$ = function () {
    return this.id;
  };
  protoOf(QualifiedUserId_0).get_domain_ch74y5_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedUserId_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedUserId_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_52(this, other);
  };
  protoOf(QualifiedUserId_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_65().descriptor_1;
  };
  protoOf(QualifiedUserId_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_52();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(QualifiedUserId_0).component1_7eebsc_k$ = function () {
    return this.id;
  };
  protoOf(QualifiedUserId_0).component2_7eebsb_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedUserId_0).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedUserId_0).copy_5bhor2_k$ = function (id, domain, unknownFields) {
    return new QualifiedUserId_0(id, domain, unknownFields);
  };
  protoOf(QualifiedUserId_0).copy = function (id, domain, unknownFields, $super) {
    id = id === VOID ? this.id : id;
    domain = domain === VOID ? this.domain : domain;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5bhor2_k$(id, domain, unknownFields);
  };
  protoOf(QualifiedUserId_0).toString = function () {
    return (
      'QualifiedUserId(id=' + this.id + ', domain=' + this.domain + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(QualifiedUserId_0).hashCode = function () {
    var result = getStringHashCode(this.id);
    result = (imul(result, 31) + getStringHashCode(this.domain)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(QualifiedUserId_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof QualifiedUserId_0)) return false;
    var tmp0_other_with_cast = other instanceof QualifiedUserId_0 ? other : THROW_CCE();
    if (!(this.id === tmp0_other_with_cast.id)) return false;
    if (!(this.domain === tmp0_other_with_cast.domain)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_66() {
    Companion_instance_64 = this;
    var tmp = this;
    var tmp_0 = getKClass(ClientId);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_209(this);
    var tmp1_type = new UInt64(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'client', 1, tmp1_type, client$factory(), VOID, 'client'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.ClientId', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_66).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_53(Companion_getInstance_66(), u);
  };
  protoOf(Companion_66).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_64;
  function Companion_getInstance_66() {
    if (Companion_instance_64 == null) new Companion_66();
    return Companion_instance_64;
  }
  function ClientId$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ClientId(client, unknownFields) {
    Companion_getInstance_66();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.client = client;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientId$protoSize$delegate$lambda(this));
  }
  protoOf(ClientId).get_client_byfnx0_k$ = function () {
    return this.client;
  };
  protoOf(ClientId).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ClientId).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_53(this, other);
  };
  protoOf(ClientId).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_66().descriptor_1;
  };
  protoOf(ClientId).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_53();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ClientId).component1_7eebsc_k$ = function () {
    return this.client;
  };
  protoOf(ClientId).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ClientId).copy_q1md5i_k$ = function (client, unknownFields) {
    return new ClientId(client, unknownFields);
  };
  protoOf(ClientId).copy = function (client, unknownFields, $super) {
    client = client === VOID ? this.client : client;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_q1md5i_k$(client, unknownFields);
  };
  protoOf(ClientId).toString = function () {
    return 'ClientId(client=' + this.client.toString() + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(ClientId).hashCode = function () {
    var result = this.client.hashCode();
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ClientId).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ClientId)) return false;
    var tmp0_other_with_cast = other instanceof ClientId ? other : THROW_CCE();
    if (!this.client.equals(tmp0_other_with_cast.client)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_67() {
    Companion_instance_65 = this;
    var tmp = this;
    var tmp_0 = getKClass(ClientEntry);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_210(this);
    var tmp1_type = new Message(Companion_getInstance_66());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'client', 1, tmp1_type, client$factory_0(), VOID, 'client'),
    );
    var tmp2_messageDescriptor = descriptor$factory_211(this);
    var tmp3_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'text', 2, tmp3_type, text$factory_5(), VOID, 'text'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.ClientEntry', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_67).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_54(Companion_getInstance_67(), u);
  };
  protoOf(Companion_67).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_65;
  function Companion_getInstance_67() {
    if (Companion_instance_65 == null) new Companion_67();
    return Companion_instance_65;
  }
  function ClientEntry$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ClientEntry(client, text, unknownFields) {
    Companion_getInstance_67();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.client = client;
    this.text = text;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientEntry$protoSize$delegate$lambda(this));
  }
  protoOf(ClientEntry).get_client_byfnx0_k$ = function () {
    return this.client;
  };
  protoOf(ClientEntry).get_text_wouvsm_k$ = function () {
    return this.text;
  };
  protoOf(ClientEntry).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ClientEntry).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_54(this, other);
  };
  protoOf(ClientEntry).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_67().descriptor_1;
  };
  protoOf(ClientEntry).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_54();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ClientEntry).component1_7eebsc_k$ = function () {
    return this.client;
  };
  protoOf(ClientEntry).component2_7eebsb_k$ = function () {
    return this.text;
  };
  protoOf(ClientEntry).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ClientEntry).copy_8m2jfd_k$ = function (client, text, unknownFields) {
    return new ClientEntry(client, text, unknownFields);
  };
  protoOf(ClientEntry).copy = function (client, text, unknownFields, $super) {
    client = client === VOID ? this.client : client;
    text = text === VOID ? this.text : text;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_8m2jfd_k$(client, text, unknownFields);
  };
  protoOf(ClientEntry).toString = function () {
    return (
      'ClientEntry(client=' + this.client + ', text=' + this.text + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(ClientEntry).hashCode = function () {
    var result = this.client.hashCode();
    result = (imul(result, 31) + this.text.hashCode()) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ClientEntry).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ClientEntry)) return false;
    var tmp0_other_with_cast = other instanceof ClientEntry ? other : THROW_CCE();
    if (!this.client.equals(tmp0_other_with_cast.client)) return false;
    if (!this.text.equals(tmp0_other_with_cast.text)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_68() {
    Companion_instance_66 = this;
    var tmp = this;
    var tmp_0 = getKClass(UserEntry);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_212(this);
    var tmp1_type = new Message(Companion_getInstance_64());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'user', 1, tmp1_type, user$factory(), VOID, 'user'),
    );
    var tmp2_messageDescriptor = descriptor$factory_213(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_67()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'clients', 2, tmp3_type, clients$factory(), VOID, 'clients'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.UserEntry', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_68).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_55(Companion_getInstance_68(), u);
  };
  protoOf(Companion_68).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_66;
  function Companion_getInstance_68() {
    if (Companion_instance_66 == null) new Companion_68();
    return Companion_instance_66;
  }
  function UserEntry$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function UserEntry(user, clients, unknownFields) {
    Companion_getInstance_68();
    clients = clients === VOID ? emptyList() : clients;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.user = user;
    this.clients = clients;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(UserEntry$protoSize$delegate$lambda(this));
  }
  protoOf(UserEntry).get_user_wovspg_k$ = function () {
    return this.user;
  };
  protoOf(UserEntry).get_clients_fhxbmn_k$ = function () {
    return this.clients;
  };
  protoOf(UserEntry).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(UserEntry).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_55(this, other);
  };
  protoOf(UserEntry).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_68().descriptor_1;
  };
  protoOf(UserEntry).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_55();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(UserEntry).component1_7eebsc_k$ = function () {
    return this.user;
  };
  protoOf(UserEntry).component2_7eebsb_k$ = function () {
    return this.clients;
  };
  protoOf(UserEntry).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(UserEntry).copy_302qdk_k$ = function (user, clients, unknownFields) {
    return new UserEntry(user, clients, unknownFields);
  };
  protoOf(UserEntry).copy = function (user, clients, unknownFields, $super) {
    user = user === VOID ? this.user : user;
    clients = clients === VOID ? this.clients : clients;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_302qdk_k$(user, clients, unknownFields);
  };
  protoOf(UserEntry).toString = function () {
    return (
      'UserEntry(user=' + this.user + ', clients=' + this.clients + ', unknownFields=' + this.unknownFields_1 + ')'
    );
  };
  protoOf(UserEntry).hashCode = function () {
    var result = this.user.hashCode();
    result = (imul(result, 31) + hashCode(this.clients)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(UserEntry).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof UserEntry)) return false;
    var tmp0_other_with_cast = other instanceof UserEntry ? other : THROW_CCE();
    if (!this.user.equals(tmp0_other_with_cast.user)) return false;
    if (!equals(this.clients, tmp0_other_with_cast.clients)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_69() {
    Companion_instance_67 = this;
    var tmp = this;
    var tmp_0 = getKClass(QualifiedUserEntry);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(2);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(2);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_214(this);
    var tmp1_type = new String_0(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'domain', 1, tmp1_type, domain$factory_3(), VOID, 'domain'),
    );
    var tmp2_messageDescriptor = descriptor$factory_215(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_68()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'entries', 2, tmp3_type, entries$factory(), VOID, 'entries'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.QualifiedUserEntry', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_69).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_56(Companion_getInstance_69(), u);
  };
  protoOf(Companion_69).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_67;
  function Companion_getInstance_69() {
    if (Companion_instance_67 == null) new Companion_69();
    return Companion_instance_67;
  }
  function QualifiedUserEntry$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function QualifiedUserEntry(domain, entries, unknownFields) {
    Companion_getInstance_69();
    entries = entries === VOID ? emptyList() : entries;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.domain = domain;
    this.entries = entries;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(QualifiedUserEntry$protoSize$delegate$lambda(this));
  }
  protoOf(QualifiedUserEntry).get_domain_ch74y5_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedUserEntry).get_entries_p20ztl_k$ = function () {
    return this.entries;
  };
  protoOf(QualifiedUserEntry).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedUserEntry).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_56(this, other);
  };
  protoOf(QualifiedUserEntry).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_69().descriptor_1;
  };
  protoOf(QualifiedUserEntry).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_56();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(QualifiedUserEntry).component1_7eebsc_k$ = function () {
    return this.domain;
  };
  protoOf(QualifiedUserEntry).component2_7eebsb_k$ = function () {
    return this.entries;
  };
  protoOf(QualifiedUserEntry).component3_7eebsa_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedUserEntry).copy_l90l1_k$ = function (domain, entries, unknownFields) {
    return new QualifiedUserEntry(domain, entries, unknownFields);
  };
  protoOf(QualifiedUserEntry).copy = function (domain, entries, unknownFields, $super) {
    domain = domain === VOID ? this.domain : domain;
    entries = entries === VOID ? this.entries : entries;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_l90l1_k$(domain, entries, unknownFields);
  };
  protoOf(QualifiedUserEntry).toString = function () {
    return (
      'QualifiedUserEntry(domain=' +
      this.domain +
      ', entries=' +
      this.entries +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(QualifiedUserEntry).hashCode = function () {
    var result = getStringHashCode(this.domain);
    result = (imul(result, 31) + hashCode(this.entries)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(QualifiedUserEntry).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof QualifiedUserEntry)) return false;
    var tmp0_other_with_cast = other instanceof QualifiedUserEntry ? other : THROW_CCE();
    if (!(this.domain === tmp0_other_with_cast.domain)) return false;
    if (!equals(this.entries, tmp0_other_with_cast.entries)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_70() {
    Companion_instance_68 = this;
    var tmp = this;
    var tmp_0 = getKClass(NewOtrMessage);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(7);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(7);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_216(this);
    var tmp1_type = new Message(Companion_getInstance_66());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'sender', 1, tmp1_type, sender$factory(), VOID, 'sender'),
    );
    var tmp2_messageDescriptor = descriptor$factory_217(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_68()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp2_messageDescriptor, 'recipients', 2, tmp3_type, recipients$factory(), VOID, 'recipients'),
    );
    var tmp4_messageDescriptor = descriptor$factory_218(this);
    var tmp5_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'native_push',
        3,
        tmp5_type,
        nativePush$factory(),
        VOID,
        'nativePush',
      ),
    );
    var tmp6_messageDescriptor = descriptor$factory_219(this);
    var tmp7_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'blob', 4, tmp7_type, blob$factory(), VOID, 'blob'),
    );
    var tmp8_messageDescriptor = descriptor$factory_220(this);
    var tmp9_type = new Enum_0(Companion_getInstance_63(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'native_priority',
        5,
        tmp9_type,
        nativePriority$factory(),
        VOID,
        'nativePriority',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_221(this);
    var tmp11_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp10_messageDescriptor, 'transient', 6, tmp11_type, transient$factory(), VOID, 'transient'),
    );
    var tmp12_messageDescriptor = descriptor$factory_222(this);
    var tmp13_type = new Repeated(new Message(Companion_getInstance_64()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp12_messageDescriptor,
        'report_missing',
        7,
        tmp13_type,
        reportMissing$factory(),
        VOID,
        'reportMissing',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.NewOtrMessage', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_70).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_57(Companion_getInstance_70(), u);
  };
  protoOf(Companion_70).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_68;
  function Companion_getInstance_70() {
    if (Companion_instance_68 == null) new Companion_70();
    return Companion_instance_68;
  }
  function NewOtrMessage$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function NewOtrMessage(
    sender,
    recipients,
    nativePush,
    blob,
    nativePriority,
    transient,
    reportMissing,
    unknownFields,
  ) {
    Companion_getInstance_70();
    recipients = recipients === VOID ? emptyList() : recipients;
    nativePush = nativePush === VOID ? null : nativePush;
    blob = blob === VOID ? null : blob;
    nativePriority = nativePriority === VOID ? null : nativePriority;
    transient = transient === VOID ? null : transient;
    reportMissing = reportMissing === VOID ? emptyList() : reportMissing;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.sender = sender;
    this.recipients = recipients;
    this.nativePush = nativePush;
    this.blob = blob;
    this.nativePriority = nativePriority;
    this.transient = transient;
    this.reportMissing = reportMissing;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(NewOtrMessage$protoSize$delegate$lambda(this));
  }
  protoOf(NewOtrMessage).get_sender_jfe81q_k$ = function () {
    return this.sender;
  };
  protoOf(NewOtrMessage).get_recipients_px0n3x_k$ = function () {
    return this.recipients;
  };
  protoOf(NewOtrMessage).get_nativePush_v5u7ve_k$ = function () {
    return this.nativePush;
  };
  protoOf(NewOtrMessage).get_blob_wojizq_k$ = function () {
    return this.blob;
  };
  protoOf(NewOtrMessage).get_nativePriority_kqak84_k$ = function () {
    return this.nativePriority;
  };
  protoOf(NewOtrMessage).get_transient_pxati9_k$ = function () {
    return this.transient;
  };
  protoOf(NewOtrMessage).get_reportMissing_1s6s89_k$ = function () {
    return this.reportMissing;
  };
  protoOf(NewOtrMessage).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(NewOtrMessage).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_57(this, other);
  };
  protoOf(NewOtrMessage).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_70().descriptor_1;
  };
  protoOf(NewOtrMessage).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_57();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(NewOtrMessage).component1_7eebsc_k$ = function () {
    return this.sender;
  };
  protoOf(NewOtrMessage).component2_7eebsb_k$ = function () {
    return this.recipients;
  };
  protoOf(NewOtrMessage).component3_7eebsa_k$ = function () {
    return this.nativePush;
  };
  protoOf(NewOtrMessage).component4_7eebs9_k$ = function () {
    return this.blob;
  };
  protoOf(NewOtrMessage).component5_7eebs8_k$ = function () {
    return this.nativePriority;
  };
  protoOf(NewOtrMessage).component6_7eebs7_k$ = function () {
    return this.transient;
  };
  protoOf(NewOtrMessage).component7_7eebs6_k$ = function () {
    return this.reportMissing;
  };
  protoOf(NewOtrMessage).component8_7eebs5_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(NewOtrMessage).copy_gsbtj2_k$ = function (
    sender,
    recipients,
    nativePush,
    blob,
    nativePriority,
    transient,
    reportMissing,
    unknownFields,
  ) {
    return new NewOtrMessage(
      sender,
      recipients,
      nativePush,
      blob,
      nativePriority,
      transient,
      reportMissing,
      unknownFields,
    );
  };
  protoOf(NewOtrMessage).copy = function (
    sender,
    recipients,
    nativePush,
    blob,
    nativePriority,
    transient,
    reportMissing,
    unknownFields,
    $super,
  ) {
    sender = sender === VOID ? this.sender : sender;
    recipients = recipients === VOID ? this.recipients : recipients;
    nativePush = nativePush === VOID ? this.nativePush : nativePush;
    blob = blob === VOID ? this.blob : blob;
    nativePriority = nativePriority === VOID ? this.nativePriority : nativePriority;
    transient = transient === VOID ? this.transient : transient;
    reportMissing = reportMissing === VOID ? this.reportMissing : reportMissing;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_gsbtj2_k$(
      sender,
      recipients,
      nativePush,
      blob,
      nativePriority,
      transient,
      reportMissing,
      unknownFields,
    );
  };
  protoOf(NewOtrMessage).toString = function () {
    return (
      'NewOtrMessage(sender=' +
      this.sender +
      ', recipients=' +
      this.recipients +
      ', nativePush=' +
      this.nativePush +
      ', blob=' +
      this.blob +
      ', nativePriority=' +
      this.nativePriority +
      ', transient=' +
      this.transient +
      ', reportMissing=' +
      this.reportMissing +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(NewOtrMessage).hashCode = function () {
    var result = this.sender.hashCode();
    result = (imul(result, 31) + hashCode(this.recipients)) | 0;
    result = (imul(result, 31) + (this.nativePush == null ? 0 : getBooleanHashCode(this.nativePush))) | 0;
    result = (imul(result, 31) + (this.blob == null ? 0 : this.blob.hashCode())) | 0;
    result = (imul(result, 31) + (this.nativePriority == null ? 0 : this.nativePriority.hashCode())) | 0;
    result = (imul(result, 31) + (this.transient == null ? 0 : getBooleanHashCode(this.transient))) | 0;
    result = (imul(result, 31) + hashCode(this.reportMissing)) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(NewOtrMessage).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof NewOtrMessage)) return false;
    var tmp0_other_with_cast = other instanceof NewOtrMessage ? other : THROW_CCE();
    if (!this.sender.equals(tmp0_other_with_cast.sender)) return false;
    if (!equals(this.recipients, tmp0_other_with_cast.recipients)) return false;
    if (!(this.nativePush == tmp0_other_with_cast.nativePush)) return false;
    if (!equals(this.blob, tmp0_other_with_cast.blob)) return false;
    if (!equals(this.nativePriority, tmp0_other_with_cast.nativePriority)) return false;
    if (!(this.transient == tmp0_other_with_cast.transient)) return false;
    if (!equals(this.reportMissing, tmp0_other_with_cast.reportMissing)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ReportAll(reportAll) {
    ClientMismatchStrategy.call(this, reportAll);
  }
  function IgnoreAll(ignoreAll) {
    ClientMismatchStrategy.call(this, ignoreAll);
  }
  function ReportOnly(reportOnly) {
    ClientMismatchStrategy.call(this, reportOnly);
  }
  function IgnoreOnly(ignoreOnly) {
    ClientMismatchStrategy.call(this, ignoreOnly);
  }
  function ClientMismatchStrategy(value) {
    OneOf.call(this, value);
  }
  function Companion_71() {
    Companion_instance_69 = this;
    var tmp = this;
    var tmp_0 = getKClass(QualifiedNewOtrMessage);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(10);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(10);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_223(this);
    var tmp1_type = new Message(Companion_getInstance_66());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'sender', 1, tmp1_type, sender$factory_0(), VOID, 'sender'),
    );
    var tmp2_messageDescriptor = descriptor$factory_224(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_69()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'recipients',
        2,
        tmp3_type,
        recipients$factory_0(),
        VOID,
        'recipients',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_225(this);
    var tmp5_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp4_messageDescriptor,
        'native_push',
        3,
        tmp5_type,
        nativePush$factory_0(),
        VOID,
        'nativePush',
      ),
    );
    var tmp6_messageDescriptor = descriptor$factory_226(this);
    var tmp7_type = new Bytes(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp6_messageDescriptor, 'blob', 4, tmp7_type, blob$factory_0(), VOID, 'blob'),
    );
    var tmp8_messageDescriptor = descriptor$factory_227(this);
    var tmp9_type = new Enum_0(Companion_getInstance_63(), true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp8_messageDescriptor,
        'native_priority',
        5,
        tmp9_type,
        nativePriority$factory_0(),
        VOID,
        'nativePriority',
      ),
    );
    var tmp10_messageDescriptor = descriptor$factory_228(this);
    var tmp11_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp10_messageDescriptor,
        'transient',
        6,
        tmp11_type,
        transient$factory_0(),
        VOID,
        'transient',
      ),
    );
    var tmp12_messageDescriptor = descriptor$factory_229(this);
    var tmp13_type = new Message(Companion_getInstance_72());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp12_messageDescriptor, 'report_all', 7, tmp13_type, reportAll$factory(), true, 'reportAll'),
    );
    var tmp14_messageDescriptor = descriptor$factory_230(this);
    var tmp15_type = new Message(Companion_getInstance_73());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp14_messageDescriptor, 'ignore_all', 8, tmp15_type, ignoreAll$factory(), true, 'ignoreAll'),
    );
    var tmp16_messageDescriptor = descriptor$factory_231(this);
    var tmp17_type = new Message(Companion_getInstance_74());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp16_messageDescriptor,
        'report_only',
        9,
        tmp17_type,
        reportOnly$factory(),
        true,
        'reportOnly',
      ),
    );
    var tmp18_messageDescriptor = descriptor$factory_232(this);
    var tmp19_type = new Message(Companion_getInstance_75());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp18_messageDescriptor,
        'ignore_only',
        10,
        tmp19_type,
        ignoreOnly$factory(),
        true,
        'ignoreOnly',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.QualifiedNewOtrMessage', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_71).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_58(Companion_getInstance_71(), u);
  };
  protoOf(Companion_71).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_69;
  function Companion_getInstance_71() {
    if (Companion_instance_69 == null) new Companion_71();
    return Companion_instance_69;
  }
  function QualifiedNewOtrMessage$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function QualifiedNewOtrMessage(
    sender,
    recipients,
    nativePush,
    blob,
    nativePriority,
    transient,
    clientMismatchStrategy,
    unknownFields,
  ) {
    Companion_getInstance_71();
    recipients = recipients === VOID ? emptyList() : recipients;
    nativePush = nativePush === VOID ? null : nativePush;
    blob = blob === VOID ? null : blob;
    nativePriority = nativePriority === VOID ? null : nativePriority;
    transient = transient === VOID ? null : transient;
    clientMismatchStrategy = clientMismatchStrategy === VOID ? null : clientMismatchStrategy;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.sender = sender;
    this.recipients = recipients;
    this.nativePush = nativePush;
    this.blob = blob;
    this.nativePriority = nativePriority;
    this.transient = transient;
    this.clientMismatchStrategy = clientMismatchStrategy;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(QualifiedNewOtrMessage$protoSize$delegate$lambda(this));
  }
  protoOf(QualifiedNewOtrMessage).get_sender_jfe81q_k$ = function () {
    return this.sender;
  };
  protoOf(QualifiedNewOtrMessage).get_recipients_px0n3x_k$ = function () {
    return this.recipients;
  };
  protoOf(QualifiedNewOtrMessage).get_nativePush_v5u7ve_k$ = function () {
    return this.nativePush;
  };
  protoOf(QualifiedNewOtrMessage).get_blob_wojizq_k$ = function () {
    return this.blob;
  };
  protoOf(QualifiedNewOtrMessage).get_nativePriority_kqak84_k$ = function () {
    return this.nativePriority;
  };
  protoOf(QualifiedNewOtrMessage).get_transient_pxati9_k$ = function () {
    return this.transient;
  };
  protoOf(QualifiedNewOtrMessage).get_clientMismatchStrategy_p8hnbp_k$ = function () {
    return this.clientMismatchStrategy;
  };
  protoOf(QualifiedNewOtrMessage).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedNewOtrMessage).get_reportAll_2o54is_k$ = function () {
    var tmp = this.clientMismatchStrategy;
    var tmp0_safe_receiver = tmp instanceof ReportAll ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(QualifiedNewOtrMessage).get_ignoreAll_fuvwli_k$ = function () {
    var tmp = this.clientMismatchStrategy;
    var tmp0_safe_receiver = tmp instanceof IgnoreAll ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(QualifiedNewOtrMessage).get_reportOnly_brjtl5_k$ = function () {
    var tmp = this.clientMismatchStrategy;
    var tmp0_safe_receiver = tmp instanceof ReportOnly ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(QualifiedNewOtrMessage).get_ignoreOnly_5m2bx5_k$ = function () {
    var tmp = this.clientMismatchStrategy;
    var tmp0_safe_receiver = tmp instanceof IgnoreOnly ? tmp : null;
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_value_j01efc_k$();
  };
  protoOf(QualifiedNewOtrMessage).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_58(this, other);
  };
  protoOf(QualifiedNewOtrMessage).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_71().descriptor_1;
  };
  protoOf(QualifiedNewOtrMessage).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_58();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(QualifiedNewOtrMessage).component1_7eebsc_k$ = function () {
    return this.sender;
  };
  protoOf(QualifiedNewOtrMessage).component2_7eebsb_k$ = function () {
    return this.recipients;
  };
  protoOf(QualifiedNewOtrMessage).component3_7eebsa_k$ = function () {
    return this.nativePush;
  };
  protoOf(QualifiedNewOtrMessage).component4_7eebs9_k$ = function () {
    return this.blob;
  };
  protoOf(QualifiedNewOtrMessage).component5_7eebs8_k$ = function () {
    return this.nativePriority;
  };
  protoOf(QualifiedNewOtrMessage).component6_7eebs7_k$ = function () {
    return this.transient;
  };
  protoOf(QualifiedNewOtrMessage).component7_7eebs6_k$ = function () {
    return this.clientMismatchStrategy;
  };
  protoOf(QualifiedNewOtrMessage).component8_7eebs5_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(QualifiedNewOtrMessage).copy_5172ix_k$ = function (
    sender,
    recipients,
    nativePush,
    blob,
    nativePriority,
    transient,
    clientMismatchStrategy,
    unknownFields,
  ) {
    return new QualifiedNewOtrMessage(
      sender,
      recipients,
      nativePush,
      blob,
      nativePriority,
      transient,
      clientMismatchStrategy,
      unknownFields,
    );
  };
  protoOf(QualifiedNewOtrMessage).copy = function (
    sender,
    recipients,
    nativePush,
    blob,
    nativePriority,
    transient,
    clientMismatchStrategy,
    unknownFields,
    $super,
  ) {
    sender = sender === VOID ? this.sender : sender;
    recipients = recipients === VOID ? this.recipients : recipients;
    nativePush = nativePush === VOID ? this.nativePush : nativePush;
    blob = blob === VOID ? this.blob : blob;
    nativePriority = nativePriority === VOID ? this.nativePriority : nativePriority;
    transient = transient === VOID ? this.transient : transient;
    clientMismatchStrategy = clientMismatchStrategy === VOID ? this.clientMismatchStrategy : clientMismatchStrategy;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_5172ix_k$(
      sender,
      recipients,
      nativePush,
      blob,
      nativePriority,
      transient,
      clientMismatchStrategy,
      unknownFields,
    );
  };
  protoOf(QualifiedNewOtrMessage).toString = function () {
    return (
      'QualifiedNewOtrMessage(sender=' +
      this.sender +
      ', recipients=' +
      this.recipients +
      ', nativePush=' +
      this.nativePush +
      ', blob=' +
      this.blob +
      ', nativePriority=' +
      this.nativePriority +
      ', transient=' +
      this.transient +
      ', clientMismatchStrategy=' +
      this.clientMismatchStrategy +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(QualifiedNewOtrMessage).hashCode = function () {
    var result = this.sender.hashCode();
    result = (imul(result, 31) + hashCode(this.recipients)) | 0;
    result = (imul(result, 31) + (this.nativePush == null ? 0 : getBooleanHashCode(this.nativePush))) | 0;
    result = (imul(result, 31) + (this.blob == null ? 0 : this.blob.hashCode())) | 0;
    result = (imul(result, 31) + (this.nativePriority == null ? 0 : this.nativePriority.hashCode())) | 0;
    result = (imul(result, 31) + (this.transient == null ? 0 : getBooleanHashCode(this.transient))) | 0;
    result =
      (imul(result, 31) + (this.clientMismatchStrategy == null ? 0 : this.clientMismatchStrategy.hashCode())) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(QualifiedNewOtrMessage).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof QualifiedNewOtrMessage)) return false;
    var tmp0_other_with_cast = other instanceof QualifiedNewOtrMessage ? other : THROW_CCE();
    if (!this.sender.equals(tmp0_other_with_cast.sender)) return false;
    if (!equals(this.recipients, tmp0_other_with_cast.recipients)) return false;
    if (!(this.nativePush == tmp0_other_with_cast.nativePush)) return false;
    if (!equals(this.blob, tmp0_other_with_cast.blob)) return false;
    if (!equals(this.nativePriority, tmp0_other_with_cast.nativePriority)) return false;
    if (!(this.transient == tmp0_other_with_cast.transient)) return false;
    if (!equals(this.clientMismatchStrategy, tmp0_other_with_cast.clientMismatchStrategy)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ClientMismatchStrategy$Companion$defaultInstance$delegate$lambda() {
    return new ClientMismatchStrategy_0();
  }
  function ClientMismatchStrategy$ReportAll$Companion$defaultInstance$delegate$lambda() {
    return new ReportAll_0();
  }
  function Companion_72() {
    Companion_instance_70 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ClientMismatchStrategy$ReportAll$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(ReportAll_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(0);
    // Inline function 'kotlin.apply' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp$ret$3 = ArrayList_init_$Create$(0).build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('proteus.ClientMismatchStrategy.ReportAll', tmp_1, this, tmp$ret$3);
  }
  protoOf(Companion_72).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_10();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_72).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_60(Companion_getInstance_72(), u);
  };
  protoOf(Companion_72).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_70;
  function Companion_getInstance_72() {
    if (Companion_instance_70 == null) new Companion_72();
    return Companion_instance_70;
  }
  function ClientMismatchStrategy$ReportAll$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ClientMismatchStrategy$IgnoreAll$Companion$defaultInstance$delegate$lambda() {
    return new IgnoreAll_0();
  }
  function Companion_73() {
    Companion_instance_71 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ClientMismatchStrategy$IgnoreAll$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(IgnoreAll_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(0);
    // Inline function 'kotlin.apply' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp$ret$3 = ArrayList_init_$Create$(0).build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('proteus.ClientMismatchStrategy.IgnoreAll', tmp_1, this, tmp$ret$3);
  }
  protoOf(Companion_73).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_11();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_73).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_61(Companion_getInstance_73(), u);
  };
  protoOf(Companion_73).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_71;
  function Companion_getInstance_73() {
    if (Companion_instance_71 == null) new Companion_73();
    return Companion_instance_71;
  }
  function ClientMismatchStrategy$IgnoreAll$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ClientMismatchStrategy$ReportOnly$Companion$defaultInstance$delegate$lambda() {
    return new ReportOnly_0();
  }
  function Companion_74() {
    Companion_instance_72 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ClientMismatchStrategy$ReportOnly$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(ReportOnly_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_233(this);
    var tmp1_type = new Repeated(new Message(Companion_getInstance_65()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'user_ids', 1, tmp1_type, userIds$factory(), VOID, 'userIds'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('proteus.ClientMismatchStrategy.ReportOnly', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_74).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_12();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_74).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_62(Companion_getInstance_74(), u);
  };
  protoOf(Companion_74).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_72;
  function Companion_getInstance_74() {
    if (Companion_instance_72 == null) new Companion_74();
    return Companion_instance_72;
  }
  function ClientMismatchStrategy$ReportOnly$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ClientMismatchStrategy$IgnoreOnly$Companion$defaultInstance$delegate$lambda() {
    return new IgnoreOnly_0();
  }
  function Companion_75() {
    Companion_instance_73 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ClientMismatchStrategy$IgnoreOnly$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(IgnoreOnly_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(1);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(1);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_234(this);
    var tmp1_type = new Repeated(new Message(Companion_getInstance_65()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'user_ids', 1, tmp1_type, userIds$factory_0(), VOID, 'userIds'),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('proteus.ClientMismatchStrategy.IgnoreOnly', tmp_1, this, tmp$ret$2);
  }
  protoOf(Companion_75).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_13();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_75).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_63(Companion_getInstance_75(), u);
  };
  protoOf(Companion_75).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_73;
  function Companion_getInstance_75() {
    if (Companion_instance_73 == null) new Companion_75();
    return Companion_instance_73;
  }
  function ClientMismatchStrategy$IgnoreOnly$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function Companion_76() {
    Companion_instance_74 = this;
    var tmp = this;
    tmp.defaultInstance$delegate_1 = lazy(ClientMismatchStrategy$Companion$defaultInstance$delegate$lambda);
    var tmp_0 = this;
    var tmp_1 = getKClass(ClientMismatchStrategy_0);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(0);
    // Inline function 'kotlin.apply' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp$ret$3 = ArrayList_init_$Create$(0).build_1k0s4u_k$();
    tmp_0.descriptor_1 = new MessageDescriptor('proteus.ClientMismatchStrategy', tmp_1, this, tmp$ret$3);
  }
  protoOf(Companion_76).get_defaultInstance_axha8d_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.defaultInstance$delegate_1;
    defaultInstance$factory_9();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(Companion_76).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_59(Companion_getInstance_76(), u);
  };
  protoOf(Companion_76).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_74;
  function Companion_getInstance_76() {
    if (Companion_instance_74 == null) new Companion_76();
    return Companion_instance_74;
  }
  function ReportAll_0(unknownFields) {
    Companion_getInstance_72();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientMismatchStrategy$ReportAll$protoSize$delegate$lambda(this));
  }
  protoOf(ReportAll_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ReportAll_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_60(this, other);
  };
  protoOf(ReportAll_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_72().descriptor_1;
  };
  protoOf(ReportAll_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_60();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ReportAll_0).component1_7eebsc_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ReportAll_0).copy_pjnxbm_k$ = function (unknownFields) {
    return new ReportAll_0(unknownFields);
  };
  protoOf(ReportAll_0).copy = function (unknownFields, $super) {
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_pjnxbm_k$(unknownFields);
  };
  protoOf(ReportAll_0).toString = function () {
    return 'ReportAll(unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(ReportAll_0).hashCode = function () {
    return hashCode(this.unknownFields_1);
  };
  protoOf(ReportAll_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ReportAll_0)) return false;
    var tmp0_other_with_cast = other instanceof ReportAll_0 ? other : THROW_CCE();
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function IgnoreAll_0(unknownFields) {
    Companion_getInstance_73();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientMismatchStrategy$IgnoreAll$protoSize$delegate$lambda(this));
  }
  protoOf(IgnoreAll_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(IgnoreAll_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_61(this, other);
  };
  protoOf(IgnoreAll_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_73().descriptor_1;
  };
  protoOf(IgnoreAll_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_61();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(IgnoreAll_0).component1_7eebsc_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(IgnoreAll_0).copy_pjnxbm_k$ = function (unknownFields) {
    return new IgnoreAll_0(unknownFields);
  };
  protoOf(IgnoreAll_0).copy = function (unknownFields, $super) {
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_pjnxbm_k$(unknownFields);
  };
  protoOf(IgnoreAll_0).toString = function () {
    return 'IgnoreAll(unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(IgnoreAll_0).hashCode = function () {
    return hashCode(this.unknownFields_1);
  };
  protoOf(IgnoreAll_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof IgnoreAll_0)) return false;
    var tmp0_other_with_cast = other instanceof IgnoreAll_0 ? other : THROW_CCE();
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ReportOnly_0(userIds, unknownFields) {
    Companion_getInstance_74();
    userIds = userIds === VOID ? emptyList() : userIds;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.userIds = userIds;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientMismatchStrategy$ReportOnly$protoSize$delegate$lambda(this));
  }
  protoOf(ReportOnly_0).get_userIds_1622v0_k$ = function () {
    return this.userIds;
  };
  protoOf(ReportOnly_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ReportOnly_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_62(this, other);
  };
  protoOf(ReportOnly_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_74().descriptor_1;
  };
  protoOf(ReportOnly_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_62();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ReportOnly_0).component1_7eebsc_k$ = function () {
    return this.userIds;
  };
  protoOf(ReportOnly_0).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ReportOnly_0).copy_tofqqy_k$ = function (userIds, unknownFields) {
    return new ReportOnly_0(userIds, unknownFields);
  };
  protoOf(ReportOnly_0).copy = function (userIds, unknownFields, $super) {
    userIds = userIds === VOID ? this.userIds : userIds;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_tofqqy_k$(userIds, unknownFields);
  };
  protoOf(ReportOnly_0).toString = function () {
    return 'ReportOnly(userIds=' + this.userIds + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(ReportOnly_0).hashCode = function () {
    var result = hashCode(this.userIds);
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(ReportOnly_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ReportOnly_0)) return false;
    var tmp0_other_with_cast = other instanceof ReportOnly_0 ? other : THROW_CCE();
    if (!equals(this.userIds, tmp0_other_with_cast.userIds)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function IgnoreOnly_0(userIds, unknownFields) {
    Companion_getInstance_75();
    userIds = userIds === VOID ? emptyList() : userIds;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.userIds = userIds;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientMismatchStrategy$IgnoreOnly$protoSize$delegate$lambda(this));
  }
  protoOf(IgnoreOnly_0).get_userIds_1622v0_k$ = function () {
    return this.userIds;
  };
  protoOf(IgnoreOnly_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(IgnoreOnly_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_63(this, other);
  };
  protoOf(IgnoreOnly_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_75().descriptor_1;
  };
  protoOf(IgnoreOnly_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_63();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(IgnoreOnly_0).component1_7eebsc_k$ = function () {
    return this.userIds;
  };
  protoOf(IgnoreOnly_0).component2_7eebsb_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(IgnoreOnly_0).copy_tofqqy_k$ = function (userIds, unknownFields) {
    return new IgnoreOnly_0(userIds, unknownFields);
  };
  protoOf(IgnoreOnly_0).copy = function (userIds, unknownFields, $super) {
    userIds = userIds === VOID ? this.userIds : userIds;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_tofqqy_k$(userIds, unknownFields);
  };
  protoOf(IgnoreOnly_0).toString = function () {
    return 'IgnoreOnly(userIds=' + this.userIds + ', unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(IgnoreOnly_0).hashCode = function () {
    var result = hashCode(this.userIds);
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(IgnoreOnly_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof IgnoreOnly_0)) return false;
    var tmp0_other_with_cast = other instanceof IgnoreOnly_0 ? other : THROW_CCE();
    if (!equals(this.userIds, tmp0_other_with_cast.userIds)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function ClientMismatchStrategy$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function ClientMismatchStrategy_0(unknownFields) {
    Companion_getInstance_76();
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(ClientMismatchStrategy$protoSize$delegate$lambda(this));
  }
  protoOf(ClientMismatchStrategy_0).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ClientMismatchStrategy_0).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_59(this, other);
  };
  protoOf(ClientMismatchStrategy_0).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_76().descriptor_1;
  };
  protoOf(ClientMismatchStrategy_0).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_59();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(ClientMismatchStrategy_0).component1_7eebsc_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(ClientMismatchStrategy_0).copy_pjnxbm_k$ = function (unknownFields) {
    return new ClientMismatchStrategy_0(unknownFields);
  };
  protoOf(ClientMismatchStrategy_0).copy = function (unknownFields, $super) {
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_pjnxbm_k$(unknownFields);
  };
  protoOf(ClientMismatchStrategy_0).toString = function () {
    return 'ClientMismatchStrategy(unknownFields=' + this.unknownFields_1 + ')';
  };
  protoOf(ClientMismatchStrategy_0).hashCode = function () {
    return hashCode(this.unknownFields_1);
  };
  protoOf(ClientMismatchStrategy_0).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof ClientMismatchStrategy_0)) return false;
    var tmp0_other_with_cast = other instanceof ClientMismatchStrategy_0 ? other : THROW_CCE();
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function Companion_77() {
    Companion_instance_75 = this;
    var tmp = this;
    var tmp_0 = getKClass(OtrAssetMeta);
    // Inline function 'kotlin.collections.buildList' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.collections.buildListInternal' call
    checkBuilderCapacity(4);
    // Inline function 'kotlin.apply' call
    var this_0 = ArrayList_init_$Create$(4);
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'com.wire.kalium.protobuf.otr.Companion.descriptor.<anonymous>' call
    var tmp0_messageDescriptor = descriptor$factory_235(this);
    var tmp1_type = new Message(Companion_getInstance_66());
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp0_messageDescriptor, 'sender', 1, tmp1_type, sender$factory_1(), VOID, 'sender'),
    );
    var tmp2_messageDescriptor = descriptor$factory_236(this);
    var tmp3_type = new Repeated(new Message(Companion_getInstance_68()));
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp2_messageDescriptor,
        'recipients',
        2,
        tmp3_type,
        recipients$factory_1(),
        VOID,
        'recipients',
      ),
    );
    var tmp4_messageDescriptor = descriptor$factory_237(this);
    var tmp5_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(tmp4_messageDescriptor, 'isInline', 3, tmp5_type, isInline$factory(), VOID, 'isInline'),
    );
    var tmp6_messageDescriptor = descriptor$factory_238(this);
    var tmp7_type = new Bool(true);
    this_0.add_utx5q5_k$(
      new FieldDescriptor(
        tmp6_messageDescriptor,
        'native_push',
        4,
        tmp7_type,
        nativePush$factory_1(),
        VOID,
        'nativePush',
      ),
    );
    var tmp$ret$2 = this_0.build_1k0s4u_k$();
    tmp.descriptor_1 = new MessageDescriptor('proteus.OtrAssetMeta', tmp_0, this, tmp$ret$2);
  }
  protoOf(Companion_77).decodeWith_xpfz54_k$ = function (u) {
    return decodeWithImpl_64(Companion_getInstance_77(), u);
  };
  protoOf(Companion_77).get_descriptor_wjt6a0_k$ = function () {
    return this.descriptor_1;
  };
  var Companion_instance_75;
  function Companion_getInstance_77() {
    if (Companion_instance_75 == null) new Companion_77();
    return Companion_instance_75;
  }
  function OtrAssetMeta$protoSize$delegate$lambda(this$0) {
    return function () {
      return get_protoSize.call(this$0);
    };
  }
  function OtrAssetMeta(sender, recipients, isInline, nativePush, unknownFields) {
    Companion_getInstance_77();
    recipients = recipients === VOID ? emptyList() : recipients;
    isInline = isInline === VOID ? null : isInline;
    nativePush = nativePush === VOID ? null : nativePush;
    unknownFields = unknownFields === VOID ? emptyMap() : unknownFields;
    this.sender = sender;
    this.recipients = recipients;
    this.isInline = isInline;
    this.nativePush = nativePush;
    this.unknownFields_1 = unknownFields;
    var tmp = this;
    tmp.protoSize$delegate_1 = lazy(OtrAssetMeta$protoSize$delegate$lambda(this));
  }
  protoOf(OtrAssetMeta).get_sender_jfe81q_k$ = function () {
    return this.sender;
  };
  protoOf(OtrAssetMeta).get_recipients_px0n3x_k$ = function () {
    return this.recipients;
  };
  protoOf(OtrAssetMeta).get_isInline_usk17w_k$ = function () {
    return this.isInline;
  };
  protoOf(OtrAssetMeta).get_nativePush_v5u7ve_k$ = function () {
    return this.nativePush;
  };
  protoOf(OtrAssetMeta).get_unknownFields_kpu7i2_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(OtrAssetMeta).plus_fj0q1z_k$ = function (other) {
    return protoMergeImpl_64(this, other);
  };
  protoOf(OtrAssetMeta).get_descriptor_wjt6a0_k$ = function () {
    return Companion_getInstance_77().descriptor_1;
  };
  protoOf(OtrAssetMeta).get_protoSize_1ekskg_k$ = function () {
    // Inline function 'kotlin.getValue' call
    var this_0 = this.protoSize$delegate_1;
    protoSize$factory_64();
    return this_0.get_value_j01efc_k$();
  };
  protoOf(OtrAssetMeta).component1_7eebsc_k$ = function () {
    return this.sender;
  };
  protoOf(OtrAssetMeta).component2_7eebsb_k$ = function () {
    return this.recipients;
  };
  protoOf(OtrAssetMeta).component3_7eebsa_k$ = function () {
    return this.isInline;
  };
  protoOf(OtrAssetMeta).component4_7eebs9_k$ = function () {
    return this.nativePush;
  };
  protoOf(OtrAssetMeta).component5_7eebs8_k$ = function () {
    return this.unknownFields_1;
  };
  protoOf(OtrAssetMeta).copy_xbg0rc_k$ = function (sender, recipients, isInline, nativePush, unknownFields) {
    return new OtrAssetMeta(sender, recipients, isInline, nativePush, unknownFields);
  };
  protoOf(OtrAssetMeta).copy = function (sender, recipients, isInline, nativePush, unknownFields, $super) {
    sender = sender === VOID ? this.sender : sender;
    recipients = recipients === VOID ? this.recipients : recipients;
    isInline = isInline === VOID ? this.isInline : isInline;
    nativePush = nativePush === VOID ? this.nativePush : nativePush;
    unknownFields = unknownFields === VOID ? this.unknownFields_1 : unknownFields;
    return this.copy_xbg0rc_k$(sender, recipients, isInline, nativePush, unknownFields);
  };
  protoOf(OtrAssetMeta).toString = function () {
    return (
      'OtrAssetMeta(sender=' +
      this.sender +
      ', recipients=' +
      this.recipients +
      ', isInline=' +
      this.isInline +
      ', nativePush=' +
      this.nativePush +
      ', unknownFields=' +
      this.unknownFields_1 +
      ')'
    );
  };
  protoOf(OtrAssetMeta).hashCode = function () {
    var result = this.sender.hashCode();
    result = (imul(result, 31) + hashCode(this.recipients)) | 0;
    result = (imul(result, 31) + (this.isInline == null ? 0 : getBooleanHashCode(this.isInline))) | 0;
    result = (imul(result, 31) + (this.nativePush == null ? 0 : getBooleanHashCode(this.nativePush))) | 0;
    result = (imul(result, 31) + hashCode(this.unknownFields_1)) | 0;
    return result;
  };
  protoOf(OtrAssetMeta).equals = function (other) {
    if (this === other) return true;
    if (!(other instanceof OtrAssetMeta)) return false;
    var tmp0_other_with_cast = other instanceof OtrAssetMeta ? other : THROW_CCE();
    if (!this.sender.equals(tmp0_other_with_cast.sender)) return false;
    if (!equals(this.recipients, tmp0_other_with_cast.recipients)) return false;
    if (!(this.isInline == tmp0_other_with_cast.isInline)) return false;
    if (!(this.nativePush == tmp0_other_with_cast.nativePush)) return false;
    if (!equals(this.unknownFields_1, tmp0_other_with_cast.unknownFields_1)) return false;
    return true;
  };
  function orDefaultForClientMismatchStrategy(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_76().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForClientMismatchStrategyReportAll(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_72().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForClientMismatchStrategyIgnoreAll(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_73().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForClientMismatchStrategyReportOnly(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_74().defaultInstance : _this__u8e3s4;
  }
  function orDefaultForClientMismatchStrategyIgnoreOnly(_this__u8e3s4) {
    return _this__u8e3s4 == null ? Companion_getInstance_75().defaultInstance : _this__u8e3s4;
  }
  function protoMergeImpl_51(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof UserId_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(VOID, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_51(_this__u8e3s4, u) {
    var uuid = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_51(uuid));
    if (uuid._v == null) {
      throw Companion_getInstance().missingRequiredField('uuid');
    }
    return new UserId_0(ensureNotNull(uuid._v), unknownFields);
  }
  function protoMergeImpl_52(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof QualifiedUserId_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_52(_this__u8e3s4, u) {
    var id = {_v: null};
    var domain = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_52(id, domain));
    if (id._v == null) {
      throw Companion_getInstance().missingRequiredField('id');
    }
    if (domain._v == null) {
      throw Companion_getInstance().missingRequiredField('domain');
    }
    return new QualifiedUserId_0(ensureNotNull(id._v), ensureNotNull(domain._v), unknownFields);
  }
  function protoMergeImpl_53(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ClientId ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(VOID, plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_53(_this__u8e3s4, u) {
    var client = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_53(client));
    if (client._v == null) {
      throw Companion_getInstance().missingRequiredField('client');
    }
    return new ClientId(ensureNotNull(client._v), unknownFields);
  }
  function protoMergeImpl_54(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ClientEntry ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        _this__u8e3s4.client.plus_fj0q1z_k$(plus.client),
        VOID,
        plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_54(_this__u8e3s4, u) {
    var client = {_v: null};
    var text = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_54(client, text));
    if (client._v == null) {
      throw Companion_getInstance().missingRequiredField('client');
    }
    if (text._v == null) {
      throw Companion_getInstance().missingRequiredField('text');
    }
    return new ClientEntry(ensureNotNull(client._v), ensureNotNull(text._v), unknownFields);
  }
  function protoMergeImpl_55(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof UserEntry ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        _this__u8e3s4.user.plus_fj0q1z_k$(plus_1.user),
        plus(_this__u8e3s4.clients, plus_1.clients),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_55(_this__u8e3s4, u) {
    var user = {_v: null};
    var clients = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_55(user, clients));
    if (user._v == null) {
      throw Companion_getInstance().missingRequiredField('user');
    }
    return new UserEntry(ensureNotNull(user._v), Companion_getInstance_0().fixed(clients._v), unknownFields);
  }
  function protoMergeImpl_56(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof QualifiedUserEntry ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        VOID,
        plus(_this__u8e3s4.entries, plus_1.entries),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_56(_this__u8e3s4, u) {
    var domain = {_v: null};
    var entries = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_56(domain, entries));
    if (domain._v == null) {
      throw Companion_getInstance().missingRequiredField('domain');
    }
    return new QualifiedUserEntry(ensureNotNull(domain._v), Companion_getInstance_0().fixed(entries._v), unknownFields);
  }
  function protoMergeImpl_57(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof NewOtrMessage ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      var tmp_0 = _this__u8e3s4.sender.plus_fj0q1z_k$(plus_1.sender);
      var tmp_1 = plus(_this__u8e3s4.recipients, plus_1.recipients);
      var tmp0_elvis_lhs = plus_1.nativePush;
      var tmp_2 = tmp0_elvis_lhs == null ? _this__u8e3s4.nativePush : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus_1.blob;
      var tmp_3 = tmp1_elvis_lhs == null ? _this__u8e3s4.blob : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus_1.nativePriority;
      var tmp_4 = tmp2_elvis_lhs == null ? _this__u8e3s4.nativePriority : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus_1.transient;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp_2,
        tmp_3,
        tmp_4,
        tmp3_elvis_lhs == null ? _this__u8e3s4.transient : tmp3_elvis_lhs,
        plus(_this__u8e3s4.reportMissing, plus_1.reportMissing),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_57(_this__u8e3s4, u) {
    var sender = {_v: null};
    var recipients = {_v: null};
    var nativePush = {_v: null};
    var blob = {_v: null};
    var nativePriority = {_v: null};
    var transient = {_v: null};
    var reportMissing = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_57(sender, recipients, nativePush, blob, nativePriority, transient, reportMissing),
    );
    if (sender._v == null) {
      throw Companion_getInstance().missingRequiredField('sender');
    }
    return new NewOtrMessage(
      ensureNotNull(sender._v),
      Companion_getInstance_0().fixed(recipients._v),
      nativePush._v,
      blob._v,
      nativePriority._v,
      transient._v,
      Companion_getInstance_0().fixed(reportMissing._v),
      unknownFields,
    );
  }
  function protoMergeImpl_58(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof QualifiedNewOtrMessage ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      var tmp_0 = _this__u8e3s4.sender.plus_fj0q1z_k$(plus_1.sender);
      var tmp_1 = plus(_this__u8e3s4.recipients, plus_1.recipients);
      var tmp0_elvis_lhs = plus_1.nativePush;
      var tmp_2 = tmp0_elvis_lhs == null ? _this__u8e3s4.nativePush : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus_1.blob;
      var tmp_3 = tmp1_elvis_lhs == null ? _this__u8e3s4.blob : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = plus_1.nativePriority;
      var tmp_4 = tmp2_elvis_lhs == null ? _this__u8e3s4.nativePriority : tmp2_elvis_lhs;
      var tmp3_elvis_lhs = plus_1.transient;
      var tmp_5 = tmp3_elvis_lhs == null ? _this__u8e3s4.transient : tmp3_elvis_lhs;
      var tmp_6;
      var tmp_7;
      var tmp_8 = _this__u8e3s4.clientMismatchStrategy;
      if (tmp_8 instanceof ReportAll) {
        var tmp_9 = plus_1.clientMismatchStrategy;
        tmp_7 = tmp_9 instanceof ReportAll;
      } else {
        tmp_7 = false;
      }
      if (tmp_7) {
        tmp_6 = new ReportAll(
          _this__u8e3s4.clientMismatchStrategy
            .get_value_j01efc_k$()
            .plus_fj0q1z_k$(plus_1.clientMismatchStrategy.get_value_j01efc_k$()),
        );
      } else {
        var tmp_10;
        var tmp_11 = _this__u8e3s4.clientMismatchStrategy;
        if (tmp_11 instanceof IgnoreAll) {
          var tmp_12 = plus_1.clientMismatchStrategy;
          tmp_10 = tmp_12 instanceof IgnoreAll;
        } else {
          tmp_10 = false;
        }
        if (tmp_10) {
          tmp_6 = new IgnoreAll(
            _this__u8e3s4.clientMismatchStrategy
              .get_value_j01efc_k$()
              .plus_fj0q1z_k$(plus_1.clientMismatchStrategy.get_value_j01efc_k$()),
          );
        } else {
          var tmp_13;
          var tmp_14 = _this__u8e3s4.clientMismatchStrategy;
          if (tmp_14 instanceof ReportOnly) {
            var tmp_15 = plus_1.clientMismatchStrategy;
            tmp_13 = tmp_15 instanceof ReportOnly;
          } else {
            tmp_13 = false;
          }
          if (tmp_13) {
            tmp_6 = new ReportOnly(
              _this__u8e3s4.clientMismatchStrategy
                .get_value_j01efc_k$()
                .plus_fj0q1z_k$(plus_1.clientMismatchStrategy.get_value_j01efc_k$()),
            );
          } else {
            var tmp_16;
            var tmp_17 = _this__u8e3s4.clientMismatchStrategy;
            if (tmp_17 instanceof IgnoreOnly) {
              var tmp_18 = plus_1.clientMismatchStrategy;
              tmp_16 = tmp_18 instanceof IgnoreOnly;
            } else {
              tmp_16 = false;
            }
            if (tmp_16) {
              tmp_6 = new IgnoreOnly(
                _this__u8e3s4.clientMismatchStrategy
                  .get_value_j01efc_k$()
                  .plus_fj0q1z_k$(plus_1.clientMismatchStrategy.get_value_j01efc_k$()),
              );
            } else {
              var tmp4_elvis_lhs = plus_1.clientMismatchStrategy;
              tmp_6 = tmp4_elvis_lhs == null ? _this__u8e3s4.clientMismatchStrategy : tmp4_elvis_lhs;
            }
          }
        }
      }
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp_2,
        tmp_3,
        tmp_4,
        tmp_5,
        tmp_6,
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_58(_this__u8e3s4, u) {
    var sender = {_v: null};
    var recipients = {_v: null};
    var nativePush = {_v: null};
    var blob = {_v: null};
    var nativePriority = {_v: null};
    var transient = {_v: null};
    var clientMismatchStrategy = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_58(sender, recipients, nativePush, blob, nativePriority, transient, clientMismatchStrategy),
    );
    if (sender._v == null) {
      throw Companion_getInstance().missingRequiredField('sender');
    }
    return new QualifiedNewOtrMessage(
      ensureNotNull(sender._v),
      Companion_getInstance_0().fixed(recipients._v),
      nativePush._v,
      blob._v,
      nativePriority._v,
      transient._v,
      clientMismatchStrategy._v,
      unknownFields,
    );
  }
  function protoMergeImpl_59(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ClientMismatchStrategy_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_59(_this__u8e3s4, u) {
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_59);
    return new ClientMismatchStrategy_0(unknownFields);
  }
  function protoMergeImpl_60(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof ReportAll_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_60(_this__u8e3s4, u) {
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_60);
    return new ReportAll_0(unknownFields);
  }
  function protoMergeImpl_61(_this__u8e3s4, plus) {
    var tmp0_safe_receiver = plus instanceof IgnoreAll_0 ? plus : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(plus_0(_this__u8e3s4.unknownFields_1, plus.get_unknownFields_kpu7i2_k$()));
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_61(_this__u8e3s4, u) {
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_61);
    return new IgnoreAll_0(unknownFields);
  }
  function protoMergeImpl_62(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof ReportOnly_0 ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        plus(_this__u8e3s4.userIds, plus_1.userIds),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_62(_this__u8e3s4, u) {
    var userIds = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_62(userIds));
    return new ReportOnly_0(Companion_getInstance_0().fixed(userIds._v), unknownFields);
  }
  function protoMergeImpl_63(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof IgnoreOnly_0 ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      tmp = tmp0_safe_receiver.copy(
        plus(_this__u8e3s4.userIds, plus_1.userIds),
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs = tmp;
    return tmp1_elvis_lhs == null ? _this__u8e3s4 : tmp1_elvis_lhs;
  }
  function decodeWithImpl_63(_this__u8e3s4, u) {
    var userIds = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(_this__u8e3s4, decodeWithImpl$lambda_63(userIds));
    return new IgnoreOnly_0(Companion_getInstance_0().fixed(userIds._v), unknownFields);
  }
  function protoMergeImpl_64(_this__u8e3s4, plus_1) {
    var tmp0_safe_receiver = plus_1 instanceof OtrAssetMeta ? plus_1 : null;
    var tmp;
    if (tmp0_safe_receiver == null) {
      tmp = null;
    } else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'com.wire.kalium.protobuf.otr.protoMergeImpl.<anonymous>' call
      var tmp_0 = _this__u8e3s4.sender.plus_fj0q1z_k$(plus_1.sender);
      var tmp_1 = plus(_this__u8e3s4.recipients, plus_1.recipients);
      var tmp0_elvis_lhs = plus_1.isInline;
      var tmp_2 = tmp0_elvis_lhs == null ? _this__u8e3s4.isInline : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = plus_1.nativePush;
      tmp = tmp0_safe_receiver.copy(
        tmp_0,
        tmp_1,
        tmp_2,
        tmp1_elvis_lhs == null ? _this__u8e3s4.nativePush : tmp1_elvis_lhs,
        plus_0(_this__u8e3s4.unknownFields_1, plus_1.get_unknownFields_kpu7i2_k$()),
      );
    }
    var tmp1_elvis_lhs_0 = tmp;
    return tmp1_elvis_lhs_0 == null ? _this__u8e3s4 : tmp1_elvis_lhs_0;
  }
  function decodeWithImpl_64(_this__u8e3s4, u) {
    var sender = {_v: null};
    var recipients = {_v: null};
    var isInline = {_v: null};
    var nativePush = {_v: null};
    var unknownFields = u.readMessage_fttc7y_k$(
      _this__u8e3s4,
      decodeWithImpl$lambda_64(sender, recipients, isInline, nativePush),
    );
    if (sender._v == null) {
      throw Companion_getInstance().missingRequiredField('sender');
    }
    return new OtrAssetMeta(
      ensureNotNull(sender._v),
      Companion_getInstance_0().fixed(recipients._v),
      isInline._v,
      nativePush._v,
      unknownFields,
    );
  }
  function decodeWithImpl$lambda_51($uuid) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $uuid._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_52($id, $domain) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $id._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $domain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_53($client) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $client._v = _fieldValue instanceof Long ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_54($client, $text) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $client._v = _fieldValue instanceof ClientId ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        $text._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_55($user, $clients) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $user._v = _fieldValue instanceof UserId_0 ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        // Inline function 'kotlin.apply' call
        var tmp1_elvis_lhs = $clients._v;
        var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call
        // Inline function 'kotlin.collections.plusAssign' call
        var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
        addAll(this_0, elements);
        $clients._v = this_0;
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_56($domain, $entries) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        $domain._v = typeof _fieldValue === 'string' ? _fieldValue : THROW_CCE();
        tmp = Unit_getInstance();
      } else if (_fieldNumber === 2) {
        // Inline function 'kotlin.apply' call
        var tmp1_elvis_lhs = $entries._v;
        var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call
        // Inline function 'kotlin.collections.plusAssign' call
        var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
        addAll(this_0, elements);
        $entries._v = this_0;
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_57(
    $sender,
    $recipients,
    $nativePush,
    $blob,
    $nativePriority,
    $transient,
    $reportMissing,
  ) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $sender._v = _fieldValue instanceof ClientId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $recipients._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $recipients._v = this_0;
          tmp = Unit_getInstance();
          break;
        case 3:
          $nativePush._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $blob._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $nativePriority._v = _fieldValue instanceof Priority ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $transient._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          // Inline function 'kotlin.apply' call

          var tmp2_elvis_lhs = $reportMissing._v;
          var this_1 = tmp2_elvis_lhs == null ? init() : tmp2_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements_0 = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_1, elements_0);
          $reportMissing._v = this_1;
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_58(
    $sender,
    $recipients,
    $nativePush,
    $blob,
    $nativePriority,
    $transient,
    $clientMismatchStrategy,
  ) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $sender._v = _fieldValue instanceof ClientId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $recipients._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $recipients._v = this_0;
          tmp = Unit_getInstance();
          break;
        case 3:
          $nativePush._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $blob._v = _fieldValue instanceof ByteArr ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 5:
          $nativePriority._v = _fieldValue instanceof Priority ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 6:
          $transient._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 7:
          $clientMismatchStrategy._v = new ReportAll(_fieldValue instanceof ReportAll_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 8:
          $clientMismatchStrategy._v = new IgnoreAll(_fieldValue instanceof IgnoreAll_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 9:
          $clientMismatchStrategy._v = new ReportOnly(_fieldValue instanceof ReportOnly_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
        case 10:
          $clientMismatchStrategy._v = new IgnoreOnly(_fieldValue instanceof IgnoreOnly_0 ? _fieldValue : THROW_CCE());
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_59(_anonymous_parameter_0__qggqh8, _anonymous_parameter_1__qggqgd) {
    return Unit_getInstance();
  }
  function decodeWithImpl$lambda_60(_anonymous_parameter_0__qggqh8, _anonymous_parameter_1__qggqgd) {
    return Unit_getInstance();
  }
  function decodeWithImpl$lambda_61(_anonymous_parameter_0__qggqh8, _anonymous_parameter_1__qggqgd) {
    return Unit_getInstance();
  }
  function decodeWithImpl$lambda_62($userIds) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        // Inline function 'kotlin.apply' call
        var tmp1_elvis_lhs = $userIds._v;
        var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call
        // Inline function 'kotlin.collections.plusAssign' call
        var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
        addAll(this_0, elements);
        $userIds._v = this_0;
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_63($userIds) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      if (_fieldNumber === 1) {
        // Inline function 'kotlin.apply' call
        var tmp1_elvis_lhs = $userIds._v;
        var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call
        // Inline function 'kotlin.collections.plusAssign' call
        var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
        addAll(this_0, elements);
        $userIds._v = this_0;
        tmp = Unit_getInstance();
      }
      return Unit_getInstance();
    };
  }
  function decodeWithImpl$lambda_64($sender, $recipients, $isInline, $nativePush) {
    return function (_fieldNumber, _fieldValue) {
      var tmp;
      switch (_fieldNumber) {
        case 1:
          $sender._v = _fieldValue instanceof ClientId ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 2:
          // Inline function 'kotlin.apply' call

          var tmp1_elvis_lhs = $recipients._v;
          var this_0 = tmp1_elvis_lhs == null ? init() : tmp1_elvis_lhs;
          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'com.wire.kalium.protobuf.otr.decodeWithImpl.<anonymous>.<anonymous>' call

          // Inline function 'kotlin.collections.plusAssign' call

          var elements = isInterface(_fieldValue, Sequence) ? _fieldValue : THROW_CCE();
          addAll(this_0, elements);
          $recipients._v = this_0;
          tmp = Unit_getInstance();
          break;
        case 3:
          $isInline._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
        case 4:
          $nativePush._v = typeof _fieldValue === 'boolean' ? _fieldValue : THROW_CCE();
          tmp = Unit_getInstance();
          break;
      }
      return Unit_getInstance();
    };
  }
  function values$factory_9() {
    return getPropertyCallableRef(
      'values',
      1,
      KProperty1,
      function (receiver) {
        return receiver.values;
      },
      null,
    );
  }
  function protoSize$factory_51() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_206($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function uuid$factory() {
    return getPropertyCallableRef(
      'uuid',
      1,
      KProperty1,
      function (receiver) {
        return receiver.uuid;
      },
      null,
    );
  }
  function protoSize$factory_52() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_207($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function id$factory_5() {
    return getPropertyCallableRef(
      'id',
      1,
      KProperty1,
      function (receiver) {
        return receiver.id;
      },
      null,
    );
  }
  function descriptor$factory_208($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function domain$factory_2() {
    return getPropertyCallableRef(
      'domain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.domain;
      },
      null,
    );
  }
  function protoSize$factory_53() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_209($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function client$factory() {
    return getPropertyCallableRef(
      'client',
      1,
      KProperty1,
      function (receiver) {
        return receiver.client;
      },
      null,
    );
  }
  function protoSize$factory_54() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_210($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function client$factory_0() {
    return getPropertyCallableRef(
      'client',
      1,
      KProperty1,
      function (receiver) {
        return receiver.client;
      },
      null,
    );
  }
  function descriptor$factory_211($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function text$factory_5() {
    return getPropertyCallableRef(
      'text',
      1,
      KProperty1,
      function (receiver) {
        return receiver.text;
      },
      null,
    );
  }
  function protoSize$factory_55() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_212($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function user$factory() {
    return getPropertyCallableRef(
      'user',
      1,
      KProperty1,
      function (receiver) {
        return receiver.user;
      },
      null,
    );
  }
  function descriptor$factory_213($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function clients$factory() {
    return getPropertyCallableRef(
      'clients',
      1,
      KProperty1,
      function (receiver) {
        return receiver.clients;
      },
      null,
    );
  }
  function protoSize$factory_56() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_214($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function domain$factory_3() {
    return getPropertyCallableRef(
      'domain',
      1,
      KProperty1,
      function (receiver) {
        return receiver.domain;
      },
      null,
    );
  }
  function descriptor$factory_215($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function entries$factory() {
    return getPropertyCallableRef(
      'entries',
      1,
      KProperty1,
      function (receiver) {
        return receiver.entries;
      },
      null,
    );
  }
  function protoSize$factory_57() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_216($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sender$factory() {
    return getPropertyCallableRef(
      'sender',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sender;
      },
      null,
    );
  }
  function descriptor$factory_217($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function recipients$factory() {
    return getPropertyCallableRef(
      'recipients',
      1,
      KProperty1,
      function (receiver) {
        return receiver.recipients;
      },
      null,
    );
  }
  function descriptor$factory_218($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function nativePush$factory() {
    return getPropertyCallableRef(
      'nativePush',
      1,
      KProperty1,
      function (receiver) {
        return receiver.nativePush;
      },
      null,
    );
  }
  function descriptor$factory_219($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function blob$factory() {
    return getPropertyCallableRef(
      'blob',
      1,
      KProperty1,
      function (receiver) {
        return receiver.blob;
      },
      null,
    );
  }
  function descriptor$factory_220($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function nativePriority$factory() {
    return getPropertyCallableRef(
      'nativePriority',
      1,
      KProperty1,
      function (receiver) {
        return receiver.nativePriority;
      },
      null,
    );
  }
  function descriptor$factory_221($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function transient$factory() {
    return getPropertyCallableRef(
      'transient',
      1,
      KProperty1,
      function (receiver) {
        return receiver.transient;
      },
      null,
    );
  }
  function descriptor$factory_222($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function reportMissing$factory() {
    return getPropertyCallableRef(
      'reportMissing',
      1,
      KProperty1,
      function (receiver) {
        return receiver.reportMissing;
      },
      null,
    );
  }
  function protoSize$factory_58() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_223($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sender$factory_0() {
    return getPropertyCallableRef(
      'sender',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sender;
      },
      null,
    );
  }
  function descriptor$factory_224($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function recipients$factory_0() {
    return getPropertyCallableRef(
      'recipients',
      1,
      KProperty1,
      function (receiver) {
        return receiver.recipients;
      },
      null,
    );
  }
  function descriptor$factory_225($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function nativePush$factory_0() {
    return getPropertyCallableRef(
      'nativePush',
      1,
      KProperty1,
      function (receiver) {
        return receiver.nativePush;
      },
      null,
    );
  }
  function descriptor$factory_226($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function blob$factory_0() {
    return getPropertyCallableRef(
      'blob',
      1,
      KProperty1,
      function (receiver) {
        return receiver.blob;
      },
      null,
    );
  }
  function descriptor$factory_227($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function nativePriority$factory_0() {
    return getPropertyCallableRef(
      'nativePriority',
      1,
      KProperty1,
      function (receiver) {
        return receiver.nativePriority;
      },
      null,
    );
  }
  function descriptor$factory_228($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function transient$factory_0() {
    return getPropertyCallableRef(
      'transient',
      1,
      KProperty1,
      function (receiver) {
        return receiver.transient;
      },
      null,
    );
  }
  function descriptor$factory_229($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function reportAll$factory() {
    return getPropertyCallableRef(
      'reportAll',
      1,
      KProperty1,
      function (receiver) {
        return receiver.reportAll;
      },
      null,
    );
  }
  function descriptor$factory_230($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function ignoreAll$factory() {
    return getPropertyCallableRef(
      'ignoreAll',
      1,
      KProperty1,
      function (receiver) {
        return receiver.ignoreAll;
      },
      null,
    );
  }
  function descriptor$factory_231($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function reportOnly$factory() {
    return getPropertyCallableRef(
      'reportOnly',
      1,
      KProperty1,
      function (receiver) {
        return receiver.reportOnly;
      },
      null,
    );
  }
  function descriptor$factory_232($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function ignoreOnly$factory() {
    return getPropertyCallableRef(
      'ignoreOnly',
      1,
      KProperty1,
      function (receiver) {
        return receiver.ignoreOnly;
      },
      null,
    );
  }
  function protoSize$factory_59() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function defaultInstance$factory_9() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_60() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function defaultInstance$factory_10() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_61() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function defaultInstance$factory_11() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_62() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_233($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function userIds$factory() {
    return getPropertyCallableRef(
      'userIds',
      1,
      KProperty1,
      function (receiver) {
        return receiver.userIds;
      },
      null,
    );
  }
  function defaultInstance$factory_12() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_63() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_234($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function userIds$factory_0() {
    return getPropertyCallableRef(
      'userIds',
      1,
      KProperty1,
      function (receiver) {
        return receiver.userIds;
      },
      null,
    );
  }
  function defaultInstance$factory_13() {
    return getPropertyCallableRef(
      'defaultInstance',
      1,
      KProperty1,
      function (receiver) {
        return receiver.defaultInstance;
      },
      null,
    );
  }
  function protoSize$factory_64() {
    return getPropertyCallableRef(
      'protoSize',
      1,
      KProperty1,
      function (receiver) {
        return receiver.get_protoSize_1ekskg_k$();
      },
      null,
    );
  }
  function descriptor$factory_235($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function sender$factory_1() {
    return getPropertyCallableRef(
      'sender',
      1,
      KProperty1,
      function (receiver) {
        return receiver.sender;
      },
      null,
    );
  }
  function descriptor$factory_236($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function recipients$factory_1() {
    return getPropertyCallableRef(
      'recipients',
      1,
      KProperty1,
      function (receiver) {
        return receiver.recipients;
      },
      null,
    );
  }
  function descriptor$factory_237($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function isInline$factory() {
    return getPropertyCallableRef(
      'isInline',
      1,
      KProperty1,
      function (receiver) {
        return receiver.isInline;
      },
      null,
    );
  }
  function descriptor$factory_238($b0) {
    return getPropertyCallableRef(
      'descriptor',
      0,
      KProperty0,
      function () {
        return $b0.descriptor_1;
      },
      null,
    );
  }
  function nativePush$factory_1() {
    return getPropertyCallableRef(
      'nativePush',
      1,
      KProperty1,
      function (receiver) {
        return receiver.nativePush;
      },
      null,
    );
  }
  //region block: post-declaration
  defineProp(protoOf(Companion_1), 'values', protoOf(Companion_1).get_values_ksazhn_k$);
  defineProp(protoOf(ExportedMessage), 'text', protoOf(ExportedMessage).get_text_wouvsm_k$);
  defineProp(protoOf(ExportedMessage), 'asset', protoOf(ExportedMessage).get_asset_iotcjr_k$);
  defineProp(protoOf(ExportedMessage), 'location', protoOf(ExportedMessage).get_location_d3s02_k$);
  defineProp(protoOf(ExportedAsset), 'image', protoOf(ExportedAsset).get_image_it3i2a_k$);
  defineProp(protoOf(ExportedAsset), 'video', protoOf(ExportedAsset).get_video_j06c0i_k$);
  defineProp(protoOf(ExportedAsset), 'audio', protoOf(ExportedAsset).get_audio_ioubhp_k$);
  defineProp(protoOf(ExportedAsset), 'generic', protoOf(ExportedAsset).get_generic_25wk2_k$);
  defineProp(protoOf(Companion_11), 'defaultInstance', protoOf(Companion_11).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_12), 'defaultInstance', protoOf(Companion_12).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_13), 'defaultInstance', protoOf(Companion_13).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_15), 'values', protoOf(Companion_15).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_16), 'values', protoOf(Companion_16).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_17), 'values', protoOf(Companion_17).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_18), 'values', protoOf(Companion_18).get_values_ksazhn_k$);
  defineProp(protoOf(GenericMessage), 'text', protoOf(GenericMessage).get_text_wouvsm_k$);
  defineProp(protoOf(GenericMessage), 'image', protoOf(GenericMessage).get_image_it3i2a_k$);
  defineProp(protoOf(GenericMessage), 'knock', protoOf(GenericMessage).get_knock_iu80iz_k$);
  defineProp(protoOf(GenericMessage), 'lastRead', protoOf(GenericMessage).get_lastRead_f38nit_k$);
  defineProp(protoOf(GenericMessage), 'cleared', protoOf(GenericMessage).get_cleared_ffnnwj_k$);
  defineProp(protoOf(GenericMessage), 'external', protoOf(GenericMessage).get_external_945310_k$);
  defineProp(protoOf(GenericMessage), 'clientAction', protoOf(GenericMessage).get_clientAction_rxi3me_k$);
  defineProp(protoOf(GenericMessage), 'calling', protoOf(GenericMessage).get_calling_ac784b_k$);
  defineProp(protoOf(GenericMessage), 'asset', protoOf(GenericMessage).get_asset_iotcjr_k$);
  defineProp(protoOf(GenericMessage), 'hidden', protoOf(GenericMessage).get_hidden_e9x67n_k$);
  defineProp(protoOf(GenericMessage), 'location', protoOf(GenericMessage).get_location_d3s02_k$);
  defineProp(protoOf(GenericMessage), 'deleted', protoOf(GenericMessage).get_deleted_qwnqy8_k$);
  defineProp(protoOf(GenericMessage), 'edited', protoOf(GenericMessage).get_edited_cs4uuq_k$);
  defineProp(protoOf(GenericMessage), 'confirmation', protoOf(GenericMessage).get_confirmation_vrrloi_k$);
  defineProp(protoOf(GenericMessage), 'reaction', protoOf(GenericMessage).get_reaction_ovokj6_k$);
  defineProp(protoOf(GenericMessage), 'ephemeral', protoOf(GenericMessage).get_ephemeral_hty584_k$);
  defineProp(protoOf(GenericMessage), 'availability', protoOf(GenericMessage).get_availability_xg9hek_k$);
  defineProp(protoOf(GenericMessage), 'composite', protoOf(GenericMessage).get_composite_emurz6_k$);
  defineProp(protoOf(GenericMessage), 'buttonAction', protoOf(GenericMessage).get_buttonAction_bgujip_k$);
  defineProp(
    protoOf(GenericMessage),
    'buttonActionConfirmation',
    protoOf(GenericMessage).get_buttonActionConfirmation_pvbmee_k$,
  );
  defineProp(protoOf(GenericMessage), 'dataTransfer', protoOf(GenericMessage).get_dataTransfer_ncqosi_k$);
  defineProp(protoOf(Companion_22), 'defaultInstance', protoOf(Companion_22).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_23), 'defaultInstance', protoOf(Companion_23).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Item), 'text', protoOf(Item).get_text_wouvsm_k$);
  defineProp(protoOf(Item), 'button', protoOf(Item).get_button_bmjiuz_k$);
  defineProp(protoOf(Companion_27), 'values', protoOf(Companion_27).get_values_ksazhn_k$);
  defineProp(protoOf(Ephemeral_0), 'text', protoOf(Ephemeral_0).get_text_wouvsm_k$);
  defineProp(protoOf(Ephemeral_0), 'image', protoOf(Ephemeral_0).get_image_it3i2a_k$);
  defineProp(protoOf(Ephemeral_0), 'knock', protoOf(Ephemeral_0).get_knock_iu80iz_k$);
  defineProp(protoOf(Ephemeral_0), 'asset', protoOf(Ephemeral_0).get_asset_iotcjr_k$);
  defineProp(protoOf(Ephemeral_0), 'location', protoOf(Ephemeral_0).get_location_d3s02_k$);
  defineProp(protoOf(LinkPreview), 'article', protoOf(LinkPreview).get_article_auhgc3_k$);
  defineProp(protoOf(LinkPreview), 'tweet', protoOf(LinkPreview).get_tweet_izbpe0_k$);
  defineProp(protoOf(Companion_33), 'defaultInstance', protoOf(Companion_33).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Mention), 'userId', protoOf(Mention).get_userId_kl13yn_k$);
  defineProp(protoOf(MessageEdit), 'text', protoOf(MessageEdit).get_text_wouvsm_k$);
  defineProp(protoOf(MessageEdit), 'composite', protoOf(MessageEdit).get_composite_emurz6_k$);
  defineProp(protoOf(Companion_42), 'values', protoOf(Companion_42).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_46), 'values', protoOf(Companion_46).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_50), 'defaultInstance', protoOf(Companion_50).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_51), 'defaultInstance', protoOf(Companion_51).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_53), 'defaultInstance', protoOf(Companion_53).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Original), 'image', protoOf(Original).get_image_it3i2a_k$);
  defineProp(protoOf(Original), 'video', protoOf(Original).get_video_j06c0i_k$);
  defineProp(protoOf(Original), 'audio', protoOf(Original).get_audio_ioubhp_k$);
  defineProp(protoOf(Preview_0), 'image', protoOf(Preview_0).get_image_it3i2a_k$);
  defineProp(protoOf(Asset_2), 'notUploaded', protoOf(Asset_2).get_notUploaded_oca97a_k$);
  defineProp(protoOf(Asset_2), 'uploaded', protoOf(Asset_2).get_uploaded_5xryzb_k$);
  defineProp(protoOf(Companion_57), 'defaultInstance', protoOf(Companion_57).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_59), 'values', protoOf(Companion_59).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_60), 'values', protoOf(Companion_60).get_values_ksazhn_k$);
  defineProp(protoOf(Companion_63), 'values', protoOf(Companion_63).get_values_ksazhn_k$);
  defineProp(protoOf(QualifiedNewOtrMessage), 'reportAll', protoOf(QualifiedNewOtrMessage).get_reportAll_2o54is_k$);
  defineProp(protoOf(QualifiedNewOtrMessage), 'ignoreAll', protoOf(QualifiedNewOtrMessage).get_ignoreAll_fuvwli_k$);
  defineProp(protoOf(QualifiedNewOtrMessage), 'reportOnly', protoOf(QualifiedNewOtrMessage).get_reportOnly_brjtl5_k$);
  defineProp(protoOf(QualifiedNewOtrMessage), 'ignoreOnly', protoOf(QualifiedNewOtrMessage).get_ignoreOnly_5m2bx5_k$);
  defineProp(protoOf(Companion_72), 'defaultInstance', protoOf(Companion_72).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_73), 'defaultInstance', protoOf(Companion_73).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_74), 'defaultInstance', protoOf(Companion_74).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_75), 'defaultInstance', protoOf(Companion_75).get_defaultInstance_axha8d_k$);
  defineProp(protoOf(Companion_76), 'defaultInstance', protoOf(Companion_76).get_defaultInstance_axha8d_k$);
  //endregion
  //region block: exports
  function $jsExportAll$(_) {
    var $com = _.com || (_.com = {});
    var $com$wire = $com.wire || ($com.wire = {});
    var $com$wire$kalium = $com$wire.kalium || ($com$wire.kalium = {});
    var $com$wire$kalium$protobuf = $com$wire$kalium.protobuf || ($com$wire$kalium.protobuf = {});
    var $com$wire$kalium$protobuf$backup = $com$wire$kalium$protobuf.backup || ($com$wire$kalium$protobuf.backup = {});
    $com$wire$kalium$protobuf$backup.ExportedEncryptionAlgorithm = ExportedEncryptionAlgorithm;
    defineProp(
      $com$wire$kalium$protobuf$backup.ExportedEncryptionAlgorithm,
      'BACKUP_AES_CBC',
      BACKUP_AES_CBC_getInstance,
    );
    defineProp(
      $com$wire$kalium$protobuf$backup.ExportedEncryptionAlgorithm,
      'BACKUP_AES_GCM',
      BACKUP_AES_GCM_getInstance,
    );
    $com$wire$kalium$protobuf$backup.ExportedEncryptionAlgorithm.UNRECOGNIZED = UNRECOGNIZED;
    defineProp($com$wire$kalium$protobuf$backup.ExportedEncryptionAlgorithm, 'Companion', Companion_getInstance_1);
    $com$wire$kalium$protobuf$backup.BackupData = BackupData;
    defineProp($com$wire$kalium$protobuf$backup.BackupData, 'Companion', Companion_getInstance_2);
    $com$wire$kalium$protobuf$backup.BackupInfo = BackupInfo;
    defineProp($com$wire$kalium$protobuf$backup.BackupInfo, 'Companion', Companion_getInstance_3);
    $com$wire$kalium$protobuf$backup.ExportUser = ExportUser;
    defineProp($com$wire$kalium$protobuf$backup.ExportUser, 'Companion', Companion_getInstance_4);
    $com$wire$kalium$protobuf$backup.ExportedQualifiedId = ExportedQualifiedId;
    defineProp($com$wire$kalium$protobuf$backup.ExportedQualifiedId, 'Companion', Companion_getInstance_5);
    $com$wire$kalium$protobuf$backup.ExportedConversation = ExportedConversation;
    defineProp($com$wire$kalium$protobuf$backup.ExportedConversation, 'Companion', Companion_getInstance_6);
    $com$wire$kalium$protobuf$backup.ExportedMessage = ExportedMessage;
    $com$wire$kalium$protobuf$backup.ExportedMessage.Content = Content;
    $com$wire$kalium$protobuf$backup.ExportedMessage.Content.Text = Text;
    $com$wire$kalium$protobuf$backup.ExportedMessage.Content.Asset = Asset;
    $com$wire$kalium$protobuf$backup.ExportedMessage.Content.Location = Location;
    defineProp($com$wire$kalium$protobuf$backup.ExportedMessage, 'Companion', Companion_getInstance_7);
    $com$wire$kalium$protobuf$backup.ExportedText = ExportedText;
    defineProp($com$wire$kalium$protobuf$backup.ExportedText, 'Companion', Companion_getInstance_8);
    $com$wire$kalium$protobuf$backup.ExportedAsset = ExportedAsset;
    $com$wire$kalium$protobuf$backup.ExportedAsset.MetaData = MetaData;
    $com$wire$kalium$protobuf$backup.ExportedAsset.MetaData.Image = Image;
    $com$wire$kalium$protobuf$backup.ExportedAsset.MetaData.Video = Video;
    $com$wire$kalium$protobuf$backup.ExportedAsset.MetaData.Audio = Audio;
    $com$wire$kalium$protobuf$backup.ExportedAsset.MetaData.Generic = Generic;
    defineProp($com$wire$kalium$protobuf$backup.ExportedAsset, 'Companion', Companion_getInstance_9);
    $com$wire$kalium$protobuf$backup.ExportedImageMetaData = ExportedImageMetaData;
    defineProp($com$wire$kalium$protobuf$backup.ExportedImageMetaData, 'Companion', Companion_getInstance_10);
    $com$wire$kalium$protobuf$backup.ExportedVideoMetaData = ExportedVideoMetaData;
    defineProp($com$wire$kalium$protobuf$backup.ExportedVideoMetaData, 'Companion', Companion_getInstance_11);
    $com$wire$kalium$protobuf$backup.ExportedAudioMetaData = ExportedAudioMetaData;
    defineProp($com$wire$kalium$protobuf$backup.ExportedAudioMetaData, 'Companion', Companion_getInstance_12);
    $com$wire$kalium$protobuf$backup.ExportedGenericMetaData = ExportedGenericMetaData;
    defineProp($com$wire$kalium$protobuf$backup.ExportedGenericMetaData, 'Companion', Companion_getInstance_13);
    $com$wire$kalium$protobuf$backup.ExportedLocation = ExportedLocation;
    defineProp($com$wire$kalium$protobuf$backup.ExportedLocation, 'Companion', Companion_getInstance_14);
    $com$wire$kalium$protobuf$backup.orDefaultForExportedVideoMetaData = orDefaultForExportedVideoMetaData;
    $com$wire$kalium$protobuf$backup.orDefaultForExportedAudioMetaData = orDefaultForExportedAudioMetaData;
    $com$wire$kalium$protobuf$backup.orDefaultForExportedGenericMetaData = orDefaultForExportedGenericMetaData;
    var $com = _.com || (_.com = {});
    var $com$wire = $com.wire || ($com.wire = {});
    var $com$wire$kalium = $com$wire.kalium || ($com$wire.kalium = {});
    var $com$wire$kalium$protobuf = $com$wire$kalium.protobuf || ($com$wire$kalium.protobuf = {});
    var $com$wire$kalium$protobuf$messages =
      $com$wire$kalium$protobuf.messages || ($com$wire$kalium$protobuf.messages = {});
    $com$wire$kalium$protobuf$messages.ClientAction = ClientAction;
    defineProp($com$wire$kalium$protobuf$messages.ClientAction, 'RESET_SESSION', RESET_SESSION_getInstance);
    $com$wire$kalium$protobuf$messages.ClientAction.UNRECOGNIZED = UNRECOGNIZED_0;
    defineProp($com$wire$kalium$protobuf$messages.ClientAction, 'Companion', Companion_getInstance_15);
    $com$wire$kalium$protobuf$messages.EncryptionAlgorithm = EncryptionAlgorithm;
    defineProp($com$wire$kalium$protobuf$messages.EncryptionAlgorithm, 'AES_CBC', AES_CBC_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.EncryptionAlgorithm, 'AES_GCM', AES_GCM_getInstance);
    $com$wire$kalium$protobuf$messages.EncryptionAlgorithm.UNRECOGNIZED = UNRECOGNIZED_1;
    defineProp($com$wire$kalium$protobuf$messages.EncryptionAlgorithm, 'Companion', Companion_getInstance_16);
    $com$wire$kalium$protobuf$messages.LegalHoldStatus = LegalHoldStatus;
    defineProp($com$wire$kalium$protobuf$messages.LegalHoldStatus, 'UNKNOWN', UNKNOWN_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.LegalHoldStatus, 'DISABLED', DISABLED_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.LegalHoldStatus, 'ENABLED', ENABLED_getInstance);
    $com$wire$kalium$protobuf$messages.LegalHoldStatus.UNRECOGNIZED = UNRECOGNIZED_2;
    defineProp($com$wire$kalium$protobuf$messages.LegalHoldStatus, 'Companion', Companion_getInstance_17);
    $com$wire$kalium$protobuf$messages.UnknownStrategy = UnknownStrategy;
    defineProp($com$wire$kalium$protobuf$messages.UnknownStrategy, 'IGNORE', IGNORE_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.UnknownStrategy, 'DISCARD_AND_WARN', DISCARD_AND_WARN_getInstance);
    defineProp(
      $com$wire$kalium$protobuf$messages.UnknownStrategy,
      'WARN_USER_ALLOW_RETRY',
      WARN_USER_ALLOW_RETRY_getInstance,
    );
    $com$wire$kalium$protobuf$messages.UnknownStrategy.UNRECOGNIZED = UNRECOGNIZED_3;
    defineProp($com$wire$kalium$protobuf$messages.UnknownStrategy, 'Companion', Companion_getInstance_18);
    $com$wire$kalium$protobuf$messages.GenericMessage = GenericMessage;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content = Content_0;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Text = Text_0;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Image = Image_0;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Knock = Knock;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.LastRead = LastRead;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Cleared = Cleared;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.External = External;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.ClientAction = ClientAction_0;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Calling = Calling;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Asset = Asset_0;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Hidden = Hidden;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Location = Location_0;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Deleted = Deleted;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Edited = Edited;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Confirmation = Confirmation;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Reaction = Reaction;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Ephemeral = Ephemeral;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Availability = Availability;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.Composite = Composite;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.ButtonAction = ButtonAction;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.ButtonActionConfirmation = ButtonActionConfirmation;
    $com$wire$kalium$protobuf$messages.GenericMessage.Content.DataTransfer = DataTransfer;
    defineProp($com$wire$kalium$protobuf$messages.GenericMessage, 'Companion', Companion_getInstance_19);
    $com$wire$kalium$protobuf$messages.QualifiedUserId = QualifiedUserId;
    defineProp($com$wire$kalium$protobuf$messages.QualifiedUserId, 'Companion', Companion_getInstance_20);
    $com$wire$kalium$protobuf$messages.QualifiedConversationId = QualifiedConversationId;
    defineProp($com$wire$kalium$protobuf$messages.QualifiedConversationId, 'Companion', Companion_getInstance_21);
    $com$wire$kalium$protobuf$messages.Composite = Composite_0;
    defineProp($com$wire$kalium$protobuf$messages.Composite, 'Companion', Companion_getInstance_23);
    $com$wire$kalium$protobuf$messages.Composite.Item = Item;
    $com$wire$kalium$protobuf$messages.Composite.Item.Content = Content_1;
    $com$wire$kalium$protobuf$messages.Composite.Item.Content.Text = Text_1;
    $com$wire$kalium$protobuf$messages.Composite.Item.Content.Button = Button;
    defineProp($com$wire$kalium$protobuf$messages.Composite.Item, 'Companion', Companion_getInstance_22);
    $com$wire$kalium$protobuf$messages.Button = Button_0;
    defineProp($com$wire$kalium$protobuf$messages.Button, 'Companion', Companion_getInstance_24);
    $com$wire$kalium$protobuf$messages.ButtonAction = ButtonAction_0;
    defineProp($com$wire$kalium$protobuf$messages.ButtonAction, 'Companion', Companion_getInstance_25);
    $com$wire$kalium$protobuf$messages.ButtonActionConfirmation = ButtonActionConfirmation_0;
    defineProp($com$wire$kalium$protobuf$messages.ButtonActionConfirmation, 'Companion', Companion_getInstance_26);
    $com$wire$kalium$protobuf$messages.Availability = Availability_0;
    defineProp($com$wire$kalium$protobuf$messages.Availability, 'Companion', Companion_getInstance_28);
    $com$wire$kalium$protobuf$messages.Availability.Type = Type;
    defineProp($com$wire$kalium$protobuf$messages.Availability.Type, 'NONE', NONE_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.Availability.Type, 'AVAILABLE', AVAILABLE_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.Availability.Type, 'AWAY', AWAY_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.Availability.Type, 'BUSY', BUSY_getInstance);
    $com$wire$kalium$protobuf$messages.Availability.Type.UNRECOGNIZED = UNRECOGNIZED_4;
    defineProp($com$wire$kalium$protobuf$messages.Availability.Type, 'Companion', Companion_getInstance_27);
    $com$wire$kalium$protobuf$messages.Ephemeral = Ephemeral_0;
    $com$wire$kalium$protobuf$messages.Ephemeral.Content = Content_2;
    $com$wire$kalium$protobuf$messages.Ephemeral.Content.Text = Text_2;
    $com$wire$kalium$protobuf$messages.Ephemeral.Content.Image = Image_1;
    $com$wire$kalium$protobuf$messages.Ephemeral.Content.Knock = Knock_0;
    $com$wire$kalium$protobuf$messages.Ephemeral.Content.Asset = Asset_1;
    $com$wire$kalium$protobuf$messages.Ephemeral.Content.Location = Location_1;
    defineProp($com$wire$kalium$protobuf$messages.Ephemeral, 'Companion', Companion_getInstance_29);
    $com$wire$kalium$protobuf$messages.Text = Text_3;
    defineProp($com$wire$kalium$protobuf$messages.Text, 'Companion', Companion_getInstance_30);
    $com$wire$kalium$protobuf$messages.Knock = Knock_1;
    defineProp($com$wire$kalium$protobuf$messages.Knock, 'Companion', Companion_getInstance_31);
    $com$wire$kalium$protobuf$messages.LinkPreview = LinkPreview;
    $com$wire$kalium$protobuf$messages.LinkPreview.Preview = Preview;
    $com$wire$kalium$protobuf$messages.LinkPreview.Preview.Article = Article;
    $com$wire$kalium$protobuf$messages.LinkPreview.MetaData = MetaData_0;
    $com$wire$kalium$protobuf$messages.LinkPreview.MetaData.Tweet = Tweet;
    defineProp($com$wire$kalium$protobuf$messages.LinkPreview, 'Companion', Companion_getInstance_32);
    $com$wire$kalium$protobuf$messages.Tweet = Tweet_0;
    defineProp($com$wire$kalium$protobuf$messages.Tweet, 'Companion', Companion_getInstance_33);
    $com$wire$kalium$protobuf$messages.Article = Article_0;
    defineProp($com$wire$kalium$protobuf$messages.Article, 'Companion', Companion_getInstance_34);
    $com$wire$kalium$protobuf$messages.Mention = Mention;
    $com$wire$kalium$protobuf$messages.Mention.MentionType = MentionType;
    $com$wire$kalium$protobuf$messages.Mention.MentionType.UserId = UserId;
    defineProp($com$wire$kalium$protobuf$messages.Mention, 'Companion', Companion_getInstance_35);
    $com$wire$kalium$protobuf$messages.LastRead = LastRead_0;
    defineProp($com$wire$kalium$protobuf$messages.LastRead, 'Companion', Companion_getInstance_36);
    $com$wire$kalium$protobuf$messages.Cleared = Cleared_0;
    defineProp($com$wire$kalium$protobuf$messages.Cleared, 'Companion', Companion_getInstance_37);
    $com$wire$kalium$protobuf$messages.MessageHide = MessageHide;
    defineProp($com$wire$kalium$protobuf$messages.MessageHide, 'Companion', Companion_getInstance_38);
    $com$wire$kalium$protobuf$messages.MessageDelete = MessageDelete;
    defineProp($com$wire$kalium$protobuf$messages.MessageDelete, 'Companion', Companion_getInstance_39);
    $com$wire$kalium$protobuf$messages.MessageEdit = MessageEdit;
    $com$wire$kalium$protobuf$messages.MessageEdit.Content = Content_3;
    $com$wire$kalium$protobuf$messages.MessageEdit.Content.Text = Text_4;
    $com$wire$kalium$protobuf$messages.MessageEdit.Content.Composite = Composite_1;
    defineProp($com$wire$kalium$protobuf$messages.MessageEdit, 'Companion', Companion_getInstance_40);
    $com$wire$kalium$protobuf$messages.Quote = Quote;
    defineProp($com$wire$kalium$protobuf$messages.Quote, 'Companion', Companion_getInstance_41);
    $com$wire$kalium$protobuf$messages.Confirmation = Confirmation_0;
    defineProp($com$wire$kalium$protobuf$messages.Confirmation, 'Companion', Companion_getInstance_43);
    $com$wire$kalium$protobuf$messages.Confirmation.Type = Type_0;
    defineProp($com$wire$kalium$protobuf$messages.Confirmation.Type, 'DELIVERED', DELIVERED_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.Confirmation.Type, 'READ', READ_getInstance);
    $com$wire$kalium$protobuf$messages.Confirmation.Type.UNRECOGNIZED = UNRECOGNIZED_5;
    defineProp($com$wire$kalium$protobuf$messages.Confirmation.Type, 'Companion', Companion_getInstance_42);
    $com$wire$kalium$protobuf$messages.Location = Location_2;
    defineProp($com$wire$kalium$protobuf$messages.Location, 'Companion', Companion_getInstance_44);
    $com$wire$kalium$protobuf$messages.ImageAsset = ImageAsset;
    defineProp($com$wire$kalium$protobuf$messages.ImageAsset, 'Companion', Companion_getInstance_45);
    $com$wire$kalium$protobuf$messages.Asset = Asset_2;
    $com$wire$kalium$protobuf$messages.Asset.Status = Status;
    $com$wire$kalium$protobuf$messages.Asset.Status.NotUploaded = NotUploaded;
    $com$wire$kalium$protobuf$messages.Asset.Status.Uploaded = Uploaded;
    defineProp($com$wire$kalium$protobuf$messages.Asset, 'Companion', Companion_getInstance_53);
    $com$wire$kalium$protobuf$messages.Asset.NotUploaded = NotUploaded_0;
    defineProp($com$wire$kalium$protobuf$messages.Asset.NotUploaded, 'CANCELLED', CANCELLED_getInstance);
    defineProp($com$wire$kalium$protobuf$messages.Asset.NotUploaded, 'FAILED', FAILED_getInstance);
    $com$wire$kalium$protobuf$messages.Asset.NotUploaded.UNRECOGNIZED = UNRECOGNIZED_6;
    defineProp($com$wire$kalium$protobuf$messages.Asset.NotUploaded, 'Companion', Companion_getInstance_46);
    $com$wire$kalium$protobuf$messages.Asset.Original = Original;
    $com$wire$kalium$protobuf$messages.Asset.Original.MetaData = MetaData_1;
    $com$wire$kalium$protobuf$messages.Asset.Original.MetaData.Image = Image_2;
    $com$wire$kalium$protobuf$messages.Asset.Original.MetaData.Video = Video_0;
    $com$wire$kalium$protobuf$messages.Asset.Original.MetaData.Audio = Audio_0;
    defineProp($com$wire$kalium$protobuf$messages.Asset.Original, 'Companion', Companion_getInstance_47);
    $com$wire$kalium$protobuf$messages.Asset.Preview = Preview_0;
    $com$wire$kalium$protobuf$messages.Asset.Preview.MetaData = MetaData_2;
    $com$wire$kalium$protobuf$messages.Asset.Preview.MetaData.Image = Image_3;
    defineProp($com$wire$kalium$protobuf$messages.Asset.Preview, 'Companion', Companion_getInstance_48);
    $com$wire$kalium$protobuf$messages.Asset.ImageMetaData = ImageMetaData;
    defineProp($com$wire$kalium$protobuf$messages.Asset.ImageMetaData, 'Companion', Companion_getInstance_49);
    $com$wire$kalium$protobuf$messages.Asset.VideoMetaData = VideoMetaData;
    defineProp($com$wire$kalium$protobuf$messages.Asset.VideoMetaData, 'Companion', Companion_getInstance_50);
    $com$wire$kalium$protobuf$messages.Asset.AudioMetaData = AudioMetaData;
    defineProp($com$wire$kalium$protobuf$messages.Asset.AudioMetaData, 'Companion', Companion_getInstance_51);
    $com$wire$kalium$protobuf$messages.Asset.RemoteData = RemoteData;
    defineProp($com$wire$kalium$protobuf$messages.Asset.RemoteData, 'Companion', Companion_getInstance_52);
    $com$wire$kalium$protobuf$messages.External = External_0;
    defineProp($com$wire$kalium$protobuf$messages.External, 'Companion', Companion_getInstance_54);
    $com$wire$kalium$protobuf$messages.Reaction = Reaction_0;
    defineProp($com$wire$kalium$protobuf$messages.Reaction, 'Companion', Companion_getInstance_55);
    $com$wire$kalium$protobuf$messages.Calling = Calling_0;
    defineProp($com$wire$kalium$protobuf$messages.Calling, 'Companion', Companion_getInstance_56);
    $com$wire$kalium$protobuf$messages.DataTransfer = DataTransfer_0;
    defineProp($com$wire$kalium$protobuf$messages.DataTransfer, 'Companion', Companion_getInstance_57);
    $com$wire$kalium$protobuf$messages.TrackingIdentifier = TrackingIdentifier;
    defineProp($com$wire$kalium$protobuf$messages.TrackingIdentifier, 'Companion', Companion_getInstance_58);
    $com$wire$kalium$protobuf$messages.orDefaultForComposite = orDefaultForComposite;
    $com$wire$kalium$protobuf$messages.orDefaultForCompositeItem = orDefaultForCompositeItem;
    $com$wire$kalium$protobuf$messages.orDefaultForTweet = orDefaultForTweet;
    $com$wire$kalium$protobuf$messages.orDefaultForAsset = orDefaultForAsset;
    $com$wire$kalium$protobuf$messages.orDefaultForAssetVideoMetaData = orDefaultForAssetVideoMetaData;
    $com$wire$kalium$protobuf$messages.orDefaultForAssetAudioMetaData = orDefaultForAssetAudioMetaData;
    $com$wire$kalium$protobuf$messages.orDefaultForDataTransfer = orDefaultForDataTransfer;
    var $com = _.com || (_.com = {});
    var $com$wire = $com.wire || ($com.wire = {});
    var $com$wire$kalium = $com$wire.kalium || ($com$wire.kalium = {});
    var $com$wire$kalium$protobuf = $com$wire$kalium.protobuf || ($com$wire$kalium.protobuf = {});
    var $com$wire$kalium$protobuf$mls = $com$wire$kalium$protobuf.mls || ($com$wire$kalium$protobuf.mls = {});
    $com$wire$kalium$protobuf$mls.GroupInfoType = GroupInfoType;
    defineProp($com$wire$kalium$protobuf$mls.GroupInfoType, 'PUBLIC_GROUP_STATE', PUBLIC_GROUP_STATE_getInstance);
    defineProp($com$wire$kalium$protobuf$mls.GroupInfoType, 'GROUP_INFO', GROUP_INFO_getInstance);
    defineProp($com$wire$kalium$protobuf$mls.GroupInfoType, 'GROUP_INFO_JWE', GROUP_INFO_JWE_getInstance);
    $com$wire$kalium$protobuf$mls.GroupInfoType.UNRECOGNIZED = UNRECOGNIZED_7;
    defineProp($com$wire$kalium$protobuf$mls.GroupInfoType, 'Companion', Companion_getInstance_59);
    $com$wire$kalium$protobuf$mls.RatchetTreeType = RatchetTreeType;
    defineProp($com$wire$kalium$protobuf$mls.RatchetTreeType, 'FULL', FULL_getInstance);
    defineProp($com$wire$kalium$protobuf$mls.RatchetTreeType, 'DELTA', DELTA_getInstance);
    defineProp($com$wire$kalium$protobuf$mls.RatchetTreeType, 'REFERENCE', REFERENCE_getInstance);
    $com$wire$kalium$protobuf$mls.RatchetTreeType.UNRECOGNIZED = UNRECOGNIZED_8;
    defineProp($com$wire$kalium$protobuf$mls.RatchetTreeType, 'Companion', Companion_getInstance_60);
    $com$wire$kalium$protobuf$mls.GroupInfoBundle = GroupInfoBundle;
    defineProp($com$wire$kalium$protobuf$mls.GroupInfoBundle, 'Companion', Companion_getInstance_61);
    $com$wire$kalium$protobuf$mls.CommitBundle = CommitBundle;
    defineProp($com$wire$kalium$protobuf$mls.CommitBundle, 'Companion', Companion_getInstance_62);
    var $com = _.com || (_.com = {});
    var $com$wire = $com.wire || ($com.wire = {});
    var $com$wire$kalium = $com$wire.kalium || ($com$wire.kalium = {});
    var $com$wire$kalium$protobuf = $com$wire$kalium.protobuf || ($com$wire$kalium.protobuf = {});
    var $com$wire$kalium$protobuf$otr = $com$wire$kalium$protobuf.otr || ($com$wire$kalium$protobuf.otr = {});
    $com$wire$kalium$protobuf$otr.Priority = Priority;
    defineProp($com$wire$kalium$protobuf$otr.Priority, 'LOW_PRIORITY', LOW_PRIORITY_getInstance);
    defineProp($com$wire$kalium$protobuf$otr.Priority, 'HIGH_PRIORITY', HIGH_PRIORITY_getInstance);
    $com$wire$kalium$protobuf$otr.Priority.UNRECOGNIZED = UNRECOGNIZED_9;
    defineProp($com$wire$kalium$protobuf$otr.Priority, 'Companion', Companion_getInstance_63);
    $com$wire$kalium$protobuf$otr.UserId = UserId_0;
    defineProp($com$wire$kalium$protobuf$otr.UserId, 'Companion', Companion_getInstance_64);
    $com$wire$kalium$protobuf$otr.QualifiedUserId = QualifiedUserId_0;
    defineProp($com$wire$kalium$protobuf$otr.QualifiedUserId, 'Companion', Companion_getInstance_65);
    $com$wire$kalium$protobuf$otr.ClientId = ClientId;
    defineProp($com$wire$kalium$protobuf$otr.ClientId, 'Companion', Companion_getInstance_66);
    $com$wire$kalium$protobuf$otr.ClientEntry = ClientEntry;
    defineProp($com$wire$kalium$protobuf$otr.ClientEntry, 'Companion', Companion_getInstance_67);
    $com$wire$kalium$protobuf$otr.UserEntry = UserEntry;
    defineProp($com$wire$kalium$protobuf$otr.UserEntry, 'Companion', Companion_getInstance_68);
    $com$wire$kalium$protobuf$otr.QualifiedUserEntry = QualifiedUserEntry;
    defineProp($com$wire$kalium$protobuf$otr.QualifiedUserEntry, 'Companion', Companion_getInstance_69);
    $com$wire$kalium$protobuf$otr.NewOtrMessage = NewOtrMessage;
    defineProp($com$wire$kalium$protobuf$otr.NewOtrMessage, 'Companion', Companion_getInstance_70);
    $com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage = QualifiedNewOtrMessage;
    $com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage.ClientMismatchStrategy = ClientMismatchStrategy;
    $com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage.ClientMismatchStrategy.ReportAll = ReportAll;
    $com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage.ClientMismatchStrategy.IgnoreAll = IgnoreAll;
    $com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage.ClientMismatchStrategy.ReportOnly = ReportOnly;
    $com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage.ClientMismatchStrategy.IgnoreOnly = IgnoreOnly;
    defineProp($com$wire$kalium$protobuf$otr.QualifiedNewOtrMessage, 'Companion', Companion_getInstance_71);
    $com$wire$kalium$protobuf$otr.ClientMismatchStrategy = ClientMismatchStrategy_0;
    defineProp($com$wire$kalium$protobuf$otr.ClientMismatchStrategy, 'Companion', Companion_getInstance_76);
    $com$wire$kalium$protobuf$otr.ClientMismatchStrategy.ReportAll = ReportAll_0;
    defineProp($com$wire$kalium$protobuf$otr.ClientMismatchStrategy.ReportAll, 'Companion', Companion_getInstance_72);
    $com$wire$kalium$protobuf$otr.ClientMismatchStrategy.IgnoreAll = IgnoreAll_0;
    defineProp($com$wire$kalium$protobuf$otr.ClientMismatchStrategy.IgnoreAll, 'Companion', Companion_getInstance_73);
    $com$wire$kalium$protobuf$otr.ClientMismatchStrategy.ReportOnly = ReportOnly_0;
    defineProp($com$wire$kalium$protobuf$otr.ClientMismatchStrategy.ReportOnly, 'Companion', Companion_getInstance_74);
    $com$wire$kalium$protobuf$otr.ClientMismatchStrategy.IgnoreOnly = IgnoreOnly_0;
    defineProp($com$wire$kalium$protobuf$otr.ClientMismatchStrategy.IgnoreOnly, 'Companion', Companion_getInstance_75);
    $com$wire$kalium$protobuf$otr.OtrAssetMeta = OtrAssetMeta;
    defineProp($com$wire$kalium$protobuf$otr.OtrAssetMeta, 'Companion', Companion_getInstance_77);
    $com$wire$kalium$protobuf$otr.orDefaultForClientMismatchStrategy = orDefaultForClientMismatchStrategy;
    $com$wire$kalium$protobuf$otr.orDefaultForClientMismatchStrategyReportAll =
      orDefaultForClientMismatchStrategyReportAll;
    $com$wire$kalium$protobuf$otr.orDefaultForClientMismatchStrategyIgnoreAll =
      orDefaultForClientMismatchStrategyIgnoreAll;
    $com$wire$kalium$protobuf$otr.orDefaultForClientMismatchStrategyReportOnly =
      orDefaultForClientMismatchStrategyReportOnly;
    $com$wire$kalium$protobuf$otr.orDefaultForClientMismatchStrategyIgnoreOnly =
      orDefaultForClientMismatchStrategyIgnoreOnly;
  }
  $jsExportAll$(_);
  _.$jsExportAll$ = $jsExportAll$;
  _.$_$ = _.$_$ || {};
  _.$_$.a = BackupData;
  _.$_$.b = BackupInfo;
  _.$_$.c = ExportUser;
  _.$_$.d = Audio;
  _.$_$.e = Generic;
  _.$_$.f = Image;
  _.$_$.g = Video;
  _.$_$.h = ExportedAsset;
  _.$_$.i = ExportedAudioMetaData;
  _.$_$.j = ExportedConversation;
  _.$_$.k = UNRECOGNIZED;
  _.$_$.l = ExportedGenericMetaData;
  _.$_$.m = ExportedImageMetaData;
  _.$_$.n = ExportedLocation;
  _.$_$.o = Asset;
  _.$_$.p = Location;
  _.$_$.q = Text;
  _.$_$.r = ExportedMessage;
  _.$_$.s = ExportedQualifiedId;
  _.$_$.t = ExportedText;
  _.$_$.u = ExportedVideoMetaData;
  _.$_$.v = Companion_getInstance_2;
  _.$_$.w = BACKUP_AES_CBC_getInstance;
  _.$_$.x = BACKUP_AES_GCM_getInstance;
  //endregion
  return _;
});

//# sourceMappingURL=kalium-protobuf.js.map
