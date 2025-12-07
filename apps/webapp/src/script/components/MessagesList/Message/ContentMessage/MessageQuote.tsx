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

import {FC, Fragment, MouseEvent as ReactMouseEvent, useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import cx from 'classnames';
import * as Icon from 'Components/Icon';
import {AssetImage} from 'Components/Image';
import type {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Text} from 'Repositories/entity/message/Text';
import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';
import {t} from 'Util/LocalizerUtil';
import {formatDateNumeral, formatTimeShort, isBeforeToday} from 'Util/TimeUtil';

import {WebAppEvents} from '@wireapp/webapp-events';

import {AudioAsset} from './asset/AudioAsset/AudioAsset';
import {FileAsset} from './asset/FileAsset/FileAsset';
import {LocationAsset} from './asset/LocationAsset';
import {TextMessageRenderer} from './asset/TextMessageRenderer';
import {VideoAsset} from './asset/VideoAsset/VideoAsset';

import {MessageActions} from '..';
import {ConversationError} from '../../../../error/ConversationError';
import {QuoteEntity} from '../../../../message/QuoteEntity';
import {useMessageFocusedTabIndex} from '../util';

function createPlaceholderMessage() {
  const message = new ContentMessage();
  const user = new User();
  user.name(' ');
  message.user(user);
  const textAsset = new Text('fake-text', ' ');
  message.assets.push(textAsset);
  return message;
}

interface QuoteProps {
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage: (id: string) => void;
  handleClickOnMessage: MessageActions['onClickMessage'];
  quote: QuoteEntity;
  selfId: QualifiedId;
  showDetail: (message: ContentMessage, event: ReactMouseEvent) => void;
  showUserDetails: (user: User) => void;
  isMessageFocused: boolean;
}

export const Quote: FC<QuoteProps> = ({
  conversation,
  findMessage,
  focusMessage,
  handleClickOnMessage,
  quote,
  selfId,
  showDetail,
  showUserDetails,
  isMessageFocused,
}) => {
  const [quotedMessage, setQuotedMessage] = useState<ContentMessage>();
  const [error, setError] = useState<Error | string | undefined>(quote.error);

  useEffect(() => {
    const handleQuoteDeleted = (messageId: string) => {
      if (quotedMessage?.id === messageId) {
        setError(QuoteEntity.ERROR.MESSAGE_NOT_FOUND);
        setQuotedMessage(undefined);
      }
    };

    const handleQuoteUpdated = (originalMessageId: string, messageEntity: ContentMessage) => {
      if (quotedMessage?.id === originalMessageId) {
        setQuotedMessage(messageEntity);
      }
    };

    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleQuoteDeleted);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleQuoteUpdated);

    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleQuoteDeleted);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleQuoteUpdated);
    };
  }, [quotedMessage]);

  useEffect(() => {
    if (!error && quote.messageId) {
      findMessage(conversation, quote.messageId)
        .then(message => {
          setQuotedMessage(message as ContentMessage);
        })
        .catch(error => {
          if (error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND) {
            return setError(QuoteEntity.ERROR.MESSAGE_NOT_FOUND);
          }
          throw error;
        });
    }
  }, [quote, error]);

  return (
    <div className="message-quote" data-uie-name="quote-item">
      {error ? (
        <div className="message-quote__error" data-uie-name="label-error-quote">
          {t('replyQuoteError')}
        </div>
      ) : (
        <QuotedMessage
          quotedMessage={quotedMessage ?? createPlaceholderMessage()}
          selfId={selfId}
          focusMessage={focusMessage}
          handleClickOnMessage={handleClickOnMessage}
          showDetail={showDetail}
          showUserDetails={showUserDetails}
          isMessageFocused={isMessageFocused}
        />
      )}
    </div>
  );
};

interface QuotedMessageProps {
  focusMessage: (id: string) => void;
  handleClickOnMessage: MessageActions['onClickMessage'];
  quotedMessage: ContentMessage;
  selfId: QualifiedId;
  showDetail: (message: ContentMessage, event: ReactMouseEvent) => void;
  showUserDetails: (user: User) => void;
  isMessageFocused: boolean;
}

const QuotedMessage: FC<QuotedMessageProps> = ({
  quotedMessage,
  focusMessage,
  selfId,
  handleClickOnMessage,
  showDetail,
  showUserDetails,
  isMessageFocused,
}) => {
  const {user, assets, senderName, was_edited, timestamp} = useKoSubscribableChildren(quotedMessage, [
    'user',
    'assets',
    'senderName',
    'was_edited',
    'timestamp',
  ]);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);

  return (
    <>
      <div className="message-quote__sender">
        <button
          type="button"
          className="button-reset-default text-left"
          onClick={() => showUserDetails(user)}
          data-uie-name="label-name-quote"
          tabIndex={messageFocusedTabIndex}
        >
          {senderName}
        </button>
        {was_edited && (
          <span data-uie-name="message-edited-quote" title={quotedMessage.displayEditedTimestamp()}>
            <Icon.EditIcon />
          </span>
        )}
      </div>
      {assets.map((asset, index) => (
        <Fragment key={index}>
          {asset.isImage() && (
            <div data-uie-name="media-picture-quote">
              <AssetImage
                className="message-quote__image"
                imageStyles={{objectFit: 'cover'}}
                image={asset}
                onClick={event => showDetail(quotedMessage, event)}
              />
            </div>
          )}

          {asset.isText() && (
            <TextMessageRenderer
              onMessageClick={handleClickOnMessage}
              text={asset.render(selfId)}
              className={cx('message-quote__text', {
                'message-quote__text--large': includesOnlyEmojis(asset.text),
              })}
              isFocusable={isMessageFocused}
              data-uie-name="media-text-quote"
              collapse
            />
          )}

          {asset.isVideo() && (
            <VideoAsset
              isQuote
              message={quotedMessage}
              // className="message-quote__video"
              data-uie-name="media-video-quote"
              isFocusable={isMessageFocused}
            />
          )}

          {asset.isAudio() && (
            <AudioAsset
              message={quotedMessage}
              className="message-quote__audio"
              data-uie-name="media-audio-quote"
              isFocusable={isMessageFocused}
            />
          )}

          {asset.isFile() && (
            <FileAsset
              message={quotedMessage}
              // className="message-quote__file"
              data-uie-name="media-file-quote"
              isFocusable={isMessageFocused}
            />
          )}

          {asset.isLocation() && <LocationAsset asset={asset} data-uie-name="media-location-quote" />}
        </Fragment>
      ))}
      <button
        type="button"
        className="button-reset-default message-quote__timestamp"
        onClick={() => {
          if (quotedMessage) {
            focusMessage(quotedMessage.id);
          }
        }}
        data-uie-name="label-timestamp-quote"
        tabIndex={messageFocusedTabIndex}
      >
        {isBeforeToday(timestamp)
          ? t('replyQuoteTimeStampDate', {date: formatDateNumeral(timestamp)})
          : t('replyQuoteTimeStampTime', {time: formatTimeShort(timestamp)})}
      </button>
    </>
  );
};
