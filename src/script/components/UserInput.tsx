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
import {registerReactComponent} from 'Util/ComponentUtil';
import type {User} from '../entity/User';
import {MAX_HANDLE_LENGTH} from '../user/UserHandleGenerator';
import {isEnterKey, isRemovalAction} from 'Util/KeyboardUtil';

export interface UserInputProps {
  enter?: () => void | Promise<void>;
  /** Will force the component to have a dark theme and not follow user's theme */
  forceDark?: boolean;
  input: string;
  placeholder: string;
  selectedUsers?: User[];
  setInput: (input: string) => void;
  setSelectedUsers?: (users: User[]) => void;
}

const UserInput: React.FC<UserInputProps> = ({
  enter: onEnter,
  input,
  selectedUsers = [],
  setSelectedUsers = () => {},
  placeholder,
  setInput,
  forceDark,
}: UserInputProps) => {
  const innerElement = useRef<HTMLDivElement>();
  const inputElement = useRef<HTMLInputElement>();

  const emptyInput = input.length === 0;
  const noSelectedUsers = selectedUsers.length === 0;

  useLayoutEffect(() => {
    inputElement.current.focus();
    innerElement.current.scrollTop = inputElement.current.scrollHeight;
  }, [selectedUsers.length]);

  useEffect(() => {
    setInput('');
  }, [selectedUsers.length]);

  const placeHolderText = emptyInput && noSelectedUsers ? placeholder : '';

  return (
    <form autoComplete="off" className={`search-outer user-input ${forceDark ? '' : 'user-list-light'}`}>
      <div className="search-inner-wrap">
        <div className="search-inner" ref={innerElement}>
          <div className="search-icon icon-search" />
          {selectedUsers.map(({name, id}) => (
            <span key={id} data-uie-name="item-selected">
              {name()}
            </span>
          ))}
          <input
            className="search-input"
            data-uie-name="enter-users"
            maxLength={MAX_HANDLE_LENGTH}
            onChange={event => setInput(event.target.value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (isRemovalAction(event.key) && emptyInput) {
                setSelectedUsers(selectedUsers.slice(0, -1));
              } else if (isEnterKey(event.nativeEvent)) {
                event.preventDefault();
                onEnter?.();
              }
              return true;
            }}
            placeholder={placeHolderText}
            ref={inputElement}
            required
            spellCheck={false}
            type="text"
            value={input}
          />
        </div>
      </div>
    </form>
  );
};

export default UserInput;

registerReactComponent<UserInputProps>('user-input', {
  component: UserInput,
  template:
    '<div data-bind="react: {enter, input: ko.unwrap(input), setInput: input, placeholder, selectedUsers: ko.unwrap(selected), setSelectedUsers: selected}"></div>',
});
