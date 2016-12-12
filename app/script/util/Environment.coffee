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
z.util ?= {}

APP_ENV =
  LOCALHOST: 'localhost'
  PRODUCTION: 'app.wire.com'
  PROD_NEXT: 'wire-webapp-prod-next.wire.com'
  VIRTUAL_HOST: 'wire.ms' # The domain "wire.ms" is our virtual host for testing contact uploads

BROWSER_NAME =
  CHROME: 'Chrome'
  EDGE: 'Microsoft Edge'
  ELECTRON: 'Electron'
  FIREFOX: 'Firefox'
  OPERA: 'Opera'

PLATFORM_NAME =
  MACINTOSH: 'Mac'
  WINDOWS: 'Win'

# TODO: We need to remove the "do ->" pattern and invoke the Environment ourselves!
# Otherwise we cannot override the "navigator.userAgent" in our integration tests to check the behaviour of this class.
z.util.Environment = do ->
  _check =
    is_chrome: ->
      return platform.name is BROWSER_NAME.CHROME
    is_edge: ->
      return platform.name is BROWSER_NAME.EDGE
    is_firefox: ->
      return platform.name is BROWSER_NAME.FIREFOX
    is_opera: ->
      return platform.name is BROWSER_NAME.OPERA
    is_electron: ->
      return navigator.userAgent.includes BROWSER_NAME.ELECTRON

    get_version: ->
      return window.parseInt platform.version?.split('.')[0], 10

    requires_codec_rewrite: ->
      return false if not @supports_calling()
      return @is_chrome() and @get_version() is 51

    supports_notifications: ->
      return false if window.Notification is undefined
      return false if window.Notification.requestPermission is undefined
      return false if document.visibilityState is undefined
      return true
    supports_calling: ->
      return false if not @supports_media_devices()
      return false if window.WebSocket is undefined
      return false if @is_edge()
      return @is_chrome() or @is_firefox() or @is_opera()
    supports_media_devices: ->
      return true if navigator.mediaDevices?.getUserMedia
      return false
    supports_screen_sharing: ->
      return true if window.desktopCapturer
      return @is_firefox() and @get_version() >= 48

  os =
    is_mac: ->
      return navigator.platform.includes PLATFORM_NAME.MACINTOSH
    is_windows: ->
      return navigator.platform.includes PLATFORM_NAME.WINDOWS

  # add body information
  os_css_class = if os.is_mac() then 'os-mac' else 'os-pc'
  platform_css_class = if _check.is_electron() then 'platform-electron' else 'platform-web'
  $(document.body).addClass "#{os_css_class} #{platform_css_class}"

  app_version = ->
    if $("[property='wire:version']").attr('version')?
      version = $("[property='wire:version']").attr('version').trim().split '-'
      return "#{version[0]}.#{version[1]}.#{version[2]}.#{version[3]}#{version[4]}"

  ################
  # PUBLIC METHODS
  ################

  # "backend.current" is "undefined" when you are not connected to the backend (for example, if you are on the login page).
  # In such situations use methods like "is_staging" to detect environments.
  #
  backend: current: undefined

  frontend:
    is_localhost: ->
      return window.location.hostname in [APP_ENV.LOCALHOST, APP_ENV.VIRTUAL_HOST]
    is_production: ->
      return window.location.hostname in [APP_ENV.PRODUCTION, APP_ENV.PROD_NEXT, APP_ENV.TACO]

  browser:
    name: platform.name
    version: _check.get_version()

    chrome: _check.is_chrome()
    edge: _check.is_edge()
    firefox: _check.is_firefox()
    opera: _check.is_opera()

    supports:
      calling: _check.supports_calling()
      media_devices: _check.supports_media_devices()
      notifications: _check.supports_notifications()
      screen_sharing: _check.supports_screen_sharing()
    requires:
      calling_codec_rewrite: _check.requires_codec_rewrite()

  os:
    linux: not os.is_mac() and not os.is_windows()
    mac: os.is_mac()
    win: os.is_windows()

  electron: _check.is_electron()

  version: (show_wrapper_version = true) ->
    return 'dev' if z.util.Environment.frontend.is_localhost()
    return window.electron_version if window.electron_version and show_wrapper_version
    return app_version()
