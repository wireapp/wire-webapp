/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import * as Icon from 'Components/Icon';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {createConversationHeaderContainerCss} from './CreateConversation.styles';
import {CreateConversationSubmit} from './CreateConversationSubmit';
import {useCreateConversationModal} from './hooks/useCreateConversationModal';
import {ConversationType, ConversationCreationStep} from './types';

export const CreateConversationHeader = () => {
  const {
    error,
    gotoNextStep,
    conversationName,
    conversationCreationStep,
    gotoPreviousStep,
    conversationType,
    gotoLastStep,
    gotoFirstStep,
    setDiscardTrigger,
    setIsConfirmDiscardModalOpen,
    hideModal,
  } = useCreateConversationModal();
  const userState = container.resolve(UserState);
  const selfUser = userState.self();

  const onNextClick = () => {
    if (conversationType === ConversationType.Group) {
      gotoLastStep();
      return;
    }

    gotoNextStep();
  };

  const onBackClick = () => {
    if (conversationType === ConversationType.Group) {
      gotoFirstStep();
      return;
    }

    gotoPreviousStep();
  };

  const onModalClose = () => {
    if (conversationCreationStep !== ConversationCreationStep.ConversationDetails) {
      setDiscardTrigger('modalClose');
      setIsConfirmDiscardModalOpen(true);
      return;
    }
    hideModal();
  };

  const isNextButtonDisabled =
    !!error || !conversationName || (selfUser?.isExternal() && conversationType === ConversationType.Group);

  return (
    <div className="modal__header modal__header--list" css={createConversationHeaderContainerCss}>
      <button
        className="button-reset-default"
        type="button"
        onClick={onModalClose}
        aria-label={t('accessibility.groupCreationActionCloseModal')}
        data-uie-name="do-close"
      >
        <Icon.CloseIcon aria-hidden="true" className="modal__header__button" />
      </button>

      <h2 id="group-creation-label" className="modal__header__title" data-uie-name="status-people-selected">
        {t('createConversationModalHeader')}
      </h2>

      <div css={{display: 'flex', gap: '8px'}}>
        {conversationCreationStep !== ConversationCreationStep.ConversationDetails && (
          <Button
            id="conversation-go-previous"
            css={{marginBottom: 0}}
            type="button"
            onClick={onBackClick}
            aria-label={'Back'}
            data-uie-name="go-to-previous-step"
            variant={ButtonVariant.TERTIARY}
          >
            {t('createConversationModalHeaderBack')}
          </Button>
        )}

        {conversationCreationStep === ConversationCreationStep.ParticipantsSelection ? (
          <CreateConversationSubmit />
        ) : (
          <Button
            id="group-go-next"
            css={{marginBottom: 0}}
            disabled={isNextButtonDisabled}
            type="button"
            onClick={onNextClick}
            aria-label={t('groupCreationPreferencesAction')}
            data-uie-name="go-next"
            variant={ButtonVariant.TERTIARY}
          >
            {t('createConversationModalHeaderNext')}
          </Button>
        )}
      </div>
    </div>
  );
};
