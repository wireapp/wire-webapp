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


class z.ViewModel.list.TakeOverViewModel

  ###
  @param element_id [String] HTML selector
  @param user_repository [z.user.UserRepository] User repository
  ###
  constructor: (element_id, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.list.TakeOverViewModel', z.config.LOGGER.OPTIONS

    @self_user = @user_repository.self
    @name = ko.pureComputed => @self_user()?.name()
    @username = ko.pureComputed => @self_user()?.username()

  keep_username: ->
    amplify.publish z.event.WebApp.TAKEOVER.DISMISS

  choose_username: ->
    amplify.publish z.event.WebApp.TAKEOVER.DISMISS
    amplify.publish z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT
