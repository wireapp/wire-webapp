/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import TestPage from 'Util/test/TestPage';
import {LinkPreview} from 'src/script/entity/message/LinkPreview';
import {Text} from 'src/script/entity/message/Text';
import {StatusType} from 'src/script/message/StatusType';
import LinkPreviewAssetComponent, {LinkPreviewAssetProps} from './LinkPreviewAssetComponent';

class LinkPreviewAssetComponentTestPage extends TestPage<LinkPreviewAssetProps> {
  constructor(props?: LinkPreviewAssetProps) {
    super(LinkPreviewAssetComponent, props);
  }

  getLinkPreviewTitle = () => this.get('[data-uie-name="link-preview-title"]');
  getTweetAuthor = () => this.get('[data-uie-name="link-preview-tweet-author"]');
  getLinkPreviewUrl = () => this.get('[data-uie-name="link-preview-url"]');
}

describe('LinkPreviewAssetComponent', () => {
  function mockLinkPreview(url = 'https://example.com'): ContentMessage {
    const linkPreviewEntity = new LinkPreview({title: 'Link Preview', url});
    const asset = new Text();
    asset.text = url;
    asset.previews([linkPreviewEntity]);

    const message = new ContentMessage();
    message.addAsset(asset);

    return message;
  }

  function mockTweet(): ContentMessage {
    const linkPreviewEntity = new LinkPreview({
      title: 'Link Preview',
      tweet: {
        author: 'jack',
        username: 'jack',
      },
      url: 'https://twitter.com/jack/status/20',
    });
    const asset = new Text();
    asset.text = 'https://twitter.com/jack/status/20';
    asset.previews([linkPreviewEntity]);

    const message = new ContentMessage();
    message.addAsset(asset);

    return message;
  }

  it('renders link previews', () => {
    const testPage = new LinkPreviewAssetComponentTestPage({
      message: mockLinkPreview(),
    });

    const linkPreviewUploadMessage = testPage.getLinkPreviewTitle();
    expect(linkPreviewUploadMessage.exists()).toBeTruthy();
  });

  it('does not render link previews from timed-out / obfuscated messages', () => {
    const message = mockLinkPreview();
    message.ephemeral_expires(true);
    message.status(StatusType.SENT);

    const testPage = new LinkPreviewAssetComponentTestPage({
      message,
    });

    const linkPreviewUploadMessage = testPage.getLinkPreviewTitle();
    expect(linkPreviewUploadMessage.exists()).toBeFalsy();
  });

  it('displays the author if the link is a tweet', () => {
    const message = mockTweet();

    const testPage = new LinkPreviewAssetComponentTestPage({
      message,
    });

    const linkPreviewUploadMessage = testPage.getLinkPreviewTitle();
    expect(linkPreviewUploadMessage.exists()).toBeTruthy();

    const linkPreviewTweetAuthor = testPage.getTweetAuthor();
    expect(linkPreviewTweetAuthor.exists()).toBeTruthy();
  });

  it('cleans the preview URL', () => {
    const message = mockLinkPreview('http://example.com');

    const testPage = new LinkPreviewAssetComponentTestPage({
      message,
    });

    const linkPreviewUploadMessage = testPage.getLinkPreviewTitle();
    expect(linkPreviewUploadMessage.exists()).toBeTruthy();

    const linkPreviewUrlElement = testPage.getLinkPreviewUrl();
    expect(linkPreviewUrlElement.exists()).toBeTruthy();
    expect(linkPreviewUrlElement.text()).toBe('example.com');
  });
});
