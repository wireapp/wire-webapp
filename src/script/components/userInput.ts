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

import {isRemovalAction} from 'Util/KeyboardUtil';
import type {User} from '../entity/User';

interface UserInputParams {
  enter: () => void | Promise<void>;
  focusDelay?: number;
  input: ko.Observable<string>;
  placeholder: string;
  selected: ko.ObservableArray<User>;
}

class UserInput {
  element: HTMLElement;
  hasFocus: ko.Observable<boolean>;
  innerElement: JQuery<HTMLElement>;
  input: ko.Observable<string>;
  inputElement: JQuery<HTMLElement>;
  noSelectedUsers: ko.PureComputed<boolean>;
  onEnter: () => void | Promise<void>;
  placeholder: ko.PureComputed<string>;
  placeholderText: string;
  selectedSubscription: ko.Subscription;
  selectedUsers: ko.ObservableArray<User>;

  constructor(params: UserInputParams, componentInfo: {element: HTMLElement}) {
    this.input = params.input;
    this.onEnter = params.enter;
    this.placeholderText = params.placeholder;
    this.selectedUsers = params.selected;

    this.element = componentInfo.element;
    this.innerElement = $(this.element).find('.search-inner');
    this.inputElement = $(this.element).find('.search-input');

    this.hasFocus = ko.observable(false);
    if (params.focusDelay) {
      window.setTimeout(() => this.hasFocus(true), params.focusDelay);
    } else {
      this.hasFocus(true);
    }

    this.noSelectedUsers = ko.pureComputed(() => {
      return typeof this.selectedUsers !== 'function' || !this.selectedUsers().length;
    });

    if (typeof this.selectedUsers === 'function') {
      this.selectedSubscription = this.selectedUsers.subscribe(() => {
        if (typeof this.input === 'function') {
          this.input('');
        }

        this.inputElement.focus();
        window.setTimeout(() => this.innerElement.scrollTop(this.innerElement[0].scrollHeight));
      });
    }

    this.placeholder = ko.pureComputed(() => {
      const emptyInput = typeof this.input !== 'function' || !this.input().length;
      if (emptyInput && this.noSelectedUsers()) {
        return this.placeholderText;
      }
      return '';
    });
  }

  onKeyDown(_data: unknown, keyboardEvent: KeyboardEvent): true {
    if (typeof this.selectedUsers === 'function') {
      if (isRemovalAction(keyboardEvent) && !this.input().length) {
        this.selectedUsers.pop();
      }
    }
    return true;
  }

  dispose = (): void => {
    if (this.selectedSubscription) {
      this.selectedSubscription.dispose();
    }
  };
}

ko.components.register('user-input', {
  template: `
    <form autocomplete="off" class="search-outer">
      <div class="search-inner-wrap">
        <div class="search-inner"">
          <div class="search-icon icon-search"></div>
          <!-- ko ifnot: noSelectedUsers-->
            <!-- ko foreach: selectedUsers -->
              <span data-bind="text: name()" data-uie-name="item-selected"></span>
            <!-- /ko -->
          <!-- /ko -->
          <input class="search-input" maxlength="128"
                 required spellcheck="false" type="text"
                 data-bind="textInput: input,
                            hasFocus: hasFocus,
                            attr: {placeholder: placeholder},
                            css: {'search-input-show-placeholder': placeholder},
                            event: {keydown: onKeyDown},
                            enter: onEnter"
                 data-uie-name="enter-users">
        </div>
      </div>
    </form>
  `,
  viewModel: {
    createViewModel(params: UserInputParams, componentInfo: {element: HTMLElement}) {
      return new UserInput(params, componentInfo);
    },
  },
});
