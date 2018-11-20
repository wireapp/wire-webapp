/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

window.sodium = {
  onload: sodium => (window.sodium = sodium),
};

/* eslint-disable no-unused-vars */
import {amplify} from 'amplify';
window.amplify = amplify;
import jqueryMousewheel from '../../ext/js/jquery-mousewheel/jquery.mousewheel.js';
import index from '../../ext/js/url-search-params-polyfill/index.js';
import phoneFormatGlobal from '../../ext/js/phoneformat/phone-format-global.js';
import platform from '../../ext/js/platform.js/platform.js';
import raygun from '../../ext/js/raygun4js/raygun.vanilla.js';
import poster from '../../ext/js/poster-image/poster.js';

import namespace from '../../ext/js/webapp-module-namespace/Namespace.js';
import bubble from '../../ext/js/webapp-module-bubble/webapp-module-bubble.js';
import logger from '../../ext/js/webapp-module-logger/Logger.js';

import configGlobal from '../config.js';
import envGlobal from '../util/Environment.js';
import ArrayUtilGlobal from '../util/ArrayUtil.js';
import ClipboardUtilGlobal from '../util/ClipboardUtil.js';
import CryptoGlobal from '../util/Crypto.js';
import DebugUtilGlobal from '../util/DebugUtil.js';
import EmojiUtilGlobal from '../util/EmojiUtil.js';
import utilGlobal from '../util/util.js';
import SanitizationUtilGlobal from '../util/SanitizationUtil.js';
import TimeUtilGlobal from '../util/TimeUtil.js';
import protobufGlobal from '../util/protobuf.js';
import KeyboardUtilGlobal from '../util/KeyboardUtil.js';
import LocalizerUtilGlobal from '../util/LocalizerUtil.js';
import linkifyGlobal from '../util/linkify.js';
import htmlGlobal from '../util/linkify-html.js';
import MessageComparatorGlobal from '../util/MessageComparator.js';
import NumberUtilGlobal from '../util/NumberUtil.js';
import ObjectUtilGlobal from '../util/ObjectUtil.js';
import PeerConnectionUtilGlobal from '../util/PeerConnectionUtil.js';
import PromiseQueueGlobal from '../util/PromiseQueue.js';
import helpersGlobal from '../util/scroll-helpers.js';
import StorageUtilGlobal from '../util/StorageUtil.js';
import StringUtilGlobal from '../util/StringUtil.js';
import URLUtilGlobal from '../util/URLUtil.js';
import CountryCodesGlobal from '../util/CountryCodes.js';
import workerGlobal from '../util/worker.js';
import ValidationUtilGlobal from '../util/ValidationUtil.js';
import ValidationUtilErrorGlobal from '../util/ValidationUtilError.js';
import PopupUtilGlobal from '../util/PopupUtil.js';
import BaseErrorGlobal from '../error/BaseError.js';
import AccessTokenErrorGlobal from '../error/AccessTokenError.js';
import AuthErrorGlobal from '../error/AuthError.js';
import AudioErrorGlobal from '../error/AudioError.js';
import BackendClientErrorGlobal from '../error/BackendClientError.js';
import CallErrorGlobal from '../error/CallError.js';
import ClientErrorGlobal from '../error/ClientError.js';
import ConnectErrorGlobal from '../error/ConnectError.js';
import ConnectionErrorGlobal from '../error/ConnectionError.js';
import ConversationErrorGlobal from '../error/ConversationError.js';
import CryptographyErrorGlobal from '../error/CryptographyError.js';
import EventErrorGlobal from '../error/EventError.js';
import LinkPreviewErrorGlobal from '../error/LinkPreviewError.js';
import LocationErrorGlobal from '../error/LocationError.js';
import MediaErrorGlobal from '../error/MediaError.js';
import NotificationErrorGlobal from '../error/NotificationError.js';
import PermissionErrorGlobal from '../error/PermissionError.js';
import StorageErrorGlobal from '../error/StorageError.js';
import TeamErrorGlobal from '../error/TeamError.js';
import UserErrorGlobal from '../error/UserError.js';
import AudioTypeGlobal from '../audio/AudioType.js';
import AudioPlayingTypeGlobal from '../audio/AudioPlayingType.js';
import SignOutReasonGlobal from '../auth/SignOutReason.js';
import authUrlParamGlobal from '../auth/URLParameter.js';
import QueueStateGlobal from '../service/QueueState.js';
// import authGlobal from '../main/auth.js';
import StorageKeyGlobal from '../storage/StorageKey.js';
import StorageRepositoryGlobal from '../storage/StorageRepository.js';
import StorageSchemataGlobal from '../storage/StorageSchemata.js';
import StorageServiceGlobal from '../storage/StorageService.js';
import initGlobal from '../localization/strings-init.js';
// import csGlobal from '../localization/translations/webapp-cs.js';
// import daGlobal from '../localization/translations/webapp-da.js';
// import deGlobal from '../localization/translations/webapp-de.js';
// import elGlobal from '../localization/translations/webapp-el.js';
// import esGlobal from '../localization/translations/webapp-es.js';
// import etGlobal from '../localization/translations/webapp-et.js';
// import fiGlobal from '../localization/translations/webapp-fi.js';
// import frGlobal from '../localization/translations/webapp-fr.js';
// import hrGlobal from '../localization/translations/webapp-hr.js';
// import huGlobal from '../localization/translations/webapp-hu.js';
// import itGlobal from '../localization/translations/webapp-it.js';
// import ltGlobal from '../localization/translations/webapp-lt.js';
// import nlGlobal from '../localization/translations/webapp-nl.js';
// import plGlobal from '../localization/translations/webapp-pl.js';
// import ptGlobal from '../localization/translations/webapp-pt.js';
// import roGlobal from '../localization/translations/webapp-ro.js';
// import ruGlobal from '../localization/translations/webapp-ru.js';
// import skGlobal from '../localization/translations/webapp-sk.js';
// import slGlobal from '../localization/translations/webapp-sl.js';
// import trGlobal from '../localization/translations/webapp-tr.js';
// import ukGlobal from '../localization/translations/webapp-uk.js';
import webappGlobal from '../localization/webapp.js';
import LocalizerGlobal from '../localization/Localizer.js';
import TrackConversationTypeGlobal from '../tracking/attribute/ConversationType.js';
import DeleteTypeGlobal from '../tracking/attribute/DeleteType.js';
import MessageTypeGlobal from '../tracking/attribute/MessageType.js';
import PlatformTypeGlobal from '../tracking/attribute/PlatformType.js';
import UserTypeGlobal from '../tracking/attribute/UserType.js';
import EventNameGlobal from '../tracking/EventName.js';
import EventTrackingRepositoryGlobal from '../tracking/EventTrackingRepository.js';
import HelpersGlobal from '../tracking/Helpers.js';
import SuperPropertyGlobal from '../tracking/SuperProperty.js';
import AssetUploadFailedReasonGlobal from '../assets/AssetUploadFailedReason.js';
import AssetURLCacheGlobal from '../assets/AssetURLCache.js';
import AssetRemoteDataGlobal from '../assets/AssetRemoteData.js';
import AssetRetentionPolicyGlobal from '../assets/AssetRetentionPolicy.js';
import AssetTransferStateGlobal from '../assets/AssetTransferState.js';
import AssetTypeGlobal from '../assets/AssetType.js';
import AssetServiceGlobal from '../assets/AssetService.js';
import AssetMapperGlobal from '../assets/AssetMapper.js';
import AssetMetaDataBuilderGlobal from '../assets/AssetMetaDataBuilder.js';
import AssetCryptoGlobal from '../assets/AssetCrypto.js';
import ErrorGlobal from '../backup/Error.js';
import BackupRepositoryGlobal from '../backup/BackupRepository.js';
import BackupServiceGlobal from '../backup/BackupService.js';
import BroadcastRepositoryGlobal from '../broadcast/BroadcastRepository.js';
import BroadcastServiceGlobal from '../broadcast/BroadcastService.js';
import CacheRepositoryGlobal from '../cache/CacheRepository.js';
import EnumCallMessageTypeGlobal from '../calling/enum/CallMessageType.js';
import CallStateGlobal from '../calling/enum/CallState.js';
import CallStateGroupGlobal from '../calling/enum/CallStateGroup.js';
import PropertyStateGlobal from '../calling/enum/PropertyState.js';
import SDPNegotiationModeGlobal from '../calling/enum/SDPNegotiationMode.js';
import SDPSourceGlobal from '../calling/enum/SDPSource.js';
import TerminationReasonGlobal from '../calling/enum/TerminationReason.js';
import DataChannelStateGlobal from '../calling/rtc/DataChannelState.js';
import ICEConnectionStateGlobal from '../calling/rtc/ICEConnectionState.js';
import ICEGatheringStateGlobal from '../calling/rtc/ICEGatheringState.js';
import SDPTypeGlobal from '../calling/rtc/SDPType.js';
import SignalingStateGlobal from '../calling/rtc/SignalingState.js';
import StatsTypeGlobal from '../calling/rtc/StatsType.js';
import CallEntityGlobal from '../calling/entities/CallEntity.js';
import CallMessageEntityGlobal from '../calling/entities/CallMessageEntity.js';
import FlowEntityGlobal from '../calling/entities/FlowEntity.js';
import FlowAudioEntityGlobal from '../calling/entities/FlowAudioEntity.js';
import ParticipantEntityGlobal from '../calling/entities/ParticipantEntity.js';
import CallingRepositoryGlobal from '../calling/CallingRepository.js';
import CallingServiceGlobal from '../calling/CallingService.js';
import CallMessageBuilderGlobal from '../calling/CallMessageBuilder.js';
import CallMessageMapperGlobal from '../calling/CallMessageMapper.js';
import SDPMapperGlobal from '../calling/SDPMapper.js';
import VideoGridRepositoryGlobal from '../calling/VideoGridRepository.js';
import ConnectGoogleServiceGlobal from '../connect/ConnectGoogleService.js';
import ConnectServiceGlobal from '../connect/ConnectService.js';
import ConnectRepositoryGlobal from '../connect/ConnectRepository.js';
import ConnectSourceGlobal from '../connect/ConnectSource.js';
import PhoneBookGlobal from '../connect/PhoneBook.js';
import ConnectionEntityGlobal from '../connection/ConnectionEntity.js';
import ConnectionMapperGlobal from '../connection/ConnectionMapper.js';
import ConnectionRepositoryGlobal from '../connection/ConnectionRepository.js';
import ConnectionServiceGlobal from '../connection/ConnectionService.js';
import ConnectionStatusGlobal from '../connection/ConnectionStatus.js';
import ClientEntityGlobal from '../client/ClientEntity.js';
import ClientMapperGlobal from '../client/ClientMapper.js';
import ClientRepositoryGlobal from '../client/ClientRepository.js';
import ClientServiceGlobal from '../client/ClientService.js';
import ClientTypeGlobal from '../client/ClientType.js';
import AbstractConversationEventHandlerGlobal from '../conversation/AbstractConversationEventHandler.js';
import AccessModeGlobal from '../conversation/AccessMode.js';
import AccessRoleGlobal from '../conversation/AccessRole.js';
import AccessStateGlobal from '../conversation/AccessState.js';
import ClientMismatchHandlerGlobal from '../conversation/ClientMismatchHandler.js';
import ConversationCellStateGlobal from '../conversation/ConversationCellState.js';
import ConversationEphemeralHandlerGlobal from '../conversation/ConversationEphemeralHandler.js';
import ConversationMapperGlobal from '../conversation/ConversationMapper.js';
import ConversationRepositoryGlobal from '../conversation/ConversationRepository.js';
import ConversationServiceGlobal from '../conversation/ConversationService.js';
import ConversationStateHandlerGlobal from '../conversation/ConversationStateHandler.js';
import ConversationStatusGlobal from '../conversation/ConversationStatus.js';
import ConversationStatusIconGlobal from '../conversation/ConversationStatusIcon.js';
import ConversationTypeGlobal from '../conversation/ConversationType.js';
import ConversationVerificationStateGlobal from '../conversation/ConversationVerificationState.js';
import ConversationVerificationStateHandlerGlobal from '../conversation/ConversationVerificationStateHandler.js';
import EventBuilderGlobal from '../conversation/EventBuilder.js';
import EventInfoEntityGlobal from '../conversation/EventInfoEntity.js';
import EventMapperGlobal from '../conversation/EventMapper.js';
import NotificationSettingGlobal from '../conversation/NotificationSetting.js';
import CryptographyMapperGlobal from '../cryptography/CryptographyMapper.js';
import CryptographyRepositoryGlobal from '../cryptography/CryptographyRepository.js';
import CryptographyServiceGlobal from '../cryptography/CryptographyService.js';
import GenericMessageTypeGlobal from '../cryptography/GenericMessageType.js';
import ProtoMessageTypeGlobal from '../cryptography/ProtoMessageType.js';
import ephemeralTimingsGlobal from '../ephemeral/ephemeralTimings.js';
import BackendGlobal from '../event/Backend.js';
import ClientGlobal from '../event/Client.js';
import EventRepositoryGlobal from '../event/EventRepository.js';
import EventServiceGlobal from '../event/EventService.js';
import EventServiceNoCompoundGlobal from '../event/EventServiceNoCompound.js';
import EventTypeGlobal from '../event/EventType.js';
import EventTypeHandlingGlobal from '../event/EventTypeHandling.js';
import NotificationHandlingStateGlobal from '../event/NotificationHandlingState.js';
import NotificationServiceGlobal from '../event/NotificationService.js';
import QuotedMessageMiddlewareGlobal from '../event/preprocessor/QuotedMessageMiddleware.js';
import ServiceMiddlewareGlobal from '../event/preprocessor/ServiceMiddleware.js';
import WebAppGlobal from '../event/WebApp.js';
import WebSocketServiceGlobal from '../event/WebSocketService.js';
import GiphyServiceGlobal from '../extension/GiphyService.js';
import GiphyRepositoryGlobal from '../extension/GiphyRepository.js';
import GiphyContentSizesGlobal from '../extension/GiphyContentSizes.js';
import IntegrationMapperGlobal from '../integration/IntegrationMapper.js';
import IntegrationRepositoryGlobal from '../integration/IntegrationRepository.js';
import IntegrationServiceGlobal from '../integration/IntegrationService.js';
import ProviderEntityGlobal from '../integration/ProviderEntity.js';
import ServiceEntityGlobal from '../integration/ServiceEntity.js';
import ServiceTagGlobal from '../integration/ServiceTag.js';
import LifecycleServiceGlobal from '../lifecycle/LifecycleService.js';
import LifecycleRepositoryGlobal from '../lifecycle/LifecycleRepository.js';
import UpdateSourceGlobal from '../lifecycle/UpdateSource.js';
import LinkPreviewHelpersGlobal from '../links/LinkPreviewHelpers.js';
import LinkPreviewMetaDataTypeGlobal from '../links/LinkPreviewMetaDataType.js';
import LinkPreviewProtoBuilderGlobal from '../links/LinkPreviewProtoBuilder.js';
import LinkPreviewRepositoryGlobal from '../links/LinkPreviewRepository.js';
import LinkPreviewBlackListGlobal from '../links/LinkPreviewBlackList.js';
import LocationServiceGlobal from '../location/LocationService.js';
import LocationRepositoryGlobal from '../location/LocationRepository.js';
import MediaConstraintsHandlerGlobal from '../media/MediaConstraintsHandler.js';
import MediaDevicesHandlerGlobal from '../media/MediaDevicesHandler.js';
import MediaDeviceTypeGlobal from '../media/MediaDeviceType.js';
import MediaElementHandlerGlobal from '../media/MediaElementHandler.js';
import MediaEmbedsGlobal from '../media/MediaEmbeds.js';
import MediaParserGlobal from '../media/MediaParser.js';
import MediaRepositoryGlobal from '../media/MediaRepository.js';
import MediaStreamErrorGlobal from '../media/MediaStreamError.js';
import MediaStreamErrorTypesGlobal from '../media/MediaStreamErrorTypes.js';
import MediaStreamHandlerGlobal from '../media/MediaStreamHandler.js';
import MediaStreamSourceGlobal from '../media/MediaStreamSource.js';
import MediaStreamInfoGlobal from '../media/MediaStreamInfo.js';
import MediaTypeGlobal from '../media/MediaType.js';
import VideoQualityModeGlobal from '../media/VideoQualityMode.js';
import MotionDurationGlobal from '../motion/MotionDuration.js';
import PermissionStateGlobal from '../notification/PermissionState.js';
import NotificationPreferenceGlobal from '../notification/NotificationPreference.js';
import NotificationRepositoryGlobal from '../notification/NotificationRepository.js';
import PermissionRepositoryGlobal from '../permission/PermissionRepository.js';
import PermissionStatusStateGlobal from '../permission/PermissionStatusState.js';
import PermissionTypeGlobal from '../permission/PermissionType.js';
import PropertiesEntityGlobal from '../properties/PropertiesEntity.js';
import PropertiesRepositoryGlobal from '../properties/PropertiesRepository.js';
import PropertiesServiceGlobal from '../properties/PropertiesService.js';
import PropertiesTypeGlobal from '../properties/PropertiesType.js';
import FullTextSearchGlobal from '../search/FullTextSearch.js';
import SearchServiceGlobal from '../search/SearchService.js';
import SearchRepositoryGlobal from '../search/SearchRepository.js';
import SelfServiceGlobal from '../self/SelfService.js';
import ServerTimeRepositoryGlobal from '../time/ServerTimeRepository.js';
import TeamEntityGlobal from '../team/TeamEntity.js';
import TeamMapperGlobal from '../team/TeamMapper.js';
import TeamMemberEntityGlobal from '../team/TeamMemberEntity.js';
import TeamPermissionGlobal from '../team/TeamPermission.js';
import TeamRepositoryGlobal from '../team/TeamRepository.js';
import TeamRoleGlobal from '../team/TeamRole.js';
import TeamServiceGlobal from '../team/TeamService.js';
import AppInitStatisticsGlobal from '../telemetry/app_init/AppInitStatistics.js';
import AppInitStatisticsValueGlobal from '../telemetry/app_init/AppInitStatisticsValue.js';
import AppInitTelemetryGlobal from '../telemetry/app_init/AppInitTelemetry.js';
import AppInitTimingsGlobal from '../telemetry/app_init/AppInitTimings.js';
import AppInitTimingsStepGlobal from '../telemetry/app_init/AppInitTimingsStep.js';
import CallSetupStepsGlobal from '../telemetry/calling/CallSetupSteps.js';
import CallSetupStepsOrderGlobal from '../telemetry/calling/CallSetupStepsOrder.js';
import CallSetupTimingsGlobal from '../telemetry/calling/CallSetupTimings.js';
import FlowTelemetryGlobal from '../telemetry/calling/FlowTelemetry.js';
import CallTelemetryGlobal from '../telemetry/calling/CallTelemetry.js';
import CallLoggerGlobal from '../telemetry/calling/CallLogger.js';
import AvailabilityMapperGlobal from '../user/AvailabilityMapper.js';
import AvailabilityTypeGlobal from '../user/AvailabilityType.js';
import ConsentTypeGlobal from '../user/ConsentType.js';
import ConsentValueGlobal from '../user/ConsentValue.js';
import UserServiceGlobal from '../user/UserService.js';
import UserMapperGlobal from '../user/UserMapper.js';
import UserRepositoryGlobal from '../user/UserRepository.js';
import UserHandleGeneratorGlobal from '../user/UserHandleGenerator.js';
import ActionsViewModelGlobal from '../view_model/ActionsViewModel.js';
import FaviconViewModelGlobal from '../view_model/FaviconViewModel.js';
import ImageDetailViewViewModelGlobal from '../view_model/ImageDetailViewViewModel.js';
import LoadingViewModelGlobal from '../view_model/LoadingViewModel.js';
import MainViewModelGlobal from '../view_model/MainViewModel.js';
import ModalsViewModelGlobal from '../view_model/ModalsViewModel.js';
import ShortcutsViewModelGlobal from '../view_model/ShortcutsViewModel.js';
import WarningsViewModelGlobal from '../view_model/WarningsViewModel.js';
import VideoCallingViewModelGlobal from '../view_model/VideoCallingViewModel.js';
import WindowTitleViewModelGlobal from '../view_model/WindowTitleViewModel.js';
import CommonBindingsGlobal from '../view_model/bindings/CommonBindings.js';
import ConversationListBindingsGlobal from '../view_model/bindings/ConversationListBindings.js';
import ListBackgroundBindingsGlobal from '../view_model/bindings/ListBackgroundBindings.js';
import LocalizationBindingsGlobal from '../view_model/bindings/LocalizationBindings.js';
import MessageListBindingsGlobal from '../view_model/bindings/MessageListBindings.js';
import VideoCallingBindingsGlobal from '../view_model/bindings/VideoCallingBindings.js';
import ContentViewModelGlobal from '../view_model/ContentViewModel.js';
import CollectionDetailsViewModelGlobal from '../view_model/content/CollectionDetailsViewModel.js';
import CollectionViewModelGlobal from '../view_model/content/CollectionViewModel.js';
import ConnectRequestsViewModelGlobal from '../view_model/content/ConnectRequestsViewModel.js';
import EmojiInputViewModelGlobal from '../view_model/content/EmojiInputViewModel.js';
import GiphyViewModelGlobal from '../view_model/content/GiphyViewModel.js';
import GroupCreationViewModelGlobal from '../view_model/content/GroupCreationViewModel.js';
import HistoryExportViewModelGlobal from '../view_model/content/HistoryExportViewModel.js';
import HistoryImportViewModelGlobal from '../view_model/content/HistoryImportViewModel.js';
import InputBarViewModelGlobal from '../view_model/content/InputBarViewModel.js';
import MessageListViewModelGlobal from '../view_model/content/MessageListViewModel.js';
import PreferencesAboutViewModelGlobal from '../view_model/content/PreferencesAboutViewModel.js';
import PreferencesAccountViewModelGlobal from '../view_model/content/PreferencesAccountViewModel.js';
import PreferencesAVViewModelGlobal from '../view_model/content/PreferencesAVViewModel.js';
import PreferencesDeviceDetailsViewModelGlobal from '../view_model/content/PreferencesDeviceDetailsViewModel.js';
import PreferencesDevicesViewModelGlobal from '../view_model/content/PreferencesDevicesViewModel.js';
import PreferencesOptionsViewModelGlobal from '../view_model/content/PreferencesOptionsViewModel.js';
import TitleBarViewModelGlobal from '../view_model/content/TitleBarViewModel.js';
import PanelViewModelGlobal from '../view_model/PanelViewModel.js';
import BasePanelViewModelGlobal from '../view_model/panel/BasePanelViewModel.js';
import AddParticipantsViewModelGlobal from '../view_model/panel/AddParticipantsViewModel.js';
import ConversationDetailsViewModelGlobal from '../view_model/panel/ConversationDetailsViewModel.js';
import ConversationParticipantsViewModelGlobal from '../view_model/panel/ConversationParticipantsViewModel.js';
import GroupParticipantUserViewModelGlobal from '../view_model/panel/GroupParticipantUserViewModel.js';
import GroupParticipantServiceViewModelGlobal from '../view_model/panel/GroupParticipantServiceViewModel.js';
import GuestsAndServicesViewModelGlobal from '../view_model/panel/GuestsAndServicesViewModel.js';
import NotificationsViewModelGlobal from '../view_model/panel/NotificationsViewModel.js';
import TimedMessagesViewModelGlobal from '../view_model/panel/TimedMessagesViewModel.js';
import ParticipantDevicesViewModelGlobal from '../view_model/panel/ParticipantDevicesViewModel.js';
import ListViewModelGlobal from '../view_model/ListViewModel.js';
import ArchiveViewModelGlobal from '../view_model/list/ArchiveViewModel.js';
import ConversationListViewModelGlobal from '../view_model/list/ConversationListViewModel.js';
import PreferencesListViewModelGlobal from '../view_model/list/PreferencesListViewModel.js';
import StartUIViewModelGlobal from '../view_model/list/StartUIViewModel.js';
import TakeoverViewModelGlobal from '../view_model/list/TakeoverViewModel.js';
import TemporaryGuestViewModelGlobal from '../view_model/list/TemporaryGuestViewModel.js';
import accentColorPickerGlobal from '../components/accentColorPicker.js';
import availabilityStateGlobal from '../components/availabilityState.js';
import copyToClipboardGlobal from '../components/copyToClipboard.js';
import deviceCardGlobal from '../components/deviceCard.js';
import deviceRemoveGlobal from '../components/deviceRemove.js';
import ephemeralTimerGlobal from '../components/ephemeralTimer.js';
import fullSearchGlobal from '../components/fullSearch.js';
import groupListGlobal from '../components/groupList.js';
import groupVideoGridGlobal from '../components/groupVideoGrid.js';
import imageGlobal from '../components/image.js';
import inputElementGlobal from '../components/inputElement.js';
import inputLevelGlobal from '../components/inputLevel.js';
import messageGlobal from '../components/message.js';
import messageQuoteGlobal from '../components/messageQuote.js';
import messageTimerButtonGlobal from '../components/messageTimerButton.js';
import mentionSuggestionsGlobal from '../components/mentionSuggestions.js';
import serviceListGlobal from '../components/serviceList.js';
import topPeopleGlobal from '../components/topPeople.js';
import participantAvatarGlobal from '../components/participantAvatar.js';
import participantItemGlobal from '../components/list/participantItem.js';
import userProfileGlobal from '../components/userProfile.js';
import userInputGlobal from '../components/userInput.js';
import userListGlobal from '../components/userList.js';
import guestModeToggleGlobal from '../components/guestModeToggle.js';
import iconsGlobal from '../components/icons.js';
import logosGlobal from '../components/logos.js';
import loadingBarGlobal from '../components/loadingBar.js';
import assetHeaderGlobal from '../components/asset/assetHeader.js';
import videoAssetGlobal from '../components/asset/videoAsset.js';
import audioAssetGlobal from '../components/asset/audioAsset.js';
import fileAssetGlobal from '../components/asset/fileAsset.js';
import linkPreviewAssetGlobal from '../components/asset/linkPreviewAsset.js';
import locationAssetGlobal from '../components/asset/locationAsset.js';
import audioSeekBarGlobal from '../components/asset/controls/audioSeekBar.js';
import seekBarGlobal from '../components/asset/controls/seekBar.js';
import mediaButtonGlobal from '../components/asset/controls/mediaButton.js';
import chooseScreenGlobal from '../components/calling/chooseScreen.js';
import deviceToggleButtonGlobal from '../components/calling/deviceToggleButton.js';
import conversationListCallingCellGlobal from '../components/list/conversationListCallingCell.js';
import conversationListCellGlobal from '../components/list/conversationListCell.js';
import groupAvatarGlobal from '../components/list/groupAvatar.js';
import userDetailsGlobal from '../components/panel/userDetails.js';
import serviceDetailsGlobal from '../components/panel/serviceDetails.js';
import CallMessageTypeGlobal from '../message/CallMessageType.js';
import MessageCategoryGlobal from '../message/MessageCategory.js';
import MessageCategorizationGlobal from '../message/MessageCategorization.js';
import MessageHasherGlobal from '../message/MessageHasher.js';
import EphemeralStatusTypeGlobal from '../message/EphemeralStatusType.js';
import MentionEntityGlobal from '../message/MentionEntity.js';
import QuoteEntityGlobal from '../message/QuoteEntity.js';
import StatusTypeGlobal from '../message/StatusType.js';
import ReactionTypeGlobal from '../message/ReactionType.js';
import SuperTypeGlobal from '../message/SuperType.js';
import SystemMessageTypeGlobal from '../message/SystemMessageType.js';
import VerificationMessageTypeGlobal from '../message/VerificationMessageType.js';
import AssetGlobal from '../entity/message/Asset.js';
import TextGlobal from '../entity/message/Text.js';
import LinkPreviewGlobal from '../entity/message/LinkPreview.js';
import FileGlobal from '../entity/message/File.js';
import LocationGlobal from '../entity/message/Location.js';
import MediumImageGlobal from '../entity/message/MediumImage.js';
import MessageGlobal from '../entity/message/Message.js';
import DeleteMessageGlobal from '../entity/message/DeleteMessage.js';
import SystemMessageGlobal from '../entity/message/SystemMessage.js';
import MemberMessageGlobal from '../entity/message/MemberMessage.js';
import MissedMessageGlobal from '../entity/message/MissedMessage.js';
import ContentMessageGlobal from '../entity/message/ContentMessage.js';
import MessageTimerUpdateMessageGlobal from '../entity/message/MessageTimerUpdateMessage.js';
import RenameMessageGlobal from '../entity/message/RenameMessage.js';
import PingMessageGlobal from '../entity/message/PingMessage.js';
import CallMessageGlobal from '../entity/message/CallMessage.js';
import DecryptErrorMessageGlobal from '../entity/message/DecryptErrorMessage.js';
import VerificationMessageGlobal from '../entity/message/VerificationMessage.js';
import UserGlobal from '../entity/User.js';
import ConversationGlobal from '../entity/Conversation.js';
import AvailabilityContextMenuGlobal from '../ui/AvailabilityContextMenu.js';
import ContextMenuGlobal from '../ui/ContextMenu.js';
import ModalGlobal from '../ui/Modal.js';
import OverlayedObserverGlobal from '../ui/OverlayedObserver.js';
import ShortcutTypeGlobal from '../ui/ShortcutType.js';
import ShortcutGlobal from '../ui/Shortcut.js';
import ViewportObserverGlobal from '../ui/ViewportObserver.js';
import WindowHandlerGlobal from '../ui/WindowHandler.js';
import SingleInstanceHandlerGlobal from '../main/SingleInstanceHandler.js';
// import appGlobal from '../main/app.js';

import backendClientGlobal from '../service/BackendClient.js';
import backendEnvGlobal from '../service/BackendEnvironment.js';
import authServiceGlobal from '../auth/AuthService.js';
import authRepoGlobal from '../auth/AuthRepository.js';
import audioRepoGlobal from '../audio/AudioRepository.js';
import audioPreferenceGlobal from '../audio/AudioPreference.js';

import auth from './auth';
/* eslint-enable no-unused-vars */

class App {
  static get CONFIG() {
    return {
      COOKIES_CHECK: {
        COOKIE_NAME: 'cookies_enabled',
      },
      NOTIFICATION_CHECK: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 10,
      SIGN_OUT_REASONS: {
        IMMEDIATE: [
          z.auth.SIGN_OUT_REASON.ACCOUNT_DELETED,
          z.auth.SIGN_OUT_REASON.CLIENT_REMOVED,
          z.auth.SIGN_OUT_REASON.SESSION_EXPIRED,
        ],
        TEMPORARY_GUEST: [
          z.auth.SIGN_OUT_REASON.MULTIPLE_TABS,
          z.auth.SIGN_OUT_REASON.SESSION_EXPIRED,
          z.auth.SIGN_OUT_REASON.USER_REQUESTED,
        ],
      },
    };
  }

  /**
   * Construct a new app.
   * @param {z.main.Auth} authComponent - Authentication component
   */
  constructor(authComponent) {
    this.backendClient = authComponent.backendClient;
    this.logger = new z.util.Logger('z.main.App', z.config.LOGGER.OPTIONS);

    this.telemetry = new z.telemetry.app_init.AppInitTelemetry();
    this.windowHandler = new z.ui.WindowHandler().init();

    this.service = this._setupServices(authComponent);
    this.repository = this._setupRepositories(authComponent);
    this.view = this._setupViewModels();
    this.util = this._setup_utils();

    this.instanceId = z.util.createRandomUuid();

    this._onExtraInstanceStarted = this._onExtraInstanceStarted.bind(this);
    this.singleInstanceHandler = new z.main.SingleInstanceHandler(this._onExtraInstanceStarted);

    this._subscribeToEvents();

    this.initDebugging();
    this.initApp();
    this.initServiceWorker();
  }

  //##############################################################################
  // Instantiation
  //##############################################################################

  /**
   * Create all app repositories.
   * @param {z.main.Auth} authComponent - Authentication component
   * @returns {Object} All repositories
   */
  _setupRepositories(authComponent) {
    const repositories = {};

    repositories.audio = authComponent.audio;
    repositories.auth = authComponent.repository;
    repositories.cache = new z.cache.CacheRepository();
    repositories.giphy = new z.extension.GiphyRepository(this.service.giphy);
    repositories.location = new z.location.LocationRepository(this.service.location);
    repositories.permission = new z.permission.PermissionRepository();
    repositories.serverTime = new z.time.ServerTimeRepository();
    repositories.storage = new z.storage.StorageRepository(this.service.storage);

    repositories.cryptography = new z.cryptography.CryptographyRepository(
      this.service.cryptography,
      repositories.storage
    );
    repositories.client = new z.client.ClientRepository(this.service.client, repositories.cryptography);
    repositories.media = new z.media.MediaRepository(repositories.permission);
    repositories.user = new z.user.UserRepository(
      this.service.user,
      this.service.asset,
      this.service.self,
      repositories.client,
      repositories.serverTime
    );
    repositories.connection = new z.connection.ConnectionRepository(this.service.connection, repositories.user);
    repositories.event = new z.event.EventRepository(
      this.service.event,
      this.service.notification,
      this.service.webSocket,
      this.service.conversation,
      repositories.cryptography,
      repositories.serverTime,
      repositories.user
    );
    repositories.properties = new z.properties.PropertiesRepository(this.service.properties);
    repositories.lifecycle = new z.lifecycle.LifecycleRepository(this.service.lifecycle, repositories.user);
    repositories.connect = new z.connect.ConnectRepository(this.service.connect, repositories.properties);
    repositories.links = new z.links.LinkPreviewRepository(this.service.asset, repositories.properties);
    repositories.search = new z.search.SearchRepository(this.service.search, repositories.user);
    repositories.team = new z.team.TeamRepository(this.service.team, repositories.user);
    repositories.eventTracker = new z.tracking.EventTrackingRepository(repositories.team, repositories.user);

    repositories.conversation = new z.conversation.ConversationRepository(
      this.service.conversation,
      this.service.asset,
      repositories.client,
      repositories.connection,
      repositories.cryptography,
      repositories.event,
      repositories.giphy,
      repositories.links,
      repositories.serverTime,
      repositories.team,
      repositories.user
    );

    const serviceMiddleware = new z.event.preprocessor.ServiceMiddleware(repositories.conversation, repositories.user);
    const quotedMessageMiddleware = new z.event.preprocessor.QuotedMessageMiddleware(
      this.service.event,
      z.message.MessageHasher
    );
    repositories.event.setEventProcessMiddlewares([
      serviceMiddleware.processEvent.bind(serviceMiddleware),
      quotedMessageMiddleware.processEvent.bind(quotedMessageMiddleware),
    ]);
    repositories.backup = new z.backup.BackupRepository(
      this.service.backup,
      repositories.client,
      repositories.connection,
      repositories.conversation,
      repositories.user
    );
    repositories.broadcast = new z.broadcast.BroadcastRepository(
      this.service.broadcast,
      repositories.client,
      repositories.conversation,
      repositories.cryptography,
      repositories.user
    );
    repositories.calling = new z.calling.CallingRepository(
      this.service.calling,
      repositories.client,
      repositories.conversation,
      repositories.event,
      repositories.media,
      repositories.serverTime,
      repositories.user
    );
    repositories.integration = new z.integration.IntegrationRepository(
      this.service.integration,
      repositories.conversation,
      repositories.team
    );
    repositories.notification = new z.notification.NotificationRepository(
      repositories.calling,
      repositories.conversation,
      repositories.permission,
      repositories.user
    );
    repositories.videoGrid = new z.calling.VideoGridRepository(repositories.calling, repositories.media);

    return repositories;
  }

  /**
   * Create all app services.
   * @param {z.main.Auth} authComponent - Authentication component
   * @returns {Object} All services
   */
  _setupServices(authComponent) {
    const storageService = new z.storage.StorageService();
    const eventService = z.util.Environment.browser.edge
      ? new z.event.EventServiceNoCompound(storageService)
      : new z.event.EventService(storageService);

    return {
      asset: new z.assets.AssetService(this.backendClient),
      auth: authComponent.service,
      backup: new z.backup.BackupService(storageService),
      broadcast: new z.broadcast.BroadcastService(this.backendClient),
      calling: new z.calling.CallingService(this.backendClient),
      client: new z.client.ClientService(this.backendClient, storageService),
      connect: new z.connect.ConnectService(this.backendClient),
      connection: new z.connection.ConnectionService(this.backendClient),
      conversation: new z.conversation.ConversationService(this.backendClient, eventService, storageService),
      cryptography: new z.cryptography.CryptographyService(this.backendClient),
      event: eventService,
      giphy: new z.extension.GiphyService(this.backendClient),
      integration: new z.integration.IntegrationService(this.backendClient),
      lifecycle: new z.lifecycle.LifecycleService(),
      location: new z.location.LocationService(this.backendClient),
      notification: new z.event.NotificationService(this.backendClient, storageService),
      properties: new z.properties.PropertiesService(this.backendClient),
      search: new z.search.SearchService(this.backendClient),
      self: new z.self.SelfService(this.backendClient),
      storage: storageService,
      team: new z.team.TeamService(this.backendClient),
      user: new z.user.UserService(this.backendClient, storageService),
      webSocket: new z.event.WebSocketService(this.backendClient),
    };
  }

  /**
   * Create all app utils.
   * @returns {Object} All utils
   */
  _setup_utils() {
    return window.wire.env.FEATURE.ENABLE_DEBUG ? {debug: new z.util.DebugUtil(this.repository)} : {};
  }

  /**
   * Create all app view models.
   * @returns {Object} All view models
   */
  _setupViewModels() {
    return new z.viewModel.MainViewModel(this.repository);
  }

  /**
   * Subscribe to amplify events.
   * @returns {undefined} No return value
   */
  _subscribeToEvents() {
    amplify.subscribe(z.event.WebApp.LIFECYCLE.REFRESH, this.refresh.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.SIGN_OUT, this.logout.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.UPDATE, this.update.bind(this));
  }

  //##############################################################################
  // Initialization
  //##############################################################################

  /**
   * Initialize the app.
   *
   * @note Locally known clients and sessions must not be touched until after the notification stream has been handled.
   *   Any failure in the Promise chain will result in a logout.
   * @todo Check if we really need to logout the user in all these error cases or how to recover from them
   *
   * @param {boolean} [isReload=_isReload()] - App init after page reload
   * @returns {undefined} No return value
   */
  initApp(isReload = this._isReload()) {
    z.util
      .checkIndexedDb()
      .then(() => this._registerSingleInstance())
      .then(() => this._loadAccessToken())
      .then(() => {
        this.view.loading.updateProgress(2.5);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

        const protoFile = `ext/js/@wireapp/protocol-messaging/proto/messages.proto?${z.util.Environment.version(
          false
        )}`;
        return Promise.all([this._initiateSelfUser(), z.util.protobuf.loadProtos(protoFile)]);
      })
      .then(() => {
        this.view.loading.updateProgress(5, z.string.initReceivedSelfUser);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_SELF_USER);
        return this._initiateSelfUserClients();
      })
      .then(clientEntity => {
        this.view.loading.updateProgress(7.5, z.string.initValidatedClient);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.VALIDATED_CLIENT);
        this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CLIENT_TYPE, clientEntity.type);

        return this.repository.cryptography.loadCryptobox(this.service.storage.db);
      })
      .then(() => {
        this.view.loading.updateProgress(10);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);

        this.repository.event.connectWebSocket();

        const promises = [this.repository.conversation.getConversations(), this.repository.connection.getConnections()];
        return Promise.all(promises);
      })
      .then(([conversationEntities, connectionEntities]) => {
        this.view.loading.updateProgress(25, z.string.initReceivedUserData);

        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_USER_DATA);
        this.telemetry.add_statistic(
          z.telemetry.app_init.AppInitStatisticsValue.CONVERSATIONS,
          conversationEntities.length,
          50
        );
        this.telemetry.add_statistic(
          z.telemetry.app_init.AppInitStatisticsValue.CONNECTIONS,
          connectionEntities.length,
          50
        );

        this.repository.conversation.map_connections(this.repository.connection.connectionEntities());
        this._subscribeToUnloadEvents();

        return this.repository.team.getTeam();
      })
      .then(() => this.repository.user.loadUsers())
      .then(() => this.repository.event.initializeFromStream())
      .then(notificationsCount => {
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
        this.telemetry.add_statistic(
          z.telemetry.app_init.AppInitStatisticsValue.NOTIFICATIONS,
          notificationsCount,
          100
        );

        this.repository.eventTracker.init(this.repository.properties.properties.settings.privacy.improve_wire);
        return this.repository.conversation.initialize_conversations();
      })
      .then(() => {
        this.view.loading.updateProgress(97.5, z.string.initUpdatedFromNotifications);

        this._watchOnlineStatus();
        return this.repository.client.updateClientsForSelf();
      })
      .then(clientEntities => {
        this.view.loading.updateProgress(99);

        this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CLIENTS, clientEntities.length);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.APP_PRE_LOADED);

        this.repository.user.self().devices(clientEntities);
        this.logger.info('App pre-loading completed');
        return this._handleUrlParams();
      })
      .then(() => {
        this._showInterface();
        this.telemetry.report();
        amplify.publish(z.event.WebApp.LIFECYCLE.LOADED);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.APP_LOADED);
        return this.repository.conversation.updateConversationsOnAppInit();
      })
      .then(() => {
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.UPDATED_CONVERSATIONS);
        this.repository.lifecycle.init();
        this.repository.audio.init(true);
        this.repository.conversation.cleanup_conversations();
        this.logger.info('App fully loaded');
      })
      .catch(error => this._appInitFailure(error, isReload));
  }

  /**
   * Initialize ServiceWorker if supported.
   * @returns {undefined} No return value
   */
  initServiceWorker() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker
        .register(`/sw.js?${z.util.Environment.version(false)}`)
        .then(({scope}) => this.logger.info(`ServiceWorker registration successful with scope: ${scope}`));
    }
  }

  /**
   * Behavior when internet connection is re-established.
   * @returns {undefined} No return value
   */
  onInternetConnectionGained() {
    this.logger.info('Internet connection regained. Re-establishing WebSocket connection...');
    this.backendClient
      .executeOnConnectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.CONNECTION_REGAINED)
      .then(() => {
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.NO_INTERNET);
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        this.repository.event.reconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.ONLINE);
      });
  }

  /**
   * Reflect internet connection loss in the UI.
   * @returns {undefined} No return value
   */
  onInternetConnectionLost() {
    this.logger.warn('Internet connection lost');
    this.repository.event.disconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.OFFLINE);
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.NO_INTERNET);
  }

  _appInitFailure(error, isReload) {
    let logMessage = `Could not initialize app version '${z.util.Environment.version(false)}'`;
    if (z.util.Environment.desktop) {
      logMessage = `${logMessage} - Electron '${platform.os.family}' '${z.util.Environment.version()}'`;
    }
    this.logger.info(logMessage, {error});

    const {message, type} = error;
    const isAuthError = error instanceof z.error.AuthError;
    if (isAuthError) {
      const isTypeMultipleTabs = type === z.error.AuthError.TYPE.MULTIPLE_TABS;
      const signOutReason = isTypeMultipleTabs
        ? z.auth.SIGN_OUT_REASON.MULTIPLE_TABS
        : z.auth.SIGN_OUT_REASON.INDEXED_DB;
      return this._redirectToLogin(signOutReason);
    }

    this.logger.debug(
      `App reload: '${isReload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`
    );
    if (isReload) {
      const isSessionExpired = [
        z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN,
        z.error.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE,
      ];

      if (isSessionExpired.includes(type)) {
        this.logger.error(`Session expired on page reload: ${message}`, error);
        Raygun.send(new Error('Session expired on page reload', error));
        return this._redirectToLogin(z.auth.SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      const isAccessTokenError = error instanceof z.error.AccessTokenError;
      const isInvalidClient = type === z.error.ClientError.TYPE.NO_VALID_CLIENT;

      if (isAccessTokenError || isInvalidClient) {
        this.logger.warn('Connectivity issues. Trigger reload on regained connectivity.', error);
        const triggerSource = isAccessTokenError
          ? z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL
          : z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD;
        return this.backendClient.executeOnConnectivity(triggerSource).then(() => window.location.reload(false));
      }
    }

    if (navigator.onLine) {
      switch (type) {
        case z.error.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
        case z.error.AccessTokenError.TYPE.RETRIES_EXCEEDED:
        case z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN: {
          this.logger.warn(`Redirecting to login: ${error.message}`, error);
          return this._redirectToLogin(z.auth.SIGN_OUT_REASON.NOT_SIGNED_IN);
        }

        default: {
          this.logger.error(`Caused by: ${(error ? error.message : undefined) || error}`, error);

          const isAccessTokenError = error instanceof z.error.AccessTokenError;
          if (isAccessTokenError) {
            this.logger.error(`Could not get access token: ${error.message}. Logging out user.`, error);
          } else {
            Raygun.send(error);
          }

          return this.logout(z.auth.SIGN_OUT_REASON.APP_INIT);
        }
      }
    }

    this.logger.warn('No connectivity. Trigger reload on regained connectivity.', error);
    this._watchOnlineStatus();
  }

  /**
   * Check whether we need to set different user information (picture, username).
   * @param {z.entity.User} userEntity - Self user entity
   * @returns {z.entity.User} Checked user entity
   */
  _checkUserInformation(userEntity) {
    if (userEntity.hasActivatedIdentity()) {
      if (!userEntity.mediumPictureResource()) {
        this.repository.user.set_default_picture();
      }
      if (!userEntity.username()) {
        this.repository.user.get_username_suggestion();
      }
    }

    return userEntity;
  }

  /**
   * Initiate the self user by getting it from the backend.
   * @returns {Promise<z.entity.User>} Resolves with the self user entity
   */
  _initiateSelfUser() {
    return this.repository.user.getSelf().then(userEntity => {
      this.logger.info(`Loaded self user with ID '${userEntity.id}'`);

      if (!userEntity.hasActivatedIdentity()) {
        this.logger.info('User does not have an activated identity and seems to be a temporary guest');

        if (!userEntity.isTemporaryGuest()) {
          throw new Error('User does not have an activated identity');
        }
      }

      return this.service.storage
        .init(userEntity.id)
        .then(() => this.repository.client.init(userEntity))
        .then(() => this.repository.properties.init(userEntity))
        .then(() => this._checkUserInformation(userEntity));
    });
  }

  /**
   * Initiate the current client of the self user.
   * @returns {Promise<z.client.Client>} Resolves with the local client entity
   */
  _initiateSelfUserClients() {
    return this.repository.client
      .getValidLocalClient()
      .then(clientObservable => {
        this.repository.cryptography.currentClient = clientObservable;
        this.repository.event.currentClient = clientObservable;
        return this.repository.client.getClientsForSelf();
      })
      .then(() => this.repository.client.currentClient());
  }

  /**
   * Handle URL params.
   * @private
   * @returns {undefined} Not return value
   */
  _handleUrlParams() {
    // Currently no URL params to be handled
  }

  /**
   * Check whether the page has been reloaded.
   * @private
   * @returns {boolean}  True if it is a page refresh
   */
  _isReload() {
    const isReload = z.util.isSameLocation(document.referrer, window.location.href);
    const log = `App reload: '${isReload}', Referrer: '${document.referrer}', Location: '${window.location.href}'`;
    this.logger.debug(log);
    return isReload;
  }

  /**
   * Load the access token from cache or get one from the backend.
   * @returns {Promise} Resolves with the access token
   */
  _loadAccessToken() {
    const isLocalhost = z.util.Environment.frontend.isLocalhost();
    const referrer = document.referrer.toLowerCase();
    const isLoginRedirect = referrer.includes('/auth') || referrer.includes('/login');
    const getCachedToken = isLocalhost || isLoginRedirect;

    return getCachedToken ? this.repository.auth.getCachedAccessToken() : this.repository.auth.getAccessToken();
  }

  //##############################################################################
  // Multiple tabs check
  //##############################################################################

  /**
   * Check that this is the single instance tab of the app.
   * @returns {Promise} Resolves when page is the first tab
   */
  _registerSingleInstance() {
    if (this.singleInstanceHandler.registerInstance(this.instanceId)) {
      this._registerSingleInstanceCleaning();
      return Promise.resolve();
    }
    return Promise.reject(new z.error.AuthError(z.error.AuthError.TYPE.MULTIPLE_TABS));
  }

  _registerSingleInstanceCleaning(singleInstanceCheckIntervalId) {
    $(window).on('beforeunload', () => {
      this.singleInstanceHandler.deregisterInstance();
    });
  }

  /**
   * Hide the loading spinner and show the application UI.
   * @returns {undefined} No return value
   */
  _showInterface() {
    const conversationEntity = this.repository.conversation.getMostRecentConversation();
    this.logger.info('Showing application UI');
    if (this.repository.user.isTemporaryGuest()) {
      this.view.list.showTemporaryGuest();
    } else if (this.repository.user.shouldChangeUsername()) {
      this.view.list.showTakeover();
    } else if (conversationEntity) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
    } else if (this.repository.user.connect_requests().length) {
      amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    this.view.loading.removeFromView();
    $('#wire-main').attr('data-uie-value', 'is-loaded');

    this.repository.properties.checkPrivacyPermission().then(() => {
      window.setTimeout(() => this.repository.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });
  }

  /**
   * Subscribe to 'beforeunload' to stop calls and disconnect the WebSocket.
   * @returns {undefined} No return value
   */
  _subscribeToUnloadEvents() {
    $(window).on('unload', () => {
      this.logger.info("'window.onunload' was triggered, so we will disconnect from the backend.");
      this.repository.event.disconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.PAGE_NAVIGATION);
      this.repository.calling.leaveCallOnUnload();

      if (this.repository.user.isActivatedAccount()) {
        this.repository.storage.terminate('window.onunload');
      } else {
        this.repository.conversation.leaveGuestRoom();
        this.repository.storage.deleteDatabase();
      }

      this.repository.notification.clearNotifications();
    });
  }

  /**
   * Subscribe to 'navigator.onLine' related events.
   * @returns {undefined} No return value
   */
  _watchOnlineStatus() {
    this.logger.info('Watching internet connectivity status');
    $(window).on('offline', this.onInternetConnectionLost.bind(this));
    $(window).on('online', this.onInternetConnectionGained.bind(this));
  }

  //##############################################################################
  // Lifecycle
  //##############################################################################

  /**
   * Logs the user out on the backend and deletes cached data.
   *
   * @param {z.auth.SIGN_OUT_REASON} signOutReason - Cause for logout
   * @param {boolean} clearData - Keep data in database
   * @returns {undefined} No return value
   */
  logout(signOutReason, clearData = false) {
    const _redirectToLogin = () => {
      amplify.publish(z.event.WebApp.LIFECYCLE.SIGNED_OUT, clearData);
      this._redirectToLogin(signOutReason);
    };

    const _logout = () => {
      // Disconnect from our backend, end tracking and clear cached data
      this.repository.event.disconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.LOGOUT);

      // Clear Local Storage (but don't delete the cookie label if you were logged in with a permanent client)
      const keysToKeep = [z.storage.StorageKey.AUTH.SHOW_LOGIN];

      const keepPermanentDatabase = this.repository.client.isCurrentClientPermanent() && !clearData;
      if (keepPermanentDatabase) {
        keysToKeep.push(z.storage.StorageKey.AUTH.PERSIST);
      }

      // @todo remove on next iteration
      const selfUser = this.repository.user.self();
      if (selfUser) {
        const cookieLabelKey = this.repository.client.constructCookieLabelKey(selfUser.email() || selfUser.phone());

        Object.keys(amplify.store()).forEach(keyInAmplifyStore => {
          const isCookieLabelKey = keyInAmplifyStore === cookieLabelKey;
          const deleteLabelKey = isCookieLabelKey && clearData;
          const isCookieLabel = z.util.StringUtil.includes(keyInAmplifyStore, z.storage.StorageKey.AUTH.COOKIE_LABEL);

          if (!deleteLabelKey && isCookieLabel) {
            keysToKeep.push(keyInAmplifyStore);
          }
        });

        const keepConversationInput = signOutReason === z.auth.SIGN_OUT_REASON.SESSION_EXPIRED;
        this.repository.cache.clearCache(keepConversationInput, keysToKeep);
      }

      // Clear IndexedDB
      const clearDataPromise = clearData
        ? this.repository.storage
            .deleteDatabase()
            .catch(error => this.logger.error('Failed to delete database before logout', error))
        : Promise.resolve();

      return clearDataPromise.then(() => _redirectToLogin());
    };

    const _logoutOnBackend = () => {
      this.logger.info(`Logout triggered by '${signOutReason}': Disconnecting user from the backend.`);
      return this.repository.auth
        .logout()
        .then(() => _logout())
        .catch(() => _redirectToLogin());
    };

    if (App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason)) {
      return _logout();
    }

    if (navigator.onLine) {
      return _logoutOnBackend();
    }

    this.logger.warn('No internet access. Continuing when internet connectivity regained.');
    $(window).on('online', () => _logoutOnBackend());
  }

  /**
   * Refresh the web app or desktop wrapper
   * @returns {undefined} No return value
   */
  refresh() {
    this.logger.info(`Refresh to update started`);
    if (z.util.Environment.desktop) {
      // if we are in a desktop env, we just warn the wrapper that we need to reload. It then decide what should be done
      return amplify.publish(z.event.WebApp.LIFECYCLE.RESTART, z.lifecycle.UPDATE_SOURCE.WEBAPP);
    }

    window.location.reload(true);
    window.focus();
  }

  /**
   * Notify about found update
   * @returns {undefined} No return value
   */
  update() {
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.LIFECYCLE_UPDATE);
  }

  /**
   * Redirect to the login page after internet connectivity has been verified.
   * @param {z.auth.SIGN_OUT_REASON} signOutReason - Redirect triggered by session expiration
   * @returns {undefined} No return value
   */
  _redirectToLogin(signOutReason) {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);
    this.backendClient
      .executeOnConnectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT)
      .then(() => {
        const isTemporaryGuestReason = App.CONFIG.SIGN_OUT_REASONS.TEMPORARY_GUEST.includes(signOutReason);
        const isLeavingGuestRoom = isTemporaryGuestReason && this.repository.user.isTemporaryGuest();
        if (isLeavingGuestRoom) {
          const path = z.l10n.text(z.string.urlWebsiteRoot);
          const url = z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.WEBSITE, path);
          return window.location.replace(url);
        }

        let url = `/auth/${location.search}`;
        const isImmediateSignOutReason = App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason);
        if (isImmediateSignOutReason) {
          url = z.util.URLUtil.appendParameter(url, `${z.auth.URLParameter.REASON}=${signOutReason}`);
        }

        const redirectToLogin = signOutReason !== z.auth.SIGN_OUT_REASON.NOT_SIGNED_IN;
        if (redirectToLogin) {
          url = `${url}#login`;
        }

        window.location.replace(url);
      });
  }

  //##############################################################################
  // Debugging
  //##############################################################################

  /**
   * Disable debugging on any environment.
   * @returns {undefined} No return value
   */
  disableDebugging() {
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 0;
    this.repository.properties.savePreference(z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING, false);
  }

  /**
   * Enable debugging on any environment.
   * @returns {undefined} No return value
   */
  enableDebugging() {
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 300;
    this.repository.properties.savePreference(z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING, true);
  }

  /**
   * Initialize debugging features.
   * @returns {undefined} No return value
   */
  initDebugging() {
    if (z.util.Environment.frontend.isLocalhost()) {
      this._attachLiveReload();
    }
  }

  /**
   * Report call telemetry to Raygun for analysis.
   * @returns {undefined} No return value
   */
  reportCall() {
    this.repository.calling.reportCall();
  }

  /**
   * Attach live reload on localhost.
   * @returns {undefined} No return value
   */
  _attachLiveReload() {
    const liveReload = document.createElement('script');
    liveReload.id = 'liveReload';
    liveReload.src = 'http://localhost:32123/livereload.js';
    document.body.appendChild(liveReload);
    $('html').addClass('development');
  }

  _onExtraInstanceStarted() {
    return this._redirectToLogin(z.auth.SIGN_OUT_REASON.MULTIPLE_TABS);
  }
}

//##############################################################################
// Setting up the App
//##############################################################################

$(() => {
  if ($('#wire-main-app').length !== 0) {
    wire.app = new App(wire.auth);
  }
});
