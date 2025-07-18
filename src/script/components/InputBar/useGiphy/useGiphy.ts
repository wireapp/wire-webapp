/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useCallback, useEffect, useMemo} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {MessageRepository, OutgoingQuote} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Config} from 'src/script/Config';

interface UseGiphyProps {
  text: string;
  maxLength: number;
  openGiphy: (inputValue: string) => void;
  generateQuote: () => Promise<OutgoingQuote | undefined>;
  messageRepository: MessageRepository;
  conversation: Conversation;
  cancelMesssageEditing: () => void;
}

export const useGiphy = ({
  text,
  maxLength,
  openGiphy,
  generateQuote,
  messageRepository,
  conversation,
  cancelMesssageEditing,
}: UseGiphyProps) => {
  const isMessageFormatButtonsFlagEnabled = Config.getConfig().FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;

  const showGiphyButton = useMemo(() => {
    if (isMessageFormatButtonsFlagEnabled) {
      return text.length > 0;
    }
    return text.length > 0 && text.length <= maxLength;
  }, [text.length, maxLength, isMessageFormatButtonsFlagEnabled]);

  const handleGifClick = () => openGiphy(text);

  const sendGiphy = useCallback(
    (gifUrl: string, tag: string): void => {
      void generateQuote().then(quoteEntity => {
        void messageRepository.sendGif(conversation, gifUrl, tag, quoteEntity);
        cancelMesssageEditing();
      });
    },
    [cancelMesssageEditing, conversation, generateQuote, messageRepository],
  );

  useEffect(() => {
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, sendGiphy);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.EXTENSIONS.GIPHY.SEND);
    };
  }, [sendGiphy, cancelMesssageEditing]);

  return {
    showGiphyButton,
    handleGifClick,
    sendGiphy,
  };
};
