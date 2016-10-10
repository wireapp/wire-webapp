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
z.ViewModel.list ?= {}


class z.ViewModel.list.ListViewModel
  ###
  @param element_id [String] HTML selector
  @param content_view_model [z.ViewModel.ContentViewModel] Content view model
  @param call_center [z.calling.CallCenter] Call center
  @param connect_repository [z.connect.ConnectRepository] Connect repository
  @param conversation_repository [z.conversation.ConversationRepository] Conversation repository
  @param search_repository [z.search.SearchRepository] Search repository
  @param user_repository [z.user.UserRepository] User repository
  ###
  constructor: (element_id, @content_view_model, @call_center, @connect_repository, @conversation_repository, @search_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.list.ListViewModel', z.config.LOGGER.OPTIONS

    # state
    @list_state = ko.observable z.ViewModel.list.LIST_STATE.CONVERSATIONS
    @last_update = ko.observable()
    @webapp_loaded = ko.observable false

    # nested view models
    @archive       = new z.ViewModel.list.ArchiveViewModel 'archive', @, @conversation_repository
    @conversations = new z.ViewModel.list.ConversationListViewModel 'conversations', @, @content_view_model, @call_center, @conversation_repository, @user_repository
    @preferences   = new z.ViewModel.list.PreferencesListViewModel 'preferences', @, @content_view_model
    @start_ui      = new z.ViewModel.list.StartUIViewModel 'start-ui', @, @connect_repository, @conversation_repository, @search_repository, @user_repository

    @actions       = new z.ViewModel.list.ActionsViewModel 'actions-bubble', @, @conversations, @conversation_repository, @user_repository

    @self_user = ko.pureComputed => @user_repository.self()?.picture_medium_url() if @webapp_loaded()

    @_init_subscriptions()

    ko.applyBindings @, document.getElementById element_id


  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.LOADED, => @webapp_loaded true
    amplify.subscribe z.event.WebApp.PROFILE.SETTINGS.SHOW, @open_device_management
    amplify.subscribe z.event.WebApp.PREFERENCES.MANAGE_DEVICES, @open_device_management

  open_device_management: (device_et) =>
    @switch_list z.ViewModel.list.LIST_STATE.PREFERENCES
    if device_et
      @content_view_model.preferences_device_details.selected_device device_et
      @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS
    else
      @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT

  open_start_ui: =>
    @switch_list z.ViewModel.list.LIST_STATE.START_UI

  switch_list: (new_list_state) =>
    return if @list_state() is new_list_state

    @_hide_list()
    @_update_list new_list_state
    @_show_list new_list_state

  _hide_list: ->
    $("##{@_get_element_id_of_list @list_state()}").removeClass 'left-list-is-visible'
    $(document).off 'keydown.list_view'

  _show_list: (new_list_state) ->
    $("##{@_get_element_id_of_list new_list_state}").addClass 'left-list-is-visible'
    @list_state new_list_state
    @last_update Date.now()
    $(document).on 'keydown.list_view', (event) =>
      @switch_list z.ViewModel.list.LIST_STATE.CONVERSATIONS if event.keyCode is z.util.KEYCODE.ESC

  _update_list: (new_list_state) ->
    switch new_list_state
      when z.ViewModel.list.LIST_STATE.ARCHIVE
        @archive.update_list()
      when z.ViewModel.list.LIST_STATE.START_UI
        @start_ui.update_list()
      when z.ViewModel.list.LIST_STATE.PREFERENCES
        @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT
      else
        @content_view_model.switch_previous_content()

  _get_element_id_of_list: (list_state) ->
    switch list_state
      when z.ViewModel.list.LIST_STATE.ARCHIVE then 'archive'
      when z.ViewModel.list.LIST_STATE.PREFERENCES then 'preferences'
      when z.ViewModel.list.LIST_STATE.START_UI then 'start-ui'
      else 'conversations'
