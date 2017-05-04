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

# grunt test_init && grunt test_run:entity/Conversation

describe 'Conversation', ->
  conversation_et = null
  self_user = new z.entity.User entities.user.john_doe.id
  self_user.is_me = true
  other_user = null

  beforeEach ->
    conversation_et = new z.entity.Conversation()
    other_user = new z.entity.User entities.user.jane_roe.id

  describe 'timestamp', ->

    it 'adding a message should update the conversation timestamp', ->
      message_et = new z.entity.Message()
      message_et.timestamp new Date('2014-12-15T09:21:14.225Z').getTime()
      conversation_et.last_event_timestamp new Date('2014-12-14T09:21:14.225Z').getTime()
      conversation_et.add_message message_et
      expect(conversation_et.last_event_timestamp()).toBe message_et.timestamp()

    it 'adding a message should not update the conversation timestamp if should_effect_conversation_timestamp is false', ->
      message_et = new z.entity.Message()
      message_et.timestamp new Date('2014-12-15T09:21:14.225Z').getTime()
      conversation_et.add_message message_et

      message_two_et = new z.entity.Message()
      message_two_et.timestamp new Date('2014-12-16T09:21:14.225Z').getTime()
      message_two_et.should_effect_conversation_timestamp = false
      conversation_et.add_message message_two_et
      expect(conversation_et.last_event_timestamp()).toBe message_et.timestamp()

  describe '_increment_time_only', ->
    first_date = new Date('2014-12-15T09:21:14.225Z').getTime()
    second_date = new Date('2014-12-15T09:22:14.225Z').getTime()

    it 'should update with newer timestamp', ->
      expect(conversation_et._increment_time_only first_date, second_date).toBe second_date

    it 'should not update with older timestamp', ->
      expect(conversation_et._increment_time_only second_date, first_date).toBeFalsy()

    it 'should not update with same timestamp', ->
      expect(conversation_et._increment_time_only first_date, first_date).toBeFalsy()

  describe 'is_archived', ->
    first_date = new Date('2014-12-15T09:21:14.225Z').getTime()
    second_date = new Date('2014-12-15T09:22:14.225Z').getTime()

    it 'is not archived when nothing is set', ->
      expect(conversation_et.is_archived()).toBeFalsy()

    it 'is archived when archived event is last event', ->
      conversation_et.archived_state true
      conversation_et.archived_timestamp first_date
      conversation_et.last_event_timestamp first_date
      expect(conversation_et.is_archived()).toBeTruthy()

    it 'is not archived when archived event is older then last event', ->
      conversation_et.archived_state true
      conversation_et.archived_timestamp first_date
      conversation_et.last_event_timestamp second_date
      expect(conversation_et.is_archived()).toBeFalsy()

    it 'is archived when archived event is older then last event but its muted', ->
      conversation_et.archived_state true
      conversation_et.archived_timestamp first_date
      conversation_et.last_event_timestamp second_date
      conversation_et.muted_timestamp first_date
      conversation_et.muted_state true
      expect(conversation_et.is_muted()).toBeTruthy()
      expect(conversation_et.is_archived()).toBeTruthy()

  describe 'is_verified', ->
    it 'is not verified when nothing is set', ->
      expect(conversation_et.is_verified()).toBeFalsy()

    it 'is verified when self user has no remote clients', ->
      verified_client_et = new z.client.Client()
      verified_client_et.meta.is_verified true

      self_user_et = new z.entity.User()
      self_user_et.is_me = true
      conversation_et.self = self_user_et

      user_et = new z.entity.User()
      user_et.devices.push verified_client_et
      conversation_et.participating_user_ets.push user_et

      expect(conversation_et.is_verified()).toBeTruthy()

    it 'is not verified when participant has unverified device', ->
      unverified_client_et = new z.client.Client()
      verified_client_et = new z.client.Client()
      verified_client_et.meta.is_verified true

      self_user_et = new z.entity.User()
      self_user_et.is_me = true
      self_user_et.devices.push verified_client_et
      conversation_et.self = self_user_et

      user_et = new z.entity.User()
      user_et.devices.push unverified_client_et
      user_et.devices.push verified_client_et

      user_et_two = new z.entity.User()
      user_et_two.devices.push verified_client_et

      conversation_et.participating_user_ets.push user_et, user_et_two

      expect(conversation_et.is_verified()).toBeFalsy()

    it 'is verified when all users are verified', ->
      verified_client_et = new z.client.Client()
      verified_client_et.meta.is_verified true

      self_user_et = new z.entity.User()
      self_user_et.is_me = true
      self_user_et.devices.push verified_client_et
      conversation_et.self = self_user_et

      user_et = new z.entity.User()
      user_et.devices.push verified_client_et
      user_et.devices.push verified_client_et

      user_et_two = new z.entity.User()
      user_et_two.devices.push verified_client_et

      conversation_et.participating_user_ets.push user_et, user_et_two

      expect(conversation_et.is_verified()).toBeTruthy()

  describe 'display_name', ->

    it 'displays a name if the conversation is a 1:1 conversation or a connection request', ->
      other_user.name entities.user.jane_roe.name
      conversation_et.participating_user_ets.push other_user
      conversation_et.type z.conversation.ConversationType.ONE2ONE
      expect(conversation_et.display_name()).toBe conversation_et.participating_user_ets()[0].name()

      conversation_et.type z.conversation.ConversationType.CONNECT
      expect(conversation_et.display_name()).toBe conversation_et.participating_user_ets()[0].name()

    it 'displays a fallback if no user name has been set', ->
      conversation_et.type z.conversation.ConversationType.ONE2ONE
      expect(conversation_et.display_name()).toBe '…'

      conversation_et.type z.conversation.ConversationType.CONNECT
      expect(conversation_et.display_name()).toBe '…'

    it 'displays a group conversation name with names from the participants', ->
      third_user = new z.entity.User z.util.create_random_uuid()
      third_user.name 'Brad Delson'
      other_user.name entities.user.jane_roe.name
      conversation_et.participating_user_ets.push other_user
      conversation_et.participating_user_ets.push third_user
      conversation_et.type z.conversation.ConversationType.REGULAR
      expected_display_name = "#{conversation_et.participating_user_ets()[0].first_name()}, #{conversation_et.participating_user_ets()[1].first_name()}"
      expect(conversation_et.display_name()).toBe expected_display_name

    it 'displays "Empty Conversation" if no other participants are in the conversation', ->
      conversation_et.type z.conversation.ConversationType.REGULAR
      expect(conversation_et.display_name()).toBe z.string.conversations_empty_conversation

    it 'displays a fallback if no user name has been set for a group conversation', ->
      user = new z.entity.User z.util.create_random_uuid()
      conversation_et.type z.conversation.ConversationType.REGULAR
      conversation_et.participating_user_ids.push other_user.id
      conversation_et.participating_user_ids.push user.id

      expect(conversation_et.display_name()).toBe '…'

    it 'displays the conversation name for a self conversation', ->
      conversation_et.type z.conversation.ConversationType.SELF
      expect(conversation_et.display_name()).toBe undefined

      conversation_name = 'My favorite music band'
      conversation_et.name conversation_name
      expect(conversation_et.display_name()).toBe conversation_name

  describe '_subscribe_to_states_updates', ->

    it 'creates subscribers to state updates', ->
      spyOn(conversation_et, '_subscribe_to_states_updates').and.callThrough()

      conversation_et._subscribe_to_states_updates()
      conversation_et.archived_state false
      conversation_et.cleared_timestamp 0
      conversation_et.last_event_timestamp 1467650148305
      conversation_et.last_read_timestamp 1467650148305
      conversation_et.muted_state false

      expect(conversation_et._subscribe_to_states_updates.calls.count()).toEqual(1)

  describe 'message sorting', ->

    reference_timestamp = Date.now()

    beforeEach ->
      message = new z.entity.Message()
      message.timestamp reference_timestamp
      conversation_et.add_message message

    it 'can add message with a newer timestamp', ->
      message_id = z.util.create_random_uuid()
      message = new z.entity.Message()
      message.id = message_id
      message.timestamp Date.now()
      conversation_et.add_message message
      expect(conversation_et.messages().length).toBe 2
      expect(conversation_et.get_last_message().id).toBe message_id

  describe 'add_messages', ->
    reference_timestamp = Date.now()

    message1 = new z.entity.Message()
    message1.id = z.util.create_random_uuid()
    message1.timestamp reference_timestamp - 10000
    message1.user self_user

    message2 = new z.entity.Message()
    message2.id = z.util.create_random_uuid()
    message2.timestamp reference_timestamp - 5000

    it 'adds many messages', ->
      message_ets = [message1, message2]
      conversation_et.add_messages message_ets

      expect(conversation_et.messages_unordered().length).toBe 2

    it 'detects duplicate messages', ->
      content = z.message.SuperType.CONTENT
      asset_meta = z.event.Client.CONVERSATION.ASSET_META

      message1.super_type = content
      message1.type = asset_meta

      message2.super_type = content
      message2.type = asset_meta
      message_ets = [message1, message2]
      conversation_et.add_messages message_ets

      expect(message2.visible()).toBe false
      expect(message1.visible()).toBe true

  describe 'message deletion', ->

    message_et = null

    beforeEach ->
      message_et = new z.entity.Message()
      message_et.id = z.util.create_random_uuid()
      conversation_et.add_message message_et

    afterEach ->
      conversation_et.remove_messages()

    it 'should remove message by id', ->
      expect(conversation_et.messages().length).toBe 1
      conversation_et.remove_message_by_id message_et.id
      expect(conversation_et.messages().length).toBe 0

    it 'should remove all message with the same id', ->
      duplicated_message_et = new z.entity.Message()
      duplicated_message_et.id = message_et.id
      conversation_et.add_message duplicated_message_et

      expect(conversation_et.messages().length).toBe 2
      conversation_et.remove_message_by_id message_et.id
      expect(conversation_et.messages().length).toBe 0

    it 'should remove message by message entity', ->
      expect(conversation_et.messages().length).toBe 1
      conversation_et.remove_message message_et
      expect(conversation_et.messages().length).toBe 0

    it 'should remove all messages', ->
      expect(conversation_et.messages().length).toBe 1
      conversation_et.remove_messages()
      expect(conversation_et.messages().length).toBe 0

  describe '_creation_message', ->
    beforeEach ->
      conversation_et.self = self_user
      conversation_et.participating_user_ets.push other_user

    it 'can create a message for an outgoing connection request', ->
      conversation_et.type z.conversation.ConversationType.CONNECT
      other_user.connection().status z.user.ConnectionStatus.SENT
      creation_message = conversation_et._creation_message()
      expect(creation_message).toBeDefined()
      expect(creation_message.member_message_type).toBe z.message.SystemMessageType.CONNECTION_REQUEST

    it 'can create a message for an accepted connection request', ->
      conversation_et.type z.conversation.ConversationType.ONE2ONE
      creation_message = conversation_et._creation_message()
      expect(creation_message).toBeDefined()
      expect(creation_message.member_message_type).toBe z.message.SystemMessageType.CONNECTION_ACCEPTED

    it 'can create a message for a group the user started', ->
      conversation_et.type z.conversation.ConversationType.REGULAR
      conversation_et.creator = self_user.id
      creation_message = conversation_et._creation_message()
      expect(creation_message).toBeDefined()
      expect(creation_message.member_message_type).toBe z.message.SystemMessageType.CONVERSATION_CREATE
      expect(creation_message.user().id).toBe self_user.id

    it 'can create a message for a group another user started', ->
      conversation_et.type z.conversation.ConversationType.REGULAR
      conversation_et.creator = other_user.id
      creation_message = conversation_et._creation_message()
      expect(creation_message).toBeDefined()
      expect(creation_message.member_message_type).toBe z.message.SystemMessageType.CONVERSATION_CREATE
      expect(creation_message.user().id).toBe other_user.id

    it 'can create a message for a group a user started that is no longer part of the group', ->
      conversation_et.type z.conversation.ConversationType.REGULAR
      conversation_et.creator = z.util.create_random_uuid
      creation_message = conversation_et._creation_message()
      expect(creation_message).toBeDefined()
      expect(creation_message.member_message_type).toBe z.message.SystemMessageType.CONVERSATION_RESUME
      expect(creation_message.user().id).toBe ''

    it 'returns undefined if there are no participating users', ->
      conversation_et.participating_user_ets []
      creation_message = conversation_et._creation_message()
      expect(creation_message).toBeUndefined()

  describe 'messages_visible', ->
    it 'returns no messages if conversation ID is empty', ->
      expect(conversation_et.id).toBe('')
      expect(conversation_et.messages_visible().length).toBe 0

    it 'creates a creation message and returns visible messages', ->
      conversation_et.self = self_user
      conversation_et.participating_user_ets.push other_user
      conversation_et.id = z.util.create_random_uuid()
      conversation_et.has_further_messages false

      expect(conversation_et.messages_visible().length).toBe 1
      expect(conversation_et.messages_visible()[0].super_type).toBe z.message.SuperType.MEMBER

      member_message = new z.entity.MemberMessage()
      member_message.super_type = z.message.SuperType.MEMBER

      conversation_et.add_message member_message

      expect(conversation_et.messages_visible().length).toBe 2
      expect(conversation_et.messages_visible()[0].super_type).toBe z.message.SuperType.MEMBER

    it 'returns visible unmerged pings', ->
      timestamp = Date.now()
      conversation_et.id = z.util.create_random_uuid()

      ping_message_1 = new z.entity.PingMessage()
      ping_message_1.timestamp timestamp - 4000
      ping_message_1.id = z.util.create_random_uuid()

      ping_message_2 = new z.entity.PingMessage()
      ping_message_2.timestamp timestamp - 2000
      ping_message_2.id = z.util.create_random_uuid()

      ping_message_3 = new z.entity.PingMessage()
      ping_message_3.timestamp timestamp
      ping_message_3.id = z.util.create_random_uuid()

      conversation_et.add_message ping_message_1
      conversation_et.add_message ping_message_2
      conversation_et.add_message ping_message_3

      expect(conversation_et.messages_unordered().length).toBe 3
      expect(conversation_et.messages().length).toBe 3
      expect(conversation_et.messages_visible().length).toBe 3

  describe 'last read', ->
    it 'should update last read if last message was send from self user', ->
      last_read_timestamp = new Date('December 24, 2000 18:00:00').getTime()
      last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime()

      conversation_et.last_read_timestamp last_read_timestamp

      message_et = new z.entity.Message()
      message_et.user self_user
      message_et.timestamp last_message_timestamp
      message_et.id = z.util.create_random_uuid()

      expect(conversation_et.last_read_timestamp()).toBe last_read_timestamp
      conversation_et.add_message message_et
      expect(conversation_et.last_read_timestamp()).toBe last_message_timestamp

    it 'should not update last read if last message was not send from self user', ->
      last_read_timestamp = new Date('December 24, 2000 18:00:00').getTime()
      last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime()

      conversation_et.last_read_timestamp last_read_timestamp

      message_et = new z.entity.Message()
      message_et.timestamp last_message_timestamp
      message_et.id = z.util.create_random_uuid()

      expect(conversation_et.last_read_timestamp()).toBe last_read_timestamp
      conversation_et.add_message message_et
      expect(conversation_et.last_read_timestamp()).toBe last_read_timestamp

  describe 'release', ->

    it 'should not release messages if conversation has unread messages', ->
      last_read_timestamp = new Date('December 24, 2000 18:00:00').getTime()
      last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime()

      conversation_et.last_read_timestamp last_read_timestamp

      message_et = new z.entity.PingMessage()
      message_et.timestamp last_message_timestamp
      message_et.id = z.util.create_random_uuid()
      conversation_et.add_message message_et

      expect(conversation_et.messages().length).toBe 1
      expect(conversation_et.unread_event_count()).toBe 1
      conversation_et.release()
      expect(conversation_et.messages().length).toBe 1
      expect(conversation_et.unread_event_count()).toBe 1

    it 'should release messages if conversation has no unread messages', ->
      last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime()

      message_et = new z.entity.Message()
      message_et.timestamp last_message_timestamp
      message_et.id = z.util.create_random_uuid()
      conversation_et.add_message message_et

      conversation_et.last_read_timestamp last_message_timestamp

      expect(conversation_et.unread_event_count()).toBe 0
      expect(conversation_et.messages().length).toBe 1
      conversation_et.release()
      expect(conversation_et.messages().length).toBe 0
      expect(conversation_et.is_loaded()).toBeFalsy()
      expect(conversation_et.has_further_messages()).toBeTruthy()

  describe '_check_for_duplicate_nonce', ->

    it 'should hide newer duplicated audio asset', ->
      older_timestamp = new Date('December 24, 2000 18:00:00').getTime()
      newer_timestamp = new Date('December 24, 2000 18:01:00').getTime()

      asset_et = new z.entity.File z.util.create_random_uuid()
      asset_et.file_size = 'audio/mp4'

      older_message_et = new z.entity.ContentMessage()
      older_message_et.timestamp older_timestamp
      older_message_et.id = z.util.create_random_uuid()
      older_message_et.nonce = z.util.create_random_uuid()
      older_message_et.type = z.event.Client.CONVERSATION.ASSET_META
      older_message_et.add_asset asset_et

      newer_message_et = new z.entity.ContentMessage()
      newer_message_et.timestamp newer_timestamp
      newer_message_et.id = older_message_et.id
      newer_message_et.nonce = older_message_et.nonce
      newer_message_et.type = z.event.Client.CONVERSATION.ASSET_META
      newer_message_et.add_asset asset_et

      conversation_et._check_for_duplicate_nonce older_message_et, newer_message_et

      expect(older_message_et.visible()).toBeTruthy()
      expect(newer_message_et.visible()).toBeFalsy()

  describe 'is_with_bot', ->
    it 'detects bot conversations by the username of the remote participant', ->
      user_et = new z.entity.User z.util.create_random_uuid()

      conversation_et = new z.entity.Conversation z.util.create_random_uuid()
      conversation_et.participating_user_ets.push user_et

      user_et.username 'ottothebot'
      conversation_et.type z.conversation.ConversationType.SELF
      expect(conversation_et.is_with_bot()).toBe false

      conversation_et.type z.conversation.ConversationType.ONE2ONE
      expect(conversation_et.is_with_bot()).toBe true

      user_et.username 'annathebot'
      expect(conversation_et.is_with_bot()).toBe true

      user_et.username undefined
      expect(conversation_et.is_with_bot()).toBe false

      user_et.username ''
      expect(conversation_et.is_with_bot()).toBe false

      user_et.username 'bob'
      expect(conversation_et.is_with_bot()).toBe false

      user_et.username 'bobthebot'
      expect(conversation_et.is_with_bot()).toBe false

      user_et.username 'bot'
      expect(conversation_et.is_with_bot()).toBe false

      user_et.username 'wire'
      expect(conversation_et.is_with_bot()).toBe false

  describe 'get_last_editable_message', ->

    self_user_et = undefined

    beforeEach ->
      self_user_et = new z.entity.User()
      self_user_et.is_me = true

    afterEach ->
      conversation_et.remove_messages()

    it 'returns undefined if conversation has no messages', ->
      expect(conversation_et.get_last_editable_message()).not.toBeDefined()

    it 'returns undefined if last message is not text and not added by self user', ->
      message_et = new z.entity.PingMessage()
      message_et.id = z.util.create_random_uuid()
      message_et.user new z.entity.User()
      conversation_et.add_message message_et
      expect(conversation_et.get_last_editable_message()).not.toBeDefined()

    it 'returns undefined if last message is not text and not added by self user', ->
      message_et = new z.entity.PingMessage()
      message_et.id = z.util.create_random_uuid()
      message_et.user new z.entity.User()
      conversation_et.add_message message_et
      expect(conversation_et.get_last_editable_message()).not.toBeDefined()

    it 'returns undefined if last message is text and not send by self user', ->
      message_et = new z.entity.ContentMessage()
      message_et.add_asset new z.entity.Text()
      message_et.id = z.util.create_random_uuid()
      message_et.user new z.entity.User()
      conversation_et.add_message message_et
      expect(conversation_et.get_last_editable_message()).not.toBeDefined()

    it 'returns message if last message is text and send by self user', ->
      message_et = new z.entity.ContentMessage()
      message_et.add_asset new z.entity.Text()
      message_et.id = z.util.create_random_uuid()
      message_et.user self_user_et
      conversation_et.add_message message_et
      expect(conversation_et.get_last_editable_message()).toBeDefined()

    it 'returns message if last message is text and send by self user', ->
      message_et = new z.entity.ContentMessage()
      message_et.add_asset new z.entity.Text()
      message_et.id = z.util.create_random_uuid()
      message_et.user self_user_et
      conversation_et.add_message message_et

      ping_message_et = new z.entity.PingMessage()
      ping_message_et.id = z.util.create_random_uuid()
      ping_message_et.user new z.entity.User()
      conversation_et.add_message ping_message_et

      expect(conversation_et.get_last_editable_message()).toBeDefined()
      expect(conversation_et.get_last_editable_message().id).toBe message_et.id

    it 'returns message if last message is text and send by self user', ->
      message_et = new z.entity.ContentMessage()
      message_et.add_asset new z.entity.Text()
      message_et.id = z.util.create_random_uuid()
      message_et.user self_user_et
      conversation_et.add_message message_et

      next_message_et = new z.entity.ContentMessage()
      next_message_et.add_asset new z.entity.Text()
      next_message_et.id = z.util.create_random_uuid()
      next_message_et.user self_user_et
      conversation_et.add_message next_message_et

      expect(conversation_et.get_last_editable_message()).toBeDefined()
      expect(conversation_et.get_last_editable_message().id).toBe next_message_et.id

    it 'returns message if last message is text and ephemeral', ->
      message_et = new z.entity.ContentMessage()
      message_et.add_asset new z.entity.Text()
      message_et.id = z.util.create_random_uuid()
      message_et.user self_user_et
      conversation_et.add_message message_et

      ephemeral_message_et = new z.entity.ContentMessage()
      ephemeral_message_et.add_asset new z.entity.Text()
      ephemeral_message_et.id = z.util.create_random_uuid()
      ephemeral_message_et.user self_user_et
      ephemeral_message_et.ephemeral_expires true
      conversation_et.add_message ephemeral_message_et

      expect(conversation_et.get_last_editable_message()).toBeDefined()
      expect(conversation_et.get_last_editable_message().id).toBe message_et.id

  describe 'get_last_delivered_message', ->

    it 'returns undefined if conversation has no messages', ->
      expect(conversation_et.get_last_delivered_message()).not.toBeDefined()

    it 'returns last delivered message', ->
      sent_message_et = new z.entity.ContentMessage()
      sent_message_et.id = z.util.create_random_uuid()
      sent_message_et.status z.message.StatusType.SENT
      conversation_et.add_message sent_message_et
      expect(conversation_et.get_last_delivered_message()).not.toBeDefined()

      delivered_message_et = new z.entity.ContentMessage()
      delivered_message_et.id = z.util.create_random_uuid()
      delivered_message_et.status z.message.StatusType.DELIVERED
      conversation_et.add_message delivered_message_et
      expect(conversation_et.get_last_delivered_message()).toBe delivered_message_et

      next_sent_message_et = new z.entity.ContentMessage()
      next_sent_message_et.id = z.util.create_random_uuid()
      next_sent_message_et.status z.message.StatusType.SENT
      conversation_et.add_message next_sent_message_et
      expect(conversation_et.get_last_delivered_message()).toBe delivered_message_et

      next_delivered_message_et = new z.entity.ContentMessage()
      next_delivered_message_et.id = z.util.create_random_uuid()
      next_delivered_message_et.status z.message.StatusType.DELIVERED
      conversation_et.add_message next_delivered_message_et
      expect(conversation_et.get_last_delivered_message()).toBe next_delivered_message_et

  describe 'set_timestamp', ->
    it 'turns strings into numbers', ->
      lrt = conversation_et.last_read_timestamp()
      expect(lrt).toBe 0
      new_lrt_string = '1480338525243'
      new_lrt_number = window.parseInt new_lrt_string, 10
      conversation_et.set_timestamp new_lrt_string, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP
      expect(conversation_et.last_read_timestamp()).toBe new_lrt_number

