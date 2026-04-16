/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export enum LegalHoldStatus {
  DISABLED = 'disabled',
  ENABLED_CONFIGURED = 'configured',
  ENABLED_NOT_CONFIGURED = 'not_configured',
}

export interface LegalHoldSettings {
  auth_token: string;
  base_url: string;
  fingerprint: string;
  public_key: string;
  team_id: string;
}

export interface LegalHoldDataUnconfigured {
  enabled: Exclude<LegalHoldStatus, LegalHoldStatus.ENABLED_CONFIGURED>;
}

export interface LegalHoldDataConfigured {
  enabled: LegalHoldStatus.ENABLED_CONFIGURED;
  settings: LegalHoldSettings;
}

export type LegalHoldData = LegalHoldDataUnconfigured | LegalHoldDataConfigured;
