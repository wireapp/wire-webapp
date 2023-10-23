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

import {ConversationEvent} from '@wireapp/api-client/lib/event';

import {EventRecord} from 'src/script/storage';

import {ClientConversationEvent} from '../../../conversation/EventBuilder';
import {IdentifiedUpdatePayload} from '../../EventService';

export type HandledEvents = ClientConversationEvent | ConversationEvent;
export type DBOperation =
  | {type: 'update'; event: HandledEvents; updates: IdentifiedUpdatePayload}
  | {type: 'delete'; event: HandledEvents; id: string}
  | {type: 'insert'; event: HandledEvents};

export type EventHandler = (
  event: HandledEvents,
  optionals: {
    selfUserId: string;
    duplicateEvent: HandledEvents | undefined;
    findEvent: (eventId: string) => Promise<EventRecord | undefined>;
  },
) => Promise<DBOperation | undefined>;
