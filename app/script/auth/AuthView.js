/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.auth = z.auth || {};

z.auth.AuthView = {
  ANIMATION_DIRECTION: {
    HORIZONTAL_LEFT: 'horizontal-left',
    HORIZONTAL_RIGHT: 'horizontal-right',
    VERTICAL_BOTTOM: 'vertical-bottom',
    VERTICAL_TOP: 'vertical-top',
  },
  MODE: {
    ACCOUNT_LOGIN: 'login',
    ACCOUNT_PASSWORD: 'password',
    ACCOUNT_PHONE: 'phone',
    ACCOUNT_REGISTER: 'register',
    HISTORY: 'history',
    LIMIT: 'limit',
    MULTIPLE_TABS: 'tabs',
    POSTED: 'posted',
    POSTED_OFFLINE: 'offline',
    POSTED_PENDING: 'pending',
    POSTED_RESEND: 'resend',
    POSTED_RETRY: 'retry',
    POSTED_VERIFY: 'verify',
    VERIFY_ACCOUNT: 'account',
    VERIFY_CODE: 'code',
    VERIFY_PASSWORD: 'phone-password',
  },
  REGISTRATION_CONTEXT: {
    EMAIL: 'email',
    GENERIC_INVITE: 'generic_invite',
    PERSONAL_INVITE: 'personal_invite',
  },
  SECTION: {
    ACCOUNT: 'account',
    HISTORY: 'history',
    LIMIT: 'limit',
    MULTIPLE_TABS: 'tabs',
    POSTED: 'posted',
    VERIFY: 'verify',
  },
  TYPE: {
    CODE: 'code',
    EMAIL: 'email',
    FORM: 'form',
    MODE: 'mode',
    NAME: 'name',
    PASSWORD: 'password',
    PHONE: 'phone',
    SECTION: 'section',
    TERMS: 'terms',
  },
};
