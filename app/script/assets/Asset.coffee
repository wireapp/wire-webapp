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
z.assets ?= {}

# Asset entity for the asset service.
class z.assets.Asset
  ###
  Construct a new asset for the asset service.

  @param config [Object] Asset configuration
  ###
  constructor: (config) ->
    @correlation_id = config.correlation_id or z.util.create_random_uuid()
    @content_type = config.content_type
    @array_buffer = config.array_buffer
    @payload =
      conv_id: config.conversation_id
      correlation_id: @correlation_id
      public: config.public or false
      tag: config.tag or 'medium'
      inline: config.inline or false
      nonce: @correlation_id
      md5: config.md5
      width: config.width
      height: config.height
      original_width: config.original_width
      original_height: config.original_height
      native_push: config.native_push or false

  # Create the content disposition header for the asset.
  get_content_disposition: ->
    payload = ['zasset']
    for key, value of @payload
      payload.push "#{key}=#{value}"
    return payload.join ';'

  ###
  Sets the image payload of the asset.

  @param image [Object] Image object to be set on the asset entity
  ###
  set_image: (image) ->
    @content_type = z.util.get_content_type_from_data_url image.src
    @array_buffer = z.util.base64_to_array image.src
    @payload.width = image.width
    @payload.height = image.height
    @payload.md5 = z.util.encode_base64_md5_array_buffer_view @array_buffer
