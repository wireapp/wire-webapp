/* eslint-disable no-unused-vars */
import {amplify} from 'amplify';
import Cookies from 'js-cookie';
import jQuery from 'jquery';
import ko from 'knockout';
import raygun from '../../../node_modules/raygun4js/dist/raygun.vanilla.js';

// Needed for the wrapper
import '../event/WebApp';

import configGlobal from '../config.js';

import LocalizerUtilGlobal from 'Util/LocalizerUtil.js';

import AccessTokenErrorGlobal from '../error/AccessTokenError.js';
import AuthErrorGlobal from '../error/AuthError.js';
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
import ErrorGlobal from '../backup/Error.js';
import FaviconViewModelGlobal from '../view_model/FaviconViewModel.js';
import ImageDetailViewViewModelGlobal from '../view_model/ImageDetailViewViewModel.js';
import LoadingViewModelGlobal from '../view_model/LoadingViewModel.js';
import MainViewModelGlobal from '../view_model/MainViewModel.js';
import CommonBindingsGlobal from '../view_model/bindings/CommonBindings.js';
import ConversationListBindingsGlobal from '../view_model/bindings/ConversationListBindings.js';
import ListBackgroundBindingsGlobal from '../view_model/bindings/ListBackgroundBindings.js';
import LocalizationBindingsGlobal from '../view_model/bindings/LocalizationBindings.js';
import MessageListBindingsGlobal from '../view_model/bindings/MessageListBindings.js';
import VideoCallingBindingsGlobal from '../view_model/bindings/VideoCallingBindings.js';
import CollectionDetailsViewModelGlobal from '../view_model/content/CollectionDetailsViewModel.js';
import CollectionViewModelGlobal from '../view_model/content/CollectionViewModel.js';
import ConnectRequestsViewModelGlobal from '../view_model/content/ConnectRequestsViewModel.js';
import GiphyViewModelGlobal from '../view_model/content/GiphyViewModel.js';
import HistoryExportViewModelGlobal from '../view_model/content/HistoryExportViewModel.js';
import HistoryImportViewModelGlobal from '../view_model/content/HistoryImportViewModel.js';
import InputBarViewModelGlobal from '../view_model/content/InputBarViewModel.js';
import PreferencesAboutViewModelGlobal from '../view_model/content/PreferencesAboutViewModel.js';
import PreferencesAccountViewModelGlobal from '../view_model/content/PreferencesAccountViewModel.js';
import PreferencesDeviceDetailsViewModelGlobal from '../view_model/content/PreferencesDeviceDetailsViewModel.js';
import PreferencesDevicesViewModelGlobal from '../view_model/content/PreferencesDevicesViewModel.js';
import PreferencesOptionsViewModelGlobal from '../view_model/content/PreferencesOptionsViewModel.js';
import TitleBarViewModelGlobal from '../view_model/content/TitleBarViewModel.js';
import PanelViewModelGlobal from '../view_model/PanelViewModel.js';
import ListViewModelGlobal from '../view_model/ListViewModel.js';
import accentColorPickerGlobal from 'Components/accentColorPicker.js';
import copyToClipboardGlobal from 'Components/copyToClipboard.ts';
import deviceRemoveGlobal from 'Components/deviceRemove.js';
import ephemeralTimerGlobal from 'Components/ephemeralTimer.js';
import fullSearchGlobal from 'Components/fullSearch.js';
import groupListGlobal from 'Components/groupList.js';
import imageGlobal from 'Components/image.js';
import inputLevelGlobal from 'Components/inputLevel.js';
import messageGlobal from 'Components/message.js';
import messageQuoteGlobal from 'Components/messageQuote.js';
import messageTimerButtonGlobal from 'Components/messageTimerButton.js';
import serviceListGlobal from 'Components/serviceList.js';
import topPeopleGlobal from 'Components/topPeople.js';
import userInputGlobal from 'Components/userInput.js';
import guestModeToggleGlobal from 'Components/guestModeToggle.js';
import infoToggleGlobal from 'Components/infoToggle.js';
import iconsGlobal from 'Components/icons.js';
import modalGlobal from 'Components/modal.ts';
import assetHeaderGlobal from 'Components/asset/assetHeader.js';
import audioSeekBarGlobal from 'Components/asset/controls/audioSeekBar.js';
import seekBarGlobal from 'Components/asset/controls/seekBar.js';
import mediaButtonGlobal from 'Components/asset/controls/mediaButton.js';
import conversationListCallingCellGlobal from 'Components/list/conversationListCallingCell.js';
import conversationListCellGlobal from 'Components/list/conversationListCell.ts';
import groupAvatarGlobal from 'Components/list/groupAvatar.js';
import userDetailsGlobal from 'Components/panel/userDetails.js';
import serviceDetailsGlobal from 'Components/panel/serviceDetails.js';
import MessageCategorizationGlobal from '../message/MessageCategorization.js';
/* eslint-enable no-unused-vars */

window.amplify = amplify;
window.Cookies = Cookies;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
