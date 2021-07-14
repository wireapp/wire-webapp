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

import type {BackendError} from '@wireapp/api-client/src/http/';
import {AxiosError} from 'axios';

export function isAxiosError(errorCandidate: any): errorCandidate is AxiosError {
  return errorCandidate && errorCandidate.isAxiosError === true;
}

export function isBackendError(errorCandidate: any): errorCandidate is BackendError {
  return errorCandidate && typeof errorCandidate.label === 'string' && typeof errorCandidate.message === 'string';
}
