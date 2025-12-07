/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {getActionsMenuCSS, getIconCSS, messageActionsMenuButton} from './MessageActions.styles';
import {reactionImgSize} from './MessageReactions/EmojiChar.styles';

interface ReplyButtonProps {
  actionId: string;
  currentMsgActionName: string;
  messageFocusedTabIndex: number;
  onReplyClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const ReplyButton: FC<ReplyButtonProps> = ({
  actionId,
  currentMsgActionName,
  messageFocusedTabIndex,
  onReplyClick,
  onKeyPress,
}) => {
  return (
    <button
      css={{
        ...messageActionsMenuButton(),
        ...getIconCSS,
        ...getActionsMenuCSS(currentMsgActionName === actionId),
      }}
      type="button"
      tabIndex={messageFocusedTabIndex}
      data-uie-name={actionId}
      aria-label={t('conversationContextMenuReply')}
      onClick={onReplyClick}
      onKeyDown={onKeyPress}
    >
      <Icon.ReplyIcon className="svg-icon" css={reactionImgSize} />
    </button>
  );
};

export {ReplyButton};
