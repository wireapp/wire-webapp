/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import * as platform from 'platform';
import * as bazinga64 from 'bazinga64';
import jQuery from 'jquery';
import Cookies from 'js-cookie';
import ko from 'knockout';
import {RaygunStatic} from 'raygun4js';
import 'raygun4js/dist/raygun.vanilla';

import {AssetService} from '../assets/AssetService';
import {NotificationService} from '../event/NotificationService';
import type {Environment} from '../util/Environment';
import type {WebAppEvents} from '../event/WebApp';
import type {PermissionHelpers, ROLE} from '../user/UserPermission';

// Needed for the wrapper
import '../event/WebApp';

import '../Config';

import 'Components/accentColorPicker';
import 'Components/asset/assetHeader';
import 'Components/asset/controls/audioSeekBar';
import 'Components/asset/controls/mediaButton';
import 'Components/asset/controls/seekBar';
import 'Components/copyToClipboard';
import 'Components/deviceRemove';
import 'Components/ephemeralTimer';
import 'Components/fullSearch';
import 'Components/groupList';
import 'Components/guestModeToggle';
import 'Components/icons';
import 'Components/image';
import 'Components/infoToggle';
import 'Components/inputLevel';
import 'Components/list/conversationListCallingCell';
import 'Components/list/conversationListCell';
import 'Components/list/groupAvatar';
import 'Components/message';
import 'Components/messageQuote';
import 'Components/messageTimerButton';
import 'Components/modal';
import 'Components/panel/serviceDetails';
import 'Components/panel/userDetails';
import 'Components/serviceList';
import 'Components/topPeople';
import 'Components/userInput';

import {t} from 'Util/LocalizerUtil';

import {
  CancelError,
  DifferentAccountError,
  ExportError,
  ImportError,
  IncompatibleBackupError,
  IncompatiblePlatformError,
  InvalidMetaDataError,
} from '../backup/Error';
import {EventBuilder} from '../conversation/EventBuilder';
import {strings} from '../localization/Localizer';
import '../message/MessageCategorization';
import '../view_model/bindings/CommonBindings';
import '../view_model/bindings/ConversationListBindings';
import '../view_model/bindings/ListBackgroundBindings';
import '../view_model/bindings/MessageListBindings';
import '../view_model/bindings/VideoCallingBindings';
import {CollectionDetailsViewModel} from '../view_model/content/CollectionDetailsViewModel';
import {CollectionViewModel} from '../view_model/content/CollectionViewModel';
import {ConnectRequestsViewModel} from '../view_model/content/ConnectRequestsViewModel';
import {GiphyViewModel} from '../view_model/content/GiphyViewModel';
import {HistoryExportViewModel} from '../view_model/content/HistoryExportViewModel';
import {HistoryImportViewModel} from '../view_model/content/HistoryImportViewModel';
import {InputBarViewModel} from '../view_model/content/InputBarViewModel';
import {PreferencesAboutViewModel} from '../view_model/content/PreferencesAboutViewModel';
import {PreferencesAccountViewModel} from '../view_model/content/PreferencesAccountViewModel';
import {PreferencesDeviceDetailsViewModel} from '../view_model/content/PreferencesDeviceDetailsViewModel';
import {PreferencesDevicesViewModel} from '../view_model/content/PreferencesDevicesViewModel';
import {PreferencesOptionsViewModel} from '../view_model/content/PreferencesOptionsViewModel';
import {TitleBarViewModel} from '../view_model/content/TitleBarViewModel';
import {FaviconViewModel} from '../view_model/FaviconViewModel';
import {ImageDetailViewViewModel} from '../view_model/ImageDetailViewViewModel';
import {ListViewModel} from '../view_model/ListViewModel';
import {LoadingViewModel} from '../view_model/LoadingViewModel';
import {MainViewModel} from '../view_model/MainViewModel';
import {PanelViewModel} from '../view_model/PanelViewModel';

declare global {
  interface Window {
    $: typeof jQuery;
    amplify: amplify.Static;
    bazinga64: typeof bazinga64;
    jQuery: typeof jQuery;
    ko: typeof ko;
    platform: typeof platform;
    Raygun: RaygunStatic;
    t: typeof t;
    wire: {
      app: {
        service: {
          asset: AssetService;
          notification: NotificationService;
        };
      };
      env: {
        ANALYTICS_API_KEY: string;
        APP_BASE: string;
        APP_NAME: string;
        BACKEND_NAME: string;
        BACKEND_REST: string;
        BACKEND_WS: string;
        BRAND_NAME: string;
        ENVIRONMENT: string;
        FEATURE: {
          ALLOWED_FILE_UPLOAD_EXTENSIONS: string[];
          APPLOCK_SCHEDULED_TIMEOUT: number;
          APPLOCK_UNFOCUS_TIMEOUT: number;
          CHECK_CONSENT: boolean;
          DEFAULT_LOGIN_TEMPORARY_CLIENT: boolean;
          ENABLE_ACCOUNT_REGISTRATION: boolean;
          ENABLE_DEBUG: boolean;
          ENABLE_DOMAIN_DISCOVERY: boolean;
          ENABLE_PHONE_LOGIN: boolean;
          ENABLE_SSO: boolean;
          PERSIST_TEMPORARY_CLIENTS: boolean;
          SHOW_LOADING_INFORMATION: boolean;
        };
        MAX_GROUP_PARTICIPANTS: number;
        MAX_VIDEO_PARTICIPANTS: number;
        NEW_PASSWORD_MINIMUM_LENGTH: number;
        RAYGUN_API_KEY: string;
        URL: {
          ACCOUNT_BASE: string;
          MOBILE_BASE: string;
          TEAMS_BASE: string;
          WEBSITE_BASE: string;
          PRIVACY_POLICY: string;
          TERMS_OF_USE_PERSONAL: string;
          TERMS_OF_USE_TEAMS: string;
          SUPPORT: {
            BUG_REPORT: string;
            CALLING: string;
            CAMERA_ACCESS_DENIED: string;
            CONTACT: string;
            DEVICE_ACCESS_DENIED: string;
            DEVICE_NOT_FOUND: string;
            EMAIL_EXISTS: string;
            HISTORY: string;
            INDEX: string;
            MICROPHONE_ACCESS_DENIED: string;
            SCREEN_ACCESS_DENIED: string;
          };
        };
        VERSION: string;
      };
    };
    wSSOCapable: boolean;
    z: {
      backup?: {
        CancelError: typeof CancelError;
        DifferentAccountError: typeof DifferentAccountError;
        ExportError: typeof ExportError;
        ImportError: typeof ImportError;
        IncompatibleBackupError: typeof IncompatibleBackupError;
        IncompatiblePlatformError: typeof IncompatiblePlatformError;
        InvalidMetaDataError: typeof InvalidMetaDataError;
      };
      conversation?: {
        EventBuilder?: typeof EventBuilder;
      };
      event?: {
        WebApp?: typeof WebAppEvents;
      };
      string?: typeof strings;
      team?: {
        ROLE?: typeof ROLE;
      };
      userPermission?: ko.Observable<PermissionHelpers>;
      util?: {
        Environment?: typeof Environment;
      };
      viewModel?: {
        CollectionDetailsViewModel: typeof CollectionDetailsViewModel;
        CollectionViewModel: typeof CollectionViewModel;
        ConnectRequestsViewModel: typeof ConnectRequestsViewModel;
        GiphyViewModel: typeof GiphyViewModel;
        HistoryExportViewModel: typeof HistoryExportViewModel;
        HistoryImportViewModel: typeof HistoryImportViewModel;
        InputBarViewModel: typeof InputBarViewModel;
        PreferencesAboutViewModel: typeof PreferencesAboutViewModel;
        PreferencesAccountViewModel: typeof PreferencesAccountViewModel;
        PreferencesDeviceDetailsViewModel: typeof PreferencesDeviceDetailsViewModel;
        PreferencesDevicesViewModel: typeof PreferencesDevicesViewModel;
        PreferencesOptionsViewModel: typeof PreferencesOptionsViewModel;
        TitleBarViewModel: typeof TitleBarViewModel;
        FaviconViewModel: typeof FaviconViewModel;
        ImageDetailViewViewModel: typeof ImageDetailViewViewModel;
        ListViewModel: typeof ListViewModel;
        LoadingViewModel: typeof LoadingViewModel;
        MainViewModel: typeof MainViewModel;
        PanelViewModel: typeof PanelViewModel;
      };
    };
  }
}

window.amplify = amplify;
window.Cookies = Cookies;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
