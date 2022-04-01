/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';
import {LegalHoldMessage as LegalHoldMessageEntity} from '../../../entity/message/LegalHoldMessage';
import LegalHoldDot from 'Components/LegalHoldDot';

import {t} from 'Util/LocalizerUtil';
import {amplify} from 'amplify';
import {LegalHoldModalViewModel} from '../../../view_model/content/LegalHoldModalViewModel';
import {container} from 'tsyringe';
import {ConversationState} from '../../../conversation/ConversationState';

export interface LegalHoldMessageProps {
  conversationState?: ConversationState;
  message: LegalHoldMessageEntity;
}

const LegalHoldMessage: React.FC<LegalHoldMessageProps> = ({
  message,
  conversationState = container.resolve(ConversationState),
}) => {
  const showLegalHold = () => {
    amplify.publish(LegalHoldModalViewModel.SHOW_DETAILS, conversationState.activeConversation());
  };
  return (
    <div className="message-header">
      <div className="message-header-icon">
        <LegalHoldDot />
      </div>
      <div className="message-header-label">
        {message.isActivationMessage ? (
          <>
            <span data-uie-name="status-legalhold-activated">{t('legalHoldActivated')}</span>
            <span className="message-header-label__learn-more" onClick={showLegalHold}>
              {t('legalHoldActivatedLearnMore')}
            </span>
          </>
        ) : (
          <span className="message-header-label" data-uie-name="status-legalhold-deactivated">
            {t('legalHoldDeactivated')}
          </span>
        )}
      </div>
    </div>
  );
};

export default LegalHoldMessage;
