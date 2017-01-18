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

# grunt test_init && grunt test_run:calling/entities/ECallMessage

describe 'z.calling.entities.ECallMessage', ->
  describe '_create_session_id', ->
    e_call_message_et = new z.calling.entities.ECallMessage()

    it 'always returns an alphanumeric string of length four', ->
      expect(e_call_message_et._create_session_id()).toMatch(/(\w|\d){4}/) for [0...100]
