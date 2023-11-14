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

import {E2eiConversationState} from '@wireapp/core/lib/messagingProtocols/mls';
import {container} from 'tsyringe';

import {VerificationMessageType} from 'src/script/message/VerificationMessageType';
import {Core} from 'src/script/service/CoreSingleton';
import {Logger, getLogger} from 'Util/Logger';
import {base64ToArray} from 'Util/util';

import {MLSConversation} from '../../ConversationSelectors';
import {ConversationState} from '../../ConversationState';
import {ConversationVerificationState} from '../../ConversationVerificationState';
import {getConversationByGroupId, OnConversationVerificationStateChange} from '../shared';

export class MLSConversationVerificationStateHandler {
  private readonly logger: Logger;

  public constructor(
    private readonly onConversationVerificationStateChange: OnConversationVerificationStateChange,
    private readonly conversationState: ConversationState,
    private readonly core: Core,
  ) {
    this.logger = getLogger('MLSConversationVerificationStateHandler');
    // We need to check if the core service is available and if the e2eIdentity is available
    if (!this.core.service?.mls || !this.core.service?.e2eIdentity) {
      return;
    }

    // We hook into the newEpoch event of the MLS service to check if the conversation needs to be verified or degraded
    this.core.service.mls.on('newEpoch', this.checkConversationVerificationState);
  }

  /**
   * This function checks if the conversation is verified and if it is, it will degrade it
   * @param conversation
   * @param userIds
   */
  private async degradeConversation(conversation: MLSConversation) {
    const state = ConversationVerificationState.DEGRADED;
    conversation.mlsVerificationState(state);
    this.onConversationVerificationStateChange({
      conversationEntity: conversation,
      conversationVerificationState: state,
      verificationMessageType: VerificationMessageType.UNVERIFIED,
    });
  }

  /**
   * This function checks if the conversation is degraded and if it is, it will verify it
   * @param conversation
   * @param userIds
   */
  private async verifyConversation(conversation: MLSConversation) {
    const state = ConversationVerificationState.VERIFIED;
    conversation.mlsVerificationState(state);
    this.onConversationVerificationStateChange({
      conversationEntity: conversation,
      conversationVerificationState: state,
    });
  }

  private checkConversationVerificationState = async ({
    groupId,
    epoch,
  }: {
    groupId: string;
    epoch: number;
  }): Promise<void> => {
    const conversation = getConversationByGroupId({conversationState: this.conversationState, groupId});
    if (!conversation) {
      this.logger.error(`Epoch changed but conversationEntity can't be found`);
      return;
    }

    const verificationState = await this.core.service!.e2eIdentity?.getConversationState(base64ToArray(groupId));

    if (
      verificationState === E2eiConversationState.Degraded &&
      conversation.mlsVerificationState() !== ConversationVerificationState.DEGRADED
    ) {
      return this.degradeConversation(conversation);
    } else if (
      verificationState === E2eiConversationState.Verified &&
      conversation.mlsVerificationState() !== ConversationVerificationState.VERIFIED
    ) {
      return this.verifyConversation(conversation);
    }
  };
}

export const registerMLSConversationVerificationStateHandler = (
  onConversationVerificationStateChange: OnConversationVerificationStateChange = () => {},
  conversationState: ConversationState = container.resolve(ConversationState),
  core: Core = container.resolve(Core),
): void => {
  new MLSConversationVerificationStateHandler(onConversationVerificationStateChange, conversationState, core);
};
