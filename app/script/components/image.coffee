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
  constructor: (params, component_info) ->
    @asset = ko.unwrap params.asset
    console.debug @asset

    @asset_src = ko.observable()

    @on_entered_viewport = =>
      @load_image_asset()
      return true

    @load_image_asset = =>
      @asset.load()
      .then (blob) =>
        @asset_src window.URL.createObjectURL blob
      .catch (error) ->
        console.debug 'failed to load image ', error.message

  dispose: =>
    window.URL.revokeObjectURL @asset_src


ko.components.register 'image-component',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.Image params, component_info
  template: """
              <div class="image-component-wrapper" data-bind="in_viewport: on_entered_viewport">
                <!-- ko if: asset_src() -->
                  <img data-bind="attr:{src: asset_src}"/>
                <!-- /ko -->
                <!-- ko ifnot: asset_src() -->
                  <div class="three-dots">
                    <span></span><span></span><span></span>
                  </div>
                <!-- /ko -->
              </div>
            """
