/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {Checkbox, CheckboxLabel, ChevronDownIcon} from '@wireapp/react-ui-kit';

import {ChannelAvatar} from 'Components/avatar/channelAvatar';
import {GroupAvatar} from 'Components/avatar/groupAvatar';
import {listItem, listWrapper} from 'Components/participantItemContent/participantItem.styles';
import {collapseButton, collapseIcon} from 'Components/userList/userList.styles';
import type {Conversation} from 'Repositories/entity/Conversation';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {conversationIconStyles, conversationListStyles} from './meetingParticipantsPicker.styles';
import {getConversationKey} from './participantPickerUtils';

type MeetingConversationsSearchableListProps = {
  id: string;
  conversations: Conversation[];
  selectedConversationIds: ReadonlySet<string>;
  onSelectConversation: (conversation: Conversation) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  noUnderline: boolean;
  dataUieName?: string;
};

export const MeetingConversationsSearchableList = ({
  id,
  conversations,
  selectedConversationIds,
  onSelectConversation,
  isOpen,
  onOpenChange,
  noUnderline,
  dataUieName,
}: MeetingConversationsSearchableListProps) => {
  const {translate} = useApplicationContext();

  if (conversations.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        css={collapseButton}
        data-uie-name={dataUieName ? `${dataUieName}-toggle` : undefined}
      >
        <span css={collapseIcon(isOpen)} aria-hidden="true">
          <ChevronDownIcon width={16} height={16} />
        </span>
        {translate('meetings.scheduleModal.groupsAndChannels')}
      </button>
      <div css={conversationListStyles} role="list">
        {isOpen &&
          conversations.map(conversation => {
            const conversationKey = getConversationKey(conversation);
            const checkboxId = `${id}-${conversationKey}`;

            return (
              <div key={conversationKey} css={listWrapper({noUnderline})}>
                <Checkbox
                  id={checkboxId}
                  checked={selectedConversationIds.has(conversationKey)}
                  onChange={() => onSelectConversation(conversation)}
                  labelBeforeCheckbox
                  aligncenter={false}
                  outlineOffset="0"
                >
                  <CheckboxLabel htmlFor={checkboxId}>
                    <div css={listItem()}>
                      {conversation.isChannel() ? (
                        <ChannelAvatar
                          conversationID={conversation.id}
                          isLocked={false}
                          size="large"
                          css={conversationIconStyles}
                        />
                      ) : (
                        <GroupAvatar conversationID={conversation.id} size="medium" css={conversationIconStyles} />
                      )}
                      <span>{conversation.display_name()}</span>
                    </div>
                  </CheckboxLabel>
                </Checkbox>
              </div>
            );
          })}
      </div>
    </>
  );
};
