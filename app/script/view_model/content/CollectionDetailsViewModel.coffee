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
z.ViewModel.content ?= {}

# Parent: z.ViewModel.CollectionViewModel
class z.ViewModel.content.CollectionDetailsViewModel
  constructor: (element_id) ->
    @logger = new z.util.Logger 'z.ViewModel.CollectionDetailsViewModel', z.config.LOGGER.OPTIONS

    @template = ko.observable()
    @conversation_et = ko.observable()

    @items = ko.observableArray()

  set_conversation: (conversation_et, category, items) =>
    @template category
    @conversation_et conversation_et
    @items items

  removed_from_view: =>
    @conversation_et null
    @items.removeAll()

  click_on_back_button: ->
    amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.COLLECTION
