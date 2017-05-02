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

class z.ViewModel.MainViewModel
  constructor: (element_id, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.MainViewModel', z.config.LOGGER.OPTIONS

    @user = @user_repository.self

    @main_classes = ko.pureComputed =>
      if @user()?
        main_css_classes = "main-accent-color-#{@user().accent_id()}"  # deprecated - still used on input control hover
        main_css_classes += " #{@user().accent_theme()}"
        main_css_classes += " show"
        return main_css_classes

    ko.applyBindings @, document.getElementById element_id
