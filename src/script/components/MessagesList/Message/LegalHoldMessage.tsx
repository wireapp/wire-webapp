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

import {container} from 'tsyringe';

import {LegalHoldDot} from 'Components/LegalHoldDot';
import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {LegalHoldMessage as LegalHoldMessageEntity} from 'Repositories/entity/message/LegalHoldMessage';
import {t} from 'Util/LocalizerUtil';

interface LegalHoldMessageProps {
  conversationState?: ConversationState;
  message: LegalHoldMessageEntity;
}

const LegalHoldMessage = ({
  message,
  conversationState = container.resolve(ConversationState),
}: LegalHoldMessageProps) => {
  const {showUsers} = useLegalHoldModalState(state => state);
  const showLegalHold = () => showUsers(false, conversationState.activeConversation());

  return (
    <div className="message-header">
      <div className="message-header-icon">
        <LegalHoldDot isMessage />
      </div>

      <div className="message-header-label">
        {message.isActivationMessage ? (
          <>
            <p data-uie-name="status-legalhold-activated">{t('legalHoldActivated')}</p>

            <button
              type="button"
              className="button-reset-default message-header-label__learn-more"
              onClick={showLegalHold}
            >
              {t('legalHoldActivatedLearnMore')}
            </button>
          </>
        ) : (
          <p className="message-header-label" data-uie-name="status-legalhold-deactivated">
            {t('legalHoldDeactivated')}
          </p>
        )}
      </div>
    </div>
  );
};

export {LegalHoldMessage};
