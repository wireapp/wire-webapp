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

import viewportObserver from '../ui/viewportObserver';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.Image = class Image {
  constructor(params, componentInfo) {
    this.asset = ko.unwrap(params.asset);
    this.assetSrc = ko.observable();
    this.assetIsLoading = ko.observable(false);
    this.element = componentInfo.element;

    this.onClick = () => {
      if (!this.assetIsLoading() && typeof params.click === 'function') {
        params.click(this.asset);
      }
    };

    const _onInViewport = () => {
      this.assetIsLoading(true);
      this.asset.load().then(blob => {
        if (blob) {
          this.assetSrc(window.URL.createObjectURL(blob));
        }
        this.assetIsLoading(false);
      });
    };

    viewportObserver.addElement(this.element, _onInViewport);
  }

  dispose() {
    viewportObserver.removeElement(this.element);
    if (this.assetSrc()) {
      window.URL.revokeObjectURL(this.assetSrc());
    }
  }
};

ko.components.register('image-component', {
  template: `
    <!-- ko if: assetSrc() -->
      <img data-bind="attr:{src: assetSrc}, click: onClick"/>
    <!-- /ko -->
    <!-- ko ifnot: assetSrc() -->
      <div data-bind="css: {'three-dots': assetIsLoading()}">
        <span></span><span></span><span></span>
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new z.components.Image(params, componentInfo);
    },
  },
});
