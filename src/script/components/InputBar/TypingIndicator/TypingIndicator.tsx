/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC} from 'react';

import {css, CSSObject, keyframes} from '@emotion/react';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {StringIdentifer, t} from 'Util/LocalizerUtil';

import {useTypingIndicatorState} from './TypingIndicator.state';

export interface TypingIndicatorProps {
  conversationId: string;
}

const wrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
  marginLeft: '18px',
  color: 'var(--text-input-placeholder)',
  fontSize: '14px',
  fontWeight: 500,
};

const indicatorAnimationWrapperStyles: CSSObject = {
  width: 38,
  height: 16,
  marginLeft: 4,
  position: 'relative',
};

const animationStyles: CSSObject = {
  animationFillMode: 'forwards',
  animationDirection: 'normal',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  animationDuration: '1.2s',
};

const dotStyles: CSSObject = {
  ...animationStyles,
  position: 'absolute',
  width: 4,
  height: 4,
  backgroundColor: 'var(--text-input-placeholder)',
  borderRadius: '100%',
  bottom: 0,
  transformBox: 'fill-box',
  transformOrigin: '50% 50%',
};

const editIconKeyFrams = keyframes({
  '0%': {
    transform: 'translateX(0px) rotate(0deg)',
  },
  '25%': {transform: 'translateX(5px) rotate(-5deg)'},
  '50%': {transform: 'translateX(10px) rotate(5deg)'},
  '75%': {transform: 'translateX(15px) rotate(-5deg)'},
  '100%': {transform: 'translateX(25px) rotate(5deg)'},
});

const dot1KeyFrames = keyframes({
  '0%': {opacity: 0},
  '20%': {opacity: 0},
  '100%': {opacity: 1},
});

const dot2KeyFrames = keyframes({
  '0%': {opacity: 0},
  '45%': {opacity: 0},
  '100%': {opacity: 1},
});

const dot3KeyFrames = keyframes({
  '0%': {opacity: 0},
  '70%': {opacity: 0},
  '100%': {opacity: 1},
});

const editIconStyles = css`
  animation: ${editIconKeyFrams};
  bottom: 0;
  fill: var(--text-input-placeholder);
  position: absolute;
  ${animationStyles}
`;

const dotOneStyles = css`
  animation: ${dot1KeyFrames};
  left: 0;
  ${dotStyles};
`;

const dotTwoStyles = css`
  animation: ${dot2KeyFrames};
  left: 8px;
  ${dotStyles};
`;

const dotThreeStyles = css`
  animation: ${dot3KeyFrames};
  left: 16px;
  ${dotStyles};
`;

const TypingIndicator: FC<TypingIndicatorProps> = ({conversationId}) => {
  const users = useTypingIndicatorState(state => state.getTypingUsersInConversation(conversationId));
  const usersCount = users.length;

  if (usersCount === 0) {
    return null;
  }

  return (
    <div css={wrapperStyles}>
      <div css={{display: 'flex', marginRight: '18px'}}>
        {users.slice(0, 3).map((user, index) => (
          <Avatar
            key={user.id}
            className="cursor-default"
            style={index > 0 ? {marginLeft: -15} : {}}
            participant={user}
            avatarSize={AVATAR_SIZE.X_SMALL}
          />
        ))}
      </div>
      {usersCount === 1 && t('tooltipConversationInputOneUserTyping' as StringIdentifer, {user1: users[0].name()})}
      {usersCount === 2 &&
        t('tooltipConversationInputTwoUserTyping' as StringIdentifer, {
          user1: users[0].name(),
          user2: users[1].name(),
        })}
      {usersCount > 2 &&
        t('tooltipConversationInputMoreThanTwoUserTyping' as StringIdentifer, {
          user1: users[0].name(),
          count: usersCount.toString(),
        })}
      <div css={indicatorAnimationWrapperStyles}>
        <div css={dotOneStyles} />
        <div css={dotTwoStyles} />
        <div css={dotThreeStyles} />
        <Icon.Edit css={editIconStyles} />
      </div>
    </div>
  );
};

export {TypingIndicator};
