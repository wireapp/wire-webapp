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

import {ChevronIcon, FlexBox, Option} from '@wireapp/react-ui-kit';

import {UpgradeBadge} from './UpgradeBadge';

import {
  customHistorySharingOptionContainerCss,
  customHistorySharingOptionLeftSectionCss,
  customHistorySharingOptionIconCss,
} from '../../CreateConversation.styles';
import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';
import {ChatHistory} from '../../types';

interface ChatHistorySharingOptionProps {
  option: Option;
  isPremiumUser: boolean;
}

export const CustomHistorySharingOption = ({option, isPremiumUser}: ChatHistorySharingOptionProps) => {
  const {chatHistory} = useCreateConversationModal();

  return (
    <FlexBox css={customHistorySharingOptionContainerCss}>
      {option.label}
      {option.value === ChatHistory.Custom && chatHistory !== ChatHistory.Custom && (
        <FlexBox css={customHistorySharingOptionLeftSectionCss}>
          {!isPremiumUser && <UpgradeBadge />}
          <ChevronIcon css={customHistorySharingOptionIconCss} />
        </FlexBox>
      )}
    </FlexBox>
  );
};
