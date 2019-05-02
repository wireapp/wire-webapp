/* eslint-disable no-unused-vars */
import {amplify} from 'amplify';
import Cookies from 'js-cookie';
import jQuery from 'jquery';
import ko from 'knockout';
import raygun from '../../../node_modules/raygun4js/dist/raygun.vanilla.js';

import namespace from '../../ext/js/webapp-module-namespace/Namespace.js';
import bubble from '../../ext/js/webapp-module-bubble/webapp-module-bubble.js';

// Needed for the wrapper
import '../event/WebApp';

import configGlobal from '../config.js';

import LocalizerUtilGlobal from 'Util/LocalizerUtil.js';

import BaseErrorGlobal from '../error/BaseError.js';
import AccessTokenErrorGlobal from '../error/AccessTokenError.js';
import AuthErrorGlobal from '../error/AuthError.js';
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
import PermissionErrorGlobal from '../error/PermissionError.js';
import StorageErrorGlobal from '../error/StorageError.js';
import TeamErrorGlobal from '../error/TeamError.js';
import UserErrorGlobal from '../error/UserError.js';
import LocalizerGlobal from '../localization/Localizer.js';
import EventNameGlobal from '../tracking/EventName.js';
import EventTrackingRepositoryGlobal from '../tracking/EventTrackingRepository.js';
import SuperPropertyGlobal from '../tracking/SuperProperty.js';
import ErrorGlobal from '../backup/Error.js';
import ConnectionEntityGlobal from '../connection/ConnectionEntity.js';
import ConnectionMapperGlobal from '../connection/ConnectionMapper.js';
import ConnectionRepositoryGlobal from '../connection/ConnectionRepository.js';
import ConnectionServiceGlobal from '../connection/ConnectionService.js';
import ConnectionStatusGlobal from '../connection/ConnectionStatus.js';
import ClientEntityGlobal from '../client/ClientEntity.js';
import ClientMapperGlobal from '../client/ClientMapper.js';
import ClientTypeGlobal from '../client/ClientType.js';
import AbstractConversationEventHandlerGlobal from '../conversation/AbstractConversationEventHandler.js';
import ClientMismatchHandlerGlobal from '../conversation/ClientMismatchHandler.js';
import ConversationCellStateGlobal from '../conversation/ConversationCellState.js';
import ConversationEphemeralHandlerGlobal from '../conversation/ConversationEphemeralHandler.js';
import ConversationMapperGlobal from '../conversation/ConversationMapper.js';
import ConversationRepositoryGlobal from '../conversation/ConversationRepository.js';
import ConversationServiceGlobal from '../conversation/ConversationService.js';
import ConversationStateHandlerGlobal from '../conversation/ConversationStateHandler.js';
import EventBuilderGlobal from '../conversation/EventBuilder.js';
import CryptographyMapperGlobal from '../cryptography/CryptographyMapper.js';
import CryptographyRepositoryGlobal from '../cryptography/CryptographyRepository.js';
import CryptographyServiceGlobal from '../cryptography/CryptographyService.js';
import GenericMessageTypeGlobal from '../cryptography/GenericMessageType.js';
import ProtoMessageTypeGlobal from '../cryptography/ProtoMessageType.js';
import EventRepositoryGlobal from '../event/EventRepository.js';
import EventServiceGlobal from '../event/EventService.js';
import EventServiceNoCompoundGlobal from '../event/EventServiceNoCompound.js';
import NotificationServiceGlobal from '../event/NotificationService.js';
import QuotedMessageMiddlewareGlobal from '../event/preprocessor/QuotedMessageMiddleware.js';
import ServiceMiddlewareGlobal from '../event/preprocessor/ServiceMiddleware.js';
import WebSocketServiceGlobal from '../event/WebSocketService.js';
import LinkPreviewProtoBuilderGlobal from '../links/LinkPreviewProtoBuilder.js';
import LinkPreviewBlackListGlobal from '../links/LinkPreviewBlackList.js';
import FullTextSearchGlobal from '../search/FullTextSearch.js';
import SearchServiceGlobal from '../search/SearchService.js';
import SearchRepositoryGlobal from '../search/SearchRepository.js';
import TeamEntityGlobal from '../team/TeamEntity.js';
import TeamMemberEntityGlobal from '../team/TeamMemberEntity.js';
import TeamRepositoryGlobal from '../team/TeamRepository.js';
import TeamServiceGlobal from '../team/TeamService.js';
import ActionsViewModelGlobal from '../view_model/ActionsViewModel.js';
import FaviconViewModelGlobal from '../view_model/FaviconViewModel.js';
import ImageDetailViewViewModelGlobal from '../view_model/ImageDetailViewViewModel.js';
import LoadingViewModelGlobal from '../view_model/LoadingViewModel.js';
import MainViewModelGlobal from '../view_model/MainViewModel.js';
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
import GiphyViewModelGlobal from '../view_model/content/GiphyViewModel.js';
import HistoryExportViewModelGlobal from '../view_model/content/HistoryExportViewModel.js';
import HistoryImportViewModelGlobal from '../view_model/content/HistoryImportViewModel.js';
import InputBarViewModelGlobal from '../view_model/content/InputBarViewModel.js';
import PreferencesAboutViewModelGlobal from '../view_model/content/PreferencesAboutViewModel.js';
import PreferencesAccountViewModelGlobal from '../view_model/content/PreferencesAccountViewModel.js';
import PreferencesAVViewModelGlobal from '../view_model/content/PreferencesAVViewModel.js';
import PreferencesDeviceDetailsViewModelGlobal from '../view_model/content/PreferencesDeviceDetailsViewModel.js';
import PreferencesDevicesViewModelGlobal from '../view_model/content/PreferencesDevicesViewModel.js';
import PreferencesOptionsViewModelGlobal from '../view_model/content/PreferencesOptionsViewModel.js';
import TitleBarViewModelGlobal from '../view_model/content/TitleBarViewModel.js';
import PanelViewModelGlobal from '../view_model/PanelViewModel.js';
import ListViewModelGlobal from '../view_model/ListViewModel.js';
import accentColorPickerGlobal from 'Components/accentColorPicker.js';
import availabilityStateGlobal from 'Components/availabilityState.js';
import copyToClipboardGlobal from 'Components/copyToClipboard.js';
import deviceCardGlobal from 'Components/deviceCard.js';
import deviceRemoveGlobal from 'Components/deviceRemove.js';
import ephemeralTimerGlobal from 'Components/ephemeralTimer.js';
import fullSearchGlobal from 'Components/fullSearch.js';
import groupListGlobal from 'Components/groupList.js';
import groupVideoGridGlobal from 'Components/groupVideoGrid.js';
import imageGlobal from 'Components/image.js';
import inputLevelGlobal from 'Components/inputLevel.js';
import messageGlobal from 'Components/message.js';
import messageQuoteGlobal from 'Components/messageQuote.js';
import messageTimerButtonGlobal from 'Components/messageTimerButton.js';
import serviceListGlobal from 'Components/serviceList.js';
import topPeopleGlobal from 'Components/topPeople.js';
import participantAvatarGlobal from 'Components/participantAvatar.js';
import participantItemGlobal from 'Components/list/participantItem.js';
import userProfileGlobal from 'Components/userProfile.js';
import userInputGlobal from 'Components/userInput.js';
import userListGlobal from 'Components/userList.js';
import guestModeToggleGlobal from 'Components/guestModeToggle.js';
import infoToggleGlobal from 'Components/infoToggle.js';
import iconsGlobal from 'Components/icons.js';
import loadingBarGlobal from 'Components/loadingBar.js';
import modalGlobal from 'Components/modal.js';
import assetHeaderGlobal from 'Components/asset/assetHeader.js';
import audioSeekBarGlobal from 'Components/asset/controls/audioSeekBar.js';
import seekBarGlobal from 'Components/asset/controls/seekBar.js';
import mediaButtonGlobal from 'Components/asset/controls/mediaButton.js';
import chooseScreenGlobal from 'Components/calling/chooseScreen.js';
import deviceToggleButtonGlobal from 'Components/calling/deviceToggleButton.js';
import conversationListCallingCellGlobal from 'Components/list/conversationListCallingCell.js';
import conversationListCellGlobal from 'Components/list/conversationListCell.js';
import groupAvatarGlobal from 'Components/list/groupAvatar.js';
import userDetailsGlobal from 'Components/panel/userDetails.js';
import serviceDetailsGlobal from 'Components/panel/serviceDetails.js';
import MessageCategorizationGlobal from '../message/MessageCategorization.js';
import MessageHasherGlobal from '../message/MessageHasher.js';
import MentionEntityGlobal from '../message/MentionEntity.js';
import TextGlobal from '../entity/message/Text.js';
import LocationGlobal from '../entity/message/Location.js';
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
/* eslint-enable no-unused-vars */

window.amplify = amplify;
window.Cookies = Cookies;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
