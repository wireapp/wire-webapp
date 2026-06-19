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

import {useId} from 'react';

import {CSSObject} from '@emotion/react';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Ciphersuite} from '@wireapp/core';

import {useApplicationContext} from 'src/script/page/rootProvider';

interface ConversationProtocolDetailsProps {
  protocol: CONVERSATION_PROTOCOL;
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

export const ConversationProtocolDetails = ({protocol, cipherSuite}: ConversationProtocolDetailsProps) => {
  const {translate} = useApplicationContext();
  const protocolLabelId = useId();
  const cipherSuiteLabelId = useId();

  return (
    <div>
      <h3 className="conversation-details__list-head">{translate('conversationDetailsProtocolDetails')}</h3>

      <div css={wrapperStyles}>
        <div id={protocolLabelId} css={titleStyles}>
          Protocol
        </div>

        <div aria-labelledby={protocolLabelId} css={subTitleStyles} data-uie-name="protocol-name">
          {protocol.toUpperCase()}
        </div>

        {protocol === CONVERSATION_PROTOCOL.MLS && cipherSuite != null && (
          <>
            <div id={cipherSuiteLabelId} css={titleStyles}>
              Cipher Suite
            </div>
            <div aria-labelledby={cipherSuiteLabelId} css={subTitleStyles} data-uie-name="cipher-suite">
              {Ciphersuite[cipherSuite]}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
