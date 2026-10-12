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

import {KeyboardEvent as ReactKeyboardEvent, useCallback, useState} from 'react';

import userEvent from '@testing-library/user-event';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {useConversationSearch} from './useConversationSearch';

type SearchHarnessProps = {
  clock: ReturnType<typeof createDeterministicClock>;
  onSearch: (value: string) => void;
  onEnter: (event: ReactKeyboardEvent<HTMLInputElement>) => boolean;
  onTab: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  hasTabResult: (query: string) => boolean;
  onBeforeTab: () => void;
  onTabHandled: (wasDefaultPrevented: boolean) => void;
};

const SearchHarness = ({
  clock,
  onSearch,
  onEnter,
  onTab,
  hasTabResult,
  onBeforeTab,
  onTabHandled,
}: SearchHarnessProps) => {
  const [filter, setFilter] = useState('');
  const commitSearch = useCallback(
    (value: string) => {
      onSearch(value);
      setFilter(value);
    },
    [onSearch],
  );
  const search = useConversationSearch({
    clock,
    filter,
    onSearch: commitSearch,
    onEnter,
    onTab,
    hasTabResult,
    onBeforeTab,
  });

  return (
    <>
      <input
        aria-label="Search conversations"
        value={search.inputValue}
        onChange={event => {
          return search.changeInput(event.currentTarget.value);
        }}
        onKeyDown={event => {
          if (event.key === 'Tab') {
            search.tab(event);
            onTabHandled(event.defaultPrevented);
          }
          if (event.key === 'Enter') {
            search.enter(event);
          }
        }}
      />
      <button type="button" onClick={search.clear}>
        Clear search
      </button>
      <output aria-label="Committed search">{filter}</output>
    </>
  );
};

const renderSearch = (callbacks: Partial<Omit<SearchHarnessProps, 'clock'>> = {}) => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const onSearch = callbacks.onSearch ?? jest.fn();
  const onEnter = callbacks.onEnter ??
    jest.fn(() => {
      return false;
    });
  const onTab = callbacks.onTab ?? jest.fn();
  const hasTabResult = callbacks.hasTabResult ??
    jest.fn(() => {
      return true;
    });
  const onBeforeTab = callbacks.onBeforeTab ?? jest.fn();
  const onTabHandled = callbacks.onTabHandled ?? jest.fn();

  render(<SearchHarness {...{clock, onSearch, onEnter, onTab, hasTabResult, onBeforeTab, onTabHandled}} />);

  return {clock, onSearch, onEnter, onTab, hasTabResult, onBeforeTab, onTabHandled};
};

describe('useConversationSearch', () => {
  it('commits the latest query only after the debounce delay', async () => {
    const {clock, onSearch} = renderSearch();
    const input = screen.getByRole('textbox', {name: 'Search conversations'});
    const user = userEvent.setup();

    await user.type(input, 'wire');
    expect(input).toHaveValue('wire');
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      return clock.advanceByMilliseconds(199);
    });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      return clock.advanceByMilliseconds(1);
    });
    expect(onSearch).toHaveBeenCalledWith('wire');
    expect(screen.getByLabelText('Committed search')).toHaveTextContent('wire');
  });

  it('prevents native Tab synchronously while committing a pending query', async () => {
    const {onTab, onBeforeTab, onTabHandled} = renderSearch();
    const input = screen.getByRole('textbox', {name: 'Search conversations'});
    const user = userEvent.setup();

    await user.type(input, 'wire');
    fireEvent.keyDown(input, {key: 'Tab'});

    expect(onTabHandled).toHaveBeenCalledWith(true);
    expect(onBeforeTab).toHaveBeenCalledTimes(1);
    expect(onTab).toHaveBeenCalledTimes(1);
  });

  it('preserves native Tab when a pending query has no result', async () => {
    const hasTabResult = jest.fn(() => {
      return false;
    });
    const {onTabHandled} = renderSearch({hasTabResult});
    const input = screen.getByRole('textbox', {name: 'Search conversations'});
    const user = userEvent.setup();

    await user.type(input, 'missing');
    fireEvent.keyDown(input, {key: 'Tab'});

    expect(onTabHandled).toHaveBeenCalledWith(false);
    expect(hasTabResult).toHaveBeenCalledWith('missing');
  });

  it('clears the committed search through the search callback', async () => {
    const {onSearch} = renderSearch();
    const input = screen.getByRole('textbox', {name: 'Search conversations'});
    const user = userEvent.setup();

    await user.type(input, 'wire');
    await user.click(screen.getByRole('button', {name: 'Clear search'}));

    expect(input).toHaveValue('');
    expect(screen.getByLabelText('Committed search')).toBeEmptyDOMElement();
    expect(onSearch).toHaveBeenCalledWith('');
  });
});
