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

  ###
  Create link preview proto message

  @param data [Object] open graph data
  @param url [String] link entered by the user
  @param offset [Number] starting index of the link

  @returns [z.proto.LinkPreview]
  ###
  build_from_open_graph_data = (data, url, offset = 0) ->
    preview = null

    return if _.isEmpty data

    switch
      when not data.type? or data.type in ['article', 'website'] and data.title
        preview = new z.proto.Article data.url or url, data.title, data.description

    if preview?
      return new z.proto.LinkPreview url, offset, preview

  return {
    build_from_open_graph_data: build_from_open_graph_data
  }
