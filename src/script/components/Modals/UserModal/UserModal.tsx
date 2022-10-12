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

import React, {useState, useEffect} from 'react';

import {QualifiedId} from '@wireapp/api-client/src/user';
import cx from 'classnames';
import {noop} from 'jquery';
import {container} from 'tsyringe';

import {Icon} from 'Components/Icon';
import {ModalComponent} from 'Components/ModalComponent';
import {EnrichedFields} from 'Components/panel/EnrichedFields';
import {UserActions} from 'Components/panel/UserActions';
import {UserDetails} from 'Components/panel/UserDetails';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {renderElement} from 'Util/renderElement';

import {Config} from '../../../Config';
import {User} from '../../../entity/User';
import {Core} from '../../../service/CoreSingleton';
import {TeamState} from '../../../team/TeamState';
import {UserRepository} from '../../../user/UserRepository';
import {UserState} from '../../../user/UserState';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';

export interface UserModalProps {
  userId: QualifiedId;
  userRepository: UserRepository;
  actionsViewModel: ActionsViewModel;
  onClose?: () => void;
  userState?: UserState;
  teamState?: TeamState;
  core?: Core;
}

const brandName = Config.getConfig().BRAND_NAME;

const UserModalComponent: React.FC<UserModalProps> = ({
  userId,
  onClose = noop,
  userRepository,
  actionsViewModel,
  core = container.resolve(Core),
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}) => {
  const [isShown, setIsShown] = useState<boolean>(false);
  const [userNotFound, setUserNotFound] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const hide = () => setIsShown(false);
  const onModalClosed = () => {
    setUser(null);
    setUserNotFound(false);
    onClose();
  };
  const {isBlockedLegalHold} = useKoSubscribableChildren(user, ['isBlockedLegalHold']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {self, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {is_verified: isSelfVerified} = useKoSubscribableChildren(self, ['is_verified']);
  const isFederated = core.backendFeatures?.isFederated;
  const replaceLinkLegalHold = replaceLink(Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK, '', 'read-more-legal-hold');

  useEffect(() => {
    if (userId) {
      userRepository
        .getUserById(userId)
        .then(user => {
          if (user.isDeleted) {
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
    <div className="user-modal">
      <ModalComponent
        isShown={isShown}
        onBgClick={hide}
        onClosed={onModalClosed}
        data-uie-name={user ? 'modal-user-profile' : userNotFound ? 'modal-cannot-open-profile' : ''}
      >
        <div className="modal__header">
          {userNotFound && (
            <h2 className="modal__header__title" data-uie-name="status-modal-title">
              {t('userNotFoundTitle', brandName)}
            </h2>
          )}

          <Icon.Close className="modal__header__button" onClick={hide} data-uie-name="do-close" />
        </div>

        <div className={cx('modal__body user-modal__wrapper', {'user-modal__wrapper--max': !user && !userNotFound})}>
          {user && (
            <>
              <UserDetails participant={user} isSelfVerified={isSelfVerified} classifiedDomains={classifiedDomains} />

              <EnrichedFields user={user} showDomain={isFederated} />

              {isBlockedLegalHold ? (
                <div
                  className="modal__message"
                  data-uie-name="status-blocked-legal-hold"
                  dangerouslySetInnerHTML={{__html: t('modalUserBlockedForLegalHold', {}, replaceLinkLegalHold)}}
                />
              ) : (
                <UserActions
                  user={user}
                  actionsViewModel={actionsViewModel}
                  onAction={hide}
                  isSelfActivated={isActivatedAccount}
                  selfUser={self}
                />
              )}
            </>
          )}
          {isShown && !user && !userNotFound && (
            <div className="loading-wrapper">
              <Icon.Loading aria-hidden="true" />
            </div>
          )}

          {userNotFound && (
            <>
              <div className="modal__message" data-uie-name="status-modal-text">
                {t('userNotFoundMessage', brandName)}
              </div>

              <div className="modal__buttons">
                <button className="modal__button modal__button--confirm" data-uie-name="do-ok" onClick={hide}>
                  {t('modalAcknowledgeAction')}
                </button>
              </div>
            </>
          )}
        </div>
      </ModalComponent>
    </div>
  );
};

export {UserModalComponent};

export const showUserModal = renderElement<UserModalProps>(UserModalComponent, 'user-modal-container');
