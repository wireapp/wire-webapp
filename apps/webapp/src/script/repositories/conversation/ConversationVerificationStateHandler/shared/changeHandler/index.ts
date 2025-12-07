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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {Conversation} from 'Repositories/entity/Conversation';
import {VerificationMessageType} from 'src/script/message/VerificationMessageType';

import {E2EIVerificationMessageType} from '../../../../../message/E2EIVerificationMessageType';
import {ConversationVerificationState} from '../../../ConversationVerificationState';

interface CommonOnConversationVerificationStateChangeParams {
  conversationEntity: Conversation;
  conversationVerificationState: ConversationVerificationState;
  userIds?: QualifiedId[];
}

interface OnConversationVerificationStateChangeParams extends CommonOnConversationVerificationStateChangeParams {
  verificationMessageType?: VerificationMessageType;
}

interface OnConversationE2EIVerificationStateChangeParams extends CommonOnConversationVerificationStateChangeParams {
  verificationMessageType?: E2EIVerificationMessageType;
}

export type OnConversationVerificationStateChange = (params: OnConversationVerificationStateChangeParams) => void;

export type OnConversationE2EIVerificationStateChange = (
  params: OnConversationE2EIVerificationStateChangeParams,
) => void;
