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

import * as Icon from 'Components/Icon';
import {Conversation} from 'Repositories/entity/Conversation';
import {E2EIVerificationMessage as E2EIVerificationMessageEntity} from 'Repositories/entity/message/E2EIVerificationMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {Link, LinkVariant, MLSVerified} from '@wireapp/react-ui-kit';

import {MessageIcon, IconInfo, Link as LinkStyles} from './E2EIVerificationMessage.styles';

import {Config} from '../../../../Config';
import {E2EIHandler} from '../../../../E2EIdentity';
import {E2EIVerificationMessageType} from '../../../../message/E2EIVerificationMessageType';

const logger = getLogger('E2EIVerificationMessage');

interface LinkTextProps {
  dataUieName: string;
  onClick: () => void;
  label: string;
}

const LinkText = ({dataUieName, onClick, label}: LinkTextProps) => (
  <Link
    variant={LinkVariant.PRIMARY}
    onClick={onClick}
    textTransform={'none'}
    css={LinkStyles}
    data-uie-name={dataUieName}
  >
    {label}
  </Link>
);

interface E2EIVerificationMessageProps {
  message: E2EIVerificationMessageEntity;
  conversation: Conversation;
}

export const E2EIVerificationMessage = ({message, conversation}: E2EIVerificationMessageProps) => {
  const {messageType, userIds = []} = message;

  const {participating_user_ets: participatingUserEts, selfUser} = useKoSubscribableChildren(conversation, [
    'participating_user_ets',
    'selfUser',
  ]);

  const messageUserId = userIds.length === 1 && userIds[0];
  const isSelfUser = messageUserId && selfUser && matchQualifiedIds(messageUserId, selfUser.qualifiedId);

  const degradedUsers = participatingUserEts.filter(user =>
    userIds.find(userId => matchQualifiedIds(userId, user.qualifiedId)),
  );

  const usersName = degradedUsers?.map(user => user.name()).join(', ');

  const isVerified = messageType === E2EIVerificationMessageType.VERIFIED;
  const isNewDevice = messageType === E2EIVerificationMessageType.NEW_DEVICE;
  const isNewMember = messageType === E2EIVerificationMessageType.NEW_MEMBER;
  const isExpired = messageType === E2EIVerificationMessageType.EXPIRED;
  const isRevoked = messageType === E2EIVerificationMessageType.REVOKED;
  const isNoLongerVerified = messageType === E2EIVerificationMessageType.NO_LONGER_VERIFIED;

  const learnMoreReplacement = replaceLink(Config.getConfig().URL.SUPPORT.E2EI_VERIFICATION);

  const getCertificate = async () => {
    try {
      await E2EIHandler.getInstance().enroll({resetTimers: true});
    } catch (error) {
      logger.error('Failed to enroll user certificate: ', error);
    }
  };

  return (
    <div className="message-header">
      <div css={MessageIcon}>
        {isVerified ? (
          <MLSVerified data-uie-name="conversation-title-bar-verified-icon" />
        ) : (
          <Icon.InfoIcon css={IconInfo} />
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
              __html: t('conversation.AllE2EIDevicesVerified', undefined, learnMoreReplacement),
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
            <span>
              {t('conversation.E2EISelfUserCertificateExpired')}

              <LinkText
                onClick={getCertificate}
                dataUieName="update-certificate"
                label={t('conversation.E2EIUpdateCertificate')}
              />
            </span>
          ))}

        {isNewDevice &&
          (!isSelfUser ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EINewDeviceAdded', {user: usersName}),
              }}
            />
          ) : (
            <span>
              {t('conversation.E2EISelfUserUnverifiedDeviceAdded')}

              <LinkText
                onClick={getCertificate}
                dataUieName="get-certificate"
                label={t('conversation.E2EIUGetCertificate')}
              />
            </span>
          ))}

        {isNewMember &&
          (!isSelfUser ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t('conversation.E2EINewUserAdded', {user: usersName}),
              }}
            />
          ) : (
            <span>
              {t('conversation.E2EISelfUserUnverifiedUserAdded')}

              <LinkText
                onClick={getCertificate}
                dataUieName="get-certificate"
                label={t('conversation.E2EIUGetCertificate')}
              />
            </span>
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
                __html: t('conversation.E2EISelfUserCertificateRevoked', undefined, learnMoreReplacement),
              }}
            />
          ))}

        {isNoLongerVerified && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('conversation.E2EICertificateNoLongerVerifiedGeneric', undefined, learnMoreReplacement),
            }}
          />
        )}
      </div>
    </div>
  );
};
