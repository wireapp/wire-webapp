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

# grunt test_init && grunt test_run:links/LinkPreviewProtoBuilder

compare_article_with_mock = (url, offset, preview, mock) ->
  expect(preview).toBeDefined()
  expect(preview.preview).toBe 'article'
  expect(preview.url).toBe url
  expect(preview.url_offset).toBe offset
  expect(preview.article.title).toBe mock.title
  expect(preview.article.permanent_url).toBe mock.url
  expect(preview.article.summary).toBe mock.description
  expect(-> preview.toArrayBuffer()).not.toThrow()

beforeAll (done) ->
  z.util.protobuf.load_protos 'ext/proto/generic-message-proto/messages.proto'
  .then -> done()

describe 'build_from_open_graph_data', ->
  it 'returns undefined if no data is given', ->
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data()
    expect(link_preview).not.toBeDefined()

  it 'returns undefined if data is an empty object', ->
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data {}
    expect(link_preview).not.toBeDefined()

  it 'returns a link preview if type is "website" and title is present', ->
    url = 'wire.com'
    mock = OpenGraphMocks.getWireMock()
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url
    compare_article_with_mock url, 0, link_preview, mock

  it 'returns a link preview if type is "website" and title is present but without an image', ->
    url = 'wire.com'
    mock = OpenGraphMocks.getWireMock()
    delete mock.image
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url
    compare_article_with_mock url, 0, link_preview, mock

  it 'returns a link preview if type is "website" and title is present', ->
    url = 'wire.com'
    mock = OpenGraphMocks.getWireMock()
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url, 12
    compare_article_with_mock url, 12, link_preview, mock

  it 'returns a link preview if type is "article" and title is present', ->
    url = 'heise.de'
    mock = OpenGraphMocks.getHeiseMock()
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url
    compare_article_with_mock url, 0, link_preview, mock

  it 'returns a link preview if type is unspecified and title is present', ->
    url = 'heise.de'
    mock = OpenGraphMocks.getHeiseMock()
    delete mock.type
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url
    compare_article_with_mock url, 0, link_preview, mock

  it 'returns undefined if title is missing', ->
    url = 'wire.com'
    mock = OpenGraphMocks.getWireMock()
    delete mock.title
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url
    expect(link_preview).not.toBeDefined()

  it 'returns undefined if type is unsupported', ->
    url = 'https://open.spotify.com/track/2pucDx5Wyz9uHCou4wntHa'
    mock = OpenGraphMocks.getSpotifyMock()
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data mock, url
    expect(link_preview).not.toBeDefined()

  it 'returns a link preview if type is "object"', ->
    data =
      'image':
        'url': 'data:image/png;base64,PLACEHOLDER'
      'site_name': 'GitHub'
      'type': 'object'
      'title': 'wireapp/wire-webapp'
      'url': 'https://github.com/wireapp/wire-webapp'
      'description': 'wire-webapp - 👽 Wire for Web'

    link = 'https://github.com/wireapp/wire-webapp'
    link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data data, link
    expect(link_preview.article.title).toBe data.title
