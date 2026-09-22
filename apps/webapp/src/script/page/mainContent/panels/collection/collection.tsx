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

import {useEffect, useState} from 'react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {amplify} from 'amplify';

import {ChevronIcon, SecondaryButton} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/icon';
import {showDetailViewModal} from 'Components/Modals/DetailViewModal';
import {AssetRepository} from 'Repositories/assets/assetRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {User} from 'Repositories/entity/User';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate} from 'src/script/router/routerBindings';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {CollectionDetails} from './collectionDetails';
import {CollectionSection} from './collectionSection';
import {FullSearch} from './fullSearch';
import {Category, isOfCategory} from './utils';

import {MessageCategory} from '../../../../message/messageCategory';

type CollectionProps = {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  assetRepository: AssetRepository;
  messageRepository: MessageRepository;
  selfUser: User;
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
    },
  );
}

function Collection(props: CollectionProps) {
  const {conversation, conversationRepository, assetRepository, messageRepository, selfUser} = props;
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const {display_name, cellsState} = useKoSubscribableChildren(conversation, ['display_name', 'cellsState']);
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [detailCategory, setDetailCategory] = useState<Category | undefined>(undefined);

  useEffect(() => {
    void conversationRepository
      .getEventsForCategory(conversation, MessageCategory.LINK_PREVIEW)
      .then(allMessages => setMessages(allMessages as ContentMessage[]));
  }, [conversation, conversationRepository]);

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
  }, [conversation.id]);

  const categories = splitIntoCategories(messages);
  const {images, audio, links, files} = categories;

  const onImageClick = (message: ContentMessage) => {
    showDetailViewModal({
      assetRepository,
      conversationRepository,
      currentMessageEntity: message,
      fireAndForgetInvoker,
      messageRepository,
      selfUser,
      translate,
    });
  };

  if (detailCategory && categories[detailCategory].length > 0) {
    return (
      <CollectionDetails
        conversation={conversation}
        messages={categories[detailCategory]}
        onClose={() => setDetailCategory(undefined)}
        onImageClick={onImageClick}
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
        onImageClick={onImageClick}
        label={translate('collectionSectionImages')}
      >
        <span className={`collection-header-icon icon-library`}></span>
      </CollectionSection>
      <CollectionSection
        messages={links}
        limit={4}
        uieName={'collection-section-link'}
        onSelect={() => setDetailCategory('links')}
        label={translate('collectionSectionLinks')}
      >
        <span className={`collection-header-icon icon-link`}></span>
      </CollectionSection>
      <CollectionSection
        messages={audio}
        limit={4}
        uieName={'collection-section-audio'}
        onSelect={() => setDetailCategory('audio')}
        label={translate('collectionSectionAudio')}
      >
        <Icon.MicOnIcon className="collection-header-icon" />
      </CollectionSection>
      <CollectionSection
        messages={files}
        limit={4}
        uieName={'collection-section-file'}
        onSelect={() => setDetailCategory('files')}
        label={translate('collectionSectionFiles')}
      >
        <span className={`collection-header-icon icon-file`}></span>
      </CollectionSection>
    </>
  );

  const filesUrl = generateConversationUrl({...conversation.qualifiedId, filePath: 'files'});
  const isCellsEnabled =
    Config.getConfig().FEATURE.ENABLE_CELLS &&
    cellsState !== undefined &&
    cellsState !== CONVERSATION_CELLS_STATE.DISABLED;

  return (
    <div id="collection" className="collection content">
      <div className="content-titlebar">
        <div className="content-titlebar-items-left">
          <button
            className="content-titlebar-icon"
            data-uie-name="do-close-collection"
            onClick={createNavigate(generateConversationUrl(conversation))}
            aria-label={translate('fullsearchCancelLabel')}
          >
            <Icon.CloseIcon />
          </button>
        </div>
        <h2 className="content-titlebar-items-center">{display_name}</h2>
      </div>

      <div className="content-list-wrapper">
        <div className="content-list collection-list">
          <FullSearch
            searchProvider={(query, abortSignal) => {
              return conversationRepository.searchInConversation(conversation, query, abortSignal);
            }}
            change={setSearchTerm}
            click={message => {
              amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {exposeMessage: message});
            }}
          />
          {isCellsEnabled && (
            <SecondaryButton onClick={createNavigate(filesUrl)} fullWidth={true} uieName="shared-drive-id">
              <span data-secondary-button-content="true">
                <span data-secondary-button-title="true">{translate('cells.sharedDrive.title')}</span>
                <span data-secondary-text="true">{translate('cells.sharedDrive.description')}</span>
              </span>
              <span data-secondary-button-chevron="true" aria-hidden="true">
                <ChevronIcon width={16} height={16} color="currentColor" />
              </span>
            </SecondaryButton>
          )}
          {content}
        </div>
      </div>
    </div>
  );
}

export {Collection};
