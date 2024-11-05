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

import {MessageAddEvent, ReactionEvent} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage';
import {addReaction, userReactionMapToReactionMap} from 'Util/ReactionUtil';

import {EventValidationError} from './EventValidationError';

import {CONVERSATION} from '../../../Client';
import {EventHandler} from '../types';

function computeEventUpdates(target: StoredEvent<MessageAddEvent>, reactionEvent: ReactionEvent) {
  const version = (target.version ?? 1) + 1;
  const {
    data: {reaction},
    qualified_from,
    from,
  } = reactionEvent;
  const reactionMap = target.reactions ? userReactionMapToReactionMap(target.reactions) : [];
  return {
    primary_key: target.primary_key,
    reactions: addReaction(reactionMap, reaction, qualified_from ?? {id: from, domain: ''}),
    version: version,
  };
}

export const handleReactionEvent: EventHandler = async (event, {findEvent}) => {
  if (event.type !== CONVERSATION.REACTION) {
    return undefined;
  }
  const targetEvent = (await findEvent(event.data.message_id)) as StoredEvent<MessageAddEvent>;
  if (!targetEvent) {
    throw new EventValidationError('Reaction event to a non-existing message');
  }
  return {
    type: 'sequential-update',
    event,
    updates: computeEventUpdates(targetEvent, event),
  };
};
