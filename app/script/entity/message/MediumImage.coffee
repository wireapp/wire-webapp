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

# Medium image asset entity.
class z.entity.MediumImage extends z.entity.Asset
  ###
  Construct a new medium image asset.

  @param id [String] Asset ID
  ###
  constructor: (id) ->
    super id
    @type = z.assets.AssetType.MEDIUM_IMAGE

    @correlation_id = ''

    @width = '0px'
    @height = '0px'

    # z.assets.AssetRemoteData
    @resource = ko.observable()
