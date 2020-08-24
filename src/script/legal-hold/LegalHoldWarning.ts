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
import {WebAppEvents} from '@wireapp/webapp-events';

import {t} from 'Util/LocalizerUtil';

import {ConversationVerificationState} from '../conversation/ConversationVerificationState';
import type {Conversation} from '../entity/Conversation';
import {SHOW_LEGAL_HOLD_MODAL} from '../view_model/content/LegalHoldModalViewModel';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {OPEN_CONVERSATION_DETAILS} from '../view_model/PanelViewModel';
import {ConversationError} from '../error/ConversationError';

export const showLegalHoldWarning = (
  conversationEntity: Conversation,
  verifyDevices: boolean = false,
): Promise<boolean> => {
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
        reject(
          new ConversationError(
            ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
            ConversationError.MESSAGE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
          ),
        );
      },
      preventClose: true,
      primaryAction: {
        action: () => {
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
