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

interface InputLevelParams {
  disabled: ko.Observable<boolean>;
  level: ko.Observable<number>;
}

class InputLevel {
  input_level: ko.Observable<number>;
  disabled: ko.Observable<boolean>;
  level_in_view: ko.PureComputed<number>;
  bullet_count: number[];

  constructor(params: InputLevelParams) {
    this.input_level = params.level;
    this.disabled = params.disabled;

    this.level_in_view = ko.pureComputed(() => this.input_level()).extend({rateLimit: 100});

    this.bullet_count = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  }

  is_bullet_active(index: number): string | void {
    if (this.disabled()) {
      return 'input-level-bullet-disabled';
    }
    const threshold_passed = this.level_in_view() > (index + 1) / this.bullet_count.length;
    if (threshold_passed) {
      return 'input-level-bullet-active';
    }
  }
}

ko.components.register('input-level', {
  template: `\
    <ul class="input-level" data-bind="foreach: bullet_count">
     <li class="input-level-bullet" data-bind="css: $parent.is_bullet_active($data)"></li>
    </ul>\
  `,
  viewModel: InputLevel,
});
