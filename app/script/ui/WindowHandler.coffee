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
z.ui ?= {}


class z.ui.WindowHandler
  constructor: ->
    @logger = new z.util.Logger 'z.ui.WindowHandler', z.config.LOGGER.OPTIONS

    @width = 0
    @height = 0

    @is_visible = true
    @lost_focus_interval_time = (z.tracking.config.SESSION_TIMEOUT / 3)
    @lost_focus_interval = undefined
    @lost_focus_on = undefined

    return @

  init: =>
    @width = $(window).width()
    @height = $(window).height()
    @_listen_to_window_resize()
    @_listen_to_visibility_change =>
      if document.visibilityState is 'visible'
        @logger.log 'Webapp is visible'
        @is_visible = true
        window.clearInterval @lost_focus_interval
        @lost_focus_interval = undefined
        @lost_focus_on = undefined
        amplify.publish z.event.WebApp.ANALYTICS.SESSION.START
      else
        @logger.log 'Webapp is hidden'
        @is_visible = false
        if @lost_focus_interval is undefined
          @lost_focus_on = Date.now()
          @lost_focus_interval = window.setInterval (=> @_check_for_timeout()), @lost_focus_interval_time
    return @

  _listen_to_window_resize: =>
    $(window).on 'resize', =>
      current_height = $(window).height()
      current_width = $(window).width()

      change_in_width = @width - current_width
      change_in_height = @height - current_height

      amplify.publish z.event.WebApp.WINDOW.RESIZE.WIDTH, change_in_width
      amplify.publish z.event.WebApp.WINDOW.RESIZE.HEIGHT, change_in_height

      @width = current_width
      @height = current_height

  _listen_to_visibility_change: (callback) ->
    property_hidden = undefined
    property_visibility_change = undefined

    if typeof document.hidden isnt 'undefined'
      property_hidden = 'hidden'
      property_visibility_change = 'visibilitychange'
    else if typeof document.msHidden isnt 'undefined'
      property_hidden = 'msHidden'
      property_visibility_change = 'msvisibilitychange'
    else if typeof document.webkitHidden isnt 'undefined'
      property_hidden = 'webkitHidden'
      property_visibility_change = 'webkitvisibilitychange'

    if property_hidden
      $(document).on property_visibility_change, ->
        callback()

  _check_for_timeout: ->
    in_background_since = Date.now() - @lost_focus_on
    if in_background_since >= z.tracking.config.SESSION_TIMEOUT
      amplify.publish z.event.WebApp.ANALYTICS.SESSION.CLOSE
