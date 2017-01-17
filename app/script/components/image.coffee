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

class z.components.Image
  constructor: (params) ->
    @asset = ko.unwrap params.asset
    @asset_src = ko.observable()
    @asset_is_loading = ko.observable false

    @placeholder_src = ko.pureComputed =>
      return z.util.dummy_image @asset.width, @asset.height

    @on_click = =>
      return if @asset_is_loading()
      params.click? @asset

    @on_entered_viewport = =>
      @load_image_asset()
      return true

    @load_image_asset = =>
      @asset_is_loading true
      @asset.resource().load().then (blob) =>
        @asset_is_loading false
        @asset_src window.URL.createObjectURL blob

  dispose: =>
    window.URL.revokeObjectURL @asset_src()


ko.components.register 'image-component',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.Image params, component_info
  template: """
              <!-- ko if: asset_src() -->
                <img class="image-loaded" data-bind="attr:{src: asset_src}, click: on_click"/>
              <!-- /ko -->
              <!-- ko ifnot: asset_src() -->
                <img data-bind="attr:{src: placeholder_src}"/>
                <div class="image-loading" data-bind="in_viewport: on_entered_viewport, css: {'three-dots': asset_is_loading()}">
                  <span></span><span></span><span></span>
                </div>
              <!-- /ko -->
            """
