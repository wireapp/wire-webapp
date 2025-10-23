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

import {CSSObject} from '@emotion/react';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';

import {Ciphersuite} from '@wireapp/core';

import {t} from 'Util/LocalizerUtil';

interface ConversationProtocolDetailsProps {
  protocol: ConversationProtocol;
  cipherSuite?: number;
}

const titleStyles: CSSObject = {
  fontSize: '0.875rem',
  fontWeight: 400,
};

const subTitleStyles: CSSObject = {
  color: 'var(--text-input-placeholder)',
  fontSize: '0.75rem',
  fontWeight: 400,
  marginBottom: 16,
  wordBreak: 'break-all',
};

const wrapperStyles: CSSObject = {
  marginLeft: 'auto',
  maxWidth: 'calc(100% - 20px)',
  paddingTop: 4,
};

export const ConversationProtocolDetails = ({protocol, cipherSuite}: ConversationProtocolDetailsProps) => (
  <div>
    <h3 className="conversation-details__list-head">{t('conversationDetailsProtocolDetails')}</h3>

    <div css={wrapperStyles}>
      <div css={titleStyles}>Protocol</div>

      <p css={subTitleStyles} data-uie-name="protocol-name">
        {protocol.toUpperCase()}
      </p>

      {protocol === ConversationProtocol.MLS && cipherSuite && (
        <>
          <div css={titleStyles}>Cipher Suite</div>
          <p css={subTitleStyles} data-uie-name="cipher-suite">
            {Ciphersuite[cipherSuite]}
          </p>
        </>
      )}
    </div>
  </div>
);
