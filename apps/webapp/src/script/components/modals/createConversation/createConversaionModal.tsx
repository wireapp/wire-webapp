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

import {handleEscDown} from 'Util/keyboardUtil';

import {ConfirmDiscardModal} from './conversationtype/confirmdiscardmodal';
import {createConversationModalWrapperCss} from './createconversation.styles';
import {CreateConversationHeader} from './createconversationheader';
import {CreateTeamModal} from './createconversationsteps/conversationdetails/createteammodal';
import {CustomHistoryModal} from './createconversationsteps/conversationdetails/customhistorymodal';
import {UpgradePlanModal} from './createconversationsteps/conversationdetails/upgradeplanmodal';
import {CreateConversationSteps} from './createconversationsteps/createconversationsteps';
import {useCreateConversationModal} from './hooks/usecreateconversationmodal';
import {ConversationType} from './types';

import {ModalComponent} from '../modalcomponent';

export const CreateConversationModal = () => {
  const {isOpen, hideModal, setIsConfirmDiscardModalOpen, setConversationType, gotoPreviousStep, discardTrigger} =
    useCreateConversationModal();

  const onCancel = () => {
    setIsConfirmDiscardModalOpen(false);
  };

  const onSubmit = () => {
    if (discardTrigger === 'modalClose') {
      hideModal();
      return;
    }
    setConversationType(ConversationType.Group);
    setIsConfirmDiscardModalOpen(false);
    gotoPreviousStep();
  };

  return (
    <>
      <ModalComponent
        id="create-conversation-modal"
        wrapperCSS={createConversationModalWrapperCss}
        isShown={isOpen}
        onClosed={hideModal}
        data-uie-name="group-creation-label"
        onKeyDown={event => handleEscDown(event, hideModal)}
      >
        <CreateConversationHeader />
        <CreateConversationSteps />
      </ModalComponent>
      <CustomHistoryModal />
      <ConfirmDiscardModal onCancel={onCancel} onSubmit={onSubmit} />
      <UpgradePlanModal />
      <CreateTeamModal />
    </>
  );
};
