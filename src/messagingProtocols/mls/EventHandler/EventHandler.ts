/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {EventHandlerParams} from './EventHandler.types';
import {handleMLSMessageAdd, handleWelcomeMessage, isMLSMessageAddEvent, isWelcomeMessageEvent} from './events';

import {EventHandlerResult} from '../../common.types';

const handleBackendEvent = async (
  params: EventHandlerParams,
  onEpochChanged: (groupId: string) => void,
): EventHandlerResult => {
  const {event} = params;
  if (isWelcomeMessageEvent(event)) {
    return handleWelcomeMessage({...params, event});
  }
  if (isMLSMessageAddEvent(event)) {
    return handleMLSMessageAdd({...params, event}, onEpochChanged);
  }
};

export {handleBackendEvent};
