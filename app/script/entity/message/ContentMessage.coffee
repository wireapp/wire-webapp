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
z.entity ?= {}

# Content Message based on z.entity.Message.
class z.entity.ContentMessage extends z.entity.Message
  # Construct a new content message.
  constructor: ->
    super()

    @assets = ko.observableArray []
    @nonce = null
    @super_type = z.message.SuperType.CONTENT


  ###
  Add another content asset to the message.

  @param asset_et [z.entity.Asset] New content asset
  ###
  add_asset: (asset_et) =>
    @assets.push asset_et

  ###
  Get the first asset attached to the message.

  @return [z.entity.Message] The first asset attached to the message
  ###
  get_first_asset: ->
    return @assets()[0]
