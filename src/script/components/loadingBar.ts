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

interface LoadingBarParams {
  message: ko.Subscribable<string>;
  progress: ko.Subscribable<number>;
}

ko.components.register('loading-bar', {
  template: `
    <div class="text-center">
      <div class="progress-console" data-bind="text: loadingMessage"></div>
      <div class="progress-bar"><div data-bind="style: {width: loadingPercentage}"></div></div>
    </div>
`,
  viewModel: function ({progress, message}: LoadingBarParams): void {
    this.loadingMessage = message;
    this.loadingPercentage = ko.pureComputed(() => `${progress()}%`);
  },
});
