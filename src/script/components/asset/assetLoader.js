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

class AssetLoader {
  constructor(params) {
    const scale = params.scale || 1;

    this.progress = ko.pureComputed(() => {
      return `${params.loadProgress() * scale} ${100 * scale}`;
    });

    const viewBoxSize = 32 * scale;
    this.viewBox = `0 0 ${viewBoxSize} ${viewBoxSize}`;
  }
}

ko.components.register('asset-loader', {
  template: `
  <svg class="svg-theme" data-bind="attr: {viewBox: viewBox}">
    <circle data-bind="style: {'stroke-dasharray': progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
  </svg>
  `,
  viewModel: AssetLoader,
});
