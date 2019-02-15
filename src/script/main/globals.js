/* eslint-disable no-unused-vars */
import {amplify} from 'amplify';
import Cookies from 'js-cookie';
import jQuery from 'jquery';
import ko from 'knockout';
import raygun from '../../../node_modules/raygun4js/dist/raygun.vanilla.js';

import namespace from '../../ext/js/webapp-module-namespace/Namespace.js';
import bubble from '../../ext/js/webapp-module-bubble/webapp-module-bubble.js';

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
import PeerConnectionUtilGlobal from '../util/PeerConnectionUtil.js';
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
import StorageKeyGlobal from '../storage/StorageKey.js';
import StorageRepositoryGlobal from '../storage/StorageRepository.js';
import StorageSchemataGlobal from '../storage/StorageSchemata.js';
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
import AssetMapperGlobal from '../assets/AssetMapper.js';
import AssetMetaDataBuilderGlobal from '../assets/AssetMetaDataBuilder.js';
import AssetCryptoGlobal from '../assets/AssetCrypto.js';
import ErrorGlobal from '../backup/Error.js';
import BackupRepositoryGlobal from '../backup/BackupRepository.js';
import BroadcastRepositoryGlobal from '../broadcast/BroadcastRepository.js';
import BroadcastServiceGlobal from '../broadcast/BroadcastService.js';
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
import MediaConstraintsHandlerGlobal from '../media/MediaConstraintsHandler.js';
import MediaDeviceTypeGlobal from '../media/MediaDeviceType.js';
import MediaElementHandlerGlobal from '../media/MediaElementHandler.js';
import MediaEmbedsGlobal from '../media/MediaEmbeds.js';
import MediaParserGlobal from '../media/MediaParser.js';
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
import PermissionStatusStateGlobal from '../permission/PermissionStatusState.js';
import PermissionTypeGlobal from '../permission/PermissionType.js';
import PropertiesRepositoryGlobal from '../properties/PropertiesRepository.js';
import PropertiesServiceGlobal from '../properties/PropertiesService.js';
import PropertiesTypeGlobal from '../properties/PropertiesType.js';
import FullTextSearchGlobal from '../search/FullTextSearch.js';
import SearchServiceGlobal from '../search/SearchService.js';
import SearchRepositoryGlobal from '../search/SearchRepository.js';
import ServerTimeRepositoryGlobal from '../time/ServerTimeRepository.js';
import TeamEntityGlobal from '../team/TeamEntity.js';
import TeamMemberEntityGlobal from '../team/TeamMemberEntity.js';
import TeamRepositoryGlobal from '../team/TeamRepository.js';
import TeamServiceGlobal from '../team/TeamService.js';
import CallSetupStepsGlobal from '../telemetry/calling/CallSetupSteps.js';
import CallSetupStepsOrderGlobal from '../telemetry/calling/CallSetupStepsOrder.js';
import CallSetupTimingsGlobal from '../telemetry/calling/CallSetupTimings.js';
import FlowTelemetryGlobal from '../telemetry/calling/FlowTelemetry.js';
import CallTelemetryGlobal from '../telemetry/calling/CallTelemetry.js';
import CallLoggerGlobal from '../telemetry/calling/CallLogger.js';
import AvailabilityMapperGlobal from '../user/AvailabilityMapper.js';
import AvailabilityTypeGlobal from '../user/AvailabilityType.js';
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
import inputLevelGlobal from '../components/inputLevel.js';
import messageGlobal from '../components/message.js';
import messageQuoteGlobal from '../components/messageQuote.js';
import messageTimerButtonGlobal from '../components/messageTimerButton.js';
import serviceListGlobal from '../components/serviceList.js';
import topPeopleGlobal from '../components/topPeople.js';
import participantAvatarGlobal from '../components/participantAvatar.js';
import participantItemGlobal from '../components/list/participantItem.js';
import userProfileGlobal from '../components/userProfile.js';
import userInputGlobal from '../components/userInput.js';
import userListGlobal from '../components/userList.js';
import guestModeToggleGlobal from '../components/guestModeToggle.js';
import infoToggleGlobal from '../components/infoToggle.js';
import iconsGlobal from '../components/icons.js';
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
import ConversationGlobal from '../entity/Conversation.js';
import AvailabilityContextMenuGlobal from '../ui/AvailabilityContextMenu.js';
import ContextMenuGlobal from '../ui/ContextMenu.js';
import ModalGlobal from '../ui/Modal.js';
import ShortcutTypeGlobal from '../ui/ShortcutType.js';
import ShortcutGlobal from '../ui/Shortcut.js';
import WindowHandlerGlobal from '../ui/WindowHandler.js';
import SingleInstanceHandlerGlobal from '../main/SingleInstanceHandler.js';

import backendClientGlobal from '../service/BackendClient.js';
import backendEnvGlobal from '../service/BackendEnvironment.js';
import authServiceGlobal from '../auth/AuthService.js';
import authRepoGlobal from '../auth/AuthRepository.js';
import audioPreferenceGlobal from '../audio/AudioPreference.js';
/* eslint-enable no-unused-vars */

window.amplify = amplify;
window.Cookies = Cookies;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
