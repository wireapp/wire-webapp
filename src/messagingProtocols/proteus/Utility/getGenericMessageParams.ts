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
import {QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';

import {GenericMessage} from '@wireapp/protocol-messaging';

import {getQualifiedRecipientsForConversation, getRecipientsForConversation} from './Recipients';
import {extractQualifiedUserIds, extractUserIds} from './UserIds';

import {MessageTargetMode, MessageSendingOptions} from '../../../conversation';
import {isStringArray, isUserClients, isQualifiedUserClients, isQualifiedIdArray} from '../../../util';

export type FederatedMessageParams = {
  federated: true;
  sendingClientId: string;
  recipients: QualifiedUserClients | QualifiedUserPreKeyBundleMap;
  plainText: Uint8Array;
  options: {
    conversationId: QualifiedId;
    nativePush: boolean | undefined;
    reportMissing: boolean | QualifiedId[] | undefined;
  };
};
export type MessageParams = Omit<FederatedMessageParams, 'recipients' | 'options' | 'federated'> & {
  federated: false;
  recipients: UserClients | UserPreKeyBundleMap;
  options: Omit<FederatedMessageParams['options'], 'reportMissing'> & {
    reportMissing: boolean | string[] | undefined;
  };
};
interface GetGenericMessageParamsParams {
  sendingClientId: string;
  conversationId: QualifiedId;
  genericMessage: GenericMessage;
  options: MessageSendingOptions;
  useQualifiedIds: boolean;
  apiClient: APIClient;
}
type GetGenericMessageParamsReturnType = Promise<MessageParams | FederatedMessageParams>;

const getGenericMessageParams = async ({
  sendingClientId,
  conversationId,
  genericMessage,
  options: {targetMode = MessageTargetMode.NONE, userIds, nativePush},
  useQualifiedIds,
  apiClient,
}: GetGenericMessageParamsParams): GetGenericMessageParamsReturnType => {
  const plainText = GenericMessage.encode(genericMessage).finish();
  if (targetMode !== MessageTargetMode.NONE && !userIds) {
    throw new Error('Cannot send targetted message when no userIds are given');
  }

  if (conversationId.domain && useQualifiedIds) {
    if (isStringArray(userIds) || isUserClients(userIds)) {
      throw new Error('Invalid userIds option for sending to federated backend');
    }
    const recipients = await getQualifiedRecipientsForConversation({apiClient, conversationId, userIds});
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
      federated: true,
      sendingClientId,
      recipients,
      plainText,
      options: {
        conversationId,
        nativePush,
        reportMissing,
      },
    };
  }

  if (isQualifiedIdArray(userIds) || isQualifiedUserClients(userIds)) {
    throw new Error('Invalid userIds option for sending');
  }
  const recipients = await getRecipientsForConversation({apiClient, conversationId, userIds});
  let reportMissing;
  if (targetMode === MessageTargetMode.NONE) {
    reportMissing = isUserClients(userIds); // we want to check mismatch in case the consumer gave an exact list of users/devices
  } else if (targetMode === MessageTargetMode.USERS) {
    reportMissing = extractUserIds({userIds});
  } else {
    // in case the message is fully targetted at user/client pairs, we do not want to report the missing clients or users at all
    reportMissing = false;
  }
  return {
    federated: false,
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
