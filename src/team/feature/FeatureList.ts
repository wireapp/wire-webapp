/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import type {
  FeatureAppLock,
  FeatureDigitalSignature,
  FeatureWithoutConfig,
  FeatureLegalhold,
  FeatureConferenceCalling,
  FeatureVideoCalling,
  FeatureFileSharing,
  FeatureVideoMessage,
  FeatureAudioMessage,
} from './Feature';

export enum FEATURE_KEY {
  APPLOCK = 'appLock',
  DIGITAL_SIGNATURES = 'digitalSignatures',
  CONFERENCE_CALLING = 'conferenceCalling',
  VIDEO_CALLING = 'videoCalling',
  VIDEO_MESSAGE = 'videoMessage',
  AUDIO_MESSAGE = 'audioMessage',
  FILE_SHARING = 'fileSharing',
  LEGALHOLD = 'legalhold',
  SEARCH_VISIBILITY = 'searchVisibility',
  SSO = 'sso',
  VALIDATE_SAML_EMAILS = 'validateSAMLemails',
}

export type FeatureList = {
  [FEATURE_KEY.APPLOCK]?: FeatureAppLock;
  [FEATURE_KEY.DIGITAL_SIGNATURES]?: FeatureDigitalSignature;
  [FEATURE_KEY.CONFERENCE_CALLING]?: FeatureConferenceCalling;
  [FEATURE_KEY.VIDEO_CALLING]?: FeatureVideoCalling;
  [FEATURE_KEY.VIDEO_MESSAGE]?: FeatureVideoMessage;
  [FEATURE_KEY.AUDIO_MESSAGE]?: FeatureAudioMessage;
  [FEATURE_KEY.FILE_SHARING]?: FeatureFileSharing;
  [FEATURE_KEY.LEGALHOLD]?: FeatureLegalhold;
  [FEATURE_KEY.SEARCH_VISIBILITY]?: FeatureWithoutConfig;
  [FEATURE_KEY.SSO]?: FeatureWithoutConfig;
  [FEATURE_KEY.VALIDATE_SAML_EMAILS]?: FeatureWithoutConfig;
};
