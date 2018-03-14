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

z.components.LinkPreviewAssetComponent = class LinkPreviewAssetComponent {
  /**
   * Construct a new link preview asset.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);
    this.message_et = ko.unwrap(params.message);
    this.header = params.header || false;

    this.preview = this.message_et.get_first_asset().previews()[0];
    this.element = component_info.element;

    const is_type_tweet = this.preview.meta_data_type === z.links.LinkPreviewMetaDataType.TWEET;
    this.isTweet = is_type_tweet && z.util.ValidationUtil.urls.isTweet(this.preview.url);
    this.author = this.isTweet ? this.preview.meta_data.author.substring(0, 20) : '';

    this.on_link_preview_click = this.on_link_preview_click.bind(this);

    if (!this.message_et.is_expired()) {
      this.element.addEventListener('click', this.on_link_preview_click);
    }
  }

  on_link_preview_click() {
    if (!this.message_et.is_expired()) {
      z.util.safe_window_open(this.preview.url);
    }
  }

  dispose() {
    this.element.removeEventListener('click', this.on_link_preview_click);
  }
};

ko.components.register('link-preview-asset', {
  template: `
    <!-- ko ifnot: message_et.is_expired() -->
      <div class="link-preview-image-container">
        <!-- ko ifnot: preview.image_resource() -->
          <div class="link-preview-image-placeholder icon-link"></div>
        <!-- /ko -->
        <!-- ko if: preview.image_resource() -->
          <image-component class="link-preview-image" params="asset: preview.image_resource" data-uie-name="link-preview-image"></image-component>
        <!-- /ko -->
      </div>

      <div class="link-preview-info">
        <!-- ko if: header -->
          <asset-header class="link-preview-info-header" params="message: message_et"></asset-header>
        <!-- /ko -->
        <!-- ko if: isTweet -->
          <div class="link-preview-info-title" data-bind="text: preview.title, css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'" data-uie-name="link-preview-title"></div>
          <div class="link-preview-info-link text-graphite" data-bind="attr: {title: preview.url}" data-uie-name="link-preview-tweet-author">
            <span class="font-weight-bold link-preview-info-title-singleline" data-bind="text: author"></span>
            <span data-bind="l10n_text: z.string.conversationTweetAuthor"></span>
          </div>
        <!-- /ko -->
        <!-- ko ifnot: isTweet -->
          <div class="link-preview-info-title" data-bind="text: preview.title, css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'" data-uie-name="link-preview-title"></div>
          <div class="link-preview-info-link text-graphite ellipsis" data-bind="text: z.util.naked_url(preview.url), attr: {title: preview.url}" data-uie-name="link-preview-url"></div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
    <!-- ko if: message_et.is_expired() -->
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
    createViewModel(params, component_info) {
      return new z.components.LinkPreviewAssetComponent(params, component_info);
    },
  },
});
