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

# Asset entity.
class z.entity.Asset

  ###
  Construct a new asset.

  @param id [String] Asset ID
  ###
  constructor: (@id) ->
    @key = ''
    @type = ''

  ###
  Check if asset is a medium image.

  @return [Boolean] Is asset of type medium image
  ###
  is_medium_image: ->
    return @type is z.assets.AssetType.MEDIUM_IMAGE

  ###
  Check if asset is a preview image.

  @return [Boolean] Is asset of type preview image
  ###
  is_preview_image: ->
    return @type is z.assets.AssetType.PREVIEW_IMAGE

  ###
  Check if asset is a text.

  @return [Boolean] Is asset of type text
  ###
  is_text: ->
    return @type is z.assets.AssetType.TEXT

  ###
  Check if asset is a file.

  @return [Boolean] Is asset of type file
  ###
  is_file: ->
    return @type is z.assets.AssetType.FILE and not @is_video() and not @is_audio()

  ###
  Check if asset is a location.

  @return [Boolean] Is asset of type location
  ###
  is_location: ->
    return @type is z.assets.AssetType.LOCATION

  ###
  Check if asset is a video.

  @return [Boolean] Is asset of type video
  ###
  is_video: ->
    if @type is z.assets.AssetType.FILE and @file_type?.startsWith('video') and not z.util.Environment.browser.firefox
      can_play_audio = document.createElement('video').canPlayType @file_type
      return true if can_play_audio isnt ''
    return false
  ###
  Check if asset is a audio.

  @return [Boolean] Is asset of type audio
  ###
  is_audio: ->
    if @type is z.assets.AssetType.FILE and @file_type?.startsWith 'audio'
      can_play_audio = document.createElement('audio').canPlayType @file_type
      return true if can_play_audio isnt ''
    return false

  ###
  Replace access token in image url.

  @param url [String] asset url
  @param access_token [String]
  @return url [String]
  ###
  _replace_access_token: (url, access_token) ->
    token = url.match /access_token=([^&\s]*)/i
    return url.replace token[1], access_token

  ###
  Get current asset url.

  @param url [String] asset url
  @return url [String]
  ###
  generate_asset_url: (url) =>
    @_replace_access_token url, wire.auth.client.access_token

  ###
  Process asset before rendering it

  @todo Implement
  ###
  render: ->
    return 'Not implemented'
