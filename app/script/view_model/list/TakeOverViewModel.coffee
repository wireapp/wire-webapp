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


class z.ViewModel.list.TakeoverViewModel

  ###
  @param element_id [String] HTML selector
  @param conversation_repository [z.conversation.ConversationRepository] Conversation repository
  @param user_repository [z.user.UserRepository] User repository
  ###
  constructor: (element_id, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.list.TakeoverViewModel', z.config.LOGGER.OPTIONS

    @self_user = @user_repository.self
    @name = ko.pureComputed => @self_user()?.name()
    @username = ko.pureComputed => @self_user()?.username()

  keep_username: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.KEPT_GENERATED_USERNAME
    @user_repository.change_username @username()
    .then =>
      if conversation_et = @conversation_repository.get_most_recent_conversation()
        amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et
      else if @user_repository.connect_requests().length
        amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
    .catch ->
      amplify.publish z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT
    .then ->
      amplify.publish z.event.WebApp.TAKEOVER.DISMISS

  choose_username: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.OPENED_USERNAME_SETTINGS
    amplify.publish z.event.WebApp.TAKEOVER.DISMISS
    window.requestAnimationFrame -> amplify.publish z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT

  on_added_to_view: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.SEEN_USERNAME_SCREEN

  on_link_click: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.OPENED_USERNAME_FAQ
    return false
