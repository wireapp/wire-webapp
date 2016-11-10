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
    @preview = params.preview
    @viewport_changed = params.viewport_changed
    @element = component_info.element
    @url = @preview.original_url
    @expired = params.expired

  on_link_preview_click: =>
    z.util.safe_window_open @url

  dispose: =>
    @element.removeEventListener 'click', @on_link_preview_click


ko.components.register 'link-preview-asset',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.LinkPreviewAssetComponent params, component_info
  template: """
            <div class="link-preview-icon icon-link text-graphite"></div>
            <!-- ko ifnot: expired()-->
              <div class="link-preview-container" data-bind="click: on_link_preview_click">
                <!-- ko if: preview.image_resource()-->
                  <span class="link-preview-image image-placeholder-icon image-loading"
                        data-bind="background_image: preview.image_resource, viewport_changed: viewport_changed">
                    <img />
                    <div class="three-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </span>
                <!-- /ko -->
                <div class="link-preview-title" data-bind="text: preview.title"></div>
                <a class="link-preview-site text-graphite ellipsis" target="_blank" rel="nofollow noopener noreferrer"
                   data-bind="text: z.util.naked_url(url), attr: {href: z.util.add_http(url), title: url}"></a>
              </div>
            <!-- /ko -->
            <!-- ko if: expired()-->
              <div class="link-preview-container ephemeral-link-preview">
                <!-- ko if: preview.image_resource()-->
                  <span class="link-preview-image bg-color-ephemeral icon-link text-white"></span>
                <!-- /ko -->
                <div class="link-preview-title ephemeral-message-obfuscated" data-bind="text: z.util.StringUtil.obfuscate(preview.title)"></div>
                <div class="link-preview-site ephemeral-message-obfuscated ellipsis" data-bind="text: z.util.StringUtil.obfuscate(url)"></div>
              </div>
            <!-- /ko -->
            """
