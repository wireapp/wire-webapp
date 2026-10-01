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

import {act, fireEvent, renderHook} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import type {Conversation} from 'Repositories/entity/Conversation';

import {useMeetingParticipantsPicker} from './useMeetingParticipantsPicker';

const createUser = (id: string, name: string): User => {
  const user = new User(id, 'example.com', key => {
    return key;
  });
  user.name(name);
  return user;
};

const createConversation = (
  id: string,
  name: string,
  members: User[],
  {removed = false, archived = false, cleared = false}: {removed?: boolean; archived?: boolean; cleared?: boolean} = {},
) => {
  return {
    display_name: () => {
      return name;
    },
    isSelfUserRemoved: () => {
      return removed;
    },
    is_archived: () => {
      return archived;
    },
    is_cleared: () => {
      return cleared;
    },
    participating_user_ets: () => {
      return members;
    },
    qualifiedId: {domain: 'example.com', id},
  } as unknown as Conversation;
};

const createOptions = (overrides: Partial<Parameters<typeof useMeetingParticipantsPicker>[0]> = {}) => {
  return {
    disabled: false,
    filter: '',
    selectedUsers: [],
    onSelectedUsersChange: jest.fn(),
    onFilterChange: jest.fn(),
    ...overrides,
  };
};

describe('useMeetingParticipantsPicker', () => {
  it('returns active conversations matching the filter', () => {
    const members = [createUser('member', 'Member')];
    const active = createConversation('active', 'Engineering', members);
    const other = createConversation('other', 'Announcements', members);
    const removed = createConversation('removed', 'Engineering old', members, {removed: true});
    const getAllGroupConversations = jest.fn(() => {
      return [active, other, removed];
    });

    const {result} = renderHook(() => {
      return useMeetingParticipantsPicker(
        createOptions({
          filter: 'engine',
          conversationRepository: {getAllGroupConversations},
        }),
      );
    });

    expect(result.current.matchingConversations).toEqual([active]);
    expect(getAllGroupConversations).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the picker while clearing the filter on close', () => {
    const onFilterChange = jest.fn();
    const {result} = renderHook(() => {
      return useMeetingParticipantsPicker(createOptions({onFilterChange}));
    });

    act(() => {
      return result.current.handleOpenChange(true);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      return result.current.handleOpenChange(false);
    });
    expect(result.current.isOpen).toBe(false);
    expect(onFilterChange).toHaveBeenCalledWith('');
  });

  it('does not open when disabled', () => {
    const {result} = renderHook(() => {
      return useMeetingParticipantsPicker(createOptions({disabled: true}));
    });

    act(() => {
      return result.current.handleOpenChange(true);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('imports only eligible conversation members and removes only imported users when deselected', () => {
    const manual = createUser('manual', 'Manual');
    const imported = createUser('imported', 'Imported');
    const guest = createUser('guest', 'Guest');
    guest.isGuest(true);
    const temporaryGuest = createUser('temporary-guest', 'Temporary guest');
    temporaryGuest.isTemporaryGuest(true);
    const conversation = createConversation('conversation', 'Project', [imported, guest, temporaryGuest]);
    const onSelectedUsersChange = jest.fn();
    const options = createOptions({selectedUsers: [manual], onSelectedUsersChange});
    const {result, rerender} = renderHook(
      currentOptions => {
        return useMeetingParticipantsPicker(currentOptions);
      },
      {
        initialProps: options,
      },
    );

    act(() => {
      return result.current.handleSelectConversation(conversation);
    });
    expect(onSelectedUsersChange).toHaveBeenLastCalledWith([manual, imported]);

    rerender({...options, selectedUsers: [manual, imported]});
    act(() => {
      return result.current.handleSelectConversation(conversation);
    });

    expect(onSelectedUsersChange).toHaveBeenLastCalledWith([manual]);
    expect(result.current.selectedConversationIds).toEqual(new Set());
  });

  it('closes and clears the filter when clicking outside', () => {
    const onFilterChange = jest.fn();
    const {result} = renderHook(() => {
      return useMeetingParticipantsPicker(createOptions({onFilterChange}));
    });

    act(() => {
      return result.current.handleOpenChange(true);
    });
    act(() => {
      return fireEvent.pointerDown(document.body);
    });

    expect(result.current.isOpen).toBe(false);
    expect(onFilterChange).toHaveBeenCalledWith('');
  });
});
