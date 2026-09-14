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

import {isNonEmptyString, isNullOrUndefined, isString, isUndefined} from '@sindresorhus/is';

import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {TranslatedMessageContent} from './TranslatedMessageContent';
import type {PrimaryModalTranslatedMessage} from '../PrimaryModalTranslatedMessage';

interface MessageContentProps {
  messageHtml?: string;
  message?: React.ReactNode;
  translatedMessage?: PrimaryModalTranslatedMessage;
  translate: Translate;
}

export const MessageContent = ({message, messageHtml, translatedMessage, translate}: MessageContentProps) => {
  const {isFeatureToggleEnabled} = useApplicationContext();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
  const hasMessage = !isNullOrUndefined(message);
  const hasMessageHtml = isNonEmptyString(messageHtml);
  const hasTranslatedMessage = !isUndefined(translatedMessage);

  if (!hasMessage && !hasMessageHtml && !hasTranslatedMessage) {
    return null;
  }

  function renderRichMessageContent(): React.ReactNode {
    if (isReactTranslationRenderingEnabled && hasTranslatedMessage) {
      return <TranslatedMessageContent message={translatedMessage} translate={translate} />;
    }

    if (isNonEmptyString(messageHtml)) {
      return <p id="modal-description-html" dangerouslySetInnerHTML={{__html: messageHtml}} />;
    }

    return null;
  }

  function renderMessageValue(): React.ReactNode {
    if (isString(message)) {
      return <p>{message}</p>;
    }

    return message;
  }

  function renderMessageContent(): React.ReactNode {
    if (!hasMessage) {
      return null;
    }

    return <div id="modal-description-text">{renderMessageValue()}</div>;
  }

  return (
    <div className="modal__text" data-uie-name="status-modal-text">
      {renderRichMessageContent()}
      {renderMessageContent()}
    </div>
  );
};
