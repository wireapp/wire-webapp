/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

// grunt test_init && grunt test_run:links/LinkPreviewProtoBuilder

describe('LinkPreviewProtoBuilder', function() {
  const compare_article_with_mock = function(url, offset, preview, mock) {
    expect(preview).toBeDefined();
    expect(preview.preview).toBe('article');
    expect(preview.url).toBe(url);
    expect(preview.url_offset).toBe(offset);
    expect(preview.article.title).toBe(mock.title);
    expect(preview.article.permanent_url).toBe(mock.url);
    expect(preview.article.summary).toEqual(mock.description || null);
    expect(() => preview.toArrayBuffer()).not.toThrow();
  };

  beforeAll(function(done) {
    z.util.protobuf.load_protos('ext/proto/generic-message-proto/messages.proto').then(done).catch(done.fail);
  });

  it('returns undefined if no data is given', function() {
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data();
    expect(link_preview).not.toBeDefined();
  });

  it('returns undefined if data is an empty object', function() {
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data({});
    expect(link_preview).not.toBeDefined();
  });

  it('returns undefined if title is missing', function() {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    delete mock.title;
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(mock, url);
    expect(link_preview).not.toBeDefined();
  });

  it('returns a link preview if type is "website" and title is present', function() {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a link preview if type is image is missing', function() {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    delete mock.image;
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a link preview if title is present and offset is given', function() {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(mock, url, 12);
    compare_article_with_mock(url, 12, link_preview, mock);
  });

  it('returns a link preview if type is missing and title is present', function() {
    const url = 'heise.de';
    const mock = OpenGraphMocks.getHeiseMock();
    delete mock.type;
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a link preview even if there is no description', function() {
    const url = 'heise.de';
    const mock = OpenGraphMocks.getHeiseMock();
    delete mock.description;
    const link_preview = z.links.LinkPreviewProtoBuilder.build_from_open_graph_data(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });
});
