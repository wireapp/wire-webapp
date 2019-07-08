/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import {t} from 'Util/LocalizerUtil';
import {Conversation} from '../entity/Conversation';
import {WebAppEvents} from '../event/WebApp';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {SHOW_LEGAL_HOLD_MODAL} from '../view_model/content/LegalHoldModalViewModel';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {OPEN_CONVERSATION_DETAILS} from '../view_model/PanelViewModel';
import {ConversationRepository} from './ConversationRepository';
import {ConversationVerificationState} from './ConversationVerificationState';

export const VERIFY_LEGAL_HOLD = 'verifyLegalHold';

export class ConversationLegalHoldStateHandler {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
  ) {
    amplify.subscribe(VERIFY_LEGAL_HOLD, this.verifyLegalHold);
  }

  verifyLegalHold = async (conversationEntity: Conversation, hasLegalHoldFlag: boolean) => {
    await this.conversationRepository.updateAllClients(conversationEntity);
    const hasLegalHold = conversationEntity.hasLegalHold();
    if (hasLegalHoldFlag !== hasLegalHold) {
      const timeStamp = conversationEntity.get_latest_timestamp(this.serverTimeHandler.toServerTimestamp()) + 1;
      conversationEntity.appendLegalHoldSystemMessage(hasLegalHold, timeStamp);
    }
  };
}

export const showLegalHoldWarning = (conversationEntity: Conversation, verifyDevices: boolean = false) => {
  return new Promise((resolve, reject) => {
    const secondaryAction = [
      {
        action: () => amplify.publish(SHOW_LEGAL_HOLD_MODAL, conversationEntity),
        text: t('legalHoldWarningSecondaryInformation'),
      },
    ];
    if (verifyDevices) {
      secondaryAction.push({
        action: () => amplify.publish(OPEN_CONVERSATION_DETAILS),
        text: t('legalHoldWarningSecondaryVerify'),
      });
    }
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.MULTI_ACTIONS, {
      close: () => {
        const errorType = z.error.ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION;
        reject(new z.error.ConversationError(errorType));
      },
      preventClose: true,
      primaryAction: {
        action: () => {
          conversationEntity.needsLegalHoldApproval(false);
          if (verifyDevices) {
            conversationEntity.verification_state(ConversationVerificationState.UNVERIFIED);
          }
          resolve(true);
        },
        text: t('legalHoldWarningPrimary'),
      },
      secondaryAction,
      showClose: true,
      text: {
        htmlMessage: t('legalHoldWarningMessage', {}, {br: '<br>'}),
        title: t('legalHoldWarningTitle'),
      },
    });
  });
};
