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

# grunt test_init && grunt test_run:message/MessageCategorization

describe 'z.message.MessageCategorization.category_from_message', ->

  it 'default message should have category of type NONE', ->
    message_et = new z.entity.Message()
    expect(z.message.MessagaCategorization.category_from_message(message_et)).toBe z.message.MessageCategory.NONE

  it 'ephemeral message should have category of type NONE', ->
    message_et = new z.entity.Message()
    message_et.ephemeral_expires Date.now() + 1000
    expect(message_et.is_ephemeral()).toBeTruthy()
    expect(z.message.MessagaCategorization.category_from_message(message_et)).toBe z.message.MessageCategory.NONE

  it 'expired message should have category of type NONE', ->
    message_et = new z.entity.Message()
    message_et.ephemeral_expires true
    expect(message_et.is_expired()).toBeTruthy()
    expect(z.message.MessagaCategorization.category_from_message(message_et)).toBe z.message.MessageCategory.NONE

  it 'text message should have category of type TEXT', ->
    message_et = new z.entity.ContentMessage()
    message_et.assets.push new z.entity.Text()
    expect(message_et.has_asset_text()).toBeTruthy()
    expect(z.message.MessagaCategorization.category_from_message(message_et)).toBe z.message.MessageCategory.TEXT

  it 'text message with link should have category of type TEXT and LINK', ->
    asset_et = new z.entity.Text()
    asset_et.previews.push new z.entity.LinkPreview()
    message_et = new z.entity.ContentMessage()
    message_et.assets.push asset_et
    expect(message_et.has_asset_text()).toBeTruthy()

    category = z.message.MessagaCategorization.category_from_message(message_et)
    expect(category & z.message.MessageCategory.TEXT).toBe z.message.MessageCategory.TEXT
    expect(category & z.message.MessageCategory.LINK).toBe z.message.MessageCategory.LINK
