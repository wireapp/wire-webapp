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

import React, {useEffect} from 'react';

import {isEnterKey, isRemovalAction} from 'Util/KeyboardUtil';
import {registerReactComponent} from 'Util/ComponentUtil';

import type {User} from '../entity/User';

export interface UserInputParams {
  enter: () => void | Promise<void>;
  focusDelay?: number;
  input: string;
  placeholder: string;
  selected: User[];
}

const UserInput: React.FC<UserInputParams> = ({
  enter: onEnter,
  focusDelay,
  input: textInput,
  placeholder: placeholderText,
  selected: selectedUsers,
}) => {
  const noSelectedUsers = !selectedUsers.length;
  // TODO
  //
  // const innerElement = $(this).find('.search-inner');
  // const inputElement = $(this).find('.search-input');
  let hasFocus = false;

  if (focusDelay) {
    window.setTimeout(() => (hasFocus = true), focusDelay);
  } else {
    hasFocus = true;
  }

  // TODO
  //
  // const selectedSubscription = selectedUsers.subscribe(() => {
  //   if (typeof input === 'function') {
  //     input('');
  //   }

  //   inputElement.focus();
  //   window.setTimeout(() => innerElement.scrollTop(innerElement[0].scrollHeight));
  // });

  const placeholder = !textInput.length && !selectedUsers.length ? placeholderText : '';

  function onKeyDown(keyboardEvent: React.KeyboardEvent<HTMLInputElement>): true {
    if (isRemovalAction(keyboardEvent) && !textInput.length) {
      this.selectedUsers.pop();
    } else if (isEnterKey(keyboardEvent)) {
      onEnter();
    }
    return true;
  }

  useEffect(() => {
    // TODO
    // return () => {
    //   if (selectedSubscription) {
    //     selectedSubscription.dispose();
    //   }
    // };
  });

  return (
    <form autoComplete="off" className="search-outer">
      <div className="search-inner-wrap">
        <div className="search-inner">
          <div className="search-icon icon-search" />
          {!noSelectedUsers &&
            selectedUsers.map(user => <span key={user.id} data-bind="text: name()" data-uie-name="item-selected" />)}
          <input
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
  bindings: 'enter, focusDelay, input: ko.unwrap(input), placeholder, selected: ko.unwrap(selected)',
  component: UserInput,
  optionalParams: ['focusDelay'],
});
