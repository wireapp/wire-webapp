/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect, useLayoutEffect, useRef} from 'react';

import cx from 'classnames';
import type {User} from 'Repositories/entity/User';
import {MAX_HANDLE_LENGTH} from 'Repositories/user/UserHandleGenerator';
import {isEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import * as Icon from '../Icon';

interface SearchInputProps {
  onEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void | Promise<void>;
  /** Will force the component to have a dark theme and not follow user's theme */
  forceDark?: boolean;
  input: string;
  placeholder: string;
  selectedUsers?: User[];
  setInput: (input: string) => void;
}

export const SearchInput = ({
  onEnter,
  input,
  selectedUsers = [],
  placeholder,
  setInput,
  forceDark,
}: SearchInputProps) => {
  const innerElement = useRef<HTMLDivElement>(null);
  const inputElement = useRef<HTMLInputElement>(null);

  const emptyInput = input.length === 0;
  const noSelectedUsers = selectedUsers.length === 0;

  useLayoutEffect(() => {
    if (inputElement.current && innerElement.current) {
      inputElement.current.focus();
      innerElement.current.scrollTop = inputElement.current.scrollHeight;
    }
  }, [selectedUsers.length]);

  useEffect(() => {
    setInput('');
  }, [selectedUsers.length]);

  const placeHolderText = emptyInput && noSelectedUsers ? placeholder : '';

  return (
    <form
      autoComplete="off"
      className={`search-outer ${forceDark ? '' : 'user-list-light'}`}
      css={noSelectedUsers && {minHeight: '32px'}}
    >
      <div className="search-inner-wrap">
        <div className="search-inner" ref={innerElement}>
          <div className="search-icon icon-search" />

          <input
            className={cx('search-input', {'search-input-padding': !!input})}
            data-uie-name="enter-users"
            maxLength={MAX_HANDLE_LENGTH}
            onChange={event => setInput(event.target.value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (isEnterKey(event.nativeEvent)) {
                event.preventDefault();
                void onEnter?.(event);
              }
              return true;
            }}
            placeholder={placeHolderText}
            ref={inputElement}
            required
            spellCheck={false}
            type="text"
            value={input}
            aria-label={placeholder}
          />

          {input && (
            <button
              className="search-input-cancel"
              onClick={() => setInput('')}
              aria-label={t('accessibility.searchInput.cancel')}
            >
              <Icon.CloseIcon css={{fill: 'var(--text-input-background)', height: 8, width: 8}} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
