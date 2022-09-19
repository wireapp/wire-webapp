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
import React from 'react';
import {ConversationProtocol} from '@wireapp/api-client/src/conversation/NewConversation';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

export enum Ciphersuite {
  /**
   * DH KEM x25519 | AES-GCM 128 | SHA2-256 | Ed25519
   */
  MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519,
  /**
   * DH KEM P256 | AES-GCM 128 | SHA2-256 | EcDSA P256
   */
  MLS_128_DHKEMP256_AES128GCM_SHA256_P256,
  /**
   * DH KEM x25519 | Chacha20Poly1305 | SHA2-256 | Ed25519
   */
  MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519,
  /**
   * DH KEM x448 | AES-GCM 256 | SHA2-512 | Ed448
   */
  MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448,
  /**
   * DH KEM P521 | AES-GCM 256 | SHA2-512 | EcDSA P521
   */
  MLS_256_DHKEMP521_AES256GCM_SHA512_P521,
  /**
   * DH KEM x448 | Chacha20Poly1305 | SHA2-512 | Ed448
   */
  MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448,
  /**
   * DH KEM P384 | AES-GCM 256 | SHA2-384 | EcDSA P384
   */
  MLS_256_DHKEMP384_AES256GCM_SHA384_P384,
}

export interface ConversationProtocolDetailsProps {
  protocol: ConversationProtocol;
  cipherSuite?: number;
}

const titleStyles: CSSObject = {
  fontSize: 14,
  fontWeight: 400,
};

const subTitleStyles: CSSObject = {
  color: 'var(--gray-70)',
  fontSize: 12,
  fontWeight: 400,
  marginBottom: 16,
  wordBreak: 'break-all',
};

const wrapperStyles: CSSObject = {
  marginLeft: 'auto',
  maxWidth: 'calc(100% - 20px)',
  paddingTop: 4,
};

const ConversationProtocolDetails: React.FC<ConversationProtocolDetailsProps> = ({protocol, cipherSuite}) => {
  return (
    <>
      <div className="conversation-details__list-head">{t('conversationDetailsProtocolDetails')}</div>
      <div css={wrapperStyles}>
        <div css={titleStyles}>Protocol</div>
        <div css={subTitleStyles} data-uie-name="protocol-name">
          {protocol}
        </div>
        {protocol.toLocaleLowerCase() === ConversationProtocol.MLS && cipherSuite && (
          <>
            <div css={titleStyles}>Cipher Suite</div>
            <div css={subTitleStyles} data-uie-name="cipher-suite">
              {Ciphersuite[cipherSuite]}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ConversationProtocolDetails;

registerReactComponent('conversation-protocol-details', ConversationProtocolDetails);
