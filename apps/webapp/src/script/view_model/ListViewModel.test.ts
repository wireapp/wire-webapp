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
 */

import {ListViewModel} from './ListViewModel';

import {SidebarTabs, useSidebarStore} from '../page/leftSidebar/panels/conversations/useSidebarStore';
import {ListState, useAppState} from '../page/useAppState';
import {translateForTest} from 'Util/test/translateForTest';

const createListViewModel = (): ListViewModel => {
  const mainViewModel = {
    actions: {},
    calling: {},
    content: {
      loadPreviousContent: jest.fn(),
      switchContent: jest.fn(),
    },
    isFederated: false,
  } as unknown as ConstructorParameters<typeof ListViewModel>[0];

  const repositories = {
    calling: {},
    conversation: {},
    properties: {},
    search: {},
    team: {},
  } as unknown as ConstructorParameters<typeof ListViewModel>[1];

  const listViewModel = new ListViewModel(mainViewModel, repositories, translateForTest);
  (listViewModel as unknown as {isActivatedAccount: () => boolean}).isActivatedAccount = () => true;
  return listViewModel;
};

describe('ListViewModel', () => {
  beforeEach(() => {
    useSidebarStore.setState({currentTab: SidebarTabs.RECENT});
    useAppState.setState({listState: ListState.CONVERSATIONS});
  });

  it.each([SidebarTabs.MEETINGS, SidebarTabs.CELLS])(
    'returns to the conversation list when opening a conversation from tab %s',
    currentTab => {
      useSidebarStore.setState({currentTab});
      useAppState.setState({listState: currentTab === SidebarTabs.CELLS ? ListState.CELLS : ListState.MEETINGS});

      createListViewModel().openConversations();

      expect(useAppState.getState().listState).toBe(ListState.CONVERSATIONS);
      expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.RECENT);
    },
  );

  it.each([SidebarTabs.FAVORITES, SidebarTabs.GROUPS])(
    'keeps conversation list tab %s when opening a conversation',
    currentTab => {
      useSidebarStore.setState({currentTab});

      createListViewModel().openConversations();

      expect(useAppState.getState().listState).toBe(ListState.CONVERSATIONS);
      expect(useSidebarStore.getState().currentTab).toBe(currentTab);
    },
  );

  it('keeps the archive list when opening an archived conversation', () => {
    useSidebarStore.setState({currentTab: SidebarTabs.MEETINGS});

    createListViewModel().openConversations(true);

    expect(useAppState.getState().listState).toBe(ListState.ARCHIVE);
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.ARCHIVES);
  });
});
