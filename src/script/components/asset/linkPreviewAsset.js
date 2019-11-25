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

import {safeWindowOpen} from 'Util/SanitizationUtil';
import {isTweetUrl} from 'Util/ValidationUtil';
import {getDomainName} from 'Util/UrlUtil';

import {LinkPreviewMetaDataType} from '../../links/LinkPreviewMetaDataType';

class LinkPreviewAssetComponent {
  /**
   * Construct a new link preview asset.
   *
   * @param {Object} params - Component parameters
   * @param {Message} params.message - Message entity
   * @param {Object} componentInfo - Component information
   */
  constructor(params, componentInfo) {
    this.dispose = this.dispose.bind(this);
    this.onClick = this.onClick.bind(this);

    this.getDomainName = getDomainName;

    this.messageEntity = ko.unwrap(params.message);
    this.header = params.header || false;

    const [firstPreview] = this.messageEntity.get_first_asset().previews();
    this.preview = firstPreview;
    this.element = componentInfo.element;

    const isTypeTweet = this.preview && this.preview.meta_data_type === LinkPreviewMetaDataType.TWEET;
    this.isTweet = isTypeTweet && isTweetUrl(this.preview.url);
    this.author = this.isTweet ? this.preview.meta_data.author.substring(0, 20) : '';

    if (!this.messageEntity.is_expired()) {
      this.element.addEventListener('click', this.onClick);
    }
  }

  onClick() {
    if (!this.messageEntity.is_expired()) {
      safeWindowOpen(this.preview.url);
    }
  }

  dispose() {
    this.element.removeEventListener('click', this.onClick);
  }
}

ko.components.register('link-preview-asset', {
  template: `
    <!-- ko ifnot: messageEntity.isObfuscated() -->
      <div class="link-preview-image-container">
        <!-- ko if: !preview || !preview.image_resource() -->
          <div class="link-preview-image-placeholder icon-link"></div>
        <!-- /ko -->
        <!-- ko if: preview && preview.image_resource() -->
          <image-component class="link-preview-image" params="asset: preview.image_resource" data-uie-name="link-preview-image"></image-component>
        <!-- /ko -->
      </div>

      <div class="link-preview-info">
        <!-- ko if: header -->
          <asset-header class="link-preview-info-header" params="message: messageEntity"></asset-header>
        <!-- /ko -->
        <!-- ko if: preview -->
          <div class="link-preview-info-title" data-bind="text: preview.title, css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'" data-uie-name="link-preview-title"></div>
          <!-- ko if: isTweet -->
            <div class="link-preview-info-link text-foreground" data-bind="attr: {title: preview.url}" data-uie-name="link-preview-tweet-author">
              <span class="font-weight-bold link-preview-info-title-singleline" data-bind="text: author"></span>
              <span data-bind="text: t('conversationTweetAuthor')"></span>
            </div>
          <!-- /ko -->
          <!-- ko ifnot: isTweet -->
            <div class="link-preview-info-link text-foreground ellipsis" data-bind="text: getDomainName(preview.url), attr: {title: preview.url}" data-uie-name="link-preview-url"></div>
          <!-- /ko -->
        <!-- /ko -->
      </div>
    <!-- /ko -->

    <!-- ko if: messageEntity.isObfuscated() -->
      <div class="link-preview-image-container">
        <div class="link-preview-image-placeholder icon-link bg-color-ephemeral text-white"></div>
      </div>
      <div class="link-preview-info">
        <div class="link-preview-info-title ephemeral-message-obfuscated" data-bind="text: preview.title, css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'"></div>
        <div class="link-preview-info-link ephemeral-message-obfuscated ellipsis" data-bind="text: preview.url"></div>
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new LinkPreviewAssetComponent(params, componentInfo);
    },
  },
});
