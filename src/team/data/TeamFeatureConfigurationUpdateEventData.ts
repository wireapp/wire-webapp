/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {
  FeatureAppLock,
  FeatureDigitalSignature,
  FeatureConferenceCalling,
  FeatureVideoCalling,
  FeatureLegalhold,
  FeatureWithoutConfig,
  FEATURE_KEY,
  FeatureFileSharing,
  FeatureVideoMessage,
  FeatureAudioMessage,
} from '../feature';

export type TeamFeatureConfigurationUpdateEventData =
  | (FeatureAppLock & {name: FEATURE_KEY.APPLOCK})
  | (FeatureDigitalSignature & {name: FEATURE_KEY.DIGITAL_SIGNATURES})
  | (FeatureConferenceCalling & {name: FEATURE_KEY.CONFERENCE_CALLING})
  | (FeatureVideoCalling & {name: FEATURE_KEY.VIDEO_CALLING})
  | (FeatureVideoMessage & {name: FEATURE_KEY.VIDEO_MESSAGE})
  | (FeatureAudioMessage & {name: FEATURE_KEY.AUDIO_MESSAGE})
  | (FeatureFileSharing & {name: FEATURE_KEY.FILE_SHARING})
  | (FeatureLegalhold & {name: FEATURE_KEY.LEGALHOLD})
  | (FeatureWithoutConfig & {name: FEATURE_KEY.SEARCH_VISIBILITY | FEATURE_KEY.SSO | FEATURE_KEY.VALIDATE_SAML_EMAILS});
