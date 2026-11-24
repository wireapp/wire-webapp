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
  ACCESS_TYPE,
  CONVERSATION_PROTOCOL,
  FEATURE_KEY,
  FEATURE_LOCK_STATUS,
  FEATURE_STATUS,
} from './featureList.enums';
import {
  FeatureAllowedGlobalOperations,
  FeatureAppLock,
  FeatureApps,
  FeatureAssetAuditLog,
  FeatureCells,
  FeatureChannels,
  FeatureChatBubbles,
  FeatureClassifiedDomains,
  FeatureConferenceCalling,
  FeatureConsumableNotifications,
  FeatureConversationGuestLink,
  FeatureDigitalSignature,
  FeatureDomainRegistration,
  FeatureDownloadPath,
  FeatureExposeInvitationURLsToTeamAdmin,
  FeatureFileSharing,
  FeatureLegalhold,
  FeatureLimitedEventFanout,
  FeatureMeeting,
  FeatureMLS,
  FeatureMLSE2EId,
  FeatureMLSMigration,
  FeatureOutlookCalIntegration,
  FeaturePreventAdminLessGroups,
  FeatureSearchVisibility,
  FeatureSearchVisibilityInbound,
  FeatureSelfDeletingMessages,
  FeatureSimplifiedUserConnectionRequestQRCode,
  FeatureSndFactorPassword,
  FeatureSSO,
  FeatureStealthUsers,
  FeatureValidateSAMLEmails,
  FeatureVideoCalling,
} from './featureList.schema';

export {ACCESS_TYPE, CONVERSATION_PROTOCOL, FEATURE_KEY, FEATURE_LOCK_STATUS, FEATURE_STATUS};

/* eslint-disable @typescript-eslint/no-magic-numbers -- Expiration options define their serialized durations in seconds inline. */
export enum SELF_DELETING_TIMEOUT {
  OFF = 0,
  SECONDS_10 = 10,
  MINUTES_5 = 300,
  HOURS_1 = 3_600,
  DAYS_1 = 86_400,
  WEEKS_1 = 604_800,
  WEEKS_4 = 2_419_200,
}
/* eslint-enable @typescript-eslint/no-magic-numbers */

/**
 * FeatureList represents the response from the Wire backend feature flags API.
 *
 * IMPORTANT: This type uses types derived from Zod schemas in FeatureList.schema.ts.
 * The Zod schema is the single source of truth for structure and validation.
 *
 * When adding a new feature flag:
 * 1. Add the key to the FEATURE_KEY enum above
 * 2. Add the Zod schema in FeatureList.schema.ts
 * 3. Export the z.infer<> type from FeatureList.schema.ts
 * 4. Import and use it here
 */
export type FeatureList = {
  [FEATURE_KEY.APPLOCK]?: FeatureAppLock;
  [FEATURE_KEY.ALLOWED_GLOBAL_OPERATIONS]?: FeatureAllowedGlobalOperations;
  [FEATURE_KEY.APPS]?: FeatureApps;
  [FEATURE_KEY.ASSET_AUDIT_LOG]?: FeatureAssetAuditLog;
  [FEATURE_KEY.CELLS]?: FeatureCells;
  [FEATURE_KEY.CHANNELS]?: FeatureChannels;
  [FEATURE_KEY.CHAT_BUBBLES]?: FeatureChatBubbles;
  [FEATURE_KEY.ASSET_AUDIT_LOG]?: FeatureAssetAuditLog;
  [FEATURE_KEY.CLASSIFIED_DOMAINS]?: FeatureClassifiedDomains;
  [FEATURE_KEY.CONFERENCE_CALLING]?: FeatureConferenceCalling;
  [FEATURE_KEY.CONSUMABLE_NOTIFICATIONS]?: FeatureConsumableNotifications;
  [FEATURE_KEY.CONVERSATION_GUEST_LINKS]?: FeatureConversationGuestLink;
  [FEATURE_KEY.DIGITAL_SIGNATURES]?: FeatureDigitalSignature;
  [FEATURE_KEY.DOMAIN_REGISTRATION]?: FeatureDomainRegistration;
  [FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]?: FeatureDownloadPath;
  [FEATURE_KEY.EXPOSE_INVITATION_URLS_TO_TEAM_ADMIN]?: FeatureExposeInvitationURLsToTeamAdmin;
  [FEATURE_KEY.FILE_SHARING]?: FeatureFileSharing;
  [FEATURE_KEY.LEGALHOLD]?: FeatureLegalhold;
  [FEATURE_KEY.LIMITED_EVENT_FANOUT]?: FeatureLimitedEventFanout;
  [FEATURE_KEY.MLS]?: FeatureMLS;
  [FEATURE_KEY.MLSE2EID]?: FeatureMLSE2EId;
  [FEATURE_KEY.MLS_MIGRATION]?: FeatureMLSMigration;
  [FEATURE_KEY.OUTLOOK_CAL_INTEGRATION]?: FeatureOutlookCalIntegration;
  [FEATURE_KEY.SEARCH_VISIBILITY]?: FeatureSearchVisibility;
  [FEATURE_KEY.SEARCH_VISIBILITY_INBOUND]?: FeatureSearchVisibilityInbound;
  [FEATURE_KEY.SELF_DELETING_MESSAGES]?: FeatureSelfDeletingMessages;
  [FEATURE_KEY.SIMPLIFIED_USER_CONNECTION_REQUEST_QR_CODE]?: FeatureSimplifiedUserConnectionRequestQRCode;
  [FEATURE_KEY.SND_FACTOR_PASSWORD]?: FeatureSndFactorPassword;
  [FEATURE_KEY.SSO]?: FeatureSSO;
  [FEATURE_KEY.STEALTH_USERS]?: FeatureStealthUsers;
  [FEATURE_KEY.VALIDATE_SAML_EMAILS]?: FeatureValidateSAMLEmails;
  [FEATURE_KEY.VIDEO_CALLING]?: FeatureVideoCalling;
  [FEATURE_KEY.PREVENT_ADMIN_LESS_GROUPS]?: FeaturePreventAdminLessGroups;
  [FEATURE_KEY.MEETINGS]?: FeatureMeeting;
  // Allow additional unknown features from newer API versions (matches Zod schema .passthrough())
  [key: string]: unknown;
};
