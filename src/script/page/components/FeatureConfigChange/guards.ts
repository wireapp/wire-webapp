/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FeatureMLS, FeatureMLSE2EId} from '@wireapp/api-client/lib/team';

const isObject = (value: unknown): value is {} => typeof value === 'object' && value !== null;
const isFeatureWithConfig = (feature: unknown): feature is {config: {}} =>
  isObject(feature) && 'config' in feature && isObject(feature.config);

export const hasE2EIVerificationExpiration = (feature: unknown): feature is FeatureMLSE2EId =>
  isFeatureWithConfig(feature) && 'verificationExpiration' in feature.config;

export const hasMLSDefaultProtocol = (feature: unknown): feature is FeatureMLS =>
  isFeatureWithConfig(feature) && 'defaultProtocol' in feature.config;
