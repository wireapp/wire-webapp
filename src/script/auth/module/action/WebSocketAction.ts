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

import {USER_EVENT} from '@wireapp/api-client/lib/event/';

import {getLogger} from 'Util/Logger';

import type {ThunkAction} from '../reducer';
import * as SelfSelector from '../selector/SelfSelector';

const logger = getLogger('WebSocketAction');
export const WebSocketAction = {
  listen(): ThunkAction {
    return async (dispatch, getState, {core, actions: {selfAction}}) => {
      await core.listen({
        // We just want to get unencrypted backend events, so we use a dry run in order not to store the last notificationId and avoid decrypting events
        dryRun: true,
        onEvent: async ({event}) => {
          try {
            switch (event.type) {
              case USER_EVENT.UPDATE: {
                const isSelfId = event.user.id === SelfSelector.getSelf(getState()).id;
                if (isSelfId) {
                  await dispatch(selfAction.fetchSelf());
                }
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : error;
            logger.error(`There was an error with event ID "${event.type}": ${message}`, error);
          }
        },
      });
    };
  },
};
