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

class z.ViewModel.ImageDetailViewViewModel
  constructor: (@element_id, @conversation_repository) ->

    @image_modal = undefined

    @image_src = ko.observable()
    @image_visible = ko.observable false

    @conversation_et = ko.observable()
    @message_et = ko.observable()
    @message_et.subscribe (message_et) =>
      @conversation_et @conversation_repository.find_conversation_by_id message_et.conversation_id

    amplify.subscribe z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, @show

    ko.applyBindings @, document.getElementById @element_id

  show: (message_et) =>
    @message_et message_et

    @image_modal.destroy() if @image_modal?
    @image_modal = new zeta.webapp.module.Modal '#detail-view', @_hide_callback, @_before_hide_callback
    @image_modal.show()

    message_et.get_first_asset().resource().load().then (blob) =>
      @image_src window.URL.createObjectURL blob
      @image_visible true

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.IMAGE_DETAIL_VIEW_OPENED

  _hide_callback: =>
    window.URL.revokeObjectURL @image_src()
    @image_src undefined

  _before_hide_callback: =>
    @image_visible false

  click_on_close: =>
    @image_modal.hide()

  click_on_download: ->
    @message_et().download()

  click_on_like: =>
    @conversation_repository.toggle_like @conversation_et(), @message_et()

  click_on_delete: =>
    @conversation_repository.delete_message @conversation_et(), @message_et()
    @image_modal.hide()

  click_on_delete_for_everyone: =>
    @conversation_repository.delete_message_everyone @conversation_et(), @message_et()
    @image_modal.hide()
