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
import React, {useRef} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';

import type {User} from '../entity/User';

interface UserInputProps {
  enter: () => void | Promise<void>;
  focusDelay?: number;
  input: ko.Observable<string>;
  placeholder: string;
  selected: ko.ObservableArray<User>;
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

  const noSelectedUsers = ko.pureComputed(() => {
    return typeof selectedUsers !== 'function' || !selectedUsers().length;
  });

  return (
    <form autoComplete="off" className="search-outer">
      <div className="search-inner-wrap">
        <div className="search-inner" ref={innerElement}>
          <div className="search-icon icon-search"></div>
          <input className="search-input" ref={inputElement} />
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
