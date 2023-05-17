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

import {ChangeEvent, FC, KeyboardEvent, useEffect, useRef, useState} from 'react';

import {Icon} from 'Components/Icon';
import {isEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {removeLineBreaks} from 'Util/StringUtil';

import {ConversationRepository} from '../../../../../conversation/ConversationRepository';
import {User} from '../../../../../entity/User';
import {ServiceEntity} from '../../../../../integration/ServiceEntity';
import {GroupDetails} from '../GroupDetails/GroupDetails';

interface ConversationDetailsHeaderProps {
  isActiveGroupParticipant: boolean;
  canRenameGroup: boolean;
  displayName: string;
  updateConversationName: (conversationName: string) => void;
  isGroup: boolean;
  userParticipants: User[];
  serviceParticipants: ServiceEntity[];
  allUsersCount: number;
  isTeam?: boolean;
}

const ConversationDetailsHeader: FC<ConversationDetailsHeaderProps> = ({
  isActiveGroupParticipant,
  canRenameGroup,
  displayName,
  updateConversationName,
  isGroup,
  userParticipants,
  serviceParticipants,
  allUsersCount,
  isTeam = false,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditGroupNameTouched = useRef(false);

  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [groupName, setGroupName] = useState(displayName);

  const clickToEditGroupName = () => {
    if (isActiveGroupParticipant) {
      setIsEditingName(true);
    }
  };

  const renameConversation = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const {value: currentValue} = event.target;

    setGroupName(currentValue);
  };

  const handleRenameConversation = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isEnterKey(event)) {
      event.preventDefault();
      const {value: currentValue} = event.currentTarget;
      const currentConversationName = displayName.trim();
      const newConversationName = removeLineBreaks(currentValue.trim());
      const isNameChanged = newConversationName !== currentConversationName;

      if (isNameChanged) {
        updateConversationName(newConversationName);
        setGroupName(newConversationName);
        setIsEditingName(false);

        isEditGroupNameTouched.current = false;
      }
    }
  };

  useEffect(() => {
    if (isEditingName) {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = `0px`;
        const {scrollHeight} = textAreaRef.current;
        textAreaRef.current.style.height = `${scrollHeight}px`;
      }

      if (!isEditGroupNameTouched.current) {
        setTimeout(() => {
          const currentValue = textAreaRef.current?.value;
          const caretPosition = currentValue?.length || 0;

          textAreaRef.current?.setSelectionRange(caretPosition, caretPosition);
          textAreaRef.current?.focus();

          isEditGroupNameTouched.current = true;
        }, 0);
      }
    }
  }, [isEditingName, groupName]);

  return (
    <div className="conversation-details__header">
      {isActiveGroupParticipant ? (
        <>
          {!isEditingName ? (
            <div
              className="conversation-details__name"
              title={t('tooltipConversationDetailsRename')}
              data-uie-name="status-name"
              {...(canRenameGroup && {
                onClick: clickToEditGroupName,
              })}
            >
              {displayName && <span className="conversation-details__name">{displayName}</span>}

              {canRenameGroup && (
                <button className="conversation-details__name__edit-icon">
                  <Icon.Edit />
                </button>
              )}
            </div>
          ) : (
            <textarea
              ref={textAreaRef}
              className="conversation-details__name conversation-details__name--input"
              dir="auto"
              spellCheck="false"
              maxLength={ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH}
              onChange={renameConversation}
              onKeyDown={handleRenameConversation}
              value={groupName}
              data-uie-name="enter-name"
            />
          )}
        </>
      ) : (
        <div className="conversation-details__name">
          <div className="conversation-details__flex-row">
            <div data-uie-name="status-name">{displayName}</div>
          </div>
        </div>
      )}

      {isGroup && (
        <GroupDetails
          userParticipants={userParticipants}
          serviceParticipants={serviceParticipants}
          allUsersCount={allUsersCount}
          isTeam={isTeam}
        />
      )}
    </div>
  );
};

export {ConversationDetailsHeader};
