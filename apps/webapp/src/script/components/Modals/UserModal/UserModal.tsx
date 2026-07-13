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

import {ReactNode, useEffect, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {TabIndex, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/fadingScrollbar';
import * as Icon from 'Components/icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {EnrichedFields} from 'Components/panel/enrichedFields';
import {UserActions} from 'Components/panel/userActions';
import {UserDetails} from 'Components/panel/userDetails';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserRepository} from 'Repositories/user/userRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {handleKeyDown, KEY} from 'Util/keyboardUtil';
import {replaceLink} from 'Util/localizerUtil';

import {useUserModalState} from './UserModal.state';
import {
  unverifiedUserWarningIconStyle,
  unverifiedUserWarningLinkStyle,
  unverifiedUserWarningMessageCenteredStyle,
  unverifiedUserWarningMessageStyle,
  unverifiedUserWarningRowStyle,
  unverifiedUserWarningStyle,
  userModalStyle,
  userModalWrapperStyle,
} from './UserModal.styles';

import {Config} from '../../../Config';
import {Core} from '../../../service/coreSingleton';

export interface UserModalProps {
  userRepository: UserRepository;
  selfUser: User;
  teamState?: TeamState;
  core?: Core;
}

const brandName = Config.getConfig().BRAND_NAME;

interface UserModalUserActionsSectionProps {
  user: User;
  onAction: () => void;
  isSelfActivated: boolean;
  selfUser: User;
  blockedForLegalHoldMessageHtml: string;
}

const UserModalUserActionsSection = ({
  user,
  onAction,
  isSelfActivated,
  selfUser,
  blockedForLegalHoldMessageHtml,
}: UserModalUserActionsSectionProps) => {
  const {isBlockedLegalHold} = useKoSubscribableChildren(user, ['isBlockedLegalHold']);
  const {mainViewModel} = useApplicationContext();

  if (isBlockedLegalHold) {
    return (
      <div
        className="modal__message"
        data-uie-name="status-blocked-legal-hold"
        dangerouslySetInnerHTML={{__html: blockedForLegalHoldMessageHtml}}
      />
    );
  }

  return (
    <UserActions
      user={user}
      actionsViewModel={mainViewModel.actions}
      onAction={onAction}
      isSelfActivated={isSelfActivated}
      selfUser={selfUser}
      isModal
    />
  );
};

interface UnverifiedUserWarningProps {
  user?: User;
}

interface UserModalWarningMessageProps {
  content: ReactNode;
  showIcon?: boolean;
  textAlignCenter?: boolean;
  linkText: string;
  href: string;
}

const UserModalWarningMessage = ({
  content,
  href,
  linkText,
  showIcon = false,
  textAlignCenter = false,
}: UserModalWarningMessageProps) => {
  return (
    <div
      css={[showIcon && unverifiedUserWarningRowStyle, textAlignCenter && unverifiedUserWarningMessageCenteredStyle]}
    >
      {showIcon && <Icon.InfoIcon css={unverifiedUserWarningIconStyle} />}
      <p css={unverifiedUserWarningMessageStyle}>
        {content}
        <Link css={unverifiedUserWarningLinkStyle} variant={LinkVariant.PRIMARY} targetBlank href={href}>
          {linkText}
        </Link>
      </p>
    </div>
  );
};

export const UnverifiedUserWarning = ({user}: UnverifiedUserWarningProps) => {
  const {translate} = useApplicationContext();
  const learnMoreHref = Config.getConfig().URL.SUPPORT.PRIVACY_UNVERIFIED_USERS;

  if (user !== undefined) {
    return (
      <div css={unverifiedUserWarningStyle}>
        <UserModalWarningMessage
          content={translate('userNotVerified', {user: user.name()})}
          href={learnMoreHref}
          linkText={translate('modalUserLearnMore')}
          showIcon
        />
      </div>
    );
  }

  return (
    <div css={unverifiedUserWarningStyle}>
      <UserModalWarningMessage
        content={translate('conversationConnectionVerificationWarning')}
        href={learnMoreHref}
        linkText={translate('modalUserLearnMore')}
        textAlignCenter
      />
      <UserModalWarningMessage
        content={translate('conversationConnectionSupportWarning')}
        href={learnMoreHref}
        linkText={translate('conversationConnectionReportMisuse')}
        textAlignCenter
      />
    </div>
  );
};

const UserModal = ({
  userRepository,
  selfUser,
  core = container.resolve(Core),
  teamState = container.resolve(TeamState),
}: UserModalProps) => {
  const {translate} = useApplicationContext();
  const onClose = useUserModalState(state => state.onClose);
  const userId = useUserModalState(state => state.userId);
  const resetState = useUserModalState(state => state.resetState);

  const [isShown, setIsShown] = useState<boolean>(false);
  const [userNotFound, setUserNotFound] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const hide = () => setIsShown(false);
  const onModalClosed = () => {
    setUser(null);
    setUserNotFound(false);
    onClose?.();
    resetState();
  };
  const {classifiedDomains, isTeam} = useKoSubscribableChildren(teamState, ['classifiedDomains', 'isTeam']);
  const {
    is_trusted: isTrusted,
    isActivatedAccount,
    isTemporaryGuest,
  } = useKoSubscribableChildren(selfUser, ['is_trusted', 'isActivatedAccount', 'isTemporaryGuest']);
  const isFederated = core.backendFeatures?.isFederated;

  const isSameTeam =
    user !== null &&
    user.teamId !== undefined &&
    user.teamId !== '' &&
    selfUser.teamId !== undefined &&
    selfUser.teamId !== '' &&
    user.teamId === selfUser.teamId;

  useEffect(() => {
    if (userId !== null) {
      userRepository
        // We want to get the fresh version of the user from backend (in case the user was deleted)
        .refreshUser(userId)
        .then(user => {
          if (user.isDeleted || !user.isAvailable()) {
            setUserNotFound(true);
            return;
          }
          setUser(user);
        })
        .catch(() => setUserNotFound(true));
      setIsShown(true);
    }

    return () => {
      setUser(null);
      setUserNotFound(false);
    };
  }, [userId, userRepository]);

  const replaceLinkLegalHold = replaceLink(Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK, '', 'read-more-legal-hold');
  const blockedForLegalHoldMessageHtml = translate('modalUserBlockedForLegalHold', undefined, replaceLinkLegalHold);

  let modalDataUieName = '';
  if (user) {
    modalDataUieName = 'modal-user-profile';
  } else if (userNotFound) {
    modalDataUieName = 'modal-cannot-open-profile';
  }

  return (
    <ModalComponent
      isShown={isShown}
      onBgClick={hide}
      onClosed={onModalClosed}
      className="user-modal"
      css={userModalStyle}
      data-uie-name={modalDataUieName}
      wrapperCSS={userModalWrapperStyle}
    >
      <div className="modal__header">
        {userNotFound && (
          <h2 className="modal__header__title" data-uie-name="status-modal-title">
            {translate('userNotFoundTitle', {brandName})}
          </h2>
        )}

        <Icon.CloseIcon
          className="modal__header__button"
          onClick={hide}
          onKeyDown={event =>
            handleKeyDown({
              event,
              callback: hide,
              keys: [KEY.ENTER, KEY.SPACE],
            })
          }
          data-uie-name="do-close"
          tabIndex={TabIndex.FOCUSABLE}
        />
      </div>

      <FadingScrollbar
        className={cx('modal__body user-modal__wrapper', {'user-modal__wrapper--max': !user && !userNotFound})}
      >
        {user && (
          <>
            <UserDetails participant={user} classifiedDomains={classifiedDomains} />

            <EnrichedFields
              user={user}
              showDomain={isFederated}
              showAvailability={isTeam && !isTemporaryGuest && teamState.isInTeam(user)}
            />

            {isTrusted === false && !isSameTeam && <UnverifiedUserWarning user={user} />}

            <UserModalUserActionsSection
              user={user}
              onAction={hide}
              isSelfActivated={isActivatedAccount}
              selfUser={selfUser}
              blockedForLegalHoldMessageHtml={blockedForLegalHoldMessageHtml}
            />
          </>
        )}
        {isShown && !user && !userNotFound && (
          <div className="loading-wrapper">
            <Icon.LoadingIcon aria-hidden="true" />
          </div>
        )}

        {userNotFound && (
          <>
            <div className="modal__message" data-uie-name="status-modal-text">
              {translate('userNotFoundMessage', {brandName})}
            </div>

            <div className="modal__buttons">
              <button className="modal__button modal__button--confirm" data-uie-name="do-ok" onClick={hide}>
                {translate('modalAcknowledgeAction')}
              </button>
            </div>
          </>
        )}
      </FadingScrollbar>
    </ModalComponent>
  );
};

export {UserModal};
