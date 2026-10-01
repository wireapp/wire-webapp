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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {isNullOrUndefined} from '@sindresorhus/is';

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {
  getConversationKey,
  isAllowedMeetingParticipant,
  mergeConversationUsersIntoSelection,
  mergeUsersIntoSelection,
} from './participantPickerUtils';

interface UseMeetingParticipantsPickerOptions {
  disabled: boolean;
  filter: string;
  selectedUsers: User[];
  onSelectedUsersChange: (users: User[]) => void;
  onFilterChange: (filter: string) => void;
  conversationRepository?: Pick<ConversationRepository, 'getAllGroupConversations'>;
}

export const useMeetingParticipantsPicker = ({
  disabled,
  filter,
  selectedUsers,
  onSelectedUsersChange,
  onFilterChange,
  conversationRepository,
}: UseMeetingParticipantsPickerOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Map<string, User[]>>(new Map());
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const matchingConversations = useMemo(() => {
    if (!conversationRepository) {
      return [];
    }

    const normalizedFilter = filter.trim().toLowerCase();
    return conversationRepository.getAllGroupConversations().filter(conversation => {
      return (
        !conversation.isSelfUserRemoved() &&
        !conversation.is_archived() &&
        !conversation.is_cleared() &&
        conversation.display_name().toLowerCase().includes(normalizedFilter)
      );
    });
  }, [conversationRepository, filter]);
  const selectedConversationIds = useMemo(() => new Set(selectedConversations.keys()), [selectedConversations]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (disabled && open) {
        return;
      }

      if (!open) {
        onFilterChange('');
      } else if (!isOpen) {
        setIsContactsOpen(false);
        setIsConversationsOpen(false);
      }

      setIsOpen(open);
    },
    [disabled, isOpen, onFilterChange],
  );

  const handleSelectedUsersChange = useCallback(
    (users: User[]) => {
      onSelectedUsersChange(users);
      onFilterChange('');
    },
    [onFilterChange, onSelectedUsersChange],
  );

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      const conversationKey = getConversationKey(conversation);
      const nextSelectedConversations = new Map(selectedConversations);

      if (nextSelectedConversations.has(conversationKey)) {
        nextSelectedConversations.delete(conversationKey);
        const importedUsers = [...selectedConversations.values()].flat();
        const manuallySelectedUsers = selectedUsers.filter(user => {
          return !importedUsers.some(imported => {
            return matchQualifiedIds(imported.qualifiedId, user.qualifiedId);
          });
        });
        onSelectedUsersChange(
          mergeUsersIntoSelection(manuallySelectedUsers, [...nextSelectedConversations.values()].flat()),
        );
      } else {
        nextSelectedConversations.set(
          conversationKey,
          conversation.participating_user_ets().filter(isAllowedMeetingParticipant),
        );
        onSelectedUsersChange(mergeConversationUsersIntoSelection(selectedUsers, conversation));
      }

      setSelectedConversations(nextSelectedConversations);
    },
    [onSelectedUsersChange, selectedConversations, selectedUsers],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const trigger = triggerRef.current;
      const popover = popoverRef.current;

      if (
        (!isNullOrUndefined(trigger) && trigger.contains(target)) ||
        (!isNullOrUndefined(popover) && popover.contains(target))
      ) {
        return;
      }

      handleOpenChange(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleOpenChange, isOpen]);

  return {
    handleOpenChange,
    handleSelectedUsersChange,
    handleSelectConversation,
    isContactsOpen,
    isConversationsOpen,
    isOpen,
    matchingConversations,
    popoverRef,
    selectedConversationIds,
    setIsContactsOpen,
    setIsConversationsOpen,
    triggerRef,
  };
};
