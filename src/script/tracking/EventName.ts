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

/**
 * Definition of events used for user analytics (defined by Business Intelligence Team)
 */
export const EventName = {
  APP_OPEN: 'app.open',
  CALLING: {
    ENDED_CALL: 'calling.ended_call',
    ESTABLISHED_CALL: 'calling.established_call',
    INITIATED_CALL: 'calling.initiated_call',
    JOINED_CALL: 'calling.joined_call',
    RECEIVED_CALL: 'calling.received_call',
    SCREEN_SHARE: 'calling.screen_share',
  },
  CONTRIBUTED: 'contributed',
  E2EE: {
    FAILED_MESSAGE_DECRYPTION: 'e2ee.failed_message_decryption',
  },
};
