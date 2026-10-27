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

import {useId, type FunctionComponent} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Ciphersuite} from '@wireapp/core';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  titleStyles,
  subTitleStyles,
  wrapperStyles,
  protocolButtonStyles,
  protocolLabelStyles,
  protocolValueStyles,
} from './conversationProtocolDetails.styles';

/** IANA names of the MLS cipher suites (RFC 9420, draft-ietf-mls-pq-ciphersuites) */
const cipherSuiteNames: Record<Ciphersuite, string> = {
  [Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519]: 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519',
  [Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256]: 'MLS_128_DHKEMP256_AES128GCM_SHA256_P256',
  [Ciphersuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519]: 'MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519',
  [Ciphersuite.Mls256Dhkemx448Aes256gcmSha512Ed448]: 'MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448',
  [Ciphersuite.Mls256Dhkemp521Aes256gcmSha512P521]: 'MLS_256_DHKEMP521_AES256GCM_SHA512_P521',
  [Ciphersuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448]: 'MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448',
  [Ciphersuite.Mls256Dhkemp384Aes256gcmSha384P384]: 'MLS_256_DHKEMP384_AES256GCM_SHA384_P384',
  [Ciphersuite.Mls128Mlkem768x25519Aes128gcmSha256Ed25519]: 'MLS_128_MLKEM768X25519_AES128GCM_SHA256_Ed25519',
  [Ciphersuite.Mls128Mlkem768x25519Aes256gcmSha384Ed25519]: 'MLS_128_MLKEM768X25519_AES256GCM_SHA384_Ed25519',
  [Ciphersuite.Mls128Mlkem768p256Aes128gcmSha256P256]: 'MLS_128_MLKEM768P256_AES128GCM_SHA256_P256',
  [Ciphersuite.Mls128Mlkem768p256Aes256gcmSha384P256]: 'MLS_128_MLKEM768P256_AES256GCM_SHA384_P256',
  [Ciphersuite.Mls192Mlkem1024p384Aes256gcmSha384P384]: 'MLS_192_MLKEM1024P384_AES256GCM_SHA384_P384',
  [Ciphersuite.Mls128Mlkem768Aes256gcmSha384Ed25519]: 'MLS_128_MLKEM768_AES256GCM_SHA384_Ed25519',
  [Ciphersuite.Mls128Mlkem768Aes256gcmSha384P256]: 'MLS_128_MLKEM768_AES256GCM_SHA384_P256',
  [Ciphersuite.Mls192Mlkem1024Aes256gcmSha384P384]: 'MLS_192_MLKEM1024_AES256GCM_SHA384_P384',
  [Ciphersuite.Mls128Mlkem768x25519Chacha20poly1305Sha384Mldsa44]:
    'MLS_128_MLKEM768X25519_CHACHA20POLY1305_SHA384_MLDSA44',
  [Ciphersuite.Mls192Mlkem768Aes256gcmSha384Mldsa65]: 'MLS_192_MLKEM768_AES256GCM_SHA384_MLDSA65',
  [Ciphersuite.Mls256Mlkem1024Aes256gcmSha384Mldsa87]: 'MLS_256_MLKEM1024_AES256GCM_SHA384_MLDSA87',
};

const getCipherSuiteName = (cipherSuite: number): string => {
  return cipherSuiteNames[cipherSuite as Ciphersuite] ?? String(cipherSuite);
};

interface ConversationProtocolDetailsProps {
  protocol: CONVERSATION_PROTOCOL;
  cipherSuite?: number;
  onProtocolActivated?: () => void;
}

export const ConversationProtocolDetails: FunctionComponent<ConversationProtocolDetailsProps> = ({
  protocol,
  cipherSuite,
  onProtocolActivated,
}: ConversationProtocolDetailsProps) => {
  const {translate} = useApplicationContext();
  const protocolLabelId = useId();
  const cipherSuiteLabelId = useId();

  return (
    <div>
      <h3 className="conversation-details__list-head">{translate('conversationDetailsProtocolDetails')}</h3>

      <div css={wrapperStyles}>
        {!isUndefined(onProtocolActivated) ? (
          <button
            type="button"
            onClick={onProtocolActivated}
            data-uie-name="manual-migration-protocol"
            css={protocolButtonStyles}
          >
            <span css={protocolLabelStyles}>{translate('modalCreateGroupProtocolHeading')}</span>
            <span css={protocolValueStyles} data-uie-name="protocol-name">
              {protocol.toUpperCase()}
            </span>
          </button>
        ) : (
          <>
            <div id={protocolLabelId} css={titleStyles}>
              {translate('modalCreateGroupProtocolHeading')}
            </div>
            <div aria-labelledby={protocolLabelId} css={subTitleStyles} data-uie-name="protocol-name">
              {protocol.toUpperCase()}
            </div>
          </>
        )}

        {protocol === CONVERSATION_PROTOCOL.MLS && cipherSuite != null && (
          <>
            <div id={cipherSuiteLabelId} css={titleStyles}>
              {translate('conversationDetailsCipherSuite')}
            </div>
            <div aria-labelledby={cipherSuiteLabelId} css={subTitleStyles} data-uie-name="cipher-suite">
              {getCipherSuiteName(cipherSuite)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
