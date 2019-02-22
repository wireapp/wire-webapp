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

import AbstractAssetTransferStateTracker from './AbstractAssetTransferStateTracker';

import './assetLoader';

class ImageAssetComponent extends AbstractAssetTransferStateTracker {
  constructor({asset, message, onClick}) {
    super(message);
    this.asset = asset;
    this.message = message;
    this.isVisible = ko.observable(false);
    this.onClick = (data, event) => onClick(message, event);

    const dummyImageUrl = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${
      asset.width
    } ${asset.height}' width='${asset.width}' height='${asset.height}'></svg>`;
    this.imageUrl = ko.observable(dummyImageUrl);

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
  }

  isIdle() {
    return this.uploadProgress() === -1 && !this.asset.resource() && !this.message.isObfuscated();
  }
}

ko.components.register('image-asset', {
  template: `
    <div class="message-asset-image" style="background: grey">
      <div class="image image-loading" data-bind="
        attr: {'data-uie-visible': message.visible() && !message.isObfuscated()},
        in_viewport: {onVisible: () => isVisible(true)},
        click: onClick,
        css: {'bg-color-ephemeral': message.isObfuscated()},
        " data-uie-name="go-image-detail">
        <!-- ko if: uploadProgress() > -1 -->
          <asset-loader params="loadProgress: uploadProgress, onCancel: () => cancelUpload(message)"></asset-loader>
        <!-- /ko -->
        <!-- ko if: message.isObfuscated() -->
          <div class="icon-library flex-center full-screen text-white"></div>
        <!-- /ko -->
        <img class="image-element" data-bind="attr: {src: imageUrl}, css: {'image-ephemeral': message.isObfuscated()}"/>
        <!-- ko if: isIdle() -->
          <span class="image-placeholder-icon">
            <div class="three-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </span>
        <!-- /ko -->
      </div>
    </div>`,

  viewModel: ImageAssetComponent,
});
