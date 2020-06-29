/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

interface Params {
  large: boolean;
  loadProgress: ko.Subscribable<number>;
  onCancel: () => void;
}

ko.components.register('asset-loader', {
  template: `
  <div class="media-button" data-bind="click: onCancel, clickBubble: false" data-uie-name="status-loading-media">
    <svg data-bind="attr: {viewBox: viewBox}">
      <circle data-bind="style: {'stroke-dasharray': progress}" class="accent-stroke" r="50%" cx="50%" cy="50%"></circle>
    </svg>
    <close-icon class="media-button__icon"></close-icon>
  </div>
  `,
  viewModel: function ({large, loadProgress, onCancel}: Params): void {
    const elementScale = large ? 2 : 1;

    this.progress = ko.pureComputed(() => `${loadProgress() * elementScale} ${100 * elementScale}`);

    const viewBoxSize = 32 * elementScale;
    this.viewBox = `0 0 ${viewBoxSize} ${viewBoxSize}`;
    this.onCancel = onCancel;
  },
});
