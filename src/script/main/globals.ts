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
import type {t} from 'Util/LocalizerUtil';

import type {AssetService} from '../assets/AssetService';
import type {NotificationService} from '../event/NotificationService';

import '../Config';

import '../page/AccentColorPicker';
import 'Components/asset/AssetHeader';
import 'Components/asset/controls/AudioSeekBar';
import 'Components/asset/controls/MediaButton';
import 'Components/asset/controls/SeekBar';
import 'Components/CopyToClipboard';
import 'Components/message/EphemeralTimer';
import '../page/start-ui/GroupList';
import 'Components/toggle/GuestModeToggle';
import 'Components/icons';
import 'Components/Image';
import 'Components/toggle/InfoToggle';
import '../page/preferences/InputLevel';
import 'Components/calling/FullscreenVideoCall';
import 'Components/list/ConversationListCallingCell';
import 'Components/list/ConversationListCell';
import 'Components/avatar/GroupAvatar';
import 'Components/message';
import '../page/message-list/MessageTimerButton';
import 'Components/modal';
import 'Components/panel/ServiceDetails';
import 'Components/panel/UserDetails';
import 'Components/ServiceList';
import '../page/start-ui/TopPeople';
import 'Components/UserInput';

import 'Util/LocalizerUtil';

import '../localization/Localizer';
import '../view_model/bindings/CommonBindings';
import '../view_model/bindings/ConversationListBindings';
import '../view_model/bindings/ListBackgroundBindings';
import '../view_model/bindings/MessageListBindings';
import '../view_model/bindings/VideoCallingBindings';
import '../view_model/bindings/ReactBindings';

import '../view_model/MainViewModel';
import '../view_model/PanelViewModel';

declare global {
  interface Window {
    $: typeof jQuery;
    amplify: amplify.Static;
    jQuery: typeof jQuery;
    ko: typeof ko;
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
        CHROME_ORIGIN_TRIAL_TOKEN: string;
        COUNTLY_API_KEY: string;
        ENVIRONMENT: string;
        FEATURE: {
          ALLOWED_FILE_UPLOAD_EXTENSIONS: string[];
          APPLOCK_SCHEDULED_TIMEOUT: number;
          CHECK_CONSENT: boolean;
          CONFERENCE_AUTO_MUTE: boolean;
          DEFAULT_LOGIN_TEMPORARY_CLIENT: boolean;
          ENABLE_ACCOUNT_REGISTRATION: boolean;
          ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY: boolean;
          ENABLE_DEBUG: boolean;
          ENABLE_DOMAIN_DISCOVERY: boolean;
          ENABLE_FEDERATION: boolean;
          ENABLE_MEDIA_EMBEDS: boolean;
          ENABLE_PHONE_LOGIN: boolean;
          ENABLE_SSO: boolean;
          ENFORCE_CONSTANT_BITRATE: boolean;
          FEDERATION_DOMAIN: string;
          PERSIST_TEMPORARY_CLIENTS: boolean;
          SHOW_LOADING_INFORMATION: boolean;
        };
        MAX_GROUP_PARTICIPANTS: number;
        MAX_VIDEO_PARTICIPANTS: number;
        NEW_PASSWORD_MINIMUM_LENGTH: number;
        URL: {
          ACCOUNT_BASE: string;
          MOBILE_BASE: string;
          PRICING: string;
          PRIVACY_POLICY: string;
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
            LEGAL_HOLD_BLOCK: string;
            MICROPHONE_ACCESS_DENIED: string;
            SCREEN_ACCESS_DENIED: string;
          };
          TEAMS_BASE: string;
          TEAMS_BILLING: string;
          TEAMS_CREATE: string;
          TERMS_OF_USE_PERSONAL: string;
          TERMS_OF_USE_TEAMS: string;
          WEBSITE_BASE: string;
          WHATS_NEW: string;
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
