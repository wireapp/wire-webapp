/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {Fragment, useEffect, useState} from 'react';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Conversation} from '../../entity/Conversation';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import useEffectRef from 'Util/useEffectRef';

import Image from 'Components/Image';
import FileAssetComponent from 'Components/MessagesList/Message/ContentMessage/asset/FileAssetComponent';
import AudioAsset from 'Components/MessagesList/Message/ContentMessage/asset/AudioAsset';
import LinkPreviewAssetComponent from 'Components/MessagesList/Message/ContentMessage/asset/LinkPreviewAssetComponent';

import {MessageCategory} from '../../message/MessageCategory';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {isToday, isThisYear, formatLocale} from 'Util/TimeUtil';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {t} from 'Util/LocalizerUtil';

type Category = 'images' | 'links' | 'files' | 'audio' | 'video';
interface CollectionDetailsProps {
  category: Category;
  conversation: Conversation;
  messages: ContentMessage[];
}

type GroupedCollection = [string, ContentMessage[]][];

const getTitleForHeader = (timestamp: number) => {
  if (isToday(timestamp)) {
    return t('conversationToday');
  }
  return isThisYear(timestamp) ? formatLocale(timestamp, 'MMMM') : formatLocale(timestamp, 'MMMM y');
};

const groupByDate = (messages: ContentMessage[]): GroupedCollection => {
  return Object.entries(
    messages.reduce<{[group: string]: ContentMessage[]}>((groups, message) => {
      const group = getTitleForHeader(message.timestamp());
      groups[group] = groups[group] || [];
      groups[group].unshift(message);
      return groups;
    }, {}),
  );
};

const isOfCategory = (category: Category, message: ContentMessage) => {
  switch (category) {
    case 'images':
      return message.category & MessageCategory.IMAGE;
    case 'links':
      return message.category & MessageCategory.LINK;
    case 'files':
      return message.getFirstAsset().isFile();
    case 'audio':
      return message.getFirstAsset().isAudio();
    case 'video':
      return message.getFirstAsset().isVideo();
    default:
      return false;
  }
};

const CollectionItem: React.FC<{message: ContentMessage}> = ({message}) => {
  if (isOfCategory('images', message)) {
    return (
      <Image
        className="collection-image"
        asset={(message.getFirstAsset() as MediumImage).resource()}
        click={() => {} /*function() {$parent.clickOnImage(messageEntity)}*/}
      />
    );
  }
  if (isOfCategory('links', message)) {
    return <LinkPreviewAssetComponent message={message} header={true} />;
  }
  if (isOfCategory('files', message)) {
    return <FileAssetComponent className="collection-file" message={message} header={true} />;
  }
  if (isOfCategory('audio', message)) {
    return <AudioAsset className="collection-file" message={message} hasHeader={true} />;
  }
  if (isOfCategory('video', message)) {
    return <FileAssetComponent className="collection-file" message={message} hasHeader={true} />;
  }
  return null;
};

const CollectionDetails: React.FC<CollectionDetailsProps> = ({conversation, category, messages: initialMessages}) => {
  const {display_name} = useKoSubscribableChildren(conversation, ['display_name']);
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  const [messages, setMessages] = useState<ContentMessage[]>(initialMessages);
  useFadingScrollbar(scrollbarRef);

  useEffect(() => {
    const addItem = (message: ContentMessage) => {
      if (!isOfCategory(category, message)) {
        return;
      }
      setMessages([message].concat(messages));
    };

    const removeItem = (messageId: string, conversationId: string) => {
      if (conversation.id !== conversationId) {
        // A message from a different converation, nothing to do
        return;
      }
      // TODO if empty, go back
      setMessages(messages.filter(message => message.id !== messageId));
    };

    const removeMessage = (message: ContentMessage) => {
      removeItem(message.id, message.conversation_id);
    };

    amplify.subscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, removeMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, addItem);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, removeItem);
    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, removeMessage);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, addItem);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, removeItem);
    };
  });

  return (
    <div id="collection-details" className="collection-details content">
      <div className="content-titlebar">
        <div className="content-titlebar-items-left">
          <span
            className="content-titlebar-icon icon-back"
            data-uie-name="do-collection-details-close"
            onClick={() => {
              amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.COLLECTION);
            }}
          ></span>
        </div>
        <span className="content-titlebar-items-center" data-uie-name="collection-details-conversation-name">
          {display_name}
        </span>
      </div>

      <div className="content-list-wrapper">
        <div className="content-list collection-list" ref={setScrollbarRef}></div>
        <div className="collection-images">
          {groupByDate(messages).map(([groupName, groupMessages]) => {
            return (
              <Fragment key={groupName}>
                <header className="collection-date-separator">{groupName}</header>
                {groupMessages.map(message => (
                  <CollectionItem message={message} key={message.id} />
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CollectionDetails;

registerStaticReactComponent('collection-details', CollectionDetails);
