#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.components ?= {}

class z.components.LinkPreviewAssetComponent
  ###
  Construct a new audio asset.

  @param params [Object]
  @option params [z.entity.LinkPreview] preview
  ###
  constructor: (params, component_info) ->

    @message_et = ko.unwrap params.message
    @header = params.header or false

    @preview = @message_et.get_first_asset().previews()[0]
    @element = component_info.element
    @url = @preview.original_url

    @element.addEventListener 'click', @on_link_preview_click

  on_link_preview_click: =>
    z.util.safe_window_open @url

  dispose: =>
    @element.removeEventListener 'click', @on_link_preview_click


ko.components.register 'link-preview-asset',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.LinkPreviewAssetComponent params, component_info
  template: """
            <!-- ko ifnot: message_et.is_expired() -->
              <div class="link-preview-image-container">
                <!-- ko ifnot: preview.image_resource() -->
                  <div class="link-preview-image-placeholder icon-link"></div>
                <!-- /ko -->
                <!-- ko if: preview.image_resource() -->
                  <image-component class="link-preview-image" data-uie-name="link-preview-image" params="asset: preview.image_resource"></image-component>
                <!-- /ko -->
              </div>

              <div class="link-preview-info">
                <!-- ko if: header -->
                  <asset-header class="link-preview-info-header" params="message: message_et"></asset-header>
                <!-- /ko -->
                <!-- ko if: preview.meta_data_type == undefined -->
                  <div class="link-preview-info-title" data-uie-name="link-preview-title" data-bind="text: preview.title, css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'"></div>
                  <a class="link-preview-info-link text-graphite ellipsis" data-uie-name="link-preview-url" target="_blank" rel="nofollow noopener noreferrer"
                     data-bind="text: z.util.naked_url(url), attr: {href: z.util.add_http(url), title: url}"></a>
                <!-- /ko -->
                <!-- ko if: preview.meta_data_type === z.links.LinkPreviewMetaDataType.TWEET -->
                  <div class="link-preview-info-title" data-uie-name="link-preview-title" data-bind="text: preview.title, css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'"></div>
                  <div class="link-preview-info-link text-graphite" data-uie-name="link-preview-tweet-author" attr: {title: url}>
                    <span class="font-weight-bold ellipsis" data-bind="text: preview.meta_data.author"></span>
                    <span data-bind="l10n_text: z.string.conversation_tweet_author"></span>
                  </div>
                <!-- /ko -->
              </div>
            <!-- /ko -->
            <!-- ko if: message_et.is_expired() -->
              <div class="link-preview-image-container">
                <div class="link-preview-image-placeholder icon-link bg-color-ephemeral text-white"></div>
              </div>
              <div class="link-preview-info">
                <div class="link-preview-info-title ephemeral-message-obfuscated" data-bind="text: z.util.StringUtil.obfuscate(preview.title), css: header ? 'link-preview-info-title-singleline' : 'link-preview-info-title-multiline'"></div>
                <a class="link-preview-info-link ephemeral-message-obfuscated ellipsis" target="_blank" rel="nofollow noopener noreferrer"
                   data-bind="text: z.util.StringUtil.obfuscate(url)"></a>
              </div>
            <!-- /ko -->
            """
