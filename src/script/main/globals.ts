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
import jQuery from 'jquery';
import ko from 'knockout';
import type {RaygunStatic} from 'raygun4js';
import 'raygun4js/dist/raygun.vanilla';
import type {t} from 'Util/LocalizerUtil';

import type {AssetService} from '../assets/AssetService';
import type {NotificationService} from '../event/NotificationService';

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

import 'Util/LocalizerUtil';

import '../backup/Error';
import '../conversation/EventBuilder';
import '../localization/Localizer';
import '../message/MessageCategorization';
import '../view_model/bindings/CommonBindings';
import '../view_model/bindings/ConversationListBindings';
import '../view_model/bindings/ListBackgroundBindings';
import '../view_model/bindings/MessageListBindings';
import '../view_model/bindings/VideoCallingBindings';
import '../view_model/content/CollectionDetailsViewModel';
import '../view_model/content/CollectionViewModel';
import '../view_model/content/ConnectRequestsViewModel';
import '../view_model/content/GiphyViewModel';
import '../view_model/content/HistoryExportViewModel';
import '../view_model/content/HistoryImportViewModel';
import '../view_model/content/InputBarViewModel';
import '../view_model/content/PreferencesAboutViewModel';
import '../view_model/content/PreferencesAccountViewModel';
import '../view_model/content/PreferencesDeviceDetailsViewModel';
import '../view_model/content/PreferencesDevicesViewModel';
import '../view_model/content/PreferencesOptionsViewModel';
import '../view_model/content/TitleBarViewModel';
import '../view_model/FaviconViewModel';
import '../view_model/ImageDetailViewViewModel';
import '../view_model/ListViewModel';
import '../view_model/LoadingViewModel';
import '../view_model/MainViewModel';
import '../view_model/PanelViewModel';

declare global {
  interface Window {
    $: typeof jQuery;
    amplify: amplify.Static;
    jQuery: typeof jQuery;
    ko: typeof ko;
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
        WEBSITE_LABEL: string;
      };
    };
    wSSOCapable: boolean;
    z: any;
  }
}

window.amplify = amplify;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
