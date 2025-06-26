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

import {GroupAvatar} from 'Components/Avatar';
import {ChannelAvatar} from 'Components/Avatar/ChannelAvatar';
import {openConversation} from 'Components/CellsGlobalView/common/openConversation/openConversation';
import {Conversation} from 'src/script/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {avatarWrapperStyles, textStyles, wrapperStyles} from './CellsConversationColumn.styles';

interface CellsConversationColumnProps {
  conversation: Conversation;
}

export const CellsConversationColumn = ({conversation}: CellsConversationColumnProps) => {
  const {isChannel} = useKoSubscribableChildren(conversation, ['isChannel']);
  const {isChannelsEnabled} = useChannelsFeatureFlag();

  return (
    <button css={wrapperStyles} onClick={() => openConversation(conversation.qualifiedId)}>
      <div css={avatarWrapperStyles}>
        {isChannel && isChannelsEnabled ? (
          <ChannelAvatar conversationID={conversation.id} isLocked={false} size="small" />
        ) : (
          <GroupAvatar conversationID={conversation.id} size="small" />
        )}
      </div>
      <span css={textStyles}>{conversation.name()}</span>
    </button>
  );
};
