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
z.links ?= {}

z.links.LinkPreviewProtoBuilder = do ->

  has_valid_attributes = (data) ->
    has_valid_description = true if data.description
    has_valid_title = true if data.title
    has_valid_type = true if data.type in ['article', 'object', 'website']
    has_valid_type = true if not data.type?
    has_valid_url = true if data.url
    return true if has_valid_description and has_valid_title and has_valid_type and has_valid_url
    return false

  ###
  Create Protocol Buffers message for link previews.
  Open Graph data can be validated through: https://developers.facebook.com/tools/debug/

  @param data [Object] open graph data
  @param url [String] link entered by the user
  @param offset [Number] starting index of the link

  @returns [z.proto.LinkPreview]
  ###
  build_from_open_graph_data = (data, url, offset = 0) ->
    return undefined if _.isEmpty data

    data.url = data.url or url

    if has_valid_attributes data
      preview = new z.proto.Article data.url or url, data.title, data.description
      return new z.proto.LinkPreview url, offset, preview

    return undefined

  return {
    build_from_open_graph_data: build_from_open_graph_data
  }
