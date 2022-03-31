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

import React, {useEffect, useState} from 'react';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Conversation} from '../../entity/Conversation';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {t} from 'Util/LocalizerUtil';
import {isOfCategory, Category} from './utils';
import Icon from 'Components/Icon';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageCategory} from '../../message/MessageCategory';

import FullSearch from './FullSearch';
import CollectionDetails from './CollectionDetails';
import CollectionSection from './CollectionSection';

interface CollectionDetailsProps {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
}

type Categories = Record<Category, ContentMessage[]>;

function splitIntoCategories(messages: ContentMessage[]): Categories {
  return messages.reduce<Categories>(
    (categories, message) => {
      if (message.isExpired()) {
        return categories;
      }

      if (isOfCategory('images', message)) {
        categories.images.push(message);
      } else if (isOfCategory('audio', message)) {
        categories.audio.push(message);
      } else if (isOfCategory('files', message)) {
        categories.files.push(message);
      } else if (isOfCategory('links', message)) {
        categories.links.push(message);
      }
      return categories;
    },
    {
      audio: [],
      files: [],
      images: [],
      links: [],
    },
  );
}

const Collection: React.FC<CollectionDetailsProps> = ({conversation, conversationRepository}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const {display_name} = useKoSubscribableChildren(conversation, ['display_name']);
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [detailCategory, setDetailCategory] = useState<Category | undefined>(undefined);

  useEffect(() => {
    conversationRepository
      .getEventsForCategory(conversation, MessageCategory.LINK_PREVIEW)
      .then(allMessages => setMessages(allMessages as ContentMessage[]));
  }, []);

  useEffect(() => {
    const addItem = (message: ContentMessage) => {
      setMessages(oldMessages => [message].concat(oldMessages));
    };

    const removeItem = (messageId: string, conversationId: string) => {
      if (conversation.id !== conversationId) {
        // A message from a different converation, nothing to do
        return;
      }
      setMessages(oldMessages => oldMessages.filter(message => message.id !== messageId));
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
  }, []);

  const categories = splitIntoCategories(messages);
  const {images, audio, links, files} = categories;

  if (detailCategory && categories[detailCategory].length > 0) {
    return (
      <CollectionDetails
        conversation={conversation}
        messages={categories[detailCategory]}
        onClose={() => setDetailCategory(undefined)}
      />
    );
  }

  const content = searchTerm ? null : (
    <>
      <CollectionSection
        messages={images}
        limit={12}
        uieName={'collection-section-image'}
        onSelect={() => setDetailCategory('images')}
        label={t('collectionSectionImages')}
      >
        <span className={`collection-header-icon icon-library`}></span>
      </CollectionSection>
      <CollectionSection
        messages={links}
        limit={4}
        uieName={'collection-section-link'}
        onSelect={() => setDetailCategory('links')}
        label={t('collectionSectionLinks')}
      >
        <span className={`collection-header-icon icon-link`}></span>
      </CollectionSection>
      <CollectionSection
        messages={audio}
        limit={4}
        uieName={'collection-section-audio'}
        onSelect={() => setDetailCategory('audio')}
        label={t('collectionSectionAudio')}
      >
        <Icon.MicOn className="collection-header-icon" />
      </CollectionSection>
      <CollectionSection
        messages={files}
        limit={4}
        uieName={'collection-section-file'}
        onSelect={() => setDetailCategory('files')}
        label={t('collectionSectionFiles')}
      >
        <span className={`collection-header-icon icon-link`}></span>
      </CollectionSection>
    </>
  );

  return (
    <div id="collection" className="collection content">
      <div className="content-titlebar">
        <div className="content-titlebar-items-left">
          <button
            className="content-titlebar-icon"
            data-uie-name="do-close-collection"
            onClick={() => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {})}
          >
            <Icon.Close />
          </button>
        </div>
        <h2 className="content-titlebar-items-center">{display_name}</h2>
      </div>

      <div className="content-list-wrapper">
        <div className="content-list collection-list">
          <FullSearch
            searchProvider={query => conversationRepository.searchInConversation(conversation, query)}
            change={setSearchTerm}
            click={message => amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {exposeMessage: message})}
          />
          {content}
        </div>
      </div>
    </div>
  );
};

export default Collection;

registerStaticReactComponent('collection', Collection);
