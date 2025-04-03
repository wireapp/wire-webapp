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

import {CheckRoundIcon, FlexBox} from '@wireapp/react-ui-kit';

import {
  conversationOptionContainerCss,
  conversationOptionCss,
  conversationOptionNotSelectedCss,
} from './ConversationType.styles';

import {UpgradeBadge} from '../CreateConversationSteps/ConversationDetails/UpgradeBadge';

interface ConversationOptionProps {
  title: string;
  isSelected: boolean;
  onClick: () => void;
  isUpgradeBannerVisible?: boolean;
}

export const ConversationOption = ({onClick, title, isSelected, isUpgradeBannerVisible}: ConversationOptionProps) => {
  return (
    <FlexBox css={conversationOptionContainerCss(isSelected)} onClick={onClick}>
      <FlexBox css={conversationOptionCss(isSelected)}>
        {isSelected ? (
          <CheckRoundIcon viewBox="0 0 20 20" color="var(--app-bg-secondary)" />
        ) : (
          <div css={conversationOptionNotSelectedCss} />
        )}
        <p className="heading-h3">{title}</p>
      </FlexBox>
      {isUpgradeBannerVisible && <UpgradeBadge />}
    </FlexBox>
  );
};
