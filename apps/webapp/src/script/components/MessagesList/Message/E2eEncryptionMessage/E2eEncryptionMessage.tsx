/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {Link, LinkVariant, ShieldIcon} from '@wireapp/react-ui-kit';

import {
  e2eMessageContainerCss,
  e2eMessageIconContainerCss,
  e2eMessageIconCss,
  e2eMessageContentContainerCss,
  e2eMessageContentParagraphCss,
  e2eMessageContentParagraphWithMarginCss,
  e2eMessageContentLinkCss,
} from './E2eEncryptionMessage.styles';

interface E2eEncryptionMessageProps {
  isCellsConversation: boolean;
}

export const E2eEncryptionMessage = ({isCellsConversation}: E2eEncryptionMessageProps) => {
  return (
    <div css={e2eMessageContainerCss}>
      <div css={e2eMessageIconContainerCss}>
        <ShieldIcon css={e2eMessageIconCss} />
      </div>
      <div css={e2eMessageContentContainerCss}>
        <p css={e2eMessageContentParagraphCss}>
          {isCellsConversation ? t('conversationNewCellsConversation') : t('conversationNewConversation')}
        </p>
        <p css={e2eMessageContentParagraphWithMarginCss}>{t('conversationUnverifiedUserWarning')}</p>
        <Link
          css={e2eMessageContentLinkCss}
          variant={LinkVariant.PRIMARY}
          href={Config.getConfig().URL.SUPPORT.E2E_ENCRYPTION}
          target="_blank"
          data-uie-name="how-to-label-conversation-as-favorites"
        >
          {t('systemMessageLearnMore')}
        </Link>
      </div>
    </div>
  );
};
