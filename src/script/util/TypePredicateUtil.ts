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
import {User} from '../entity/User';
import type {QualifiedId} from '@wireapp/api-client/src/user/';
import {Conversation} from '../entity/Conversation';
import {ClientRecord} from '../storage/record/ClientRecord';
import {QualifiedUserClientEntityMap} from '../client/ClientRepository';

export function isAxiosError(errorCandidate: any): errorCandidate is AxiosError {
  return errorCandidate && errorCandidate.isAxiosError === true;
}

export function isBackendError(errorCandidate: any): errorCandidate is BackendError {
  return errorCandidate && typeof errorCandidate.label === 'string' && typeof errorCandidate.message === 'string';
}

export function isUser(userCandidate: any): userCandidate is User {
  return userCandidate instanceof User;
}

export function isQualifiedIdArray(ids: string[] | QualifiedId[]): ids is QualifiedId[] {
  return !!ids.length && isQualifiedId(ids[0]);
}

export function isQualifiedId(userId: string | QualifiedId): userId is QualifiedId {
  return typeof userId === 'object' && 'domain' in userId;
}

export function isConversationEntity(conversation: any): conversation is Conversation {
  return conversation instanceof Conversation;
}

export function isClientRecord(record: any): record is ClientRecord {
  return !!record.meta;
}

export function isQualifiedUserClientEntityMap(map: any): map is QualifiedUserClientEntityMap {
  return Object.keys(map)[0]?.includes('.');
}
