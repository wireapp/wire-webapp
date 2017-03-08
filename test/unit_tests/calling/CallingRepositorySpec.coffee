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

# grunt test_init && grunt test_run:calling/CallingRepository

describe 'z.calling.CallingRepository', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeCallingActors()
    .then done
    .catch done.fail

  describe 'outgoing_protocol_version', ->
    conversation_id = z.util.create_random_uuid()
    group_conversation_id = z.util.create_random_uuid()

    beforeAll ->
      group_conversation_et = conversation_repository.conversation_mapper.map_conversation entities.conversation
      group_conversation_et.id = group_conversation_id
      group_conversation_et.type z.conversation.ConversationType.REGULAR
      conversation_repository.conversations.push group_conversation_et

      conversation_et = conversation_repository.conversation_mapper.map_conversation entities.conversation
      conversation_et.id = conversation_id
      conversation_et.type z.conversation.ConversationType.ONE2ONE
      conversation_repository.conversations.push conversation_et

    it 'should return the expected protocol version if backend switch is not set', ->
      calling_repository.use_v3_api = undefined
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_3
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

      calling_repository.use_v3_api = true
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_3
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

      calling_repository.use_v3_api = false
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

    it 'should return the expected protocol version if backend switch is set to v2', ->
      calling_repository.calling_config {features: protocol_version_1to1: z.calling.enum.PROTOCOL.VERSION_2}

      calling_repository.use_v3_api = undefined
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

      calling_repository.use_v3_api = true
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_3
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

      calling_repository.use_v3_api = false
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

    it 'should return the expected protocol version if backend switch is set to v3', ->
      calling_repository.calling_config {features: protocol_version_1to1: z.calling.enum.PROTOCOL.VERSION_3}

      calling_repository.use_v3_api = undefined
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_3
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

      calling_repository.use_v3_api = true
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_3
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2

      calling_repository.use_v3_api = false
      expect(calling_repository.outgoing_protocol_version conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2
      expect(calling_repository.outgoing_protocol_version group_conversation_id).toBe z.calling.enum.PROTOCOL.VERSION_2
