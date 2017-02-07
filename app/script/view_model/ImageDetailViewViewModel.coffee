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

    @source = undefined

    @image_modal = undefined
    @image_src = ko.observable()
    @image_visible = ko.observable false

    @conversation_et = ko.observable()
    @message_et = ko.observable()
    @message_et.subscribe (message_et) =>
      @conversation_et @conversation_repository.find_conversation_by_id message_et.conversation_id

    amplify.subscribe z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, @show

    ko.applyBindings @, document.getElementById @element_id

  show: (message_et, source) =>
    @source = source
    @message_et message_et

    amplify.subscribe z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, @message_removed
    @image_modal.destroy() if @image_modal?
    @image_modal = new zeta.webapp.module.Modal '#detail-view', @_hide_callback, @_before_hide_callback
    @image_modal.show()

    message_et.get_first_asset().resource().load().then (blob) =>
      @image_src window.URL.createObjectURL blob
      @image_visible true

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.IMAGE_DETAIL_VIEW_OPENED

  message_removed: (message_id) =>
    @image_modal.hide() if @message_et()?.id is message_id

  _hide_callback: =>
    window.URL.revokeObjectURL @image_src()
    @image_src undefined
    @source = undefined
    amplify.unsubscribe z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, @message_removed

  _before_hide_callback: =>
    @image_visible false

  click_on_close: =>
    @image_modal.hide()

  click_on_download: ->
    @_track_item_action @conversation_et(), 'download', 'image' if @source is 'collection'
    @message_et().download()

  click_on_like: =>
    like_action = if @message_et().is_liked() then 'unlike' else 'like'
    @_track_item_action @conversation_et(), like_action, 'image' if @source is 'collection'
    @conversation_repository.toggle_like @conversation_et(), @message_et()

  click_on_delete: =>
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_MESSAGE,
      action: =>
        @_track_item_action @conversation_et(), 'delete_for_me', 'image' if @source is 'collection'
        @conversation_repository.delete_message @conversation_et(), @message_et()
        @image_modal.hide()

  click_on_delete_for_everyone: =>
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_EVERYONE_MESSAGE,
      action: =>
        @_track_item_action @conversation_et(), 'delete_for_everyone', 'image' if @source is 'collection'
        @conversation_repository.delete_message_everyone @conversation_et(), @message_et()
        @image_modal.hide()

  _track_item_action: (conversation_et, action, type) ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.COLLECTION.DID_ITEM_ACTION,
      action: action
      type: type
      conversation_type: z.tracking.helpers.get_conversation_type conversation_et
      with_bot: conversation_et.is_with_bot()
