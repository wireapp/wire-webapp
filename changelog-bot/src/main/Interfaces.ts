/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {LoginData} from '@wireapp/api-client/src/auth/';

export interface ChangelogData {
  content: string;
  conversationIds?: string[];
  isCustomMessage?: boolean;
  repoSlug: string;
}

export type LoginDataBackend = LoginData & {backend?: string};

export interface Parameters {
  backend?: string;
  conversationIds?: string;
  email: string;
  excludeCommitTypes?: string[];
  message?: string;
  password: string;
  travisCommitRange?: string;
  travisRepoSlug: string;
  travisTag?: string;
}
