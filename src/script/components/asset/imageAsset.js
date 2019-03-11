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

import AbstractAssetTransferStateTracker from './AbstractAssetTransferStateTracker';
import viewportObserver from '../../ui/viewportObserver';

import './assetLoader';

class ImageAssetComponent extends AbstractAssetTransferStateTracker {
  constructor({asset, message, onClick}, {element}) {
    super(message);
    this.asset = asset;
    this.message = message;
    this.isVisible = ko.observable(false);
    this.onClick = (data, event) => onClick(message, event);

    this.dummyImageUrl = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 1 1' width='${asset.width}' height='${asset.height}'></svg>`;

    this.imageUrl = ko.observable();

    this.isIdle = () => this.uploadProgress() === -1 && !this.asset.resource() && !this.message.isObfuscated();

    ko.computed(() => {
      if (this.isVisible() && asset.resource()) {
        asset
          .resource()
          .load()
          .then(blob => {
            this.imageUrl(window.URL.createObjectURL(blob));
          });
      }
    });

    this.container = element;
    viewportObserver.onElementInViewport(this.container, () => this.isVisible(true));
  }

  dispose() {
    viewportObserver.removeElement(this.container);
  }
}

ko.components.register('image-asset', {
  template: `
    <div class="image-asset" data-bind="
      attr: {'data-uie-visible': message.visible() && !message.isObfuscated(), 'data-uie-status': imageUrl() ? 'loaded' : 'loading'},
      click: onClick,
      css: {'bg-color-ephemeral': message.isObfuscated(), 'loading-dots': isIdle(), 'image-asset--no-image': !imageUrl()}"
      data-uie-name="go-image-detail">
      <!-- ko if: uploadProgress() > -1 -->
        <asset-loader params="loadProgress: uploadProgress, onCancel: () => cancelUpload(message)"></asset-loader>
      <!-- /ko -->
      <!-- ko if: message.isObfuscated() -->
        <image-icon class="flex-center full-screen"></image-icon>
      <!-- /ko -->
      <img class="image-element" data-bind="attr: {src: imageUrl() || dummyImageUrl}, css: {'image-ephemeral': message.isObfuscated()}"/>
    </div>`,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new ImageAssetComponent(params, componentInfo);
    },
  },
});
