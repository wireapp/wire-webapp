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
import {Category, CollectionItem, isOfCategory} from './CollectionItem';
import Icon from 'Components/Icon';
import FullSearch from '../../page/collection/FullSearch';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageCategory} from '../../message/MessageCategory';
import CollectionDetails from './CollectionDetails';

interface CollectionDetailsProps {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
}

const Section: React.FC<{
  limit: number;
  messages: ContentMessage[];
  onSelect: () => void;
  uieName: string;
}> = ({messages, limit, uieName, onSelect, children}) => {
  if (messages.length === 0) {
    return null;
  }
  const hasExtra = messages.length > limit;
  const topMessages = messages.slice(0, limit);

  return (
    <section className="collection-section" data-uie-collection-size={messages.length} data-uie-name={uieName}>
      <header>
        {children}
        {hasExtra && (
          <button className="collection-header-all accent-text" onClick={() => onSelect()}>
            <span data-uie-name="collection-show-all">{t('collectionShowAll', messages.length)}</span>
            &nbsp;<span className="icon-forward font-size-xxs"></span>
          </button>
        )}
      </header>
      <div className="collection-images">
        {topMessages.map(message => (
          <CollectionItem message={message} allMessages={[]} key={message.id} />
        ))}
      </div>
    </section>
  );
};

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
      video: [],
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
      <Section
        messages={images}
        limit={12}
        uieName={'collection-section-image'}
        onSelect={() => setDetailCategory('images')}
      >
        <span className={`collection-header-icon icon-library`}></span>
        <span className="label-bold-xs">{t('collectionSectionImages')}</span>
      </Section>
      <Section
        messages={links}
        limit={4}
        uieName={'collection-section-link'}
        onSelect={() => setDetailCategory('links')}
      >
        <span className={`collection-header-icon icon-link`}></span>
        <span className="label-bold-xs">{t('collectionSectionLinks')}</span>
      </Section>
      <Section
        messages={audio}
        limit={4}
        uieName={'collection-section-audio'}
        onSelect={() => setDetailCategory('audio')}
      >
        <Icon.MicOn className="collection-header-icon" />
        <span className="label-bold-xs">{t('collectionSectionAudio')}</span>
      </Section>
      <Section
        messages={files}
        limit={4}
        uieName={'collection-section-files'}
        onSelect={() => setDetailCategory('files')}
      >
        <span className={`collection-header-icon icon-link`}></span>
        <span className="label-bold-xs">{t('collectionSectionFiles')}</span>
      </Section>
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
        <span className="content-titlebar-items-center">{display_name}</span>
      </div>

      <div className="content-list-wrapper">
        <div className="content-list collection-list" data-bind="fadingscrollbar: true">
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
