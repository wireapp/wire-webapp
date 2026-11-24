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

/**
 * FEATURE_KEY enum defines the canonical keys for all Wire feature flags.
 * These keys match the camelCase property names returned by the Wire backend API.
 */
export enum FEATURE_KEY {
  APPLOCK = 'appLock',
  ALLOWED_GLOBAL_OPERATIONS = 'allowedGlobalOperations',
  APPS = 'apps',
  ASSET_AUDIT_LOG = 'assetAuditLog',
  CELLS = 'cells',
  CHANNELS = 'channels',
  CHAT_BUBBLES = 'chatBubbles',
  CLASSIFIED_DOMAINS = 'classifiedDomains',
  CONFERENCE_CALLING = 'conferenceCalling',
  CONSUMABLE_NOTIFICATIONS = 'consumableNotifications',
  CONVERSATION_GUEST_LINKS = 'conversationGuestLinks',
  DIGITAL_SIGNATURES = 'digitalSignatures',
  DOMAIN_REGISTRATION = 'domainRegistration',
  ENFORCE_DOWNLOAD_PATH = 'enforceFileDownloadLocation',
  EXPOSE_INVITATION_URLS_TO_TEAM_ADMIN = 'exposeInvitationURLsToTeamAdmin',
  FILE_SHARING = 'fileSharing',
  LEGALHOLD = 'legalhold',
  LIMITED_EVENT_FANOUT = 'limitedEventFanout',
  MLS = 'mls',
  MLSE2EID = 'mlsE2EId',
  MLS_MIGRATION = 'mlsMigration',
  OUTLOOK_CAL_INTEGRATION = 'outlookCalIntegration',
  SEARCH_VISIBILITY = 'searchVisibility',
  SEARCH_VISIBILITY_INBOUND = 'searchVisibilityInbound',
  SELF_DELETING_MESSAGES = 'selfDeletingMessages',
  SIMPLIFIED_USER_CONNECTION_REQUEST_QR_CODE = 'simplifiedUserConnectionRequestQRCode',
  SND_FACTOR_PASSWORD = 'sndFactorPasswordChallenge',
  SSO = 'sso',
  STEALTH_USERS = 'stealthUsers',
  VALIDATE_SAML_EMAILS = 'validateSAMLemails',
  VIDEO_CALLING = 'videoCalling',
  PREVENT_ADMIN_LESS_GROUPS = 'preventAdminlessGroups',
  MEETINGS = 'meetings',
}

export enum FEATURE_LOCK_STATUS {
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
}

export enum FEATURE_STATUS {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export enum ACCESS_TYPE {
  TEAM_MEMBERS = 'team-members',
  EVERYONE = 'everyone',
  ADMINS = 'admins',
}

export enum CONVERSATION_PROTOCOL {
  MLS = 'mls',
  PROTEUS = 'proteus',
  MIXED = 'mixed',
}
