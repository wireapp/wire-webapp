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
  constructor: (element_id, @content, @conversation_repository, @user_repository) ->

    @webapp_loaded = ko.observable false

    @self_user = ko.computed =>
      @user_repository.self()?.picture_medium_url() if @webapp_loaded()

    @background_list_element = $("##{element_id}")
    @background_list_element.on z.util.alias.animationend, ->
      if not $(@).hasClass 'background-fullscreen'
        $('.conversation, .connect-requests-wrapper').css 'z-index': ''

    @content.state.subscribe =>
      if @content.state() is z.ViewModel.CONTENT_STATE.PROFILE
        requestAnimFrame =>
          @background_list_element.addClass 'background-fullscreen'
          requestAnimFrame =>
            if @background_list_element.hasClass 'background-fullscreen-anim-disabled'
              @background_list_element.removeClass 'background-fullscreen-anim-disabled'
              $('.conversation, .connect-requests-wrapper').css 'z-index': ''
      else
        if @background_list_element.hasClass 'background-fullscreen'
          @background_list_element.removeClass 'background-fullscreen'
          $('.conversation, .connect-requests-wrapper').css 'z-index': '-1'

    @blur_background = _.throttle (ratio) =>
      blur_radius = (ratio * 24) | 0
      blur_css = "blur(#{blur_radius}px)"
      requestAnimFrame =>
        @background_list_element.find('.background').css
          '-webkit-filter': blur_css
          'filter': blur_css
    , 50

    amplify.subscribe z.event.WebApp.LOADED, => @webapp_loaded true
    amplify.subscribe z.event.WebApp.LIST.BLUR, @blur_background
    amplify.subscribe z.event.WebApp.LIST.FULLSCREEN_ANIM_DISABLED, =>
      @background_list_element.addClass 'background-fullscreen-anim-disabled'

    ko.applyBindings @, document.getElementById element_id
