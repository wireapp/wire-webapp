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

import {Button, Text} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {Config} from 'src/script/Config';
import {handleEscDown, handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {
  salesModalBodyButtonCss,
  salesModalBodyCss,
  salesModalBodyHeaderCss,
  salesModalBodyTextCss,
  salesModalBodyWrapperCss,
  salesModalWrapperCss,
} from '../../CreateConversation.styles';
import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';

export const CreateTeamModal = () => {
  const {isCreateTeamModalOpen, setIsCreateTeamModalOpen} = useCreateConversationModal();

  const onCancel = () => {
    setIsCreateTeamModalOpen(false);
  };

  const onSubmit = () => {
    setIsCreateTeamModalOpen(false);
    safeWindowOpen(Config.getConfig().URL.TEAMS_BASE);
  };

  return (
    <ModalComponent
      wrapperCSS={salesModalWrapperCss}
      id="custom-history-modal"
      isShown={isCreateTeamModalOpen}
      data-uie-name="custom-history-modal"
      onKeyDown={event => handleEscDown(event, onCancel)}
    >
      <div css={salesModalBodyCss}>
        <div css={salesModalBodyWrapperCss}>
          <p css={salesModalBodyHeaderCss} className="paragraph-body-3">
            {t('createConversationTeamCreationModalHeader')}
          </p>
          <Text block css={salesModalBodyTextCss}>
            {t('createConversationTeamCreationModalText')}
          </Text>
        </div>
        <Button
          css={salesModalBodyButtonCss}
          type="button"
          onClick={onSubmit}
          data-uie-name="do-create-team"
          onKeyDown={event => handleKeyDown({event, callback: onSubmit, keys: [KEY.ENTER, KEY.SPACE]})}
        >
          {t('createConversationTeamCreationModalButton')}
        </Button>
      </div>
    </ModalComponent>
  );
};
