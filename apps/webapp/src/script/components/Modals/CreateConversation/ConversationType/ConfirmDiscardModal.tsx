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

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown, handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Button, ButtonVariant, FlexBox, Text} from '@wireapp/react-ui-kit';

import {
  confirmConversationTypeContainerCss,
  confirmConversationHeaderCss,
  confirmConversationTextCss,
  confirmConversationButtonContainerCss,
  confirmConversationButtonCss,
} from './ConversationType.styles';

import {useCreateConversationModal} from '../hooks/useCreateConversationModal';

interface ConfirmDiscardModalProps {
  onCancel: () => void;
  onSubmit: () => void;
}

export const ConfirmDiscardModal = ({onCancel, onSubmit}: ConfirmDiscardModalProps) => {
  const {isConfirmDiscardModalOpen} = useCreateConversationModal();

  return (
    <ModalComponent
      wrapperCSS={confirmConversationTypeContainerCss}
      id="custom-history-modal"
      isShown={isConfirmDiscardModalOpen}
      data-uie-name="custom-history-modal"
      onKeyDown={event => handleEscDown(event, onCancel)}
    >
      <p css={confirmConversationHeaderCss} className="heading-h2">
        {t('createConversationConfirmDiscardModalHeader')}
      </p>
      <Text css={confirmConversationTextCss}>{t('createConversationConfirmDiscardModalText')}</Text>
      <FlexBox css={confirmConversationButtonContainerCss}>
        <Button
          css={confirmConversationButtonCss}
          variant={ButtonVariant.SECONDARY}
          type="button"
          onClick={onCancel}
          data-uie-name="do-cancel"
          onKeyDown={event => handleEscDown(event, onCancel)}
        >
          {t('createConversationConfirmDiscardModalCancel')}
        </Button>
        <Button
          css={confirmConversationButtonCss}
          type="button"
          onClick={onSubmit}
          data-uie-name="do-submit"
          onKeyDown={event => handleKeyDown({event, callback: onSubmit, keys: [KEY.ENTER, KEY.SPACE]})}
        >
          {t('createConversationConfirmDiscardModalContinue')}
        </Button>
      </FlexBox>
    </ModalComponent>
  );
};
