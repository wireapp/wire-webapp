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

import {FlexBox} from '@wireapp/react-ui-kit';

import {ConversationDetails} from './ConversationDetails/ConversationDetails';
import {
  createConversationStepRightContainerCss,
  createConversationStepWrapperCss,
} from './CreateConversationSteps.styles';
import {ParticipantsSelection} from './ParticipantsSelection';
import {Preference} from './Preference';

import {ConversationTypeContainer} from '../ConversationType/ConversationTypeContainer';
import {useCreateConversationModal} from '../hooks/useCreateConversationModal';
import {ConversationCreationStep} from '../types';

export const CreateConversationSteps = () => {
  const {conversationCreationStep} = useCreateConversationModal();

  if (conversationCreationStep === ConversationCreationStep.ParticipantsSelection) {
    return (
      <div css={createConversationStepWrapperCss}>
        <ParticipantsSelection />
      </div>
    );
  }

  return (
    <FlexBox css={createConversationStepWrapperCss}>
      <ConversationTypeContainer />
      <div css={createConversationStepRightContainerCss}>
        {conversationCreationStep === ConversationCreationStep.Preference ? <Preference /> : <ConversationDetails />}
      </div>
    </FlexBox>
  );
};
