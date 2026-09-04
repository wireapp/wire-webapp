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
  meetingsM2Enabled: boolean;
}

export const useMeetingParticipantsPicker = ({
  disabled,
  filter,
  selectedUsers,
  onSelectedUsersChange,
  onFilterChange,
  conversationRepository,
  meetingsM2Enabled,
}: UseMeetingParticipantsPickerOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(true);
  const [selectedConversations, setSelectedConversations] = useState<Map<string, User[]>>(new Map());
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const matchingConversations = useMemo(() => {
    if (!meetingsM2Enabled || !conversationRepository) {
      return [];
    }

    const normalizedFilter = filter.trim().toLowerCase();
    return conversationRepository
      .getAllGroupConversations()
      .filter(
        conversation =>
          !conversation.isSelfUserRemoved() &&
          !conversation.is_archived() &&
          !conversation.is_cleared() &&
          conversation.display_name().toLowerCase().includes(normalizedFilter),
      );
  }, [conversationRepository, filter, meetingsM2Enabled]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (disabled && open) {
        return;
      }

      if (!open) {
        onFilterChange('');
      } else {
        setIsConversationsOpen(true);
      }

      setIsOpen(open);
    },
    [disabled, onFilterChange],
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
        const manuallySelectedUsers = selectedUsers.filter(
          user => !importedUsers.some(imported => matchQualifiedIds(imported.qualifiedId, user.qualifiedId)),
        );
        onSelectedUsersChange(
          mergeUsersIntoSelection(manuallySelectedUsers, [...nextSelectedConversations.values()].flat()),
        );
      } else {
        nextSelectedConversations.set(conversationKey, conversation.participating_user_ets());
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

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [handleOpenChange, isOpen]);

  return {
    handleOpenChange,
    handleSelectedUsersChange,
    handleSelectConversation,
    isConversationsOpen,
    isOpen,
    matchingConversations,
    popoverRef,
    selectedConversationIds: new Set(selectedConversations.keys()),
    setIsConversationsOpen,
    triggerRef,
  };
};
