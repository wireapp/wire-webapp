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

  on_link_preview_click: =>
    window.open @preview.permanent_url

  dispose: =>
    @element.removeEventListener 'click', @on_link_preview_click


ko.components.register 'link-preview-asset',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.LinkPreviewAssetComponent params, component_info
  template: """
            <div class="link-preview-icon icon-link"></div>
            <!-- ko if: preview.image_resource() -->
              <span class="link-preview-image image-placeholder-icon image-loading"
                    data-bind="background_image: preview.image_resource(), viewport_changed: viewport_changed, click: on_link_preview_click">
                <img />
                <div class="three-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </span>
            <!-- /ko -->
            <div class="link-preview-title" data-bind="text: preview.title, click: on_link_preview_click"></div>
            <a class="link-preview-site text-graphite ellipsis" target="_blank" rel="nofollow"
               data-bind="text: preview.permanent_url, attr: {href: preview.permanent_url, title: preview.permanent_url}"></a>
            """
