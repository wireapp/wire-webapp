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

# grunt test_init && grunt test_run:entity/message/File

describe 'z.entity.Text', ->

  text = null

  beforeEach ->
    text = new z.entity.Text()
    text.text = 'foo'
    text.none = z.util.create_random_uuid()

    spyOn(z.util, 'render_message').and.callThrough()

  describe 'cached processed text', ->

    it 'should cache processed tect', ->
      processed_text = text.render()
      expect(text.text).toBe processed_text

      processed_text = text.render()
      expect(text.text).toBe processed_text
      expect(z.util.render_message.calls.count()).toBe 1

