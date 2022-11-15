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

import {FC, KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';

import {WebAppEvents} from '@wireapp/webapp-events';

import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {renderElement} from 'Util/renderElement';

import {DetailViewModalFooter} from './DetailViewModalFooter';
import {DetailViewModalHeader} from './DetailViewModalHeader';

import {AssetRepository} from '../../../assets/AssetRepository';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {MessageRepository} from '../../../conversation/MessageRepository';
import {Conversation} from '../../../entity/Conversation';
import {ContentMessage} from '../../../entity/message/ContentMessage';
import {MediumImage} from '../../../entity/message/MediumImage';
import {isContentMessage} from '../../../guards/Message';
import {MessageCategory} from '../../../message/MessageCategory';
import {isOfCategory} from '../../../page/MainContent/panels/Collection/utils';

interface DetailViewModalProps {
  readonly assetRepository: AssetRepository;
  readonly conversationRepository: ConversationRepository;
  readonly messageRepository: MessageRepository;
  currentMessageEntity: ContentMessage;
  onClose?: () => void;
}

const DetailViewModal: FC<DetailViewModalProps> = ({
  assetRepository,
  conversationRepository,
  messageRepository,
  currentMessageEntity,
  onClose,
}) => {
  const currentMessageEntityId = useRef<string>(currentMessageEntity.id);

  const [conversationEntity, setConversationEntity] = useState<Conversation | null>(null);
  const [messageEntity, setMessageEntity] = useState<ContentMessage | null>(currentMessageEntity);
  const [items, setItems] = useState<ContentMessage[]>([]);

  const [isImageVisible, setIsImageVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  const onCloseClick = () => {
    document.removeEventListener('keydown', onKeyDownLightBox);

    setIsImageVisible(false);
    window.URL.revokeObjectURL(imageSrc);
    setItems([]);

    setTimeout(() => {
      setImageSrc('');
      onClose?.();
    }, 150);
  };

  const handleOnClosePress = (event: KeyboardEvent | ReactKeyboardEvent<HTMLButtonElement>) => {
    handleKeyDown(event, onCloseClick);
  };

  const onLikeClick = async (conversation: Conversation, message: ContentMessage) => {
    messageRepository.toggleLike(conversation, message);

    const updatedMessage = await messageRepository.getMessageInConversationById(conversation, message.id);
    setItems(prevState => prevState.map(item => (item.id === message.id ? updatedMessage : item)));
  };

  const onReplyClick = (conversation: Conversation, message: ContentMessage) => {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {});
    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, message);

    onCloseClick();
  };

  const onDownloadClick = (message: ContentMessage) => message.download(assetRepository);

  const loadImage = (contentMessage: ContentMessage) => {
    setIsImageVisible(false);

    assetRepository.load((contentMessage.getFirstAsset() as MediumImage).resource()).then(blob => {
      if (blob) {
        setImageSrc(window.URL.createObjectURL(blob));
        setIsImageVisible(true);
      }
    });
  };

  const iterateImage = (reverse = false) => {
    const currentIndex = items.findIndex(item => item.id === currentMessageEntityId.current);

    if (currentIndex === -1) {
      return;
    }

    const lastIndex = items.length - 1;
    let nextIndex = currentIndex;

    if (reverse) {
      nextIndex = nextIndex === 0 ? lastIndex : currentIndex - 1;
    } else {
      nextIndex = nextIndex === lastIndex ? 0 : currentIndex + 1;
    }

    const newMessageEntity = items[nextIndex];

    if (newMessageEntity) {
      currentMessageEntityId.current = newMessageEntity.id;
      loadImage(newMessageEntity);
      setMessageEntity(newMessageEntity);
    }
  };

  const clickOnShowNext = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    iterateImage(true);
  };

  const clickOnShowPrevious = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    iterateImage();
  };

  const onKeyDownLightBox = async (keyboardEvent: KeyboardEvent) => {
    switch (keyboardEvent.key) {
      case KEY.ESC: {
        onCloseClick();
        break;
      }

      case KEY.ARROW_DOWN:
      case KEY.ARROW_RIGHT: {
        clickOnShowNext(keyboardEvent);
        break;
      }

      case KEY.ARROW_LEFT:
      case KEY.ARROW_UP: {
        clickOnShowPrevious(keyboardEvent);
        break;
      }
      default:
        break;
    }
  };

  const messageRemoved = (messageId: string, conversationId: string) => {
    if (conversationEntity?.id === conversationId) {
      if (currentMessageEntity.id === messageId) {
        onCloseClick();

        return;
      }

      setItems(prevState => prevState.filter(message => message.id !== messageId));
    }
  };

  const messageAdded = (message: ContentMessage) => {
    const isCurrentConversation = conversationEntity?.id === message.conversation_id;
    const isImage = isOfCategory('images', message);

    if (isCurrentConversation && isImage) {
      setItems(prevState => [...prevState, message]);
    }
  };

  const messageExpired = (message: ContentMessage) => messageRemoved(message.id, message.conversation_id);

  const getAllImages = async (conversation: Conversation) => {
    const conversationItems = await conversationRepository.getEventsForCategory(conversation, MessageCategory.IMAGE);
    const filteredImages = conversationItems.filter(
      message => isContentMessage(message) && isOfCategory('images', message),
    );

    const contentMessages = filteredImages.reduce<ContentMessage[]>(
      (contentMessages, message) => (isContentMessage(message) ? [...contentMessages, message] : contentMessages),
      [],
    );

    setItems(contentMessages);
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageExpired);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, messageAdded);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageRemoved);

    loadImage(currentMessageEntity);

    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageExpired);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, messageAdded);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageRemoved);
    };
  }, [conversationEntity]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDownLightBox);

    return () => document.removeEventListener('keydown', onKeyDownLightBox);
  }, [items]);

  useEffect(() => {
    const conversationId = currentMessageEntity.conversation_id;
    const isExpectedId = conversationEntity ? conversationId === conversationEntity.id : false;

    if (!isExpectedId && conversationRepository) {
      conversationRepository.getConversationById({domain: '', id: conversationId}).then(conversation => {
        setConversationEntity(conversation);
        getAllImages(conversation);
      });
    }
  }, []);

  return (
    <div id="detail-view" className={cx('modal detail-view modal-show', {'modal-fadein': isImageVisible})}>
      {messageEntity && conversationEntity && (
        <div
          className={cx('detail-view-content modal-content-anim-close', {
            'modal-content-anim-open': isImageVisible,
          })}
        >
          <DetailViewModalHeader messageEntity={messageEntity} onCloseClick={onCloseClick} />

          <button
            className="detail-view-main button-reset-default"
            onKeyDown={handleOnClosePress}
            aria-label={t('accessibility.conversationDetailsCloseLabel')}
            onClick={onCloseClick}
          >
            <img className="detail-view-image" src={imageSrc} data-uie-name="status-picture" alt="" />
          </button>

          <DetailViewModalFooter
            messageEntity={messageEntity}
            conversationEntity={conversationEntity}
            onLikeClick={onLikeClick}
            onReplyClick={onReplyClick}
            onDownloadClick={onDownloadClick}
          />
        </div>
      )}
    </div>
  );
};

export {DetailViewModal};

export const showDetailViewModal = renderElement<DetailViewModalProps>(DetailViewModal);
