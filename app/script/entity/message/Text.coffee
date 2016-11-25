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

# Text asset entity.
class z.entity.Text extends z.entity.Asset
  ###
  Construct a new text asset.

  @param id [String] Asset ID
  ###
  constructor: (id) ->
    super id
    @type = z.assets.AssetType.TEXT
    @nonce = undefined

    # Raw message text
    @text = ''

    # Can be used to theme media embeds
    @theme_color = undefined

    # Array of z.entity.LinkPreview instances
    @previews = ko.observableArray()

    @should_render_text = ko.pureComputed =>
      return false if not @text? or @text.length is 0
      has_link_previews = @previews().length > 0
      return not has_link_previews or (has_link_previews and not z.links.LinkPreviewHelpers.contains_only_link(@text))

  # Process text before rendering it.
  render: ->
    return z.util.render_message @text, @theme_color
