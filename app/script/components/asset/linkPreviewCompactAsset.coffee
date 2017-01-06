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

class z.components.LinkPreviewCompactAssetComponent
  ###
  Construct a new audio asset.

  @param params [Object]
  @option params [z.entity.LinkPreview] preview
  ###
  constructor: (params, component_info) ->

    @message_et = ko.unwrap params.message

    @preview = @message_et.get_first_asset().previews()[0]
    @element = component_info.element
    @url = @preview.original_url

  on_link_preview_click: =>
    z.util.safe_window_open @url

  dispose: =>
    @element.removeEventListener 'click', @on_link_preview_click


ko.components.register 'link-preview-compact-asset',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.LinkPreviewCompactAssetComponent params, component_info
  template: """
            <div class="link-preview-compact-image-container">
              <!-- ko ifnot: preview.image_resource() -->
                <div class="link-preview-compact-image-placeholder icon-link"></div>
              <!-- /ko -->
              <!-- ko if: preview.image_resource() -->
                <image-component class="link-preview-compact-image" params="asset: preview.image_resource"></image-component>
              <!-- /ko -->
            </div>

            <div class="link-preview-compact-info">
              <asset-header class="link-preview-compact-info-header" params="message: message_et"></asset-header>
              <div class="link-preview-compact-info-title ellipsis" data-bind="text: preview.title"></div>
              <a class="link-preview-compact-info-link text-graphite ellipsis" target="_blank" rel="nofollow noopener noreferrer"
                     data-bind="text: z.util.naked_url(url), attr: {href: z.util.add_http(url), title: url}"></a>
            </div>
            """
