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

# grunt test_init && grunt test_run:util/bindings

describe 'ko.bindingHandlers', ->
  ###############################################################################
  # ko.bindingHandlers.indicator
  ###############################################################################
  describe 'ko.bindingHandlers.unread_indicator', ->

    it 'can show a filled indicator dot on a conversation when call state is "NONE"', ->

      element = $('<div></div>')[0]
      observable = ko.observable ''
      valueAccessor = -> observable
      binding = ko.bindingHandlers.unread_indicator
      conversation = new z.entity.Conversation()

      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme'

      observable 0
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme'

      observable 1
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-xs'

      observable 2
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-xs'

      observable 3
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-sm'

      observable 4
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-sm'

      observable 5
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-md'

      observable 6
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-md'

      observable 7
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-lg'

      observable 8
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-lg'

      observable 9
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-xl'

      observable 1337
      binding.update element, valueAccessor, null, conversation
      expect(element.className).toBe 'bg-theme dot-xl'

  ###############################################################################
  # ko.bindingHandlers.enter
  ###############################################################################

  describe 'ko.bindingHandlers.enter', ->

    binding = ko.bindingHandlers.enter
    element = null
    handler = null

    beforeEach ->
      element = document.createElement 'div'

      handler =
        on_enter: -> 'yay'

      # we need the callFake since the spyOn will overwrite the on_enter property
      spyOn(handler, 'on_enter').and.callFake ->
        return -> 'yay'

      binding.init element, handler.on_enter

    it 'can execute callback when enter is pressed', ->
      $(element).trigger $.Event('keypress', {keyCode: 13})
      expect(handler.on_enter).toHaveBeenCalled()

    it 'can not execute callback when another key is pressed', ->
      $(element).trigger $.Event('keypress', {keyCode: 123})
      expect(handler.on_enter).not.toHaveBeenCalled()

    it 'can not execute callback when another event is triggered', ->
      $(element).trigger $.Event('keyup', {keyCode: 123})
      expect(handler.on_enter).not.toHaveBeenCalled()


  ###############################################################################
  # ko.subscribable.fn.subscribe_once
  ###############################################################################

  describe 'ko.subscribable.fn.subscribe_once', ->

    observable = null
    handler = null

    beforeEach ->
      observable = ko.observable false
      handler =
        callback: -> 'yay'

      spyOn handler, 'callback'

    it 'handler is only called once', ->
      observable.subscribe_once handler.callback
      observable true
      observable false
      expect(handler.callback).toHaveBeenCalled()
      expect(handler.callback.calls.count()).toEqual 1
      expect(handler.callback).toHaveBeenCalledWith true


  ###############################################################################
  # ko.subscribable.fn.trimmed
  ###############################################################################

  describe 'ko.subscribable.fn.trimmed', ->

    observable = null

    beforeEach ->
      observable = ko.observable('').trimmed()

    it 'trims spaces', ->
      observable ' foo'
      expect(observable()).toBe 'foo'
      observable 'foo '
      expect(observable()).toBe 'foo'
      observable ' foo '
      expect(observable()).toBe 'foo'
      observable ' foo bar '
      expect(observable()).toBe 'foo bar'
