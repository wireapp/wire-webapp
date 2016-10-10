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
z.ViewModel ?= {}

# participants view state
STATE =
  PARTICIPANTS: 'participants'
  SEARCH: 'search'

class z.ViewModel.ParticipantsViewModel
  constructor: (@element_id, @user_repository, @conversation_repository, @search_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ParticipantsViewModel', z.config.LOGGER.OPTIONS

    @state = ko.observable STATE.PARTICIPANTS

    @conversation = ko.observable new z.entity.Conversation()
    @conversation.subscribe => @render_participants false

    @render_participants = ko.observable false

    @participants = ko.observableArray()
    @participants_verified = ko.observableArray()
    @participants_unverified = ko.observableArray()

    ko.computed =>
      conversation_et = @conversation()
      participants = [].concat conversation_et.participating_user_ets()
      participants.sort z.util.sort_user_by_first_name

      @participants participants
      @participants_verified (user_et for user_et in participants when user_et.is_verified())
      @participants_unverified (user_et for user_et in participants when not user_et.is_verified())

    # confirm dialog reference
    @confirm_dialog = undefined

    # selected group user
    @user_profile = ko.observable new z.entity.User()

    # switch between div and input field to edit the conversation name
    @editing = ko.observable false
    @edit = -> @editing true

    @editing.subscribe (value) =>
      if value is false
        name = $('.group-header .name span')
        $('.group-header textarea').css('height', "#{name.height()}px")
      else
        $('.group-header textarea').val(@conversation().display_name())

    @participants_bubble = new zeta.webapp.module.Bubble
      host_selector: '#show-participants'
      scroll_selector: '.messages-wrap'
      modal: true
      on_hide: => @reset_view()

    # TODO create a viewmodel search?
    @user_input = ko.observable ''
    @user_selected = ko.observableArray []
    @connected_users = ko.pureComputed =>
      connected_users = ko.utils.arrayFilter @user_repository.users(), (user_et) =>
        is_participant = ko.utils.arrayFirst @participants(), (participant) -> user_et.id is participant.id
        is_connected = user_et.connection().status() is z.user.ConnectionStatus.ACCEPTED
        return is_participant is null and is_connected
      connected_users.sort z.util.sort_user_by_first_name
    , @, deferEvaluation: true

    @add_people_tooltip = z.localization.Localizer.get_text {
      id: z.string.tooltip_people_add
      replace: {placeholder: '%shortcut', content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.ADD_PEOPLE}
    }

    amplify.subscribe z.event.WebApp.CONTENT.SWITCH, (content_state) =>
      @participants_bubble.hide() if content_state is z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS

    amplify.subscribe z.event.WebApp.PEOPLE.SHOW, (user_et) =>
      @user_profile user_et
      $("##{@element_id}").addClass 'single-user-mode'

  toggle_participants_bubble: (add_people = false) =>
    toggle_bubble = =>
      if not @participants_bubble.is_visible()
        @reset_view()

        if @conversation().is_group()
          @user_profile new z.entity.User()
        else
          @user_profile @participants()[0]

        @render_participants true
        $("##{@element_id}").removeClass 'single-user-mode'

      if add_people
        if not @participants_bubble.is_visible()
          @participants_bubble.show()
          @add_people()
        else if @state() is STATE.SEARCH or @confirm_dialog?.is_visible()
          @participants_bubble.hide()
        else
          @add_people()
      else
        @participants_bubble.toggle()

    if wire.app.view.content.message_list.participant_bubble?.is_visible()
      setTimeout ->
        toggle_bubble()
      , 550
    else
      toggle_bubble()

  change_conversation: (conversation_et) ->
    @participants_bubble.hide()
    @conversation conversation_et
    @user_profile new z.entity.User()

  reset_view: =>
    @state STATE.PARTICIPANTS
    @user_selected.removeAll()
    @confirm_dialog?.destroy()
    $("##{@element_id}").removeClass 'single-user-mode'

  add_people: =>
    @state STATE.SEARCH
    $('.participants-search').addClass 'participants-search-show'

  leave_conversation: =>
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    @confirm_dialog = $('#participants').confirm
      template: '#template-confirm-leave'
      confirm: =>
        next_conversation_et = @conversation_repository.get_next_conversation @conversation()
        @participants_bubble.hide()
        @conversation_repository.leave_conversation @conversation(), next_conversation_et

  show_participant: (user_et) =>
    @user_profile user_et

  rename_conversation: (data, event) =>
    new_name = z.util.remove_line_breaks event.target.value.trim()
    old_name = @conversation().display_name().trim()
    event.target.value = old_name
    @editing false
    if new_name.length > 0 and new_name isnt old_name
      @conversation_repository.rename_conversation @conversation(), new_name

  on_search_add: =>
    user_ids = ko.utils.arrayMap @user_selected(), (user_et) -> user_et.id
    @participants_bubble.hide()

    if @conversation().is_group()
      @conversation_repository.add_members @conversation(), user_ids, =>
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.ADD_TO_GROUP_CONVERSATION,
          {numberOfParticipantsAdded: user_ids.length, numberOfGroupParticipants: @conversation().number_of_participants()}
    else
      user_ids = user_ids.concat @user_profile().id
      @conversation_repository.create_new_conversation user_ids, null, (conversation_et) ->
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CREATE_GROUP_CONVERSATION,
          {creationContext: 'addedToOneToOne', numberOfParticipants: user_ids.length}
        amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et

  on_search_close: =>
    @reset_view()

  close: =>
    @user_profile new z.entity.User()
    @reset_view()

  remove: (user_et) =>
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    @confirm_dialog = $('#participants').confirm
      template: '#template-confirm-remove'
      data:
        user: user_et
      confirm: =>
        @conversation_repository.remove_member @conversation(), user_et.id, (response) =>
          @reset_view() if response

  show_account: ->
    amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT

  unblock: (user_et) =>
    @confirm_dialog = $('#participants').confirm
      template: '#template-confirm-unblock'
      data:
        user: user_et
      confirm: =>
        @user_repository.unblock_user user_et
        .then =>
          @participants_bubble.hide()
          conversation_et = @conversation_repository.get_one_to_one_conversation user_et.id
          @conversation_repository.update_participating_user_ets conversation_et

  block: (user_et) =>
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    @confirm_dialog = $('#participants').confirm
      template: '#template-confirm-block'
      data:
        user: user_et
      confirm: =>
        next_conversation_et = @conversation_repository.get_next_conversation @conversation()
        @participants_bubble.hide()
        @user_repository.block_user user_et
        .then =>
          amplify.publish z.event.WebApp.CONVERSATION.SWITCH, @conversation(), next_conversation_et

  connect: (user_et) =>
    @participants_bubble.hide()

  pending: (user_et) =>
    on_success = => @participants_bubble.hide()

    @confirm_dialog = $('#participants').confirm
      template: '#template-confirm-connect'
      data:
        user: @user_profile()
      confirm: =>
        @user_repository.accept_connection_request user_et, true
        .then -> on_success()
      cancel: =>
        @user_repository.ignore_connection_request user_et
        .then -> on_success()
