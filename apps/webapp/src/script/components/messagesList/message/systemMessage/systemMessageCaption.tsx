/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ReactNode} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

import {DeleteConversationMessage} from 'Repositories/entity/message/deleteConversationMessage';
import {JoinedAfterMLSMigrationFinalisationMessage} from 'Repositories/entity/message/joinedAfterMlsMigrationFinalisationMessage';
import {MemberRoleUpdateMessage} from 'Repositories/entity/message/memberRoleUpdateMessage';
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/messageTimerUpdateMessage';
import {OneToOneMigratedToMlsMessage} from 'Repositories/entity/message/oneToOneMigratedToMlsMessage';
import type {SystemMessage} from 'Repositories/entity/message/systemMessage';
import {Config} from 'src/script/Config';
import {
  createReactTranslationMarker,
  renderReactTranslation,
  type ReactTranslationComponentReplacement,
  type ReactTranslationValueReplacement,
} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate, TranslationKey} from 'Util/localizerUtil/translationTypes';
import {formatDuration} from 'Util/timeUtil';

export type SystemMessageCaptionContent =
  | {
      readonly kind: 'text';
      readonly text: string;
    }
  | {
      readonly kind: 'translation';
      readonly translationKey: TranslationKey;
      readonly substitutions: Readonly<Record<string, string>>;
      readonly dangerousSubstitutions: Readonly<Record<string, string>>;
      readonly componentReplacements: readonly ReactTranslationComponentReplacement[];
      readonly valueReplacements: readonly ReactTranslationValueReplacement[];
    };

export type SystemMessageTranslationCaptionOptions = {
  readonly translationKey: TranslationKey;
  readonly substitutions: Readonly<Record<string, string>>;
  readonly dangerousSubstitutions: Readonly<Record<string, string>>;
  readonly componentReplacements: readonly ReactTranslationComponentReplacement[];
  readonly valueReplacements: readonly ReactTranslationValueReplacement[];
};

type GetSystemMessageCaptionContentOptions = {
  readonly message: SystemMessage;
  readonly translate: Translate;
};

type RenderSystemMessageCaptionOptions = {
  readonly content: SystemMessageCaptionContent;
  readonly translate: Translate;
};

type MlsSystemMessageTranslationKey =
  | 'conversationJoinedAfterMLSMigrationFinalisation'
  | 'conversationProtocolUpdatedToMLS'
  | 'conversationProtocolUpdatedToMixedPart1';

const systemMessageBoldMarker = createReactTranslationMarker('system-message-bold');
const systemMessageNameMarker = createReactTranslationMarker('system-message-conversation-name');
const systemMessageTimeMarker = createReactTranslationMarker('system-message-time');
const systemMessageMlsLinkMarker = createReactTranslationMarker('system-message-mls-link');

const systemMessageBoldComponentReplacement: ReactTranslationComponentReplacement = {
  start: systemMessageBoldMarker.start,
  end: systemMessageBoldMarker.end,
  render(children): ReactNode {
    return <strong>{children}</strong>;
  },
};

const systemMessageBoldDangerousSubstitutions = {
  bold: systemMessageBoldMarker.start,
  '/bold': systemMessageBoldMarker.end,
};

const systemMessageMlsLinkDangerousSubstitutions = {
  link: systemMessageMlsLinkMarker.start,
  '/link': systemMessageMlsLinkMarker.end,
};

const systemMessageMlsLinkComponentReplacement: ReactTranslationComponentReplacement = {
  start: systemMessageMlsLinkMarker.start,
  end: systemMessageMlsLinkMarker.end,
  render(children): ReactNode {
    return (
      <a
        href={Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE}
        data-uie-name=""
        className=""
        rel="nofollow noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  },
};

function createSystemMessageTextCaption(text: string): SystemMessageCaptionContent {
  return {kind: 'text', text};
}

export function createSystemMessageTranslationCaption(
  options: SystemMessageTranslationCaptionOptions,
): SystemMessageCaptionContent {
  return {kind: 'translation', ...options};
}

export function createMlsSystemMessageCaption(
  translationKey: MlsSystemMessageTranslationKey,
): SystemMessageCaptionContent {
  return createSystemMessageTranslationCaption({
    translationKey,
    substitutions: {},
    dangerousSubstitutions: systemMessageMlsLinkDangerousSubstitutions,
    componentReplacements: [systemMessageMlsLinkComponentReplacement],
    valueReplacements: [],
  });
}

export function getSystemMessageCaptionContent(
  options: GetSystemMessageCaptionContentOptions,
): SystemMessageCaptionContent | undefined {
  const {message, translate} = options;
  const {caption} = message;

  if (isNonEmptyString(caption) === false) {
    return undefined;
  }

  if (message instanceof MemberRoleUpdateMessage) {
    return createSystemMessageTranslationCaption({
      translationKey: 'conversationYouPromotedToAdmin',
      substitutions: {},
      dangerousSubstitutions: systemMessageBoldDangerousSubstitutions,
      componentReplacements: [systemMessageBoldComponentReplacement],
      valueReplacements: [],
    });
  }

  if (message instanceof MessageTimerUpdateMessage) {
    if (message.message_timer) {
      let translationKey: 'conversationUpdatedTimer' | 'conversationUpdatedTimerYou';
      if (message.isSelfUser) {
        translationKey = 'conversationUpdatedTimerYou';
      } else {
        translationKey = 'conversationUpdatedTimer';
      }

      return createSystemMessageTranslationCaption({
        translationKey,
        substitutions: {time: systemMessageTimeMarker.substitution},
        dangerousSubstitutions: {},
        componentReplacements: [],
        valueReplacements: [
          {
            marker: systemMessageTimeMarker,
            runtimeText: formatDuration(message.message_timer, translate).text,
          },
        ],
      });
    }

    return createSystemMessageTextCaption(caption);
  }

  if (message instanceof DeleteConversationMessage && message.conversationName !== undefined) {
    return createSystemMessageTranslationCaption({
      translationKey: 'notificationConversationDeletedNamed',
      substitutions: {name: systemMessageNameMarker.substitution},
      dangerousSubstitutions: {},
      componentReplacements: [],
      valueReplacements: [{marker: systemMessageNameMarker, runtimeText: message.conversationName}],
    });
  }

  if (message instanceof JoinedAfterMLSMigrationFinalisationMessage) {
    return createMlsSystemMessageCaption('conversationJoinedAfterMLSMigrationFinalisation');
  }

  if (message instanceof OneToOneMigratedToMlsMessage) {
    return createMlsSystemMessageCaption('conversationProtocolUpdatedToMLS');
  }

  return createSystemMessageTextCaption(caption);
}

export function renderSystemMessageCaption(options: RenderSystemMessageCaptionOptions): ReactNode {
  const {content, translate} = options;

  if (content.kind === 'text') {
    return content.text;
  }

  const translatedText = translate(content.translationKey, content.substitutions, content.dangerousSubstitutions);

  return renderReactTranslation({
    translatedText,
    componentReplacements: content.componentReplacements,
    nodeReplacements: [],
    valueReplacements: content.valueReplacements,
  });
}
