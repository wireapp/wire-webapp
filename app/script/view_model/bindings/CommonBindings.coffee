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

# use it on the drop area
ko.bindingHandlers.drop_file =
  init: (element, valueAccessor, allBindings, data, context) ->
    fileDragOver = (data, e) ->
      e.preventDefault()
      e.originalEvent.dataTransfer.dropEffect = 'copy'
      e.currentTarget.classList.add 'drag-hover'

    fileDragLeave = (data, e) ->
      e.currentTarget.classList.remove 'drag-hover'

    fileSelectHandler = (data, e) ->
      e.preventDefault()
      e.currentTarget.classList.remove 'drag-hover'
      files = e.dataTransfer?.files or e.originalEvent?.dataTransfer.files
      valueAccessor().call @, files  if files.length > 0

    ko.applyBindingsToNode element,
      event:
        dragover: fileDragOver
        dragleave: fileDragLeave
        drop: fileSelectHandler
    , context

# capture pasted files
ko.bindingHandlers.paste_file =
  init: (element, valueAccessor, allBindings, data, context) ->

    on_paste = (data, event) ->
      clipboard_data = event.originalEvent.clipboardData
      items = [].slice.call clipboard_data.items or clipboard_data.files

      files = items
        .filter (item) -> item.kind is 'file'
        .map (item) -> new File [item.getAsFile()], null, type: item.type
        .filter (item) -> item? and item.size isnt 4 # Pasted files result in 4 byte blob (OSX)

      if files.length > 0
        valueAccessor() files
        return false
      return true

    ko.applyBindingsToNode window,
      event:
        paste: on_paste
    , context

# blockes the default behaviour when dropping a file on the element
# if an element inside that element is listening to drag events, than this will be triggered after
ko.bindingHandlers.ignore_drop_file =
  init: (element, valueAccessor, allBindings, data, context) ->
    ko.applyBindingsToNode element,
      event:
        dragover: (data, e) -> e.preventDefault()
        drop: (data, e) -> e.preventDefault()
    , context


# indicate that the current binding loop should not try to bind this element’s children
# http://www.knockmeout.net/2012/05/quick-tip-skip-binding.html
ko.bindingHandlers.stopBinding =
  init: ->
    controlsDescendantBindings: true

ko.virtualElements.allowedBindings.stopBinding = true

# resize textarea according to the containing text
# Link: http://jsfiddle.net/C8e4w/1/
# Docu: http://knockoutjs.com/documentation/custom-bindings.html
#
# Example: HTML binding
# <textarea id="abc" data-bind="resize: scroll_message_list, enter: send_message" />
#
# - "element" will be "#abc" (DOM)
# - "valueAccessor()" will be the "scroll_message_list" function
# - "allBindings" will be an object to access the bindings "resize" and "enter"
# - "data" will be the view model (this parameter is deprecated in Knockout 3.x)
# - "context" will be an object that holds the binding context and view model
ko.bindingHandlers.resize = do ->
  last_height = null
  resize_observable = null
  resize_callback = null

  resize_textarea = (element) ->
    element.style.height = 0
    element.style.height = "#{element.scrollHeight}px"

    # height has changed
    if last_height isnt element.clientHeight
      resize_callback? element.clientHeight, last_height
      last_height = element.clientHeight
      max_height = window.parseInt getComputedStyle(element).maxHeight, 10

      if element.clientHeight is max_height
        element.style.overflowY = 'scroll'
      else
        element.style.overflowY = 'hidden'

  init: (element, valueAccessor, allBindings, data, context) ->
    last_height = element.scrollHeight
    resize_observable = ko.unwrap valueAccessor()
    resize_callback = allBindings.get 'resize_callback'

    if not resize_observable
      ko.applyBindingsToNode element,
        event:
          input: -> resize_textarea element
          focus: -> resize_textarea element
      , context

  update: (element, valueAccessor, allBindings) ->
    resize_observable = ko.unwrap valueAccessor()
    resize_textarea element
    resize_callback = allBindings.get 'resize_callback'

# register on enter key pressed
ko.bindingHandlers.enter =
  init: (element, valueAccessor, allBindings, data, context) ->
    wrapper = (data, event) ->
      if event.keyCode is z.util.KEYCODE.ENTER and not event.shiftKey and not event.altKey
        valueAccessor()?.call @, data, event
        return false
      else
        return true

    ko.applyBindingsToNode element,
      event:
        keypress: wrapper
    , context

# <input type="file" data-bind="fileSelect: on_file_select">
ko.bindingHandlers.file_select =
  init: (element, valueAccessor, allBindings, data, context) ->
    wrapper = (data, e) ->
      if e.target.files.length > 0
        valueAccessor().call @, e.target.files

        # http://stackoverflow.com/a/12102992/4453133
        # wait before clearing to fix autotests
        setTimeout ->
          $(e.target).val null
        , 1000

    ko.applyBindingsToNode element,
      event:
        change: wrapper
        focus: (data, e) -> $(e.target).blur()
    , context

# Wait for image to be loaded before applying as background image
#
ko.bindingHandlers.load_image =
  init: (element, valueAccessor) ->
    image_src = z.util.strip_url_wrapper ko.unwrap valueAccessor()
    image = new Image()
    image.onload = -> element.style.backgroundImage = "url(#{image_src})"
    image.src = image_src

# load image when hovering over element
#
ko.bindingHandlers.load_image_on_hover =
  init: (element) ->
    hoverable_item = $(element)
    static_image = hoverable_item.data('src')
    animated_gif = hoverable_item.data('hover')

    if animated_gif
      image = undefined
      hoverable_item
      .on 'mouseover', ->
        item = $(@)
        image = new Image()
        image.onload = ->
          item.css backgroundImage: 'url(' + animated_gif + ')'
        image.src = animated_gif
      .on 'mouseout', ->
        image.onload = undefined
        $(@).css backgroundImage: 'url(' + static_image + ')'

# this execution trimmes the underlying value
ko.subscribable.fn.trimmed = ->
  ko.computed
    read: ->
      @().trim()
    write: (value) ->
      @ value.trim()
      @valueHasMutated()
      return
    owner: @

# will only fire once when the value has changed
ko.subscribable.fn.subscribe_once = (handler, owner, event_name) ->
  subscription = @subscribe (new_value) ->
    subscription.dispose()
    handler new_value
  , owner, event_name

# renders antiscroll scrollbar
ko.bindingHandlers.antiscroll =
  init: (element, valueAccessor) ->
    $(element).antiscroll
      notOnMacintosh: false
      autoHide: true
      autoWrap: true

    antiscroll = $(element).parent().data 'antiscroll'

    trigger_value = valueAccessor()
    if ko.isObservable trigger_value
      trigger_subscription = trigger_value.subscribe ->
        antiscroll?.rebuild()

    resize_event = "resize.#{Date.now()}"
    $(window).on resize_event, _.throttle ->
      antiscroll?.rebuild()
    , 100

    ko.utils.domNodeDisposal.addDisposeCallback element, ->
      $(element).parent().data('antiscroll')?.destroy()
      $(window).off resize_event
      trigger_subscription?.dispose()


ko.bindingHandlers.electron_remove =
  init: (element) ->
    if z.util.Environment.electron
      $(element).remove()


ko.bindingHandlers.visibility = do ->
  setVisibility = (element, valueAccessor) ->
    hidden = ko.unwrap(valueAccessor())
    $(element).css 'visibility', if hidden then 'visible' else 'hidden'
  return {
    init: setVisibility
    update: setVisibility
  }


ko.bindingHandlers.relative_timestamp = do ->
  timestamps = []

  # should be fine to fire all 60 sec
  setInterval ->
    timestamp_func() for timestamp_func in timestamps
  , 60 * 1000

  calculate = (element, timestamp) ->
    timestamp = window.parseInt timestamp
    date = moment.unix timestamp / 1000

    today = moment().local().format 'YYMMDD'
    yesterday = moment().local().subtract(1, 'days').format 'YYMMDD'
    current_day = date.local().format 'YYMMDD'

    if moment().diff(date, 'minutes') < 2
      $(element).text z.localization.Localizer.get_text z.string.conversation_just_now
    else if moment().diff(date, 'minutes') < 60
      $(element).text date.fromNow()
    else if current_day is today
      $(element).text date.local().format 'HH:mm'
    else if current_day is yesterday
      yesterday_string = z.localization.Localizer.get_text z.string.conversation_yesterday
      $(element).text "#{yesterday_string} #{date.local().format('HH:mm')}"
    else if moment().diff(date, 'days') < 7
      $(element).text date.local().format 'dddd HH:mm'
    else
      $(element).text date.local().format 'dddd, MMMM D, HH:mm'

  init: (element, valueAccessor) ->
    timestamp_func = -> calculate element, valueAccessor()
    timestamp_func()
    timestamps.push timestamp_func

    ko.utils.domNodeDisposal.addDisposeCallback element, ->
      timestamp_index = timestamps.indexOf timestamp_func
      timestamps.splice timestamp_index, 1

# Add 'hide-controls' when the mouse leave the element or stops moving
ko.bindingHandlers.hide_controls =
  init: (element, valueAccessor) ->
    timeout = valueAccessor()
    hide_timeout = undefined

    element.onmouseenter = -> element.classList.remove 'hide-controls'
    element.onmouseleave = -> element.classList.add 'hide-controls' if document.hasFocus()
    element.onmousemove = ->
      window.clearTimeout hide_timeout if hide_timeout

      element.classList.remove 'hide-controls'

      hide_timeout = window.setTimeout ->
        element.classList.add 'hide-controls'
      , timeout

# element is added to view
ko.bindingHandlers.added_to_view =
  init: (element, valueAccessor) ->
    callback = valueAccessor()
    callback()

# element is removed to view
ko.bindingHandlers.removed_from_view =
  init: (element, valueAccessor) ->
    callback = valueAccessor()
    ko.utils.domNodeDisposal.addDisposeCallback element, ->
      callback()

# element is in viewport. return true within the callback to dispose the subscription
ko.bindingHandlers.in_viewport = do ->

  listeners = []

  window.addEventListener 'scroll', (e) ->
    listener(e) for listener in listeners by -1 # listeners can be deleted during iteration
  , true

  init: (element, valueAccessor) ->

    _in_view = (dom_element) ->
      box = dom_element.getBoundingClientRect()
      return box.right >= 0 and
          box.bottom >= 0 and
          box.left <= document.documentElement.clientWidth and
          box.top <= document.documentElement.clientHeight

    _dispose = ->
      z.util.ArrayUtil.remove_element listeners, _check_element

    _check_element = ->
      is_child = if e? then e.target.contains(element) else true
      if is_child and _in_view element
        dispose = valueAccessor()?()
        _dispose() if dispose

    listeners.push _check_element
    _check_element()

    ko.utils.domNodeDisposal.addDisposeCallback element, _dispose
