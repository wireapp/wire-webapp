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
z.user ?= {}

# User mapper to convert all server side JSON users into core user entities.
class z.user.UserMapper
  ###
  Construct a new User Mapper.

  @param asset_service [z.assets.AssetService] Backend REST API asset service implementation
  ###
  constructor: (@asset_service) ->
    @logger = new z.util.Logger 'z.user.UserMapper', z.config.LOGGER.OPTIONS

  ###
  Converts JSON user into user entity.

  @param data [Object] User data

  @return [z.entity.User] Mapped user entity
  ###
  map_user_from_object: (data) ->
    user = new z.entity.User()
    return @update_user_from_object user, data

  ###
  Convert multiple JSON users into user entities.

  @note Return an empty array in any case to prevent crashes.

  @param json [Object] User data

  @return [Array<z.entity.User>] Mapped user entities
  ###
  map_users_from_object: (data) ->
    if data?
      return (@map_user_from_object user for user in data when user isnt undefined)
    else
      @logger.log @logger.levels.WARN, 'We got no user data from the backend'
      return []

  ###
  Maps JSON user into a blank user entity or updates an existing one.

  @note Mapping of single properties to an existing user happens when the user changes his name or accent color.

  @param user_et [z.entity.User] User entity that the info shall be mapped to
  @param data [Object] User data

  @return [z.entity.User] Mapped user entity
  ###
  update_user_from_object: (user_et, data) ->
    return if not data?
    # It's a new user
    if data.id? and user_et.id is ''
      user_et.id = data.id
      user_et.joaat_hash = z.util.Crypto.Hashing.joaat_hash data.id
    # We are trying to update non-matching users
    else if user_et.id isnt '' and data.id isnt user_et.id
      throw new Error('updating wrong user_et')

    if data.email?
      user_et.email data.email

    if data.phone?
      user_et.phone data.phone

    if data.name?
      user_et.name data.name.trim()

    if data.accent_id? and data.accent_id isnt 0
      user_et.accent_id data.accent_id

    if data.assets?.length > 0
      @_map_profile_assets user_et, data.assets
    else if data.picture?.length > 0
      @_map_profile_pictures user_et, data.picture

    return user_et

  _map_profile_pictures: (user_et, picture) ->
    if picture[0]?
      user_et.preview_picture_resource z.assets.AssetRemoteData.v1 user_et.id, picture[0].id
    if picture[1]?
      user_et.medium_picture_resource z.assets.AssetRemoteData.v1 user_et.id, picture[1].id

  _map_profile_assets: (user_et, assets) ->
    for asset in assets when asset.type is 'image'
      switch asset.size
        when 'preview'
          user_et.preview_picture_resource z.assets.AssetRemoteData.v3 asset.key
        when 'complete'
          user_et.medium_picture_resource z.assets.AssetRemoteData.v3 asset.key

