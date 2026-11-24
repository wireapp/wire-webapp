/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {LoginData} from '../../../apiClient/auth/loginData';
import type {TeamData} from '../../../apiClient/team/team/teamData';
import type {UserAsset} from '../../../apiClient/user/userAsset';

export interface RegistrationDataState {
  accent_id?: number;
  assets: UserAsset[] | [];
  email?: string;
  email_code: string | null;
  invitation_code?: string;
  label?: string;
  locale?: string;
  name: string;
  password?: string;
  team?: TeamData;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  customBackendURL: string;
  accountCreationEnabled: boolean;
  shouldDisplayWarning: boolean;
}

export type LoginDataState = Pick<LoginData, 'clientType'>;
