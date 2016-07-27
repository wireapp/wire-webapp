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

# grunt test_init && grunt test_run:util/DebugUtil

describe 'z.util.DebugUtil', ->
  debug_util = null
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeConversationActors()
    .then (conversation_repository) ->
      debug_util = new z.util.DebugUtil window.user_repository, conversation_repository
      done()
    .catch done.fail

  describe 'get_event_info', ->
    it 'resolves entities used in an event', (done) ->
      #@formatter:off
      event = {"conversation":"c44055e1-22db-40ec-9d64-17bed60899ca","time":"2016-06-13T15:17:09.378Z","data":{"text":"owABAaEAWCDb7YZ+fBvqad62i2jKdKOMvAzFMaL0uP7zIL1wVFIqqgJYwAKkABn//wGhAFggvdj9J7qxVWzYNMdjSVZ4KXC0Dw82xDn+/w4RV+R4PyoCoQChAFggFKfcdRCB3aR0IdJWlMVQAVkrUBOR9Wut3SBABNGKccEDpQBQ/pr1FQzlVt3ry1k7y3XmAgEDAgADoQBYICNJWY9nrldHZWnqIMzGFFW2WhSOxSgCDH35fNeFr8cEBFguliOs/jCjfDskzztIjbNXHdx0fhfMr7EE/8Dh4KTrm4+eDGXSCqfk3yjTNn/IEA==","sender":"118ed890d2a6f83","recipient":"d15b2781562b2c6e"},"from":"39b7f597-dfd1-4dff-86f5-fe1b79cb70a0","type":"conversation.otr-message-add"}
      #@formatter:on
      conversation_et = new z.entity.Conversation 'c44055e1-22db-40ec-9d64-17bed60899ca'
      conversation_et.name 'Tomb Raider Fans'
      conversation_repository.save_conversation conversation_et

      user_et = new z.entity.User '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0'
      user_et.name 'Lara Croft'
      user_repository.save_user user_et

      debug_util.get_event_info event
      .then (debug_information) ->
        expect(debug_information.conversation.id).toBe conversation_et.id
        expect(debug_information.event.time).toBe event.time
        expect(debug_information.user.id).toBe user_et.id
        done()
      .catch done.fail

  describe 'get_amount_of_clients_in_conversation', ->

    it 'gets the amount of all clients in the current conversation (including own clients)', ->
      conversation_repository = debug_util.conversation_repository

      first_client = new z.client.Client()
      first_client.id = '5021d77752286cac'

      second_client = new z.client.Client()
      second_client.id = '575b7a890cdb7635'

      third_client = new z.client.Client()
      third_client.id = '6c0daa855d6b8b6e'

      user_et = new z.entity.User()
      user_et.devices.push first_client
      user_et.devices.push second_client

      second_user_et = new z.entity.User()
      second_user_et.devices.push third_client

      conversation_et = conversation_repository.conversation_mapper.map_conversation entities.conversation
      conversation_et.participating_user_ets.push user_et
      conversation_et.participating_user_ets.push second_user_et

      conversation_repository.conversations.push conversation_et
      conversation_repository.active_conversation conversation_et

      amount = debug_util.get_amount_of_clients_in_conversation()
      expect(amount).toBe 4

