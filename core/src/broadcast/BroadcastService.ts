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

import {MessageSendingStatus, QualifiedUserClients} from '@wireapp/api-client/lib/conversation';

import {APIClient} from '@wireapp/api-client';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {sendMessage} from '../conversation/message/messageSender';
import {MessageService} from '../conversation/message/MessageService';
import {flattenUserMap} from '../conversation/message/UserClientsUtil';
import {ProteusService} from '../messagingProtocols/proteus';

export class BroadcastService {
  private readonly messageService: MessageService;

  constructor(
    private readonly apiClient: APIClient,
    private readonly proteusService: ProteusService,
  ) {
    this.messageService = new MessageService(this.apiClient, this.proteusService);
  }

  public async broadcastGenericMessage(
    genericMessage: GenericMessage,
    recipients: QualifiedUserClients,
    onClientMismatch?: (mismatch: MessageSendingStatus) => void | boolean | Promise<boolean>,
  ) {
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const send = (): Promise<MessageSendingStatus> => {
      return this.messageService.sendMessage(this.apiClient.validatedClientId, recipients, plainTextArray, {
        reportMissing: flattenUserMap(recipients).map(({userId}) => userId),
        onClientMismatch,
      });
    };

    return sendMessage(send);
  }
}
