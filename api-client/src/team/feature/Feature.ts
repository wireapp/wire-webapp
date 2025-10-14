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

import {ConversationProtocol} from '../../conversation';

export enum FeatureStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
}

export enum FeatureLockStatus {
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
}

export enum AccessType {
  TEAM_MEMBERS = 'team-members',
  EVERYONE = 'everyone',
  ADMINS = 'admins',
}

export interface FeatureWithoutConfig {
  status: FeatureStatus;
  lockStatus?: FeatureLockStatus;
  // Time to Live. The time after which the feature resets to its default value.
  ttl?: number;
}
export interface Feature<T extends FeatureConfig> extends FeatureWithoutConfig {
  config: T;
}

export interface FeatureConfig {}

export interface FeatureAppLockConfig extends FeatureConfig {
  enforceAppLock: boolean;
  inactivityTimeoutSecs: number;
}

export interface FeatureAllowedGlobalOperationsConfig extends FeatureConfig {
  mlsConversationReset?: boolean;
}

export interface FeatureChannelsConfig {
  allowed_to_create_channels: AccessType;
  allowed_to_open_channels: AccessType;
}

export enum SelfDeletingTimeout {
  OFF = 0,
  SECONDS_10 = 10,
  MINUTES_5 = 300,
  HOURS_1 = 3_600,
  DAYS_1 = 86_400,
  WEEKS_1 = 604_800,
  WEEKS_4 = 2_419_200,
}

export interface FeatureSelfDeletingMessagesConfig extends FeatureConfig {
  enforcedTimeoutSeconds: SelfDeletingTimeout | number;
}
export interface FeatureFileDownloadPathConfig extends FeatureConfig {
  enforcedDownloadLocation: string;
}

export interface FeatureClassifiedDomainsConfig extends FeatureConfig {
  domains: string[];
}
export interface FeatureMLSConfig extends FeatureConfig {
  allowedCipherSuites: number[];
  defaultCipherSuite: number;
  defaultProtocol: ConversationProtocol;
  protocolToggleUsers: string[];
  supportedProtocols: ConversationProtocol[];
}

export interface FeatureMLSE2EIdConfig extends FeatureConfig {
  verificationExpiration: number;
  acmeDiscoveryUrl?: string;
}

export interface FeatureMLSMigrationConfig extends FeatureConfig {
  startTime?: string;
  finaliseRegardlessAfter?: string;
}

export interface FeatureConferenceCallingConfig extends FeatureConfig {
  useSFTForOneToOneCalls?: boolean;
}

export type FeatureAppLock = Feature<FeatureAppLockConfig>;
export type FeatureAllowedGlobalOperations = Feature<FeatureAllowedGlobalOperationsConfig>;
export type FeatureAssetAuditLog = FeatureWithoutConfig;
export type FeatureClassifiedDomains = Feature<FeatureClassifiedDomainsConfig>;
export type FeatureConferenceCalling = Feature<FeatureConferenceCallingConfig>;
export type FeatureDigitalSignature = FeatureWithoutConfig;
export type FeatureDomainRegistration = FeatureWithoutConfig;
export type FeatureConsumableNotifications = FeatureWithoutConfig;
export type FeatureConversationGuestLink = FeatureWithoutConfig;
export type FeatureFileSharing = FeatureWithoutConfig;
export type FeatureLegalhold = FeatureWithoutConfig;
export type FeatureDownloadPath = Feature<FeatureFileDownloadPathConfig>;
export type FeatureSearchVisibility = FeatureWithoutConfig;
export type FeatureSelfDeletingMessages = Feature<FeatureSelfDeletingMessagesConfig>;
export type FeatureMLS = Feature<FeatureMLSConfig>;
export type FeatureMLSE2EId = Feature<FeatureMLSE2EIdConfig>;
export type FeatureMLSMigration = Feature<FeatureMLSMigrationConfig>;
export type FeatureSSO = FeatureWithoutConfig;
export type FeatureSndFactorPassword = FeatureWithoutConfig;
export type FeatureValidateSAMLEmails = FeatureWithoutConfig;
export type FeatureVideoCalling = FeatureWithoutConfig;
export type FeatureChannels = Feature<FeatureChannelsConfig>;
export type FeatureCells = FeatureWithoutConfig;
