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
import {isRemovalAction} from 'Util/KeyboardUtil';

interface UserInputProps {
  enter: () => void | Promise<void>;
  focusDelay?: number;
  input: string;
  placeholder: string;
  selected: User[];
}

const UserInput: React.FC<UserInputProps> = (params: UserInputProps) => {
  const input = params.input;
  const onEnter = params.enter;
  const placeholderText = params.placeholder;
  const selectedUsers = params.selected;

  const innerElement = useRef<HTMLDivElement>();
  const inputElement = useRef<HTMLInputElement>();

  const hasFocus = ko.observable(false);
  if (params.focusDelay) {
    window.setTimeout(() => hasFocus(true), params.focusDelay);
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

  const placeholder = emptyInput && noSelectedUsers ? placeholderText : '';

  return (
    <form autoComplete="off" className="search-outer">
      <div className="search-inner-wrap">
        <div className="search-inner" ref={innerElement}>
          <div className="search-icon icon-search"></div>
          {selectedUsers.map(({name}, index) => (
            <span key={index} data-bind="text: name" data-uie-name="item-selected"></span>
          ))}
          <input
            className="search-input"
            maxLength={MAX_HANDLE_LENGTH}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (isRemovalAction(event.nativeEvent) && emptyInput) {
                selectedUsers.pop();
              }
              return true;
            }}
            onMouseEnter={() => {
              onEnter();
            }}
            placeholder={placeholder}
            ref={inputElement}
            required={true}
            spellCheck={false}
            type="text"
          />
        </div>
      </div>
    </form>
  );
};

export default UserInput;

registerReactComponent<UserInputProps>('user-input', {
  component: UserInput,
  optionalParams: [],
  template: '<div data-bind="react: {}"></div>',
});
