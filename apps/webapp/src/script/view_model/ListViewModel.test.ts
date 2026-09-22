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
import {createExecutingFireAndForgetInvokerForTest} from '../page/testSupport/rootContextTestSupport';
import {ContentState, ListState, useAppState} from '../page/useAppState';
import * as Router from '../router/Router';
import {translateForTest} from 'Util/test/translateForTest';

const createListViewModel = () => {
  const switchContent = jest.fn((contentState: ContentState) => {
    useAppState.setState({contentState});
  });

  const mainViewModel = {
    actions: {},
    calling: {},
    content: {
      loadPreviousContent: jest.fn(),
      switchContent,
    },
    isFederated: false,
  } as unknown as ConstructorParameters<typeof ListViewModel>[0];

  const teamRepository = {getTeam: jest.fn().mockResolvedValue(undefined)};
  const repositories = {
    calling: {},
    conversation: {},
    properties: {},
    search: {},
    team: teamRepository,
  } as unknown as ConstructorParameters<typeof ListViewModel>[1];
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();

  const listViewModel = new ListViewModel(mainViewModel, repositories, translateForTest, fireAndForgetInvoker);
  (listViewModel as unknown as {isActivatedAccount: () => boolean}).isActivatedAccount = () => true;
  return {fireAndForgetInvoker, listViewModel, teamRepository};
};

describe('ListViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSidebarStore.setState({currentTab: SidebarTabs.RECENT});
    useAppState.setState({listState: ListState.CONVERSATIONS});
  });

  it.each([SidebarTabs.MEETINGS, SidebarTabs.CELLS])(
    'returns to the conversation list when opening a conversation from tab %s',
    currentTab => {
      useSidebarStore.setState({currentTab});
      useAppState.setState({listState: currentTab === SidebarTabs.CELLS ? ListState.CELLS : ListState.MEETINGS});

      createListViewModel().listViewModel.openConversations();

      expect(useAppState.getState().listState).toBe(ListState.CONVERSATIONS);
      expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.RECENT);
    },
  );

  it.each([SidebarTabs.FAVORITES, SidebarTabs.GROUPS])(
    'keeps conversation list tab %s when opening a conversation',
    currentTab => {
      useSidebarStore.setState({currentTab});

      createListViewModel().listViewModel.openConversations();

      expect(useAppState.getState().listState).toBe(ListState.CONVERSATIONS);
      expect(useSidebarStore.getState().currentTab).toBe(currentTab);
    },
  );

  it('keeps the Connect tab selected when a conversation navigation is triggered underneath it', () => {
    useSidebarStore.setState({currentTab: SidebarTabs.CONNECT});

    createListViewModel().listViewModel.openConversations();

    expect(useAppState.getState().listState).toBe(ListState.CONVERSATIONS);
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.CONNECT);
  });

  it('keeps the archive list when opening an archived conversation', () => {
    useSidebarStore.setState({currentTab: SidebarTabs.MEETINGS});

    createListViewModel().listViewModel.openConversations(true);

    expect(useAppState.getState().listState).toBe(ListState.ARCHIVE);
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.ARCHIVES);
  });

  it('does not repeat navigation when opening the active preference', () => {
    const {listViewModel} = createListViewModel();
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');
    const switchContent = jest.spyOn(listViewModel.contentViewModel, 'switchContent');

    useAppState.setState({listState: ListState.PREFERENCES, contentState: ContentState.PREFERENCES_ACCOUNT});

    listViewModel.openPreferences(ContentState.PREFERENCES_ACCOUNT);

    expect(setHistoryParam).not.toHaveBeenCalled();
    expect(switchContent).not.toHaveBeenCalled();
  });

  it('navigates when opening a different preference', () => {
    const {listViewModel} = createListViewModel();
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');
    const switchContent = jest.spyOn(listViewModel.contentViewModel, 'switchContent');

    useAppState.setState({listState: ListState.PREFERENCES, contentState: ContentState.PREFERENCES_ACCOUNT});

    listViewModel.openPreferences(ContentState.PREFERENCES_DEVICES);

    expect(setHistoryParam).toHaveBeenCalledWith('/preferences/devices');
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.PREFERENCES);
    expect(switchContent).toHaveBeenCalledWith(ContentState.PREFERENCES_DEVICES);
  });

  it.each([
    [ContentState.PREFERENCES_ABOUT, '/preferences/about'],
    [ContentState.PREFERENCES_ACCOUNT, '/preferences/account'],
    [ContentState.PREFERENCES_AV, '/preferences/av'],
    [ContentState.PREFERENCES_DEVICES, '/preferences/devices'],
    [ContentState.PREFERENCES_OPTIONS, '/preferences/options'],
  ])('maps preference %s to its deep link', (contentState, path) => {
    const {listViewModel} = createListViewModel();
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');

    listViewModel.openPreferences(contentState);

    expect(setHistoryParam).toHaveBeenCalledWith(path);
  });

  it('navigates to the meetings deep link when opening meetings', () => {
    const {listViewModel} = createListViewModel();
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');

    listViewModel.openMeetingsList();

    expect(setHistoryParam).toHaveBeenCalledWith('/meetings');
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.MEETINGS);
  });

  it('does not repeat navigation when opening the active meetings list', () => {
    const {listViewModel} = createListViewModel();
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');

    useAppState.setState({listState: ListState.MEETINGS, contentState: ContentState.MEETINGS});

    listViewModel.openMeetingsList();

    expect(setHistoryParam).not.toHaveBeenCalled();
  });

  it('refreshes the team when opening the account preference', async () => {
    const {fireAndForgetInvoker, listViewModel, teamRepository} = createListViewModel();
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');
    const switchContent = jest.spyOn(listViewModel.contentViewModel, 'switchContent');

    useAppState.setState({listState: ListState.PREFERENCES, contentState: ContentState.PREFERENCES_ACCOUNT});

    listViewModel.openPreferencesAccount();
    await fireAndForgetInvoker.waitUntilAllSettled();

    expect(teamRepository.getTeam).toHaveBeenCalledTimes(1);
    expect(setHistoryParam).not.toHaveBeenCalled();
    expect(switchContent).not.toHaveBeenCalled();
  });

  it('does not switch back to Account if another preference is opened while getTeam is in flight', async () => {
    const {fireAndForgetInvoker, listViewModel, teamRepository} = createListViewModel();
    let resolveGetTeam: (value?: unknown) => void = () => undefined;
    const getTeamPromise = new Promise(resolve => {
      resolveGetTeam = resolve;
    });
    teamRepository.getTeam.mockReturnValue(getTeamPromise);

    listViewModel.openPreferencesAccount();
    listViewModel.openPreferences(ContentState.PREFERENCES_DEVICES);

    resolveGetTeam();
    await fireAndForgetInvoker.waitUntilAllSettled();

    expect(useAppState.getState().contentState).toBe(ContentState.PREFERENCES_DEVICES);
    expect(listViewModel.contentViewModel.switchContent).toHaveBeenLastCalledWith(ContentState.PREFERENCES_DEVICES);
  });
});
