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

import React from 'react';
import cx from 'classnames';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {isBeforeToday, formatDateNumeral, formatTimeShort} from 'Util/TimeUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';

import {QualifiedId} from '@wireapp/api-client/src/user';
import {QuoteEntity} from '../../../../message/QuoteEntity';
import {ConversationError} from '../../../../error/ConversationError';
import type {Conversation} from '../../../../entity/Conversation';
import type {ContentMessage} from '../../../../entity/message/ContentMessage';
import type {User} from '../../../../entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {useEffect, useState} from 'react';
import Image from 'Components/Image';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import VideoAsset from './asset/VideoAsset';
import AudioAsset from './asset/AudioAsset';
import FileAssetComponent from './asset/FileAssetComponent';
import LocationAsset from './asset/LocationAsset';
import useEffectRef from 'Util/useEffectRef';
import {Text} from 'src/script/entity/message/Text';

export interface QuoteProps {
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage: (id: string) => void;
  handleClickOnMessage: (message: ContentMessage, event: React.MouseEvent) => void;
  quote: QuoteEntity;
  selfId: QualifiedId;
  showDetail: (message: ContentMessage, event: React.MouseEvent) => void;
  showUserDetails: (user: User) => void;
}

const Quote: React.FC<QuoteProps> = ({
  conversation,
  findMessage,
  focusMessage,
  handleClickOnMessage,
  quote,
  selfId,
  showDetail,
  showUserDetails,
}) => {
  const [quotedMessage, setQuotedMessage] = useState<ContentMessage>();
  const [error, setError] = useState<Error | string>(quote.error);

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

  return !quotedMessage && !error ? (
    <div />
  ) : (
    <div className="message-quote" data-uie-name="quote-item">
      {error ? (
        <div className="message-quote__error" data-uie-name="label-error-quote">
          {t('replyQuoteError')}
        </div>
      ) : (
        <QuotedMessage
          quotedMessage={quotedMessage}
          selfId={selfId}
          focusMessage={focusMessage}
          handleClickOnMessage={handleClickOnMessage}
          showDetail={showDetail}
          showUserDetails={showUserDetails}
        />
      )}
    </div>
  );
};

interface QuotedMessageProps {
  focusMessage: (id: string) => void;
  handleClickOnMessage: (message: ContentMessage | Text, event: React.MouseEvent) => void;
  quotedMessage: ContentMessage;
  selfId: QualifiedId;
  showDetail: (message: ContentMessage, event: React.MouseEvent) => void;
  showUserDetails: (user: User) => void;
}

const QuotedMessage: React.FC<QuotedMessageProps> = ({
  quotedMessage,
  focusMessage,
  selfId,
  handleClickOnMessage,
  showDetail,
  showUserDetails,
}) => {
  const {
    user: quotedUser,
    assets: quotedAssets,
    headerSenderName,
    was_edited,
    timestamp,
    edited_timestamp,
  } = useKoSubscribableChildren(quotedMessage, [
    'user',
    'assets',
    'headerSenderName',
    'was_edited',
    'timestamp',
    'edited_timestamp',
  ]);
  const [canShowMore, setCanShowMore] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [textQuoteElement, setTextQuoteElement] = useEffectRef();

  useEffect(() => {
    setShowFullText(false);
  }, [quotedMessage]);

  useEffect(() => {
    if (textQuoteElement) {
      const preNode = textQuoteElement.querySelector('pre');
      const width = Math.max(textQuoteElement.scrollWidth, preNode ? preNode.scrollWidth : 0);
      const height = Math.max(textQuoteElement.scrollHeight, preNode ? preNode.scrollHeight : 0);
      const isWider = width > textQuoteElement.clientWidth;
      const isHigher = height > textQuoteElement.clientHeight;
      setCanShowMore(isWider || isHigher);
    }
  }, [textQuoteElement, edited_timestamp]);

  return (
    <>
      <div className="message-quote__sender">
        <span onClick={() => showUserDetails(quotedUser)} data-uie-name="label-name-quote">
          {headerSenderName}
        </span>
        {was_edited && (
          <span data-uie-name="message-edited-quote" title={quotedMessage.displayEditedTimestamp()}>
            <Icon.Edit />
          </span>
        )}
      </div>
      {quotedAssets.map((asset, index) => (
        <React.Fragment key={index}>
          {asset.isImage() && (
            <div data-uie-name="media-picture-quote">
              <Image
                className="message-quote__image"
                asset={asset.resource()}
                aspectRatio={asset.ratio}
                click={(asset, event) => showDetail(quotedMessage, event)}
              />
            </div>
          )}

          {asset.isText() && (
            <>
              <div
                className={cx('message-quote__text', {
                  'message-quote__text--full': showFullText,
                  'message-quote__text--large': includesOnlyEmojis(asset.text),
                })}
                ref={setTextQuoteElement}
                onClick={event => handleClickOnMessage(asset, event)}
                dangerouslySetInnerHTML={{__html: asset.render(selfId)}}
                dir="auto"
                data-uie-name="media-text-quote"
              />
              {canShowMore && (
                <div
                  className="message-quote__text__show-more"
                  onClick={() => setShowFullText(!showFullText)}
                  data-uie-name="do-show-more-quote"
                >
                  <span>{showFullText ? t('replyQuoteShowLess') : t('replyQuoteShowMore')}</span>
                  <Icon.Disclose
                    className={cx('disclose-icon', {
                      'upside-down': showFullText,
                    })}
                  />
                </div>
              )}
            </>
          )}

          {asset.isVideo() && (
            <VideoAsset
              isQuote
              message={quotedMessage}
              // className="message-quote__video"
              data-uie-name="media-video-quote"
            />
          )}

          {asset.isAudio() && (
            <AudioAsset message={quotedMessage} className="message-quote__audio" data-uie-name="media-audio-quote" />
          )}

          {asset.isFile() && (
            <FileAssetComponent
              message={quotedMessage}
              // className="message-quote__file"
              data-uie-name="media-file-quote"
            />
          )}

          {asset.isLocation() && <LocationAsset asset={asset} data-uie-name="media-location-quote" />}
        </React.Fragment>
      ))}
      <div
        className="message-quote__timestamp"
        onClick={() => {
          if (quotedMessage) {
            focusMessage(quotedMessage.id);
          }
        }}
        data-uie-name="label-timestamp-quote"
      >
        {isBeforeToday(timestamp)
          ? t('replyQuoteTimeStampDate', formatDateNumeral(timestamp))
          : t('replyQuoteTimeStampTime', formatTimeShort(timestamp))}
      </div>
    </>
  );
};

export default Quote;
