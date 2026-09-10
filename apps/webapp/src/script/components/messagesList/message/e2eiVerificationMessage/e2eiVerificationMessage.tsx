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

import type {ReactNode} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {Maybe} from 'true-myth';

import {Link, LinkVariant, MLSVerified} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {Conversation} from 'Repositories/entity/Conversation';
import {E2EIVerificationMessage as E2EIVerificationMessageEntity} from 'Repositories/entity/message/e2eiVerificationMessage';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {replaceLink} from 'Util/localizerUtil';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {ReactTranslationValueReplacement} from 'Util/localizerUtil/reactLocalizerUtil';
import type {TranslationKey} from 'Util/localizerUtil/translationTypes';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import {getLogger} from 'Util/logger';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {MessageIcon, IconInfo, Link as LinkStyles} from './e2eiVerificationMessage.styles';

import {Config} from '../../../../Config';
import {E2EIHandler} from '../../../../e2eIdentity';
import {E2EIVerificationMessageType} from '../../../../message/e2eiVerificationMessageType';

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

type RenderE2EITranslationOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly legacyDangerousSubstitutions: Maybe<Record<string, string>>;
  readonly translationKey: TranslationKey;
  readonly translate: Translate;
  readonly userName: Maybe<string>;
};

const e2eiUserMarker = createReactTranslationMarker('e2ei-user');
const e2eiBoldMarker = createReactTranslationMarker('e2ei-bold');
const e2eiLearnMoreLinkMarker = createReactTranslationMarker('e2ei-learn-more-link');

const e2eiReactDangerousSubstitutions = {
  '/bold': e2eiBoldMarker.end,
  '/link': e2eiLearnMoreLinkMarker.end,
  bold: e2eiBoldMarker.start,
  link: e2eiLearnMoreLinkMarker.start,
};

const noE2EIUserName = Maybe.nothing<string>();
const noE2EILegacyDangerousSubstitutions = Maybe.nothing<Record<string, string>>();

function getSingleMessageUserId(userIds: readonly QualifiedId[]): Maybe<QualifiedId> {
  if (userIds.length === 1) {
    return Maybe.of(userIds[0]);
  }

  return Maybe.nothing();
}

function renderE2EITranslation(options: RenderE2EITranslationOptions): ReactNode {
  const {isReactTranslationRenderingEnabled, legacyDangerousSubstitutions, translationKey, translate, userName} =
    options;

  if (isReactTranslationRenderingEnabled) {
    let translatedText: string;
    let valueReplacements: ReactTranslationValueReplacement[];

    if (userName.isNothing) {
      translatedText = translate(translationKey, {}, e2eiReactDangerousSubstitutions);
      valueReplacements = [];
    } else {
      translatedText = translate(translationKey, {user: e2eiUserMarker.substitution}, e2eiReactDangerousSubstitutions);
      valueReplacements = [{marker: e2eiUserMarker, runtimeText: userName.value}];
    }

    return (
      <span>
        {renderReactTranslation({
          translatedText,
          componentReplacements: [
            {
              start: e2eiBoldMarker.start,
              end: e2eiBoldMarker.end,
              render(children): ReactNode {
                return <strong>{children}</strong>;
              },
            },
            {
              start: e2eiLearnMoreLinkMarker.start,
              end: e2eiLearnMoreLinkMarker.end,
              render(children): ReactNode {
                return (
                  <a
                    href={Config.getConfig().URL.SUPPORT.E2EI_VERIFICATION}
                    className=""
                    data-uie-name=""
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    {children}
                  </a>
                );
              },
            },
          ],
          nodeReplacements: [],
          valueReplacements,
        })}
      </span>
    );
  }

  let legacyTranslation: string;
  if (userName.isJust) {
    if (legacyDangerousSubstitutions.isNothing) {
      legacyTranslation = translate(translationKey, {user: userName.value});
    } else {
      legacyTranslation = translate(translationKey, {user: userName.value}, legacyDangerousSubstitutions.value);
    }
  } else if (legacyDangerousSubstitutions.isNothing) {
    legacyTranslation = translate(translationKey);
  } else {
    legacyTranslation = translate(translationKey, {}, legacyDangerousSubstitutions.value);
  }

  return <span dangerouslySetInnerHTML={{__html: legacyTranslation}} />;
}

export const E2EIVerificationMessage = ({message, conversation}: E2EIVerificationMessageProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const {messageType, userIds = []} = message;

  const {participating_user_ets: participatingUserEts, selfUser} = useKoSubscribableChildren(conversation, [
    'participating_user_ets',
    'selfUser',
  ]);

  const messageUserId = getSingleMessageUserId(userIds);
  const isSelfUser = messageUserId
    .andThen(messageUserId => {
      return Maybe.of(selfUser).map(selfUser => {
        return matchQualifiedIds(messageUserId, selfUser.qualifiedId);
      });
    })
    .unwrapOr(false);

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

  const learnMoreReplacement = Maybe.just(replaceLink(Config.getConfig().URL.SUPPORT.E2EI_VERIFICATION));
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);

  const getCertificate = async () => {
    try {
      await E2EIHandler.getInstance().enroll({resetTimers: true});
    } catch (error: unknown) {
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
        {isVerified &&
          renderE2EITranslation({
            isReactTranslationRenderingEnabled,
            legacyDangerousSubstitutions: learnMoreReplacement,
            translationKey: 'conversation.AllE2EIDevicesVerified',
            translate,
            userName: noE2EIUserName,
          })}

        {isExpired &&
          (isSelfUser === false ? (
            renderE2EITranslation({
              isReactTranslationRenderingEnabled,
              legacyDangerousSubstitutions: noE2EILegacyDangerousSubstitutions,
              translationKey: 'conversation.E2EICertificateExpired',
              translate,
              userName: Maybe.of(usersName),
            })
          ) : (
            <span>
              {translate('conversation.E2EISelfUserCertificateExpired')}

              <LinkText
                onClick={getCertificate}
                dataUieName="update-certificate"
                label={translate('conversation.E2EIUpdateCertificate')}
              />
            </span>
          ))}

        {isNewDevice &&
          (isSelfUser === false ? (
            renderE2EITranslation({
              isReactTranslationRenderingEnabled,
              legacyDangerousSubstitutions: noE2EILegacyDangerousSubstitutions,
              translationKey: 'conversation.E2EINewDeviceAdded',
              translate,
              userName: Maybe.of(usersName),
            })
          ) : (
            <span>
              {translate('conversation.E2EISelfUserUnverifiedDeviceAdded')}

              <LinkText
                onClick={getCertificate}
                dataUieName="get-certificate"
                label={translate('conversation.E2EIUGetCertificate')}
              />
            </span>
          ))}

        {isNewMember &&
          (isSelfUser === false ? (
            renderE2EITranslation({
              isReactTranslationRenderingEnabled,
              legacyDangerousSubstitutions: noE2EILegacyDangerousSubstitutions,
              translationKey: 'conversation.E2EINewUserAdded',
              translate,
              userName: Maybe.of(usersName),
            })
          ) : (
            <span>
              {translate('conversation.E2EISelfUserUnverifiedUserAdded')}

              <LinkText
                onClick={getCertificate}
                dataUieName="get-certificate"
                label={translate('conversation.E2EIUGetCertificate')}
              />
            </span>
          ))}

        {isRevoked &&
          (isSelfUser === false
            ? renderE2EITranslation({
                isReactTranslationRenderingEnabled,
                legacyDangerousSubstitutions: learnMoreReplacement,
                translationKey: 'conversation.E2EICertificateRevoked',
                translate,
                userName: Maybe.of(usersName),
              })
            : renderE2EITranslation({
                isReactTranslationRenderingEnabled,
                legacyDangerousSubstitutions: learnMoreReplacement,
                translationKey: 'conversation.E2EISelfUserCertificateRevoked',
                translate,
                userName: noE2EIUserName,
              }))}

        {isNoLongerVerified &&
          renderE2EITranslation({
            isReactTranslationRenderingEnabled,
            legacyDangerousSubstitutions: learnMoreReplacement,
            translationKey: 'conversation.E2EICertificateNoLongerVerifiedGeneric',
            translate,
            userName: noE2EIUserName,
          })}
      </div>
    </div>
  );
};
