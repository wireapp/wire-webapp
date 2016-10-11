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

# Types for warning banners
z.ViewModel.WarningType =
  # Permission requests: dimmed screen, warning bar
  REQUEST_CAMERA: 'request_camera'
  REQUEST_MICROPHONE: 'request_microphone'
  REQUEST_NOTIFICATION: 'request_notification'
  REQUEST_SCREEN: 'request_screen'
# Permission callbacks: !dimmed screen, warning bar
  DENIED_CAMERA: 'camera_access_denied'
  DENIED_MICROPHONE: 'mic_access_denied'
  DENIED_SCREEN: 'screen_access_denied'
  NOT_FOUND_CAMERA: 'not_found_camera'
  NOT_FOUND_MICROPHONE: 'not_found_microphone'
  UNSUPPORTED_INCOMING_CALL: 'unsupported_incoming_call'
  UNSUPPORTED_OUTGOING_CALL: 'unsupported_outgoing_call'
  CONNECTIVITY_RECONNECT: 'connectivity_reconnect'
  CONNECTIVITY_RECOVERY: 'connectivity_recovery'
  NO_INTERNET: 'no_internet'

class z.ViewModel.WarningsViewModel
  constructor: (element_id) ->
    @logger = new z.util.Logger 'z.ViewModel.WarningsViewModel', z.config.LOGGER.OPTIONS

    # Array of warning banners
    @warnings = ko.observableArray()
    @top_warning = ko.pureComputed =>
      return @warnings()[@warnings().length - 1]
    , @, deferEvaluation: true
    @warnings.subscribe (warnings) ->
      mini_modes = [
        z.ViewModel.WarningType.CONNECTIVITY_RECONNECT
        z.ViewModel.WarningType.NO_INTERNET
      ]
      if warnings.length is 0
        top_margin = '0'
      else if warnings[warnings.length - 1] is z.ViewModel.WarningType.CONNECTIVITY_RECOVERY
        top_margin = '0'
      else if warnings[warnings.length - 1] in mini_modes
        top_margin = '32px'
      else
        top_margin = '64px'
      $('#app').css top: top_margin
      window.requestAnimationFrame -> $(window).trigger 'resize'

    @first_name = ko.observable()
    @call_id = undefined

    @warning_dimmed = ko.pureComputed =>
      for warning in @warnings()
        return true if warning in [
          z.ViewModel.WarningType.REQUEST_CAMERA
          z.ViewModel.WarningType.REQUEST_MICROPHONE
          z.ViewModel.WarningType.REQUEST_NOTIFICATION
          z.ViewModel.WarningType.REQUEST_SCREEN
        ]
      return false
    , @, deferEvaluation: true
    @warning_dimmed.extend rateLimit: 200

    amplify.subscribe z.event.WebApp.WARNING.SHOW, @show_warning
    amplify.subscribe z.event.WebApp.WARNING.DISMISS, @dismiss_warning

    ko.applyBindings @, document.getElementById element_id

  # Function is used to close a warning banner by clicking on it's close (X) button
  close_warning: =>
    warning_to_remove = @top_warning()
    @dismiss_warning warning_to_remove

    switch warning_to_remove
      when z.ViewModel.WarningType.REQUEST_MICROPHONE
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALLING,
          action: -> z.util.safe_window_open z.localization.Localizer.get_text z.string.url_support_mic_access_denied
      when z.ViewModel.WarningType.REQUEST_NOTIFICATION
      # We block subsequent permission requests for notifications when the user ignores the request.
        amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.REQUEST_PERMISSION, false

  dismiss_warning: (type) =>
    type = @top_warning() if not type
    @logger.log @logger.levels.WARN, "Dismissed warning of type '#{type}'"
    @warnings.remove type

  show_warning: (type, info) =>
    @dismiss_warning() if @top_warning() and type in [z.ViewModel.WarningType.CONNECTIVITY_RECONNECT, z.ViewModel.WarningType.NO_INTERNET]
    @logger.log @logger.levels.WARN, "Showing warning of type '#{type}'"
    if info?
      @first_name info.first_name
      @call_id = info.call_id
    @warnings.push type
