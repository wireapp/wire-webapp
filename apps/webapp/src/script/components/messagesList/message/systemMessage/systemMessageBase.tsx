/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ReactNode} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

import {SystemMessage} from 'Repositories/entity/message/systemMessage';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';

import {
  getSystemMessageCaptionContent,
  renderSystemMessageCaption,
  type SystemMessageCaptionContent,
} from './systemMessageCaption';

import {MessageTime} from '../messageTime';

interface SystemMessageProps {
  message: SystemMessage;
  isSenderNameVisible?: boolean;
  icon?: ReactNode;
  captionContent?: SystemMessageCaptionContent;
}

type RenderSystemMessageCaptionOptions = {
  readonly captionContent: SystemMessageCaptionContent | undefined;
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly messageCaption: string | undefined;
  readonly translate: Translate;
};

function renderSystemMessageCaptionContent(options: RenderSystemMessageCaptionOptions): ReactNode {
  const {captionContent, isReactTranslationRenderingEnabled, messageCaption, translate} = options;

  if (isNonEmptyString(messageCaption) === false) {
    return null;
  }

  if (isReactTranslationRenderingEnabled) {
    if (captionContent === undefined) {
      return <span className="system-message-caption ellipsis">{messageCaption}</span>;
    }

    return (
      <span className="system-message-caption ellipsis">
        {renderSystemMessageCaption({content: captionContent, translate})}
      </span>
    );
  }

  return <span className="system-message-caption ellipsis" dangerouslySetInnerHTML={{__html: messageCaption}} />;
}

export const SystemMessageBase = ({message, isSenderNameVisible = false, icon, captionContent}: SystemMessageProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const {unsafeSenderName, timestamp} = useKoSubscribableChildren(message, ['unsafeSenderName', 'timestamp']);
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
  const resolvedCaptionContent = captionContent ?? getSystemMessageCaptionContent({message, translate});

  return (
    <div className="message-header" data-uie-name="element-message-system">
      {icon !== undefined && icon !== null && (
        <div className="message-header-icon message-header-icon--svg text-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="message-header-label">
        <span className="message-header-label__multiline">
          {isSenderNameVisible && <span className="message-header-sender-name">{unsafeSenderName}</span>}
          {renderSystemMessageCaptionContent({
            captionContent: resolvedCaptionContent,
            isReactTranslationRenderingEnabled,
            messageCaption: message.caption,
            translate,
          })}
        </span>
      </p>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </div>
    </div>
  );
};
