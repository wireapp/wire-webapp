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

# grunt test_init && grunt test_run:conversation/ConversationVerificationStateHandler
#@formatter:off
describe 'z.conversation.ConversationVerificationStateHandler', ->
  test_factory = new TestFactory()
  state_handler = undefined
  conversation_repository = undefined

  beforeEach (done) ->
    test_factory.exposeConversationActors()
    .then (_conversation_repository) ->
      conversation_repository = _conversation_repository
      state_handler = new z.conversation.ConversationVerificationStateHandler conversation_repository
      done()
    .catch(done.fail)

  describe 'on_client_add', ->

    conversation_ab = undefined
    conversation_b = undefined
    conversation_c = undefined

    user_self = undefined
    user_a = undefined
    user_b = undefined

    beforeEach ->
      conversation_ab = new z.entity.Conversation z.util.create_random_uuid()
      conversation_b = new z.entity.Conversation z.util.create_random_uuid()
      conversation_c = new z.entity.Conversation z.util.create_random_uuid()

      user_self = new z.entity.User z.util.create_random_uuid()
      user_self.is_me = true

      user_a = new z.entity.User z.util.create_random_uuid()
      user_b = new z.entity.User z.util.create_random_uuid()

      client_a = new z.client.Client()
      client_a.meta.is_verified true
      user_a.devices.push client_a

      client_b = new z.client.Client()
      client_b.meta.is_verified true
      user_b.devices.push client_b

      conversation_ab.self = user_self
      conversation_ab.participating_user_ids.push user_a.id, user_b.id
      conversation_ab.participating_user_ets.push user_a, user_b
      conversation_b.self = user_self
      conversation_b.participating_user_ids.push user_b.id
      conversation_b.participating_user_ets.push user_b
      conversation_c.self = user_self

      conversation_repository.conversations []
      conversation_repository.save_conversation conversation_ab
      conversation_repository.save_conversation conversation_b
      conversation_repository.save_conversation conversation_c

    it 'should add a new device message in all needed conversation', ->
      spyOn z.conversation.EventBuilder, 'build_new_device'

      expect(conversation_ab.is_verified()).toBeTruthy()
      expect(conversation_b.is_verified()).toBeTruthy()

      new_client_b = new z.client.Client()
      new_client_b.meta.is_verified false
      user_b.devices.push new_client_b

      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED

      conversation_repository.on_client_add user_b.id
      expect(conversation_ab.is_verified()).toBeFalsy()
      expect(z.conversation.EventBuilder.build_new_device.calls.count()).toEqual 2
