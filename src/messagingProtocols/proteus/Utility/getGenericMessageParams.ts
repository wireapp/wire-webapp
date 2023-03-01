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
import {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap} from '@wireapp/api-client/lib/user';

import {GenericMessage} from '@wireapp/protocol-messaging';

import {getRecipientsForConversation} from './Recipients';
import {extractQualifiedUserIds} from './UserIds';

import {MessageTargetMode, MessageSendingOptions} from '../../../conversation';
import {isQualifiedUserClients} from '../../../util';

export type MessageParams = {
  sendingClientId: string;
  recipients: QualifiedUserClients | QualifiedUserPreKeyBundleMap;
  plainText: Uint8Array;
  options: {
    conversationId: QualifiedId;
    nativePush: boolean | undefined;
    reportMissing: boolean | QualifiedId[] | undefined;
  };
};
interface GetGenericMessageParamsParams {
  sendingClientId: string;
  conversationId: QualifiedId;
  genericMessage: GenericMessage;
  options: MessageSendingOptions;
  apiClient: APIClient;
}
type GetGenericMessageParamsReturnType = Promise<MessageParams>;

const getGenericMessageParams = async ({
  sendingClientId,
  conversationId,
  genericMessage,
  options: {targetMode = MessageTargetMode.NONE, userIds, nativePush},
  apiClient,
}: GetGenericMessageParamsParams): GetGenericMessageParamsReturnType => {
  const plainText = GenericMessage.encode(genericMessage).finish();
  if (targetMode !== MessageTargetMode.NONE && !userIds) {
    throw new Error('Cannot send targetted message when no userIds are given');
  }

  const recipients = await getRecipientsForConversation({apiClient, conversationId, userIds});
  let reportMissing;
  if (targetMode === MessageTargetMode.NONE) {
    reportMissing = isQualifiedUserClients(userIds); // we want to check mismatch in case the consumer gave an exact list of users/devices
  } else if (targetMode === MessageTargetMode.USERS) {
    reportMissing = extractQualifiedUserIds({userIds});
  } else {
    // in case the message is fully targetted at user/client pairs, we do not want to report the missing clients or users at all
    reportMissing = false;
  }
  return {
    sendingClientId,
    recipients,
    plainText,
    options: {
      conversationId,
      nativePush,
      reportMissing,
    },
  };
};

export {getGenericMessageParams};
