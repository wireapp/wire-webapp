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

  conversation_ab = undefined
  conversation_b = undefined
  conversation_c = undefined

  user_self = undefined
  user_a = undefined
  user_b = undefined

  client_a = undefined
  client_b = undefined

  beforeEach (done) ->
    test_factory.exposeConversationActors()
    .then (_conversation_repository) ->
      conversation_repository = _conversation_repository
      state_handler = new z.conversation.ConversationVerificationStateHandler conversation_repository

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
      conversation_ab.verification_state z.conversation.ConversationVerificationState.VERIFIED
      conversation_b.self = user_self
      conversation_b.participating_user_ids.push user_b.id
      conversation_b.verification_state z.conversation.ConversationVerificationState.VERIFIED
      conversation_b.participating_user_ets.push user_b
      conversation_c.self = user_self
      conversation_c.verification_state z.conversation.ConversationVerificationState.VERIFIED

      conversation_repository.conversations.removeAll()
      Promise.all [
        conversation_repository.save_conversation conversation_ab
        conversation_repository.save_conversation conversation_b
        conversation_repository.save_conversation conversation_c
      ]
    .then done
    .catch done.fail

  describe 'on_client_add', ->
    it 'should change state to DEGRADED if new unverified client was added', ->
      spyOn z.conversation.EventBuilder, 'build_degraded'

      new_client_b = new z.client.Client()
      new_client_b.meta.is_verified false
      user_b.devices.push new_client_b

      state_handler.on_client_add user_b.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_ab.is_verified()).toBeFalsy()
      expect(z.conversation.EventBuilder.build_degraded.calls.count()).toEqual 2

    it 'should not change VERIFIED state if new verified client was added', ->
      spyOn z.conversation.EventBuilder, 'build_all_verified'

      new_client_b = new z.client.Client()
      new_client_b.meta.is_verified true
      user_b.devices.push new_client_b

      state_handler.on_client_add user_b.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_ab.is_verified()).toBeTruthy()
      expect(z.conversation.EventBuilder.build_all_verified).not.toHaveBeenCalled()

  describe 'on_client_removed', ->
    it 'should change state from DEGRADED to VERIFIED if last unverified client was removed', ->
      spyOn z.conversation.EventBuilder, 'build_degraded'
      spyOn z.conversation.EventBuilder, 'build_all_verified'

      new_client = new z.client.Client()
      new_client.meta.is_verified false
      user_self.devices.push new_client

      state_handler.on_client_add user_self.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_c.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(z.conversation.EventBuilder.build_degraded.calls.count()).toEqual 3

      user_self.devices.remove new_client
      state_handler.on_client_removed user_self.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_c.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(z.conversation.EventBuilder.build_all_verified.calls.count()).toEqual 3

  describe 'on_clients_updated', ->
    it 'should change state from DEGRADED to VERIFIED if last unverified client was removed by other user', ->
      spyOn z.conversation.EventBuilder, 'build_degraded'
      spyOn z.conversation.EventBuilder, 'build_all_verified'

      new_client = new z.client.Client()
      new_client.meta.is_verified false
      user_self.devices.push new_client

      state_handler.on_client_add user_self.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_c.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(z.conversation.EventBuilder.build_degraded.calls.count()).toEqual 3

      user_self.devices.remove new_client
      state_handler.on_clients_updated user_self.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_c.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(z.conversation.EventBuilder.build_all_verified.calls.count()).toEqual 3

  describe 'on_member_joined', ->
    it 'should change state to DEGRADED if new user with unverified client was added to conversation', ->
      spyOn z.conversation.EventBuilder, 'build_degraded'

      new_user = new z.entity.User z.util.create_random_uuid()
      new_client_b = new z.client.Client()
      new_client_b.meta.is_verified false
      new_user.devices.push new_client_b

      conversation_ab.participating_user_ids.push new_user.id
      conversation_ab.participating_user_ets.push new_user

      state_handler.on_member_joined conversation_ab, new_user.id

      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_ab.is_verified()).toBeFalsy()
      expect(z.conversation.EventBuilder.build_degraded.calls.count()).toEqual 1

    it 'should not change state if new user with verified client was added to conversation', ->
      spyOn z.conversation.EventBuilder, 'build_degraded'

      new_user = new z.entity.User z.util.create_random_uuid()
      new_client_b = new z.client.Client()
      new_client_b.meta.is_verified true
      new_user.devices.push new_client_b

      conversation_ab.participating_user_ids.push new_user.id
      conversation_ab.participating_user_ets.push new_user

      state_handler.on_member_joined conversation_ab, new_user.id

      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_ab.is_verified()).toBeTruthy()
      expect(z.conversation.EventBuilder.build_degraded).not.toHaveBeenCalled()

  describe 'on_client_verification_changed', ->
    it 'should change state to DEGRADED if user unverified client', ->
      client_a.meta.is_verified false

      state_handler.on_client_verification_changed user_a.id, client_a.id
      expect(conversation_ab.verification_state()).toBe z.conversation.ConversationVerificationState.DEGRADED
      expect(conversation_b.verification_state()).toBe z.conversation.ConversationVerificationState.VERIFIED
      expect(conversation_ab.is_verified()).toBeFalsy()
