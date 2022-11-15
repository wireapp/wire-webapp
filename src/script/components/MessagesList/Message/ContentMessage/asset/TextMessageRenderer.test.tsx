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

import {fireEvent, render} from '@testing-library/react';
import ko from 'knockout';

import {PROTO_MESSAGE_TYPE} from 'src/script/cryptography/ProtoMessageType';
import {LinkPreview} from 'src/script/entity/message/LinkPreview';
import type {Text} from 'src/script/entity/message/Text';

import {TextMessageRenderer} from './TextMessageRenderer';

import {MentionEntity} from '../../../../../message/MentionEntity';

const mention = {
  domain: '',
  length: 0,
  startIndex: 1,
  type: PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID,
  userId: '1',
};
const asset: Text = {
  isAudio: jest.fn(),
  isButton: jest.fn(),
  isDownloadable: jest.fn(),
  isFile: jest.fn(),
  isImage: jest.fn(),
  isLocation: jest.fn(),
  isText: jest.fn(),
  isUserMentioned: jest.fn(),
  isVideo: jest.fn(),
  key: '1234',
  mentions: ko.observableArray([new MentionEntity(mention.startIndex, mention.length, mention.userId, mention.domain)]),
  previews: ko.observableArray([new LinkPreview()]),
  render: jest.fn(),
  should_render_text: ko.pureComputed(jest.fn()),
  size: '',
  text: 'this is a default txt message',
  type: 'text',
};
describe('TextMessageRenderer', () => {
  it('renders a text message', () => {
    const onClickElement = jest.fn();
    const txtMsg = 'simple message';
    const {getByText} = render(
      <TextMessageRenderer
        text={txtMsg}
        onClickMsg={onClickElement}
        isCurrentConversationFocused
        msgClass=""
        asset={asset}
      />,
    );
    const txtMsgElement = getByText(txtMsg);
    expect(txtMsgElement).not.toBe(null);

    txtMsgElement.focus();
    fireEvent.keyDown(txtMsgElement);

    // plain text message is not interactive
    expect(onClickElement).not.toHaveBeenCalled();
  });

  it('renders and trigger click/keydown event of mention message correcly', () => {
    const onClickElement = jest.fn();
    const text = `<span class="message-mention" data-uie-name="label-other-mention" data-user-id="1fc1e32d-084b-49be-a392-85377f7208f3" data-user-domain="staging.zinfra.io"><span class="mention-at-sign">@</span>jj</span> yes it is`;
    const {getByTestId} = render(
      <TextMessageRenderer
        text={text}
        onClickMsg={onClickElement}
        isCurrentConversationFocused
        msgClass=""
        asset={asset}
      />,
    );
    const mention = getByTestId('label-other-mention');
    fireEvent.click(mention);
    expect(onClickElement).toHaveBeenCalled();

    fireEvent.keyDown(mention);
    expect(onClickElement).toHaveBeenCalled();
  });

  it('renders a link message and should trigger click/keydown event', () => {
    const onClickElement = jest.fn();

    const linkTxt = 'this is a link';
    const text = `<a href="https://link.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">${linkTxt}</a>`;
    asset.text = linkTxt;

    const {getByText} = render(
      <TextMessageRenderer
        text={text}
        onClickMsg={onClickElement}
        isCurrentConversationFocused
        msgClass=""
        asset={asset}
      />,
    );
    const linkElem = getByText(linkTxt);
    expect(linkElem).not.toBe(null);

    fireEvent.click(linkElem);
    expect(onClickElement).toHaveBeenCalled();

    fireEvent.keyDown(linkElem);
    expect(onClickElement).toHaveBeenCalled();
  });

  it('should not trigger a key event if the message is not focused', () => {
    const onClickElement = jest.fn();

    const linkTxt = 'this is a link';
    const text = `<a href="https://link.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">${linkTxt}</a>`;
    asset.text = linkTxt;

    const {getByText} = render(
      <TextMessageRenderer
        text={text}
        onClickMsg={onClickElement}
        isCurrentConversationFocused={false}
        msgClass=""
        asset={asset}
      />,
    );
    const linkElem = getByText(linkTxt);
    expect(linkElem).not.toBe(null);

    fireEvent.keyDown(linkElem);
    expect(onClickElement).not.toHaveBeenCalled();
  });
});
