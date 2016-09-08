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

class z.components.LocationAssetComponent
  ###
  Construct a new audio asset.

  @param params [Object]
  @option params [ko.observableArray] asset
  ###
  constructor: (params) ->
    @asset = params.asset


ko.components.register 'location-asset',
  viewModel: z.components.LocationAssetComponent
  template: """
            <div class="location-asset-icon icon-location"></div>
            <div class="location-asset-title" data-uie-name="location-name" data-bind="text: asset.name"></div>
            <a target="_blank" rel="nofollow noopener noreferrer" class="label-xs text-theme" data-bind="attr: {href: asset.link_src}, l10n_text: z.string.conversation_location_link"></a>
            """
