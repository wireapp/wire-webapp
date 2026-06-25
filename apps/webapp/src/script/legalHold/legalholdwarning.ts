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

import {useLegalHoldModalState} from 'Components/modals/legalholdmodal/legalholdmodal.state';
import {PrimaryModal} from 'Components/modals/primarymodal';
import {ConversationVerificationState} from 'Repositories/conversation/conversationverificationstate';
import type {Conversation} from 'Repositories/entity/conversation';
import type {Substitutions, TranslationKey} from 'Util/localizerUtil';

import {ConversationError} from '../error/conversationerror';
import {OPEN_CONVERSATION_DETAILS} from '../page/rightSidebar/rightsidebar';

export const showLegalHoldWarningModal = (
  conversationEntity: Conversation,
  conversationDegraded: boolean,
  translate: (
    key: TranslationKey,
    substitutions?: Substitutions,
    dangerousSubstitutions?: Record<string, string>,
    skipEscaping?: boolean,
  ) => string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const secondaryAction = [
      {
        action: () => {
          const {showUsers} = useLegalHoldModalState.getState();
          showUsers(false, conversationEntity);
        },
        text: translate('legalHoldWarningSecondaryInformation'),
      },
    ];

    if (conversationDegraded) {
      secondaryAction.push({
        action: () => amplify.publish(OPEN_CONVERSATION_DETAILS),
        text: translate('legalHoldWarningSecondaryVerify'),
      });
    }

    PrimaryModal.show(
      PrimaryModal.type.MULTI_ACTIONS,
      {
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
            if (conversationDegraded) {
              conversationEntity.verification_state(ConversationVerificationState.UNVERIFIED);
            }
            resolve();
          },
          text: translate('legalHoldWarningPrimary'),
        },
        secondaryAction,
        text: {
          htmlMessage: translate('legalHoldWarningMessage', undefined, {br: '<br>'}),
          title: translate('legalHoldWarningTitle'),
        },
      },
      undefined,
      translate,
    );
  });
};
