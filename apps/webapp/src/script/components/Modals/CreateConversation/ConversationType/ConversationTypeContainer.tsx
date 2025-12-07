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

import {useEffect} from 'react';

import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ConversationFeature} from './ConversationFeature';
import {ConversationOption} from './ConversationOption';
import {conversationTypeContainerCss} from './ConversationType.styles';

import {useCreateConversationModal} from '../hooks/useCreateConversationModal';
import {ConversationCreationStep, ConversationType} from '../types';
import {getConversationTypeOptions} from '../utils';

export const ConversationTypeContainer = () => {
  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);
  const {self} = useKoSubscribableChildren(userState, ['self']);
  const {
    conversationType,
    setConversationType,
    conversationCreationStep,
    setIsCreateTeamModalOpen,
    setDiscardTrigger,
    setIsConfirmDiscardModalOpen,
  } = useCreateConversationModal();

  const isInTeam = teamState.isInTeam(self!);

  // Set default conversation type based on user's team membership
  useEffect(() => {
    if (!isInTeam) {
      setConversationType(ConversationType.Group);
    }
  }, [isInTeam, setConversationType]);

  const onConversationTypeChange = (conversationType: ConversationType) => {
    if (
      conversationType === ConversationType.Group &&
      conversationCreationStep === ConversationCreationStep.Preference
    ) {
      setDiscardTrigger('conversationTypeChange');
      setIsConfirmDiscardModalOpen(true);
      return;
    }
    if (conversationType === ConversationType.Channel && !isInTeam) {
      setIsCreateTeamModalOpen(true);
      return;
    }

    setConversationType(conversationType);
  };

  return (
    <div css={conversationTypeContainerCss}>
      {getConversationTypeOptions().map(option => (
        <>
          <ConversationOption
            key={option.conversationType}
            isUpgradeBannerVisible={option.conversationType === ConversationType.Channel && !isInTeam}
            title={option.label}
            isSelected={option.conversationType === conversationType}
            onClick={() => onConversationTypeChange(option.conversationType)}
          />
          <ConversationFeature conversationType={option.conversationType} key={option.conversationType} />
        </>
      ))}
    </div>
  );
};
