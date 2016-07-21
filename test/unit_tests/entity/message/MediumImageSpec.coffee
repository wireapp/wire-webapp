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

describe 'z.entity.MediumImage', ->

  message_et = null

  beforeEach ->
    message_et = new z.entity.MediumImage()

  describe '_replace_access_token', ->
    old_access_token = null
    new_access_token = null
    asset_id = null
    conversation_id = null

    beforeEach ->
      old_access_token = '2ajNq7RWvknJw3KZn7wYFsQsLAe1HD5CtBAdanLD7S1eQLjzvAkDwiCLADVr37OmOBVFptMsLBiveyc71wThCg==.v=1.k=1.d=1455115624.t=a.l=.u=faabbeca-31f5-4961-a202-c77819406e44.c=3366196404879349124'
      new_access_token = 'cHNmT61PiBuOXIMtTpA1gVgPkUTnwjgis8lNqhl-Bcbjdp2q5wl9YKgpomMYO1JHYBUMIet8wfpizydG6nf6Bg==.v=1.k=1.d=1455116558.t=a.l=.u=faabbeca-31f5-4961-a202-c77819406e44.c=4034772445459672150'
      asset_id = z.util.create_random_uuid()
      conversation_id = z.util.create_random_uuid()

    it 'can replace access token in asset url', ->
      old_url = "/assets/#{asset_id}?access_token=#{old_access_token}&conv_id=#{conversation_id}"
      url = message_et._replace_access_token old_url, new_access_token
      expect(url).toBe "/assets/#{asset_id}?access_token=#{new_access_token}&conv_id=#{conversation_id}"

    it 'can replace access token in otr asset url', ->
      old_url = "/conversations/#{conversation_id}/otr/assets/#{asset_id}?access_token=#{old_access_token}"
      url = message_et._replace_access_token old_url, new_access_token
      expect(url).toBe "/conversations/#{conversation_id}/otr/assets/#{asset_id}?access_token=#{new_access_token}"
