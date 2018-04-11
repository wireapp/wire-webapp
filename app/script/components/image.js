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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.Image = class Image {
  constructor(params) {
    this.asset = ko.unwrap(params.asset);
    this.asset_src = ko.observable();
    this.asset_is_loading = ko.observable(false);

    this.on_click = () => {
      if (!this.asset_is_loading() && typeof params.click === 'function') {
        params.click(this.asset);
      }
    };

    this.on_entered_viewport = () => {
      this.load_image_asset();
      return true;
    };

    this.load_image_asset = () => {
      this.asset_is_loading(true);
      this.asset.load().then(blob => {
        if (blob) {
          this.asset_src(window.URL.createObjectURL(blob));
        }
        this.asset_is_loading(false);
      });
    };
  }

  dispose() {
    if (this.asset_src()) {
      window.URL.revokeObjectURL(this.asset_src());
    }
  }
};

ko.components.register('image-component', {
  template: `
    <!-- ko if: asset_src() -->
      <img data-bind="attr:{src: asset_src}, click: on_click"/>
    <!-- /ko -->
    <!-- ko ifnot: asset_src() -->
      <div data-bind="in_viewport: on_entered_viewport, css: {'three-dots': asset_is_loading()}">
        <span></span><span></span><span></span>
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.Image(params, component_info);
    },
  },
});
