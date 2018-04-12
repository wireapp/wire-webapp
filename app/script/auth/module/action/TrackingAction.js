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

import * as TrackingActionCreator from './creator/TrackingActionCreator';
import * as Runtime from '../../Runtime';
import {REGISTER_FLOW} from '../selector/AuthSelector';

export const EVENT_NAME = {
  ACCOUNT: {
    LOGGED_IN: 'account.logged_in',
  },
  CONVERSATION: {
    ADD_PARTICIPANTS: 'conversation.add_participants',
  },
  GUEST_ROOMS: {
    OPENED_SIGNUP: 'guest_rooms.opened_signup',
  },
  PERSONAL: {
    CREATED: 'registration.succeeded',
    ENTERED_ACCOUNT_DATA: 'registration.entered_email_and_password',
    VERIFIED: 'registration.verified_email',
  },
  START: {
    OPENED_LOGIN: 'start.opened_login',
    OPENED_PERSONAL_REGISTRATION: 'start.opened_personal_registration',
    OPENED_START_SCREEN: 'start.opened_start_screen',
    OPENED_TEAM_REGISTRATION: 'start.opened_team_registration',
  },
  TEAM: {
    ADDED_TEAM_NAME: 'team.added_team_name',
    CREATED: 'team.created',
    FINISHED_INVITE_STEP: 'team.finished_invite_step',
    VERIFIED: 'team.verified',
  },
};

export const AUTHENTICATION_CONTEXT = {
  AUTO: 'auto',
  EMAIL: 'email',
  GENERIC_INVITE: 'generic_invite',
  HANDLE: 'handle',
  PERSONAL_INVITE: 'personal_invite',
  PHONE: 'phone',
  PHONE_CODE: 'phone_code',
  PHONE_PASSWORD: 'phone_password',
};

export const FLOW_TO_CONTEXT = {
  [REGISTER_FLOW.PERSONAL]: AUTHENTICATION_CONTEXT.EMAIL,
  [REGISTER_FLOW.GENERIC_INVITATION]: AUTHENTICATION_CONTEXT.GENERIC_INVITE,
  [REGISTER_FLOW.PERSONAL_INVITATION]: AUTHENTICATION_CONTEXT.PERSONAL_INVITE,
};

const PLATFORM_TYPE = {
  BROWSER_APP: 'web',
  DESKTOP_LINUX: 'linux',
  DESKTOP_MACOS: 'mac',
  DESKTOP_WINDOWS: 'windows',
};

function getPlatformType() {
  if (Runtime.isDesktopApp()) {
    if (Runtime.isWindows()) {
      return PLATFORM_TYPE.DESKTOP_WINDOWS;
    }
    if (Runtime.isMacOS()) {
      return PLATFORM_TYPE.DESKTOP_MACOS;
    }
    return PLATFORM_TYPE.DESKTOP_LINUX;
  }
  return PLATFORM_TYPE.BROWSER_APP;
}

export function trackEvent(event) {
  return function(dispatch, getState, {mixpanel}) {
    return Promise.resolve()
      .then(() => dispatch(TrackingActionCreator.startTrackingAction(event)))
      .then(() => {
        return new Promise(resolve => {
          const attributes = {
            ...event.attributes,
            app: 'desktop',
            desktop_app: getPlatformType(),
          };
          mixpanel.track(event.name, attributes, successCode => resolve(successCode));
        });
      })
      .then(trackingResult => dispatch(TrackingActionCreator.successfulTrackingAction(trackingResult)))
      .catch(error => dispatch(TrackingActionCreator.failedTrackingAction(error)));
  };
}

export function trackNameWithContext(name, context) {
  return trackEvent({attributes: {context}, name});
}
