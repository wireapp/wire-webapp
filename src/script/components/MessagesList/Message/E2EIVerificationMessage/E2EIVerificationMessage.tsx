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

import {Link, LinkVariant, MLSVerified} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {isUser} from 'Util/TypePredicateUtil';

import {MessageIcon, IconInfo} from './E2EIVerificationMessage.styles';

import {Config} from '../../../../Config';
import {E2EIHandler} from '../../../../E2EIdentity';
import {Conversation} from '../../../../entity/Conversation';
import {E2EIVerificationMessage as E2EIVerificationMessageEntity} from '../../../../entity/message/E2EIVerificationMessage';
import {E2EIVerificationMessageType} from '../../../../message/E2EIVerificationMessageType';

const logger = getLogger('E2EIVerificationMessage');

export interface E2EIVerificationMessageProps {
  message: E2EIVerificationMessageEntity;
  conversation: Conversation;
}

export const E2EIVerificationMessage = ({message, conversation}: E2EIVerificationMessageProps) => {
  const {messageType, userIds} = useKoSubscribableChildren(message, ['messageType', 'userIds']);
  const {participating_user_ets: participatingUserEts, selfUser} = useKoSubscribableChildren(conversation, [
    'participating_user_ets',
    'selfUser',
  ]);

  const messageUserId = userIds.length === 1 && userIds[0];
  const isSelfUser = messageUserId && selfUser && matchQualifiedIds(messageUserId, selfUser.qualifiedId);

  const degradedUsers = userIds
    ?.map(qualifiedId => participatingUserEts?.find(user => user.id === qualifiedId.id))
    .filter(isUser);

  const usersName = degradedUsers?.map(user => user.name()).join(', ');

  const isVerified = messageType === E2EIVerificationMessageType.VERIFIED;
  const isNewDevice = messageType === E2EIVerificationMessageType.NEW_DEVICE;
  const isNewMember = messageType === E2EIVerificationMessageType.NEW_MEMBER;
  const isExpired = messageType === E2EIVerificationMessageType.EXPIRED;
  const isRevoked = messageType === E2EIVerificationMessageType.REVOKED;

  const learnMoreReplacement = replaceLink(Config.getConfig().URL.SUPPORT.E2EI_VERIFICATION);

  const getCertificate = async () => {
    try {
      await E2EIHandler.getInstance().enroll();
    } catch (error) {
      logger.error('Cannot get E2EI instance: ', error);
    }
  };

  // TODO: Add update certificate method while this functionality will be finished
  const updateCertificate = () => {};

  return (
    <div className="message-header">
      <div css={MessageIcon}>
        {isVerified ? (
          <MLSVerified data-uie-name="conversation-title-bar-verified-icon" />
        ) : (
          <Icon.Info css={IconInfo} />
        )}
      </div>

      <div
        className="message-header-label message-header-label--verification"
        data-uie-name="element-message-verification"
        data-uie-value={messageType}
      >
        {isVerified && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('conversation.AllE2EIDevicesVerified', {}, learnMoreReplacement),
            }}
          />
        )}

        {isExpired &&
          (!isSelfUser ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EICertificateExpired', {user: usersName}),
              }}
            />
          ) : (
            <>
              <span
                dangerouslySetInnerHTML={{
                  __html: t('conversation.E2EISelfUserCertificateExpired'),
                }}
              />

              <Link
                variant={LinkVariant.PRIMARY}
                onClick={updateCertificate}
                textTransform={'none'}
                style={{fontSize: '.75rem', color: 'var(--accent-color)', textDecoration: 'none'}}
                data-uie-name="update-certificate"
              >
                Update certificate now
              </Link>
            </>
          ))}

        {isNewDevice &&
          (!isSelfUser ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EINewDeviceAdded', {user: usersName}),
              }}
            />
          ) : (
            <>
              <span
                dangerouslySetInnerHTML={{
                  __html: t('conversation.E2EISelfUserUnverifiedDeviceAdded'),
                }}
              />

              <Link
                variant={LinkVariant.PRIMARY}
                onClick={getCertificate}
                textTransform={'none'}
                style={{fontSize: '.75rem', color: 'var(--accent-color)', textDecoration: 'none'}}
                data-uie-name="get-certificate"
              >
                Get the certificate now
              </Link>
            </>
          ))}

        {isNewMember &&
          (!isSelfUser ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EINewUserAdded', {user: usersName}),
              }}
            />
          ) : (
            <>
              <span
                dangerouslySetInnerHTML={{
                  __html: t('conversation.E2EISelfUserUnverifiedUserAdded'),
                }}
              />
              <Link
                variant={LinkVariant.PRIMARY}
                onClick={getCertificate}
                textTransform={'none'}
                style={{fontSize: '.75rem', color: 'var(--accent-color)', textDecoration: 'none'}}
                data-uie-name="get-certificate"
              >
                Get the certificate now
              </Link>
            </>
          ))}

        {isRevoked &&
          (!isSelfUser ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EICertificateRevoked', {user: usersName}, learnMoreReplacement),
              }}
            />
          ) : (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EISelfUserCertificateRevoked', {}, learnMoreReplacement),
              }}
            />
          ))}
      </div>
    </div>
  );
};
