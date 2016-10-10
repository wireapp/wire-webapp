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
z.components ?= {}

z.components.ContextMenuEvent =
  CONTEXT_MENU: 'z.components.ContextMenuEvent::CONTEXT_MENU'

# Display context menu for the given entries. Entries should be provided as an Array of objects containing
# 'label' and 'action'. Dom Event 'z.components.ContextMenuEvent.CONTEXT_MENU' is fired when the
# context menu is clicked and data is updated.
#
# entries example:
# [
#   {label: 'copy', action: 'action-id'},
#   {label: 'delete', action: 'action-id'}
# ]
#
# @param [Object] params
# @option params [String] tag
# @option params [Object] data additional data that is passed when items in the context menu are clicked
# @option params [Array|Function] entries Array or Function that provides data for the context menu entries
# @option params [String] placement where to display the context menu ('left', 'right', 'top', 'bottom')
#
class z.components.ContextMenuViewModel

  constructor: (params, component_info) ->
    # parameter list
    @tag = params.tag
    @data = params.data
    @entry_provider = params.entries
    @placement = params.placement or 'left'
    @element = component_info.element

    @bubble = undefined
    @entries = ko.observableArray()

    @host_id = z.util.create_random_uuid()
    @bubble_id = z.util.create_random_uuid()

    @get_entries = ->
      entries = if _.isFunction(@entry_provider) then @entry_provider() else @entry_provider
      @entries entries

    @element.addEventListener 'click', @on_context_menu_button_click
    @element.addEventListener z.components.ContextMenuEvent.CONTEXT_MENU, @on_custom_context_menu
    @element.setAttribute 'id', @host_id
    @element.setAttribute 'data-bubble', "##{@bubble_id}"
    @element.setAttribute 'data-placement', @placement
    @element.setAttribute 'data-context-tag', @tag
    @element.setAttribute 'data-context-data', @data

    window.addEventListener 'scroll', @on_window_scroll, true

  on_window_scroll: =>
    @bubble?.hide()

  on_context_menu_entry_click: (entry, event) =>
    event.stopPropagation()
    amplify.publish z.event.WebApp.CONTEXT_MENU, @tag, entry.action, @data
    @bubble.hide()

  on_context_menu_button_click: () =>
    @get_entries()
    @element.dispatchEvent new Event z.components.ContextMenuEvent.CONTEXT_MENU

  on_custom_context_menu: =>
    @bubble ?= new zeta.webapp.module.Bubble {host_selector: "##{@host_id}"}
    @bubble.toggle()

  dispose: =>
    @element.removeEventListener 'click', @on_context_menu_button_click
    @element.removeEventListener z.components.ContextMenuEvent.CONTEXT_MENU, @on_custom_context_menu
    window.removeEventListener 'scroll', @on_window_scroll


ko.components.register 'context-menu',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.ContextMenuViewModel params, component_info
  template: """
            <div data-bind="attr: {id: bubble_id}" class="bubble">
              <ul class="bubble-menu">
                <!-- ko foreach: entries -->
                  <li data-bind="click: $parent.on_context_menu_entry_click, text: label, attr: {'data-context-action': action}"></li>
                <!-- /ko -->
              </ul>
            </div>
            """
