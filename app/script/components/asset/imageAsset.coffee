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

class z.components.ImageAssetComponent
  ###
  Construct a new image asset.

  @param params [Object]
  @option params [ko.observableArray] asset
  ###
  constructor: (params) ->
    @message = ko.unwrap params.message
    @asset = @message.get_first_asset()
    @expired = @message.is_expired

    @on_click = =>
      params.click? @message

ko.components.register 'image-asset',
  viewModel: z.components.ImageAssetComponent
  template: """
            <image-component data-bind="style: {'opacity': expired() ? 0 : 1}" params="asset: asset, click: on_click"></image-component>
            """
