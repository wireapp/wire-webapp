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

# Whenever the user starts typing it will focus the input field
# if no other input field or textarea is selected
#
ko.bindingHandlers.focus_on_keydown =
  init: (element, valueAccessor, allBindings, data, context) ->
    ko.applyBindingsToNode window,
      event:
        keydown: (data, e) ->
          return false if $('.detail-view').hasClass 'modal-show'

          meta_key_is_pressed = e.metaKey or e.ctrlKey
          is_paste_action = meta_key_is_pressed and e.keyCode is z.util.KEYCODE.V
          is_arrow_key = z.util.KEYCODE.is_arrow_key e.keyCode

          # check for activeElement needed, cause in IE11 i could be undefined under some circumstances
          active_element_is_input = document.activeElement and document.activeElement.tagName in ['INPUT', 'TEXTAREA']

          if not active_element_is_input and not is_arrow_key
            element.focus() if not meta_key_is_pressed or is_paste_action

          return true
    , context

# Show timestamp when hovering over the element
#
ko.bindingHandlers.show_all_timestamps =
  init: (element) ->
    $element = $(element)
    $element.on 'mousemove mouseout', (e) ->
      rect = $(@).find('.messages')[0].getBoundingClientRect()
      show_timestamps = e.clientX > rect.right - 64 and e.clientX < rect.right
      $('.time').toggleClass 'show-timestamp', show_timestamps

# Start loading image once they are in the viewport
#
ko.bindingHandlers.background_image =
  init: (element, valueAccessor, allBindingsAccessor) ->
    _in_view = (dom_element) ->
      box = dom_element.getBoundingClientRect()
      return box.right >= 0 and
          box.bottom >= 0 and
          box.left <= document.documentElement.clientWidth and
          box.top <= document.documentElement.clientHeight

    _on_viewport_change = _.debounce ->
      if _in_view element
        asset_remote_data()?.load()
        .then (blob) ->
          $(element).removeClass 'image-loading'
          object_url = window.URL.createObjectURL blob
          image_element[0].src = object_url
          viewport_subscription.dispose()
    , 500

    image_element = $(element).find 'img'
    asset_remote_data = valueAccessor()

    viewport_changed = allBindingsAccessor.get 'viewport_changed'
    viewport_subscription = viewport_changed.subscribe _on_viewport_change
    asset_subscription = asset_remote_data.subscribe _on_viewport_change

    _on_viewport_change()

    ko.utils.domNodeDisposal.addDisposeCallback element, ->
      viewport_subscription.dispose()
      asset_subscription.dispose()

# Fit image to viewport
#
ko.bindingHandlers.fit_to_viewport = do ->
  message_list_width = undefined

  process_image = (element, asset) ->
    message_list_width ?= $('.messages').width()
    content_element = element.parent()
    content_element.toggleClass 'image-widescreen', message_list_width < asset.original_width and asset.ratio < 1

  on_resize = _.throttle ->
    message_list_width = undefined
    image_func() for image_func in images()
  , 250

  images = ko.observableArray()
  images.subscribe (array) ->
    $(window).off 'resize.viewport'
    $(window).on 'resize.viewport', on_resize if array.length > 0

  init: (element, valueAccessor, allBindingsAccessor) ->
    func = -> process_image $(element), ko.unwrap valueAccessor()
    func()

    images.push func
    ko.utils.domNodeDisposal.addDisposeCallback element, -> images.remove func

# Generate message timestamp
#
ko.bindingHandlers.relative_timestamp = do ->

  # timestamp that should be updated
  timestamps = []

  calculate_timestamp = (date) ->
    today = moment().local().format 'YYMMDD'
    yesterday = moment().local().subtract(1, 'days').format 'YYMMDD'
    current_day = date.local().format 'YYMMDD'

    if moment().diff(date, 'minutes') < 2
      return z.localization.Localizer.get_text z.string.conversation_just_now
    else if moment().diff(date, 'minutes') < 60
      return date.fromNow()
    else if current_day is today
      return date.local().format 'HH:mm'
    else if current_day is yesterday
      yesterday_string = z.localization.Localizer.get_text z.string.conversation_yesterday
      return "#{yesterday_string} #{date.local().format('HH:mm')}"
    else if moment().diff(date, 'days') < 7
      return date.local().format 'dddd HH:mm'
    else
      return date.local().format 'MMMM D, HH:mm'

  calculate_timestamp_day = (date) ->
    today = moment().local().format 'YYMMDD'
    yesterday = moment().local().subtract(1, 'days').format 'YYMMDD'
    current_day = date.local().format 'YYMMDD'

    if moment().diff(date, 'minutes') < 2
      return z.localization.Localizer.get_text z.string.conversation_just_now
    else if moment().diff(date, 'minutes') < 60
      return date.fromNow()
    else if current_day is today
      today_string = z.localization.Localizer.get_text z.string.conversation_today
      return "#{today_string} #{date.local().format('HH:mm')}"
    else if current_day is yesterday
      yesterday_string = z.localization.Localizer.get_text z.string.conversation_yesterday
      return "#{yesterday_string} #{date.local().format('HH:mm')}"
    else if moment().diff(date, 'days') < 7
      return date.local().format 'dddd HH:mm'
    else
      return date.local().format 'dddd, MMMM D, HH:mm'

  # should be fine to update every minute
  setInterval ->
    timestamp_func() for timestamp_func in timestamps
  , 60 * 1000

  calculate = (element, timestamp, is_day) ->
    timestamp = window.parseInt timestamp
    date = moment.unix timestamp / 1000

    if is_day
      $(element).text calculate_timestamp_day date
    else
      $(element).text calculate_timestamp date

  init: (element, valueAccessor, allBindings) ->
    timestamp_func = -> calculate element, valueAccessor(), allBindings.get 'relative_timestamp_day'
    timestamp_func()
    timestamps.push timestamp_func

    ko.utils.domNodeDisposal.addDisposeCallback element, ->
      timestamp_index = timestamps.indexOf timestamp_func
      timestamps.splice timestamp_index, 1

ko.bindingHandlers.message_in_viewport =
  init: (element, valueAccessor, allBindingsAccessor) ->
    callback = valueAccessor()
    callback()
