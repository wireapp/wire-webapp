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

import ko from 'knockout';
import React, {useLayoutEffect, useRef} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import type {User} from '../entity/User';
import {MAX_HANDLE_LENGTH} from '../user/UserHandleGenerator';
import {isEnterKey, isRemovalAction} from 'Util/KeyboardUtil';

export interface UserInputProps {
  enter: () => void | Promise<void>;
  focusDelay?: number;
  input: string;
  placeholder: string;
  selectedUsers: User[];
  setInput: ko.Observable<string>;
  setSelectedUsers: ko.ObservableArray<User>;
}

const UserInput: React.FC<UserInputProps> = (props: UserInputProps) => {
  const onEnter = props.enter;
  const input = props.input;
  const {selectedUsers, setSelectedUsers} = props;

  const innerElement = useRef<HTMLDivElement>();
  const inputElement = useRef<HTMLInputElement>();

  const hasFocus = ko.observable(false);
  if (props.focusDelay) {
    window.setTimeout(() => hasFocus(true), props.focusDelay);
  } else {
    hasFocus(true);
  }

  const emptyInput = input.length === 0;
  const noSelectedUsers = selectedUsers.length === 0;

  useLayoutEffect(() => {
    inputElement.current.focus();
    const handle = window.requestAnimationFrame(() => {
      innerElement.current.scrollTop = inputElement.current.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [selectedUsers]);

  const placeHolderText = emptyInput && noSelectedUsers ? props.placeholder : '';

  return (
    <form autoComplete="off" className="search-outer">
      <div className="search-inner-wrap">
        <div className="search-inner" ref={innerElement}>
          <div className="search-icon icon-search"></div>
          {selectedUsers.map(({name, id}) => (
            <span key={id} data-uie-name="item-selected">
              {name()}
            </span>
          ))}
          <input
            onChange={event => {
              props.setInput(event.target.value);
            }}
            className="search-input"
            maxLength={MAX_HANDLE_LENGTH}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (isRemovalAction(event.keyCode) && emptyInput) {
                setSelectedUsers(selectedUsers.slice(0, -1));
              } else if (isEnterKey(event.nativeEvent)) {
                onEnter();
              }
              return true;
            }}
            placeholder={placeHolderText}
            ref={inputElement}
            required={true}
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
  optionalParams: ['focusDelay'],
  template:
    '<div data-bind="react: {enter, input: ko.unwrap(input), setInput: input, focusDelay, placeholder, selectedUsers: ko.unwrap(selected), setSelectedUsers: selected}"></div>',
});
