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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {ClientId, DeviceId, Uuid} from '@wireapp/core-crypto';

const textEncoder = new TextEncoder();

export function generateMLSUserId({id, domain}: QualifiedId): Uint8Array<ArrayBuffer> {
  return textEncoder.encode(`${id}@${domain}`);
}

export function createMLSClientId({id, domain}: QualifiedId, clientId: string): ClientId {
  return new ClientId(new Uuid(id), DeviceId.fromHexString(clientId), domain);
}
