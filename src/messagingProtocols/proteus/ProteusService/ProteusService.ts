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

import {APIClient} from '@wireapp/api-client/lib/APIClient';
import {ClientMismatch, MessageSendingStatus} from '@wireapp/api-client/lib/conversation';
import logdown from 'logdown';

import {ProteusServiceConfig, SendProteusMessageParams} from './ProteusService.types';
import {getGenericMessageParams} from './Utility/getGenericMessageParams';

import {PayloadBundleState, SendResult} from '../../../conversation';
import {MessageService} from '../../../conversation/message/MessageService';
import {CryptographyService} from '../../../cryptography';

export class ProteusService {
  private readonly messageService: MessageService;
  private readonly logger = logdown('@wireapp/core/ProteusService');

  constructor(
    private readonly apiClient: APIClient,
    private readonly cryptographyService: CryptographyService,
    private readonly config: ProteusServiceConfig,
  ) {
    this.messageService = new MessageService(this.apiClient, this.cryptographyService);
  }

  private isClearFromMismatch(mismatch: ClientMismatch | MessageSendingStatus): boolean {
    const hasMissing = Object.keys(mismatch.missing || {}).length > 0;
    const hasDeleted = Object.keys(mismatch.deleted || {}).length > 0;
    const hasRedundant = Object.keys(mismatch.redundant || {}).length > 0;
    const hasFailed = Object.keys((mismatch as MessageSendingStatus).failed_to_send || {}).length > 0;
    return !hasMissing && !hasDeleted && !hasRedundant && !hasFailed;
  }

  public async sendProteusMessage({
    userIds,
    sendAsProtobuf,
    conversationId,
    nativePush,
    targetMode,
    payload,
    onClientMismatch,
  }: SendProteusMessageParams): Promise<SendResult> {
    const messageParams = await getGenericMessageParams({
      apiClient: this.apiClient,
      sendingClientId: this.apiClient.validatedClientId,
      conversationId,
      genericMessage: payload,
      useQualifiedIds: this.config.useQualifiedIds,
      options: {
        userIds,
        sendAsProtobuf,
        nativePush,
        targetMode,
        onClientMismatch,
      },
    });

    const {federated, sendingClientId, recipients, plainText, options} = messageParams;
    const response = federated
      ? await this.messageService.sendFederatedMessage(sendingClientId, recipients, plainText, {
          ...options,
          onClientMismatch: mismatch => onClientMismatch?.(mismatch, false),
        })
      : await this.messageService.sendMessage(sendingClientId, recipients, plainText, {
          ...options,
          sendAsProtobuf,
          onClientMismatch: mismatch => onClientMismatch?.(mismatch, false),
        });

    if (!response.errored) {
      if (!this.isClearFromMismatch(response)) {
        // We warn the consumer that there is a mismatch that did not prevent message sending
        await onClientMismatch?.(response, true);
      }
      this.logger.log(`Successfully sent Proteus message to conversation '${conversationId.id}'`);
    }

    return {
      id: payload.messageId,
      sentAt: response.time,
      state: response.errored ? PayloadBundleState.CANCELLED : PayloadBundleState.OUTGOING_SENT,
    };
  }
}
