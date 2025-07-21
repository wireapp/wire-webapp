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

import React, {useContext, useEffect, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {TabIndex, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {EnrichedFields} from 'Components/panel/EnrichedFields';
import {UserActions} from 'Components/panel/UserActions';
import {UserDetails} from 'Components/panel/UserDetails';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserRepository} from 'Repositories/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';

import {useUserModalState} from './UserModal.state';
import {userModalStyle, userModalWrapperStyle} from './UserModal.styles';

import {Config} from '../../../Config';
import {RootContext} from '../../../page/RootProvider';
import {Core} from '../../../service/CoreSingleton';

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
}

const UserModalUserActionsSection: React.FC<UserModalUserActionsSectionProps> = ({
  user,
  onAction,
  isSelfActivated,
  selfUser,
}) => {
  const {isBlockedLegalHold} = useKoSubscribableChildren(user, ['isBlockedLegalHold']);
  const mainViewModel = useContext(RootContext);

  if (isBlockedLegalHold) {
    const replaceLinkLegalHold = replaceLink(
      Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
      '',
      'read-more-legal-hold',
    );

    return (
      <div
        className="modal__message"
        data-uie-name="status-blocked-legal-hold"
        dangerouslySetInnerHTML={{__html: t('modalUserBlockedForLegalHold', undefined, replaceLinkLegalHold)}}
      />
    );
  }

  if (!mainViewModel) {
    return null;
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

export const UnverifiedUserWarning: React.FC<UnverifiedUserWarningProps> = ({user}) => {
  return (
    <div css={{display: 'flex', color: 'var(--danger-color)', fill: 'var(--danger-color)', margin: '1em 0'}}>
      <Icon.InfoIcon css={{height: '1rem', margin: '0.15em 1em', minWidth: '1rem'}} />
      <p css={{fontSize: 'var(--font-size-medium)'}}>
        {user ? t('userNotVerified', {user: user.name()}) : t('conversationConnectionVerificationWarning')}
        <Link
          css={{fontSize: 'var(--font-size-medium)', margin: '0 0.2em'}}
          variant={LinkVariant.PRIMARY}
          targetBlank
          href={Config.getConfig().URL.SUPPORT.PRIVACY_UNVERIFIED_USERS}
        >
          {t('modalUserLearnMore')}
        </Link>
      </p>
    </div>
  );
};

const UserModal: React.FC<UserModalProps> = ({
  userRepository,
  selfUser,
  core = container.resolve(Core),
  teamState = container.resolve(TeamState),
}) => {
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

  const isSameTeam = user && user.teamId && selfUser.teamId && user.teamId === selfUser.teamId;

  useEffect(() => {
    if (userId) {
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
  }, [userId?.id, userId?.domain]);

  return (
    <ModalComponent
      isShown={isShown}
      onBgClick={hide}
      onClosed={onModalClosed}
      className="user-modal"
      css={userModalStyle}
      data-uie-name={user ? 'modal-user-profile' : userNotFound ? 'modal-cannot-open-profile' : ''}
      wrapperCSS={userModalWrapperStyle}
    >
      <div className="modal__header">
        {userNotFound && (
          <h2 className="modal__header__title" data-uie-name="status-modal-title">
            {t('userNotFoundTitle', {brandName})}
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

            {!isTrusted && !isSameTeam && <UnverifiedUserWarning user={user} />}

            <UserModalUserActionsSection
              user={user}
              onAction={hide}
              isSelfActivated={isActivatedAccount}
              selfUser={selfUser}
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
              {t('userNotFoundMessage', {brandName})}
            </div>

            <div className="modal__buttons">
              <button className="modal__button modal__button--confirm" data-uie-name="do-ok" onClick={hide}>
                {t('modalAcknowledgeAction')}
              </button>
            </div>
          </>
        )}
      </FadingScrollbar>
    </ModalComponent>
  );
};

export {UserModal};
