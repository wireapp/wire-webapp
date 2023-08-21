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

import {ConversationMLSWelcomeEvent} from '@wireapp/api-client/lib/event';
import {Decoder, Encoder} from 'bazinga64';

import {HandledEventPayload} from '../../../../../notification';
import {MLSService} from '../../../MLSService';

interface HandleWelcomeMessageParams {
  event: ConversationMLSWelcomeEvent;
  mlsService: MLSService;
}

export const handleMLSWelcomeMessage = async ({
  mlsService,
  event,
}: HandleWelcomeMessageParams): Promise<HandledEventPayload> => {
  const data = Decoder.fromBase64(event.data).asBytes;
  // We extract the groupId from the welcome message and let coreCrypto store this group

  const newGroupId = await mlsService.processWelcomeMessage(data);
  const groupIdStr = Encoder.toBase64(newGroupId).asString;
  // The groupId can then be sent back to the consumer

  // After we were added to the group we need to schedule a periodic key material renewal
  mlsService.scheduleKeyMaterialRenewal(groupIdStr);
  return {
    event: {...event, data: groupIdStr},
  };
};
