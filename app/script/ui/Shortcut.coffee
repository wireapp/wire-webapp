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

z.ui.ShortcutType =
  ADD_PEOPLE: 'add_people'
  ARCHIVE: 'archive'
  CALL_IGNORE: 'ignore'
  CALL_MUTE: 'mute_call'
  DEBUG: 'debug'
  NEXT: 'next'
  PEOPLE: 'people'
  PING: 'ping'
  PREV: 'prev'
  SILENCE: 'silence'
  START: 'start'

z.ui.Shortcut = do ->

  shortcut_map = {}

  shortcut_map[z.ui.ShortcutType.ADD_PEOPLE] =
    shortcut:
      webapp:
        osx: 'command + shift + k'
        pc: 'ctrl + shift + k'
      electron:
        osx: 'command + shift + k'
        pc: 'ctrl + shift + k'
        menu: true
    event: z.event.WebApp.SHORTCUT.ADD_PEOPLE

  shortcut_map[z.ui.ShortcutType.ARCHIVE] =
    shortcut:
      webapp:
        osx: 'command + alt + shift + d'
        pc: 'ctrl + alt + d'
      electron:
        osx: 'command + d'
        pc: 'ctrl + d'
        menu: true
    event: z.event.WebApp.SHORTCUT.ARCHIVE

  shortcut_map[z.ui.ShortcutType.CALL_IGNORE] =
    shortcut:
      webapp:
        osx: 'command + alt + .'
        pc: 'ctrl + alt + .'
      electron:
        osx: 'command + .'
        pc: 'ctrl + .'
    event: z.event.WebApp.SHORTCUT.CALL_IGNORE

  shortcut_map[z.ui.ShortcutType.CALL_MUTE] =
    shortcut:
      webapp:
        osx: 'command + alt + m'
        pc: 'ctrl + alt + m'
      electron:
        osx: 'command + alt + m'
        pc: 'ctrl + alt + m'
    event: z.event.WebApp.SHORTCUT.CALL_MUTE

  shortcut_map[z.ui.ShortcutType.PREV] =
    shortcut:
      webapp:
        osx: 'command + alt + down'
        pc: 'alt + shift + down'
      electron:
        osx: 'command + alt + down'
        pc: 'alt + shift + down'
        menu: true
    event: z.event.WebApp.SHORTCUT.PREV

  shortcut_map[z.ui.ShortcutType.NEXT] =
    shortcut:
      webapp:
        osx: 'command + alt + up'
        pc: 'alt + shift + up'
      electron:
        osx: 'command + alt + up'
        pc: 'alt + shift + up'
        menu: true
    event: z.event.WebApp.SHORTCUT.NEXT

  shortcut_map[z.ui.ShortcutType.PING] =
    shortcut:
      webapp:
        osx: 'command + alt + k'
        pc: 'ctrl + alt + k'
      electron:
        osx: 'command + k'
        pc: 'ctrl + k'
        menu: true
    event: z.event.WebApp.SHORTCUT.PING

  shortcut_map[z.ui.ShortcutType.PEOPLE] =
    shortcut:
      webapp:
        osx: 'command + alt + shift + i'
        pc: 'ctrl + alt + i'
      electron:
        osx: 'command + i'
        pc: 'ctrl + i'
        menu: true
    event: z.event.WebApp.SHORTCUT.PEOPLE

  shortcut_map[z.ui.ShortcutType.SILENCE] =
    shortcut:
      webapp:
        osx: 'command + alt + s'
        pc: 'ctrl + alt + s'
      electron:
        osx: 'command + alt + s'
        pc: 'ctrl + alt + s'
        menu: true
    event: z.event.WebApp.SHORTCUT.SILENCE

  shortcut_map[z.ui.ShortcutType.START] =
    shortcut:
      webapp:
        osx: 'command + alt + graveaccent' # KeyboardJS fires this when using cmd + alt + n
        pc: 'ctrl + alt + graveaccent'
      electron:
        osx: 'command + n'
        pc: 'ctrl + n'
        menu: true

    event: z.event.WebApp.SHORTCUT.START

  if $('#debug').length isnt 0
    shortcut_map[z.ui.ShortcutType.DEBUG] =
      shortcut:
        webapp:
          osx: 'command + alt + g'
          pc: 'ctrl + alt + g'
        electron:
          osx: 'command + alt + g'
          pc: 'ctrl + alt + g'
      event: z.event.WebApp.SHORTCUT.DEBUG

  _register_event = (platform_specific_shortcut, event) ->

    # bind also 'command + alt + n' for start shortcut
    if z.util.contains platform_specific_shortcut, 'graveaccent'
      replaced_shortcut = platform_specific_shortcut.replace 'graveaccent', 'n'
      _register_event replaced_shortcut, event

    keyboardJS.on platform_specific_shortcut, (e) ->
      keyboardJS.releaseKey e.keyCode

      # hotfix WEBAPP-1916
      return if (z.util.contains(platform_specific_shortcut, 'command') and not e.metaKey)

      e.preventDefault()
      amplify.publish event

  get_beautified_shortcut_mac = (shortcut) ->
    return shortcut
      .replace /\+/g, ''
      .replace /\s+/g, ''
      .replace 'alt', '⌥'
      .replace 'command', '⌘'
      .replace 'shift', '⇧'
      .replace 'up', '↑'
      .replace 'down', '↓'
      .replace 'graveaccent', 'n'
      .toUpperCase()

  get_beautified_shortcut_win = (shortcut) ->
    return shortcut
      .replace 'up', '↑'
      .replace 'down', '↓'
      .replace 'graveaccent', 'n'
      .replace /\w+/g, (string) -> z.util.capitalize_first_char string

  get_shortcut = (shortcut_name) ->
    platform = if z.util.Environment.electron then 'electron' else 'webapp'
    platform_shortcuts = shortcut_map[shortcut_name].shortcut[platform]
    os_shortcut = if z.util.Environment.os.mac then platform_shortcuts.osx else platform_shortcuts.pc
    return os_shortcut

  get_shortcut_tooltip = (shortcut_name) ->
    shortcut = get_shortcut shortcut_name
    if shortcut
      return get_beautified_shortcut_mac shortcut if z.util.Environment.os.mac
      return get_beautified_shortcut_win shortcut

  _init = ->
    for shortcut, data of shortcut_map
      continue if z.util.Environment.electron and shortcut_map[shortcut].shortcut.electron.menu
      _register_event get_shortcut(shortcut), data['event']

  _init()

  return {} =
    shortcut_map: shortcut_map
    get_shortcut: get_shortcut
    get_shortcut_tooltip: get_shortcut_tooltip
    get_beautified_shortcut_mac: get_beautified_shortcut_mac
    get_beautified_shortcut_win: get_beautified_shortcut_win
