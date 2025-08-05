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

import {
  FeatureAppLock,
  FeatureChannels,
  FeatureClassifiedDomains,
  FeatureConferenceCalling,
  FeatureConsumableNotifications,
  FeatureDigitalSignature,
  FeatureDomainRegistration,
  FeatureDownloadPath,
  FeatureFileSharing,
  FeatureLegalhold,
  FeatureMLS,
  FeatureMLSE2EId,
  FeatureMLSMigration,
  FeatureSelfDeletingMessages,
  FeatureSndFactorPassword,
  FeatureVideoCalling,
  FeatureWithoutConfig,
} from './Feature';

import {FeatureConversationGuestLink} from '.';

export enum FEATURE_KEY {
  APPLOCK = 'appLock',
  CLASSIFIED_DOMAINS = 'classifiedDomains',
  CONFERENCE_CALLING = 'conferenceCalling',
  CONSUMABLE_NOTIFICATIONS = 'consumableNotifications',
  CONVERSATION_GUEST_LINKS = 'conversationGuestLinks',
  DIGITAL_SIGNATURES = 'digitalSignatures',
  DOMAIN_REGISTRATION = 'domainRegistration',
  ENFORCE_DOWNLOAD_PATH = 'enforceFileDownloadLocation',
  FILE_SHARING = 'fileSharing',
  LEGALHOLD = 'legalhold',
  MLS = 'mls',
  MLSE2EID = 'mlsE2EId',
  MLS_MIGRATION = 'mlsMigration',
  SEARCH_VISIBILITY = 'searchVisibility',
  SELF_DELETING_MESSAGES = 'selfDeletingMessages',
  SND_FACTOR_PASSWORD = 'sndFactorPasswordChallenge',
  SSO = 'sso',
  VALIDATE_SAML_EMAILS = 'validateSAMLemails',
  VIDEO_CALLING = 'videoCalling',
  CHANNELS = 'channels',
  CELLS = 'cells',
}

export type FeatureList = {
  [FEATURE_KEY.APPLOCK]?: FeatureAppLock;
  [FEATURE_KEY.CLASSIFIED_DOMAINS]?: FeatureClassifiedDomains;
  [FEATURE_KEY.CONFERENCE_CALLING]?: FeatureConferenceCalling;
  [FEATURE_KEY.DIGITAL_SIGNATURES]?: FeatureDigitalSignature;
  [FEATURE_KEY.DOMAIN_REGISTRATION]?: FeatureDomainRegistration;
  [FEATURE_KEY.CONSUMABLE_NOTIFICATIONS]?: FeatureConsumableNotifications;
  [FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]?: FeatureDownloadPath;
  [FEATURE_KEY.CONVERSATION_GUEST_LINKS]?: FeatureConversationGuestLink;
  [FEATURE_KEY.FILE_SHARING]?: FeatureFileSharing;
  [FEATURE_KEY.LEGALHOLD]?: FeatureLegalhold;
  [FEATURE_KEY.SEARCH_VISIBILITY]?: FeatureWithoutConfig;
  [FEATURE_KEY.SELF_DELETING_MESSAGES]?: FeatureSelfDeletingMessages;
  [FEATURE_KEY.SND_FACTOR_PASSWORD]?: FeatureSndFactorPassword;
  [FEATURE_KEY.SSO]?: FeatureWithoutConfig;
  [FEATURE_KEY.MLS]?: FeatureMLS;
  [FEATURE_KEY.MLSE2EID]?: FeatureMLSE2EId;
  [FEATURE_KEY.MLS_MIGRATION]?: FeatureMLSMigration;
  [FEATURE_KEY.VALIDATE_SAML_EMAILS]?: FeatureWithoutConfig;
  [FEATURE_KEY.VIDEO_CALLING]?: FeatureVideoCalling;
  [FEATURE_KEY.CHANNELS]?: FeatureChannels;
  [FEATURE_KEY.CELLS]?: FeatureWithoutConfig;
};
