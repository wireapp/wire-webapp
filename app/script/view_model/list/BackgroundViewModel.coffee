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


class z.ViewModel.BackgroundViewModel
  constructor: (element_id, @content_view_model, @conversation_repository, @user_repository) ->

    @webapp_loaded = ko.observable false

    @self_user = ko.pureComputed =>
      @user_repository.self()?.picture_medium_url() if @webapp_loaded()

    amplify.subscribe z.event.WebApp.LOADED, => @webapp_loaded true

    ko.applyBindings @, document.getElementById element_id
