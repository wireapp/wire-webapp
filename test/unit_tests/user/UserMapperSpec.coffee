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

# grunt test_init && grunt test_run:user/UserMapper

describe 'User Mapper', ->

  asset_service =
    generate_asset_url: -> return 'FooBarURL'

  mapper = new z.user.UserMapper(asset_service)
  mapper.logger.level = z.util.Logger::levels.ERROR

  self_user_payload = null

  beforeEach ->
    self_user_payload = JSON.parse(JSON.stringify(payload.self.get))

  describe 'map_user_from_object', ->
    it 'can convert JSON into a single user entity', ->
      user_et = mapper.map_user_from_object self_user_payload
      expect(user_et.email()).toBe 'jd@wire.com'
      expect(user_et.name()).toBe 'John Doe'
      expect(user_et.phone()).toBe '+49177123456'
      expect(user_et.is_me).toBeFalsy()
      expect(user_et.accent_id()).toBe z.config.ACCENT_ID.YELLOW

    it 'returns undefined if input was undefined', ->
      user = mapper.map_user_from_object undefined
      expect(user).toBeUndefined()

    it 'can convert users with profile images marked as non public', ->
      self_user_payload.picture[0].info.public = false
      self_user_payload.picture[1].info.public = false
      user_et = mapper.map_user_from_object self_user_payload
      expect(user_et.name()).toBe 'John Doe'

    it 'will return default accent color if null/undefined', ->
      self_user_payload.accent_id = null
      user_et = mapper.map_user_from_object self_user_payload
      expect(user_et.name()).toBe 'John Doe'
      expect(user_et.accent_id()).toBe z.config.ACCENT_ID.BLUE

    it 'will return default accent color if backend returns 0', ->
      self_user_payload.accent_id = 0
      user_et = mapper.map_user_from_object self_user_payload
      expect(user_et.name()).toBe 'John Doe'
      expect(user_et.joaat_hash).toBe 526273169
      expect(user_et.accent_id()).toBe z.config.ACCENT_ID.BLUE

  describe 'map_self_user_from_object', ->
    it 'can convert JSON into a single user entity', ->
      user_et = mapper.map_self_user_from_object self_user_payload
      expect(user_et.email()).toBe 'jd@wire.com'
      expect(user_et.name()).toBe 'John Doe'
      expect(user_et.phone()).toBe '+49177123456'
      expect(user_et.is_me).toBeTruthy()
      expect(user_et.tracking_id).toBe '50e65001-7a96-4468-9e76-c31784ab2eba'
      expect(user_et.locale).toBe 'en'
      expect(user_et.accent_id()).toBe z.config.ACCENT_ID.YELLOW

  describe 'map_users_from_object', ->
    it 'can convert JSON into multiple user entities', ->
      user_ets = mapper.map_users_from_object payload.users.get.many
      expect(user_ets.length).toBe 2
      expect(user_ets[0].email()).toBe 'jd@wire.com'
      expect(user_ets[1].name()).toBe 'Jane Roe'

    it 'returns an empty array if input was undefined', ->
      user_ets = mapper.map_users_from_object undefined
      expect(user_ets).toBeDefined()
      expect(user_ets.length).toBe 0

    it 'returns an empty array if input was an empty array', ->
      user_ets = mapper.map_users_from_object []
      expect(user_ets).toBeDefined()
      expect(user_ets.length).toBe 0

  describe 'update_user_from_object', ->
    it 'can update the accent color', ->
      user_et = new z.entity.User()
      user_et.id = entities.user.john_doe.id
      data = {'accent_id': 1, 'id': entities.user.john_doe.id}
      updated_user_et = mapper.update_user_from_object user_et, data
      expect(updated_user_et.accent_id()).toBe z.config.ACCENT_ID.BLUE

    it 'can update the user name', ->
      user_et = new z.entity.User()
      user_et.id = entities.user.john_doe.id
      data = {'name': entities.user.jane_roe.name, 'id': entities.user.john_doe.id}
      updated_user_et = mapper.update_user_from_object user_et, data
      expect(updated_user_et.name()).toBe entities.user.jane_roe.name

    it 'can update the user handle', ->
      user_et = new z.entity.User()
      user_et.id = entities.user.john_doe.id
      data = {'handle': entities.user.jane_roe.handle, 'id': entities.user.john_doe.id}
      updated_user_et = mapper.update_user_from_object user_et, data
      expect(updated_user_et.username()).toBe entities.user.jane_roe.handle

    it 'cannot update the user name of a wrong user', ->
      user_et = new z.entity.User()
      user_et.id = entities.user.john_doe.id
      data = {'name': entities.user.jane_roe.name, 'id': entities.user.jane_roe.id}
      func = -> mapper.update_user_from_object user_et, data
      expect(func).toThrow()

    it 'can update user with v3 assets', ->
      user_et = new z.entity.User()
      user_et.id = entities.user.john_doe.id
      data = {
        'name': entities.user.jane_roe.name,
        'id': entities.user.john_doe.id
        'assets': [
          {key: z.util.create_random_uuid(), size: 'preview', type: 'image'},
          {key: z.util.create_random_uuid(), size: 'complete', type: 'image'},
        ]
      }
      updated_user_et = mapper.update_user_from_object user_et, data
      expect(updated_user_et.preview_picture_resource()).toBeDefined()
      expect(updated_user_et.medium_picture_resource()).toBeDefined()
