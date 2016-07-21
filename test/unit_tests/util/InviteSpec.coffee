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

describe 'z.util.Invite', ->
  expected_timestamp = undefined

  beforeEach ->
    # Date used in ios tests (Sun, 27 Apr 2014 21:33:20)
    expected_timestamp = z.util.Invite.hours_between_reference_date_and_date new Date(1398634400000)

  describe 'decode_data', ->
    it 'should decode url with escaped character plus', ->
      expected_uuid = '0f86b28a-85b1-46f4-a387-29d5ab420002'
      [uuid, timestamp] = z.util.Invite.decode_data 'pq9xgV1-6Gg5xsM_ftz9KTFQkjRZsLbltoN8ATScuDs'
      expect(uuid).toBe expected_uuid
      expect(timestamp).toBe expected_timestamp

    it 'should decode url with escaped character slash', ->
      expected_uuid = '0f86b28a-85b1-46f4-a387-29d5ab420001'
      [uuid, timestamp] = z.util.Invite.decode_data 'YjXsjDOfIEMtKPVnlNwHnzmn8J2R7Aika0LVMl1nCnM'
      expect(uuid).toBe expected_uuid
      expect(timestamp).toBe expected_timestamp

    it 'should decode url from android client', ->
      expected_uuid = '0f86b28a-85b1-46f4-a387-29d5ab420001'
      [uuid, timestamp] = z.util.Invite.decode_data 'B32C2G-yV4WczFZbSKoLUAkvOvHd_ypNUSiW2WcqVLY'
      expect(uuid).toBe expected_uuid
      expect(timestamp).toBe z.util.Invite.hours_between_reference_date_and_date new Date(1419349808000)

  describe 'get_user_from_invitation_token', ->

    it 'should return user_id if token is valid', ->
      expected_uuid = '0f86b28a-85b1-46f4-a387-29d5ab420002'
      url = z.util.Invite.get_invitation_to_connect_url expected_uuid
      uuid = z.util.Invite.get_user_from_invitation_url url
      expect(uuid).toBe expected_uuid

    it 'should return null if token is expired', ->
      token = z.util.Invite.encode_data '0f86b28a-85b1-46f4-a387-29d5ab420002', new Date('02 Jan 2014 00:00:00')
      uuid = z.util.Invite.get_user_from_invitation_token token
      expect(uuid).toBeNull()
