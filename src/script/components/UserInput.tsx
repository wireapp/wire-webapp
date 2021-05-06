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
import React, {useEffect, useRef, useState} from 'react';

import {isEnterKey, isRemovalAction} from 'Util/KeyboardUtil';
import {registerReactComponent} from 'Util/ComponentUtil';

import type {User} from '../entity/User';

export interface UserInputParams {
  enter: () => void | Promise<void>;
  focusDelay?: number;
  input: string;
  placeholder: string;
  selected: User[];
  setSelected: ko.ObservableArray<User>;
}

const UserInput: React.FC<UserInputParams> = ({
  enter: onEnter,
  focusDelay,
  input,
  placeholder: placeholderText,
  selected: selectedUsers,
  setSelected: setSelectedUsers,
}) => {
  const hasSelectedUsers = !!selectedUsers.length;
  const innerElement = useRef<HTMLDivElement>();
  const inputElement = useRef<HTMLInputElement>();
  let hasFocus = false;

  if (focusDelay) {
    window.setTimeout(() => (hasFocus = true), focusDelay);
  } else {
    hasFocus = true;
  }

  const [textInput, setTextInput] = useState(input);

  const placeholder = !textInput.length && hasSelectedUsers ? placeholderText : '';

  function onKeyDown(keyboardEvent: React.KeyboardEvent<HTMLInputElement>): true {
    if (isRemovalAction(keyboardEvent) && !textInput.length) {
      setSelectedUsers.pop();
    } else if (isEnterKey(keyboardEvent)) {
      onEnter();
    }
    return true;
  }

  useEffect(() => {
    setTextInput('');
    inputElement.current?.focus();
    window.setTimeout(() => innerElement.current?.scrollTo({top: innerElement.current?.scrollHeight}));
  }, [selectedUsers]);

  return (
    <form autoComplete="off" className="search-outer">
      <div className="search-inner-wrap">
        <div ref={innerElement} className="search-inner">
          <div className="search-icon icon-search" />
          {hasSelectedUsers &&
            selectedUsers.map(user => <span key={user.id} data-bind="text: name()" data-uie-name="item-selected" />)}
          <input
            ref={inputElement}
            className="search-input"
            max="128"
            required={true}
            autoFocus={hasFocus}
            spellCheck="false"
            type="text"
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            data-uie-name="enter-users"
          >
            {textInput}
          </input>
        </div>
      </div>
    </form>
  );
};

export default UserInput;

registerReactComponent('user-input', {
  bindings:
    'enter, focusDelay, input: ko.unwrap(input), placeholder, selected: ko.unwrap(selected), setSelected: selected',
  component: UserInput,
  optionalParams: ['focusDelay'],
});
