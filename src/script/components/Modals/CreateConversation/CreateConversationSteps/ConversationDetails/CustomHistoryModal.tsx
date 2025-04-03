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

import {Button, ButtonVariant, FlexBox, Input, Select, Text} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {handleEscDown, handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';
import {ChatHistory, HistorySharingUnit} from '../../types';
import {getChatHistorySharingUnitOptions} from '../../utils';
import {
  customHistorySharingModalCss,
  customHistorySharingFormContainerCss,
  customHistorySharingInputCss,
  customHistorySharingSelectCss,
  customHistorySharingButtonContainerCss,
  customHistorySharingButtonCss,
} from '../CreateConversationSteps.styles';

export const CustomHistoryModal = () => {
  const {
    setIsCustomHistoryModalOpen,
    historySharingUnit,
    setHistorySharingQuantity,
    setHistorySharingUnit,
    historySharingQuantity,
    setChatHistory,
    isCustomHistoryModalOpen,
  } = useCreateConversationModal();

  const chatHistorySharingUnitOptions = getChatHistorySharingUnitOptions(historySharingQuantity);

  const onCancel = () => {
    setHistorySharingQuantity(1);
    setHistorySharingUnit(HistorySharingUnit.Days);
    setIsCustomHistoryModalOpen(false);
  };

  const onSubmit = () => {
    setIsCustomHistoryModalOpen(false);
    setChatHistory(ChatHistory.Custom);
  };

  return (
    <ModalComponent
      wrapperCSS={customHistorySharingModalCss}
      id="custom-history-modal"
      isShown={isCustomHistoryModalOpen}
      data-uie-name="custom-history-modal"
      onKeyDown={event => handleEscDown(event, onCancel)}
    >
      <Text>{t('conversationHistoryModalText')}</Text>
      <FlexBox css={customHistorySharingFormContainerCss}>
        <Input
          wrapperCSS={customHistorySharingInputCss}
          value={historySharingQuantity || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setHistorySharingQuantity(Number(event.target.value))
          }
        />

        <Select
          menuCSS={customHistorySharingSelectCss}
          id="history-sharing-unit-select"
          dataUieName="history-sharing-unit-select"
          options={chatHistorySharingUnitOptions}
          value={chatHistorySharingUnitOptions.find(option => option.value === historySharingUnit)}
          onChange={option => setHistorySharingUnit(option?.value as HistorySharingUnit)}
        />
      </FlexBox>

      <FlexBox css={customHistorySharingButtonContainerCss}>
        <Button
          css={customHistorySharingButtonCss}
          variant={ButtonVariant.SECONDARY}
          type="button"
          onClick={onCancel}
          data-uie-name="do-cancel"
          onKeyDown={event => handleEscDown(event, onCancel)}
        >
          {t('conversationHistoryModalCancel')}
        </Button>
        <Button
          css={customHistorySharingButtonCss}
          disabled={!historySharingQuantity || historySharingQuantity < 1}
          type="button"
          onClick={onSubmit}
          data-uie-name="do-submit"
          onKeyDown={event => handleKeyDown({event, callback: onSubmit, keys: [KEY.ENTER, KEY.SPACE]})}
        >
          {t('conversationHistoryModalApply')}
        </Button>
      </FlexBox>
    </ModalComponent>
  );
};
