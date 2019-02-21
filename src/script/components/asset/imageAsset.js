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

import AbstractAssetTransferStateTracker from './AbstractAssetTransferStateTracker';

class ImageAssetComponent extends AbstractAssetTransferStateTracker {
  constructor({asset, message, onClick}) {
    super(message);
    this.asset = asset;
    this.message = message;
    this.onClick = (data, event) => onClick(message, event);
    //this.transferState.subscribe(console.log.bind(console, 'felix'));
  }
}

ko.components.register('image-asset', {
  template: `
    <div class="message-asset-image">
      <div class="image image-loading" data-bind="
        attr: {'data-uie-visible': message.visible() && !message.isObfuscated()},
        background_image: asset.resource(),
        click: onClick,
        css: {'bg-color-ephemeral': message.isObfuscated()},
        " data-uie-name="go-image-detail">
        <!-- ko if: message.isObfuscated() -->
          <div class="icon-library flex-center full-screen text-white"></div>
        <!-- /ko -->
        <img class="image-element" data-bind="attr: {src: asset.dummy_url}, css: {'image-ephemeral': message.isObfuscated()}"/>
        <!-- ko ifnot: message.isObfuscated() -->
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
