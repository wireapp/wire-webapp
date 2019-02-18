/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

const OpenGraphMocks = {
  getHeiseMock: function() {
    return {
      description:
        'Eine Woche nach ihrer Ankunft im System hat die NASA-Sonde Juno ein erstes Bild aus dem Orbit um den Jupiter gemacht und zur Erde geschickt.',
      image: {
        url: 'http://www.heise.de/imgs/18/1/8/5/1/3/4/6/PIA20707-68c99730783b54fb.jpeg',
      },
      locale: 'de_DE',
      site_name: 'heise online',
      title: 'Jupiter-Sonde Juno: Das erste Foto aus dem Orbit',
      type: 'website',
      url: 'http://www.heise.de/newsticker/meldung/Jupiter-Sonde-Juno-Das-erste-Foto-aus-dem-Orbit-3265536.html',
    };
  },

  getWireMock: function() {
    return {
      description:
        'HD quality calls, private and group chats with inline photos, music and video. Secure and perfectly synced across your devices.',
      image: {
        url:
          'https://lh3.ggpht.com/ElqTCcY1N0c3EAX27MRFoXynZlbTaJD2KEqYNXAPn5YQPZa6Bvsux4NCgEMoUhazdIWWelAU__Kzmr55j55EsgM=s1024',
      },
      title: 'Wire · Modern communication, full privacy. For iOS, Android, macOS, Windows and web.',
      type: 'website',
      url: 'https://wire.com/',
    };
  },
};

describe('LinkPreviewProtoBuilder', () => {
  const compare_article_with_mock = function(url, offset, preview, mock) {
    expect(preview).toBeDefined();
    expect(preview.preview).toBe('article');
    expect(preview.url).toBe(url);
    expect(preview.url_offset).toBe(offset);
    expect(preview.article.title).toBe(mock.title || '');
    expect(preview.article.permanent_url).toBe(mock.url);
    expect(preview.article.summary).toEqual(mock.description || '');
    expect(() => preview.toArrayBuffer()).not.toThrow();
  };

  beforeAll(() => z.util.protobuf.loadProtos('ext/js/@wireapp/protocol-messaging/proto/messages.proto'));

  it('returns undefined if no data is given', () => {
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData();

    expect(link_preview).not.toBeDefined();
  });

  it('returns undefined if data is an empty object', () => {
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData({});

    expect(link_preview).not.toBeDefined();
  });

  it('returns undefined if title is missing', () => {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    delete mock.title;
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url);

    expect(link_preview).not.toBeDefined();
  });

  it('returns a link preview if type is "website" and title is present', () => {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a link preview if type is image is missing', () => {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    delete mock.image;
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a link preview if title is present and offset is given', () => {
    const url = 'wire.com';
    const mock = OpenGraphMocks.getWireMock();
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url, 12);
    compare_article_with_mock(url, 12, link_preview, mock);
  });

  it('returns a link preview if type is missing and title is present', () => {
    const url = 'heise.de';
    const mock = OpenGraphMocks.getHeiseMock();
    delete mock.type;
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a link preview even if there is no description', () => {
    const url = 'heise.de';
    const mock = OpenGraphMocks.getHeiseMock();
    delete mock.description;
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });

  it('returns a regular link preview even if site name is Twitter', () => {
    const url = 'heise.de';
    const mock = OpenGraphMocks.getHeiseMock();
    mock.site_name = 'Twitter';
    const link_preview = z.links.LinkPreviewProtoBuilder.buildFromOpenGraphData(mock, url);
    compare_article_with_mock(url, 0, link_preview, mock);
  });
});
