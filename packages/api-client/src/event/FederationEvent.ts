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

import {FederationDeleteData, FederationConnectionRemovedData} from '../federation/data';

export enum FEDERATION_EVENT {
  FEDERATION_DELETE = 'federation.delete',
  FEDERATION_CONNECTION_REMOVED = 'federation.connectionRemoved',
}

export type FederationEventData = FederationDeleteData | FederationConnectionRemovedData | null;

export type FederationEvent = FederationDeleteEvent | FederationConnectionRemovedEvent;

export interface FederationDeleteEvent {
  domain: string;
  type: FEDERATION_EVENT.FEDERATION_DELETE;
}

export interface FederationConnectionRemovedEvent {
  domains: string[];
  type: FEDERATION_EVENT.FEDERATION_CONNECTION_REMOVED;
}
