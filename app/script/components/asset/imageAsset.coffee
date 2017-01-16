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

    @src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg' viewBox%3D'0 0 200 150'%2F%3E"


ko.components.register 'image-asset',
  viewModel: z.components.LocationAssetComponent
  template: """
            <img src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg' viewBox%3D'0 0 200 150'%2F%3E"></img>
            """

###<div class="message-asset-image">
       <div class="image image-loading" data-bind="
         attr: {'data-uie-visible': $parent.visible},
         background_image: asset.resource,
         click: function() {$parents[1].show_detail(message, event)},
         css: {'bg-color-ephemeral': message.is_expired()},
         viewport_changed: $parents[1].viewport_changed
         " data-uie-name="go-image-detail">
         <!-- ko ifnot: message.is_expired() -->
           <img class="image-element" data-bind="attr: {src: asset.dummy_url}"/>
           <span class="image-placeholder-icon">
             <div class="three-dots">
               <span></span>
               <span></span>
               <span></span>
             </div>
           </span>
         <!-- /ko -->
         <!-- ko if: message.is_expired() -->
           <div class="icon-library flex-center full-screen text-white"></div>
           <img class="image-element image-ephemeral" data-bind="attr: {src: asset.dummy_url}"/>
         <!-- /ko -->
       </div>
     </div>###
