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
z.ViewModel.content ?= {}


# View model for connection requests.
class z.ViewModel.content.ConnectRequestsViewModel
  constructor: (element_id, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.ConnectRequestsViewModel', z.config.LOGGER.OPTIONS

    @connect_requests = @user_repository.connect_requests

  ###
  Click on accept.
  @param user_et [z.entity.User] User to accept connection request from
  @return [Promise] Promise that resolves when the connection request was accepted
  ###
  click_on_accept: (user_et) =>
    @user_repository.accept_connection_request user_et, @connect_requests().length is 1

  ###
  Click on ignore.
  @param user_et [z.entity.User] User to ignore connection request from
  @return [Promise] Promise that resolves when the connection request was ignored
  ###
  click_on_ignore: (user_et) =>
    @user_repository.ignore_connection_request user_et

  ###
  Called after each connection request is rendered.
  @param elements [Object] rendered objects
  @param request [z.entity.User] Rendered connection request
  ###
  after_render: (elements, request) =>
    if z.util.array_is_last @connect_requests(), request
      window.requestAnimationFrame -> $('.connect-requests').scroll_to_bottom()
