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
z.entity ?= {}

# Content Message based on z.entity.Message.
class z.entity.ContentMessage extends z.entity.Message
  # Construct a new content message.
  constructor: ->
    super()

    @assets = ko.observableArray []
    @nonce = null
    @super_type = z.message.SuperType.CONTENT
    @replacing_message_id = null
    @edited_timestamp = null

    @reactions = ko.observable {}
    @reactions_user_ets = ko.observableArray()
    @reactions_user_ids = ko.pureComputed => (@reactions_user_ets().map (user_et) -> user_et.first_name()).join ', '
    @status = ko.observable z.message.StatusType.SENT

    @display_edited_timestamp = =>
      return  z.localization.Localizer.get_text {
        id: z.string.conversation_edit_timestamp
        replace: {placeholder: '%@timestamp', content: moment(@edited_timestamp).format 'HH:mm'}
      }

    # like
    @is_liked_provisional = ko.observable()
    @is_liked = ko.pureComputed
      read: =>
        if @is_liked_provisional()?
          is_liked_provisional = @is_liked_provisional()
          @is_liked_provisional null
          return is_liked_provisional
        likes = @reactions_user_ets().filter (user_et) -> return user_et.is_me
        return likes.length is 1
      write: (value) =>
        @is_liked_provisional value
    @other_likes = ko.pureComputed =>
      return @reactions_user_ets().filter (user_et) -> return not user_et.is_me
    @show_likes = ko.observable false

    @like_caption = ko.pureComputed =>
      if @reactions_user_ets().length <= 5
        return (@reactions_user_ets().map (user_et) -> user_et.first_name()).join ', '
      else
        return  z.localization.Localizer.get_text {
          id: z.string.conversation_likes_caption
          replace: {placeholder: '%@number', content: @reactions_user_ets().length}
        }

  ###
  Add another content asset to the message.

  @param asset_et [z.entity.Asset] New content asset
  ###
  add_asset: (asset_et) =>
    @assets.push asset_et

  ###
  Get the first asset attached to the message.

  @return [z.entity.Message] The first asset attached to the message
  ###
  get_first_asset: ->
    return @assets()[0]

  update_reactions: (event_json) ->
    reactions = @reactions()
    if event_json.data.reaction
      reactions[event_json.from] = event_json.data.reaction
    else
      delete reactions[event_json.from]
    @reactions reactions

  update_status: (updated_status) ->
    if @status() >= z.message.StatusType.SENT
      if updated_status > @status()
        return @status updated_status
    else if @stats() isnt updated_status
      return @status updated_status
    return false

  ###
  Check whether the message was edited.

  @return [Boolean]
  ###
  was_edited: ->
    return @replacing_message_id?
