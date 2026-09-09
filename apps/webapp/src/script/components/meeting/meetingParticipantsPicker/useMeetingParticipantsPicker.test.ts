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
  const user = new User(id, 'example.com', key => key);
  user.name(name);
  return user;
};

const createConversation = (
  id: string,
  name: string,
  members: User[],
  {removed = false, archived = false, cleared = false}: {removed?: boolean; archived?: boolean; cleared?: boolean} = {},
) =>
  ({
    display_name: () => name,
    isSelfUserRemoved: () => removed,
    is_archived: () => archived,
    is_cleared: () => cleared,
    participating_user_ets: () => members,
    qualifiedId: {domain: 'example.com', id},
  }) as unknown as Conversation;

const createOptions = (overrides: Partial<Parameters<typeof useMeetingParticipantsPicker>[0]> = {}) => ({
  disabled: false,
  filter: '',
  selectedUsers: [],
  onSelectedUsersChange: jest.fn(),
  onFilterChange: jest.fn(),
  meetingsM2Enabled: true,
  ...overrides,
});

describe('useMeetingParticipantsPicker', () => {
  it('returns active conversations matching the filter', () => {
    const members = [createUser('member', 'Member')];
    const active = createConversation('active', 'Engineering', members);
    const other = createConversation('other', 'Announcements', members);
    const removed = createConversation('removed', 'Engineering old', members, {removed: true});
    const getAllGroupConversations = jest.fn(() => [active, other, removed]);

    const {result} = renderHook(() =>
      useMeetingParticipantsPicker(
        createOptions({
          filter: 'engine',
          conversationRepository: {getAllGroupConversations},
        }),
      ),
    );

    expect(result.current.matchingConversations).toEqual([active]);
    expect(getAllGroupConversations).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the picker while clearing the filter on close', () => {
    const onFilterChange = jest.fn();
    const {result} = renderHook(() => useMeetingParticipantsPicker(createOptions({onFilterChange})));

    act(() => result.current.handleOpenChange(true));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handleOpenChange(false));
    expect(result.current.isOpen).toBe(false);
    expect(onFilterChange).toHaveBeenCalledWith('');
  });

  it('does not open when disabled', () => {
    const {result} = renderHook(() => useMeetingParticipantsPicker(createOptions({disabled: true})));

    act(() => result.current.handleOpenChange(true));

    expect(result.current.isOpen).toBe(false);
  });

  it('imports conversation members and removes only imported users when deselected', () => {
    const manual = createUser('manual', 'Manual');
    const imported = createUser('imported', 'Imported');
    const conversation = createConversation('conversation', 'Project', [imported]);
    const onSelectedUsersChange = jest.fn();
    const options = createOptions({selectedUsers: [manual], onSelectedUsersChange});
    const {result, rerender} = renderHook(currentOptions => useMeetingParticipantsPicker(currentOptions), {
      initialProps: options,
    });

    act(() => result.current.handleSelectConversation(conversation));
    expect(onSelectedUsersChange).toHaveBeenLastCalledWith([manual, imported]);

    rerender({...options, selectedUsers: [manual, imported]});
    act(() => result.current.handleSelectConversation(conversation));

    expect(onSelectedUsersChange).toHaveBeenLastCalledWith([manual]);
    expect(result.current.selectedConversationIds).toEqual(new Set());
  });

  it('closes and clears the filter when clicking outside', () => {
    const onFilterChange = jest.fn();
    const {result} = renderHook(() => useMeetingParticipantsPicker(createOptions({onFilterChange})));

    act(() => result.current.handleOpenChange(true));
    act(() => fireEvent.pointerDown(document.body));

    expect(result.current.isOpen).toBe(false);
    expect(onFilterChange).toHaveBeenCalledWith('');
  });
});
