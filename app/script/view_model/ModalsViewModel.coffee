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

z.ViewModel.ModalType =
  BLOCK: '.modal-block'
  CALLING: '.modal-calling'
  CALL_EMPTY_CONVERSATION: '.modal-call-conversation-empty'
  CALL_FULL_CONVERSATION: '.modal-call-conversation-full'
  CALL_FULL_VOICE_CHANNEL: '.modal-call-voice-channel-full'
  CALL_NO_VIDEO_IN_GROUP: '.modal-call-no-video-in-group'
  CALL_START_ANOTHER: '.modal-call-second'
  CLEAR: '.modal-clear'
  CLEAR_GROUP: '.modal-clear-group'
  CONNECTED_DEVICE: '.modal-connected-device'
  CONTACTS: '.modal-contacts'
  DELETE_ACCOUNT: '.modal-delete-account'
  DELETE_MESSAGE: '.modal-delete-message'
  DELETE_EVERYONE_MESSAGE: '.modal-delete-message-everyone'
  TOO_LONG_MESSAGE: '.modal-too-long-message'
  TOO_MANY_MEMBERS: '.modal-too-many-members'
  LEAVE: '.modal-leave'
  LOGOUT: '.modal-logout'
  NEW_DEVICE: '.modal-new-device'
  REMOVE_DEVICE: '.modal-remove-device'
  SESSION_RESET: '.modal-session-reset'
  UPLOAD_PARALLEL: '.modal-asset-upload-parallel'
  UPLOAD_TOO_LARGE: '.modal-asset-upload-too-large'


z.ViewModel.MODAL_CONSENT_TYPE =
  INCOMING_CALL: 'incoming_call'
  MESSAGE: 'message'
  OUTGOING_CALL: 'outgoing_call'


class z.ViewModel.ModalsViewModel
  constructor: (element_id) ->
    @logger = new z.util.Logger 'z.ViewModel.ModalsViewModel', z.config.LOGGER.OPTIONS

    @modals = {}

    amplify.subscribe z.event.WebApp.WARNING.MODAL, @show_modal

    ko.applyBindings @, document.getElementById element_id

  ###
  Show modal

  @param type [z.ViewModel.ModalType] Indicates which modal to show
  @param options [Object]
  @option data [Object] Content needed for visualization on modal
  @option action [Function] Function to be called when action in modal is triggered
  ###
  show_modal: (type, options = {}) =>
    message_element = $(type).find('.modal-text')
    title_element = $(type).find('.modal-title')
    action_element = $(type).find('.modal-action')
    switch type
      when z.ViewModel.ModalType.BLOCK
        @_show_modal_block options.data, title_element, message_element
      when z.ViewModel.ModalType.CALL_FULL_CONVERSATION
        @_show_modal_call_full_conversation options.data, message_element
      when z.ViewModel.ModalType.CALL_FULL_VOICE_CHANNEL
        @_show_modal_call_full_voice_channel options.data, message_element
      when z.ViewModel.ModalType.CALL_START_ANOTHER
        @_show_modal_call_start_another options.data, title_element, message_element
      when z.ViewModel.ModalType.CLEAR
        type = @_show_modal_clear options, type
      when z.ViewModel.ModalType.CONNECTED_DEVICE
        @_show_modal_connected_device options.data
      when z.ViewModel.ModalType.LEAVE
        @_show_modal_leave options.data, title_element
      when z.ViewModel.ModalType.NEW_DEVICE
        @_show_modal_new_device options.data, title_element, message_element, action_element
      when z.ViewModel.ModalType.REMOVE_DEVICE
        @_show_modal_remove_device options.data, title_element
      when z.ViewModel.ModalType.TOO_MANY_MEMBERS
        @_show_modal_too_many_members options.data, message_element
      when z.ViewModel.ModalType.UPLOAD_PARALLEL
        @_show_modal_upload_parallel options.data, title_element
      when z.ViewModel.ModalType.UPLOAD_TOO_LARGE
        @_show_modal_upload_too_large options.data, title_element
      when z.ViewModel.ModalType.TOO_LONG_MESSAGE
        @_show_modal_message_too_long options.data, message_element

    modal = new zeta.webapp.module.Modal type, null, ->
      $(type).find('.modal-close').off 'click'
      $(type).find('.modal-action').off 'click'
      $(type).find('.modal-secondary').off 'click'
      modal.destroy()
      options.close?()

    $(type).find('.modal-close').click ->
      modal.hide()

    $(type).find('.modal-secondary').click ->
      modal.hide -> options.secondary?()

    $(type).find('.modal-action').click ->
      if (checkbox = $(type).find('.modal-checkbox')).length
        options.action checkbox.is ':checked'
        checkbox.prop 'checked', false
      else if (input = $(type).find('.modal-input')).length
        options.action input.val()
        input.val ''
      else
        options.action?()
      modal.hide()

    @logger.info "Show modal of type '#{type}'" if not modal.is_shown()
    modal.toggle()

  _show_modal_block: (content, title_element, message_element) ->
    title_element.text z.localization.Localizer.get_text
      id: z.string.modal_block_conversation_headline
      replace:
        placeholder: '%@.name'
        content: content

    message_element.text z.localization.Localizer.get_text
      id: z.string.modal_block_conversation_message
      replace:
        placeholder: '%@.name'
        content: content

  _show_modal_call_full_conversation: (content, message_element) ->
    message_element.text z.localization.Localizer.get_text
      id: z.string.modal_call_conversation_full_message
      replace:
        placeholder: '%no'
        content: content

  _show_modal_call_full_voice_channel: (content, message_element) ->
    message_element.text z.localization.Localizer.get_text
      id: z.string.modal_call_voice_channel_full_message
      replace:
        placeholder: '%no'
        content: content

  ###
  @note Modal supports z.calling.enum.CALL_STATE.INCOMING, z.calling.enum.CALL_STATE.ONGOING, z.calling.enum.CALL_STATE.OUTGOING
  @param call_state [z.calling.enum.CALL_STATE] Current call state
  ###
  _show_modal_call_start_another: (call_state, title_element, message_element) ->
    action_element = $(z.ViewModel.ModalType.CALL_START_ANOTHER).find('.modal-action')

    action_element.text z.localization.Localizer.get_text z.string["modal_call_second_#{call_state}_action"]
    message_element.text z.localization.Localizer.get_text z.string["modal_call_second_#{call_state}_message"]
    title_element.text z.localization.Localizer.get_text z.string["modal_call_second_#{call_state}_headline"]

  _show_modal_clear: (options, type) ->
    if options.conversation.is_group() and not options.conversation.removed_from_conversation()
      type = z.ViewModel.ModalType.CLEAR_GROUP

    title_element = $(type).find('.modal-title')
    title_element.text z.localization.Localizer.get_text
      id: z.string.modal_clear_conversation_headline
      replace:
        placeholder: '%@.name'
        content: options.data

    return type

  _show_modal_connected_device: (devices) ->
    devices_element = $(z.ViewModel.ModalType.CONNECTED_DEVICE).find('.modal-connected-devices')
    devices_element.empty()
    for device in devices
      $('<div>')
        .text "#{moment(device.time).format 'MMMM Do YYYY, HH:mm'} - UTC"
        .appendTo devices_element
      $('<div>')
        .text "#{z.localization.Localizer.get_text z.string.modal_connected_device_from} #{device.model}"
        .appendTo devices_element

  _show_modal_leave: (content, title_element) ->
    title_element.text z.localization.Localizer.get_text
      id: z.string.modal_leave_conversation_headline
      replace:
        placeholder: '%@.name'
        content: content

  _show_modal_new_device: (content, title_element, message_element, action_element) ->
    joined_names = z.util.StringUtil.capitalize_first_char z.util.LocalizerUtil.join_names content.user_ets, z.string.Declension.NOMINATIVE
    string_id =
      if content.user_ets.length is 1
        if content.user_ets[0].is_me then z.string.modal_new_device_headline_you else z.string.modal_new_device_headline
      else
        z.string.modal_new_device_headline_many

    title_element.text z.localization.Localizer.get_text
      id: string_id
      replace:
        placeholder: if content.user_ets.length is 1 then '%@.name' else '%@.names'
        content: joined_names

    switch content.consent_type
      when z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL
        message_id = z.string.modal_new_device_call_incoming
        action_id = z.string.modal_new_device_call_accept
      when z.ViewModel.MODAL_CONSENT_TYPE.OUTGOING_CALL
        message_id = z.string.modal_new_device_call_outgoing
        action_id = z.string.modal_new_device_call_anyway
      else
        message_id = z.string.modal_new_device_message
        action_id = z.string.modal_new_device_send_anyway

    message_element.text z.localization.Localizer.get_text message_id
    action_element.text z.localization.Localizer.get_text action_id

  _show_modal_remove_device: (content, title_element) ->
    title_element.text z.localization.Localizer.get_text
      id: z.string.modal_remove_device_headline
      replace:
        placeholder: '%device_name'
        content: content

  _show_modal_too_many_members: (content, message_element) ->
    message_element.text z.localization.Localizer.get_text
      id: z.string.modal_too_many_members_message
      replace: [
        placeholder: '%no'
        content: content.open_spots
      ,
        placeholder: '%max'
        content: content.max
      ]

  _show_modal_upload_parallel: (content, title_element) ->
    title_element.text z.localization.Localizer.get_text
      id: z.string.modal_uploads_parallel
      replace:
        placeholder: '%no'
        content: content

  _show_modal_upload_too_large: (content, title_element) ->
    title_element.text z.localization.Localizer.get_text
      id: z.string.conversation_asset_upload_too_large
      replace:
        placeholder: '%no'
        content: content

  _show_modal_message_too_long: (content, message_element) ->
    message_element.text z.localization.Localizer.get_text
      id: z.string.modal_too_long_message
      replace:
        placeholder: '%no'
        content: content
