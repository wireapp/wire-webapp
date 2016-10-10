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

window.z ?= {}
z.entity ?= {}

###
Member message entity based on z.entity.SystemMessage.

@todo Refactor for a proper SystemMessage entities
###
class z.entity.MemberMessage extends z.entity.SystemMessage
  # Construct a new member message.
  constructor: ->
    super()
    @super_type = z.message.SuperType.MEMBER
    @member_message_type = z.message.SystemMessageType.NORMAL

    @user_ets = ko.observableArray()
    @user_ids = ko.observableArray()

    # Users joined the conversation without sender
    @joined_user_ets = ko.pureComputed =>
      return (user_et for user_et in @user_ets() when user_et.id isnt @user().id)

    # Users joined the conversation without self
    @remote_user_ets = ko.pureComputed =>
      return (user_et for user_et in @user_ets() when not user_et.is_me)

    @_generate_name_string = (declension = z.string.Declension.ACCUSATIVE) =>
      names_string = (z.util.get_first_name user_et, declension for user_et in @joined_user_ets()).join ', '
      return names_string.replace /,(?=[^,]*$)/, " #{z.localization.Localizer.get_text z.string.and}"

    @_get_caption_connection = (connection_status) ->
      switch connection_status
        when z.user.ConnectionStatus.BLOCKED
          identifier = z.string.conversation_connection_blocked
        when z.user.ConnectionStatus.SENT then return ''
        else
          identifier = z.string.conversation_connection_accepted
      return z.localization.Localizer.get_text identifier

    @_get_caption_with_names = (key, declension) =>
      return z.localization.Localizer.get_text {
        id: key
        replace: {placeholder: '%@names', content: @_generate_name_string declension}
      }

    @show_large_avatar = =>
      large_avatar_types = [
        z.message.SystemMessageType.CONNECTION_ACCEPTED
        z.message.SystemMessageType.CONNECTION_REQUEST
      ]
      return @member_message_type in large_avatar_types

    @other_user = ko.pureComputed =>
      if @user_ets().length is 1 then @user_ets()[0] else new z.entity.User()

    @caption = ko.pureComputed =>
      return '' if @user_ets().length is 0

      switch @member_message_type
        when z.message.SystemMessageType.CONNECTION_ACCEPTED, z.message.SystemMessageType.CONNECTION_REQUEST
          return @_get_caption_connection @other_user().connection().status()
        when z.message.SystemMessageType.CONVERSATION_CREATE
          return @_get_caption_with_names z.string.conversation_create_you if @user().is_me
          return @_get_caption_with_names z.string.conversation_create, z.string.Declension.DATIVE
        when z.message.SystemMessageType.CONVERSATION_RESUME
          return @_get_caption_with_names z.string.conversation_resume, z.string.Declension.DATIVE

      switch @type
        when z.event.Backend.CONVERSATION.MEMBER_LEAVE
          if @other_user().id is @user().id
            return z.localization.Localizer.get_text z.string.conversation_member_leave_left_you if @user().is_me
            return z.localization.Localizer.get_text z.string.conversation_member_leave_left
          return @_get_caption_with_names z.string.conversation_member_leave_removed_you if @user().is_me
          return @_get_caption_with_names z.string.conversation_member_leave_removed
        when z.event.Backend.CONVERSATION.MEMBER_JOIN
          return @_get_caption_with_names z.string.conversation_member_join_you if @user().is_me
          return @_get_caption_with_names z.string.conversation_member_join

    , @, deferEvaluation: true

  is_connection: =>
    return @member_message_type in [
        z.message.SystemMessageType.CONNECTION_ACCEPTED
        z.message.SystemMessageType.CONNECTION_REQUEST
    ]

  is_creation: =>
    return @member_message_type in [
      z.message.SystemMessageType.CONNECTION_ACCEPTED
      z.message.SystemMessageType.CONNECTION_REQUEST
      z.message.SystemMessageType.CONVERSATION_CREATE
      z.message.SystemMessageType.CONVERSATION_RESUME
    ]
