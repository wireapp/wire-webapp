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

import {createRef} from 'react';

import userEvent from '@testing-library/user-event';
import {act, render, screen} from '@testing-library/react';

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {User} from 'Repositories/entity/User';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {ConversationHeaderComponent} from './conversationHeader';

import {SidebarTabs} from '../useSidebarStore';

describe('ConversationHeader', () => {
  const renderHeader = ({
    onSearchTab = jest.fn(),
    onSearchEnterClick = jest.fn(),
    onSearchChange = jest.fn(),
    searchValue = 'search',
    clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
  } = {}) => {
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({translate: translateForTest, clock}),
    );
    render(
      withThemeAndRootContext(
        <ConversationHeaderComponent
          currentTab={SidebarTabs.RECENT}
          selfUser={new User('', '', translateForTest)}
          showSearchInput
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchInputPlaceholder="Search conversations"
          currentFolder={undefined}
          onSearchEnterClick={onSearchEnterClick}
          onSearchTab={onSearchTab}
          onBeforeSearchTab={jest.fn()}
          jumpToRecentSearch={jest.fn()}
          searchInputRef={createRef()}
        />,
        wrapper,
      ),
    );

    return {onSearchTab, onSearchEnterClick, onSearchChange, clock};
  };

  it('updates the search input without committing the query until the debounce expires', async () => {
    const {clock, onSearchChange} = renderHeader();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox');

    await user.type(input, 'a');
    expect(input).toHaveValue('searcha');
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => clock.advanceByMilliseconds(200));
    expect(onSearchChange).toHaveBeenCalledWith('searcha');
  });

  it('delegates forward Tab from search to the first-result focus handler', async () => {
    const {onSearchTab} = renderHeader();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox');

    input.focus();
    await user.tab();

    expect(onSearchTab).toHaveBeenCalledTimes(1);
  });

  it('does not intercept Shift+Tab from search', async () => {
    const {onSearchTab} = renderHeader();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox');

    input.focus();
    await user.tab({shift: true});

    expect(onSearchTab).not.toHaveBeenCalled();
  });

  it('keeps Enter delegated to search activation', async () => {
    const {onSearchEnterClick} = renderHeader();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox');

    input.focus();
    await user.keyboard('{Enter}');

    expect(onSearchEnterClick).toHaveBeenCalledTimes(1);
  });
});
