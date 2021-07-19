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

export enum FeatureStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
}

export interface FeatureWithoutConfig {
  status: FeatureStatus;
}
export interface Feature<T extends FeatureConfig> {
  config: T;
  status: FeatureStatus;
}

export interface FeatureConfig {}
export interface FeatureAppLockConfig extends FeatureConfig {
  enforceAppLock: boolean;
  inactivityTimeoutSecs: number;
}

export type FeatureAppLock = Feature<FeatureAppLockConfig>;
export type FeatureConferenceCalling = FeatureWithoutConfig;
export type FeatureVideoCalling = FeatureWithoutConfig;
export type FeatureFileSharing = FeatureWithoutConfig;
export type FeatureVideoMessage = FeatureWithoutConfig;
export type FeatureAudioMessage = FeatureWithoutConfig;
export type FeatureDigitalSignature = FeatureWithoutConfig;
export type FeatureLegalhold = FeatureWithoutConfig;
export type FeatureSSO = FeatureWithoutConfig;
export type FeatureSearchVisibility = FeatureWithoutConfig;
export type FeatureValidateSAMLEmails = FeatureWithoutConfig;
