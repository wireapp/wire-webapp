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

class z.links.LinkPreviewRepository
  constructor: (@asset_service) ->
    @logger = new z.util.Logger 'z.links.LinkPreviewRepository', z.config.LOGGER.OPTIONS

  ###
  Searches for url in given string and creates a link preview.
  This will upload associated image as asset and will resolve with an z.proto.LinkPreview instance

  @param string [String]
  ###
  get_link_preview_from_string: (string) =>
    Promise.resolve()
    .then =>
      data = z.links.LinkPreviewHelpers.get_first_link_with_offset string
      if data
        [url, offset] = data
        @get_link_preview url, offset
        .catch (error) ->
          throw error if error not instanceof z.links.LinkPreviewError

  ###
  Creates link preview for given link. This will upload associated image as asset and will
  resolve with an z.proto.LinkPreview instance

  @param url [String]
  @param offset [Number] starting index of the link
  ###
  get_link_preview: (url, offset = 0) ->
    open_graph_data = null

    Promise.resolve()
    .then =>
      if window.openGraph
        return @_fetch_open_graph_data url
      throw new z.links.LinkPreviewError z.links.LinkPreviewError::TYPE.NOT_SUPPORTED
    .then (data) ->
      open_graph_data = data
      if open_graph_data
        return z.links.LinkPreviewProtoBuilder.build_from_open_graph_data open_graph_data, url, offset
      throw new z.links.LinkPreviewError z.links.LinkPreviewError::TYPE.NO_DATA_AVAILABLE
    .then (link_preview) ->
      if link_preview?
        return link_preview
      throw new z.links.LinkPreviewError z.links.LinkPreviewError::TYPE.UNSUPPORTED_TYPE
    .then (link_preview) =>
      return @_fetch_preview_image link_preview, open_graph_data.image

  ###
  Fetch and upload open graph images

  ###
  _fetch_preview_image: (link_preview, open_graph_image) ->
    if link_preview.preview is 'article' and open_graph_image?.data
      return @_upload_preview_image open_graph_image.data
      .then (asset) ->
        link_preview.article.set 'image', asset
        return link_preview
    else
      return link_preview

  ###
  Fetch open graph data

  @param url [String]
  ###
  _fetch_open_graph_data: (link) ->
    return new Promise (resolve) ->
      window.openGraph link, (error, data) ->
        if error then resolve null else resolve data

  ###
  Upload open graph image as asset

  @param data_uri [String] image data as base64 encoded data URI
  ###
  _upload_preview_image: (data_URI) ->
    Promise.resolve()
    .then ->
      return z.util.base64_to_blob data_URI
    .then (blob) =>
      @asset_service.upload_image_asset blob, public: true
