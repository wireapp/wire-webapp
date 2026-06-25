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

import {GroupAvatar} from 'Components/avatar';
import {ChannelAvatar} from 'Components/avatar';
import {openConversation} from 'Components/cellsglobalview/common/openconversation/openconversation';
import {Conversation} from 'Repositories/entity/conversation';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {useChannelsFeatureFlag} from 'Util/usechannelsfeatureflag';

import {avatarWrapperStyles, textStyles, wrapperStyles} from './cellsconversationcolumn.styles';

interface CellsConversationColumnProps {
  conversation?: Conversation;
  name: string;
}

export const CellsConversationColumn = ({conversation, name}: CellsConversationColumnProps) => {
  if (!conversation) {
    return <span css={textStyles}>{name}</span>;
  }

  return <ConversationAvatar conversation={conversation} />;
};

const ConversationAvatar = ({conversation}: {conversation: Conversation}) => {
  const {isChannel, display_name: displayName} = useKoSubscribableChildren(conversation, ['isChannel', 'display_name']);
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
      <span css={textStyles}>{displayName}</span>
    </button>
  );
};
