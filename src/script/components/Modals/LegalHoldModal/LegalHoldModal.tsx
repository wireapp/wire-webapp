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

import {FC, useCallback, useEffect, useRef, useState} from 'react';

import {LegalHoldMemberStatus} from '@wireapp/api-client/lib/team/legalhold/';
import cx from 'classnames';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import * as Icon from 'Components/Icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {UserDevicesState, UserDevices} from 'Components/UserDevices';
import {UserSearchableList} from 'Components/UserSearchableList';
import {useUserDevicesHistory} from 'Hooks/useUserDevicesHistory';
import {ClientRepository} from 'Repositories/client';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {User} from 'Repositories/entity/User';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {handleEnterDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {useLegalHoldModalState} from './LegalHoldModal.state';

const DISABLE_SUBMIT_TEXT_LENGTH = 1;

export enum LegalHoldModalType {
  REQUEST = 'request',
  USERS = 'users',
}

export interface LegalHoldModalProps {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  cryptographyRepository: CryptographyRepository;
  messageRepository: MessageRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  selfUser: User;
}

const LegalHoldModal: FC<LegalHoldModalProps> = ({
  selfUser,
  conversationRepository,
  searchRepository,
  teamRepository,
  clientRepository,
  cryptographyRepository,
  messageRepository,
}) => {
  const skipShowUsersRef = useRef(false);

  const {
    fingerprint,
    setFingerprint,
    closeModal,
    closeRequestModal,
    type,
    setType,
    isLoading,
    isOpen,
    setIsLoading,
    isInitialized,
    setIsModalOpen,
    conversation: currentConversation,
    isSelfInfo,
    users,
    setUsers,
  } = useLegalHoldModalState();

  const isRequest = type === LegalHoldModalType.REQUEST;
  const isUsers = type === LegalHoldModalType.USERS;

  const [isPending, setIsPending] = useState<boolean>(false);
  const [isSendingApprove, setIsSendingApprove] = useState<boolean>(false);
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [requestError, setRequestError] = useState<string>('');
  const [userDevices, setUserDevices] = useState<User | undefined>(undefined);

  const requiresPassword = isRequest && !selfUser.isNoPasswordSSO;
  const disableSubmit = requiresPassword && passwordValue.length < DISABLE_SUBMIT_TEXT_LENGTH;

  const userDevicesHistory = useUserDevicesHistory();
  const showDeviceList = userDevicesHistory.current.state === UserDevicesState.DEVICE_LIST;

  const onClose = useCallback(() => {
    closeModal();

    setUserDevices(undefined);
    setPasswordValue('');
    setRequestError('');
  }, []);

  const onBgClick = useCallback(() => {
    if (!isRequest) {
      onClose();
    }
  }, [isRequest]);

  const onBackClick = () => {
    if (!showDeviceList) {
      return userDevicesHistory.goBack();
    }

    setUserDevices(undefined);
  };

  const closeRequest = () => {
    if (isRequest) {
      closeRequestModal();
    }
  };

  const acceptRequest = async () => {
    if (disableSubmit) {
      return;
    }

    setRequestError('');
    setIsSendingApprove(true);

    try {
      if (!selfUser.teamId) {
        return;
      }

      const password = requiresPassword ? passwordValue : undefined;
      // @ts-ignore Need to check if it will work with undefined password for SSO login
      await teamRepository.teamService.sendLegalHoldApproval(selfUser.teamId, selfUser.id, password);
      selfUser.hasPendingLegalHold(false);

      await clientRepository.updateClientsForSelf();

      setIsSendingApprove(false);
      skipShowUsersRef.current = true;
      closeRequest();
      setUserDevices(undefined);
      setPasswordValue('');
      setRequestError('');
    } catch ({code, message}) {
      switch (code) {
        case HTTP_STATUS.BAD_REQUEST: {
          setRequestError(t('BackendError.LABEL.BAD_REQUEST'));
          break;
        }
        case HTTP_STATUS.FORBIDDEN: {
          setRequestError(t('BackendError.LABEL.ACCESS_DENIED'));
          break;
        }
        default: {
          setRequestError(message as string);
        }
      }

      setIsSendingApprove(false);
    }
  };

  const showRequestModal = useCallback(async () => {
    const setModalParams = (value: boolean) => {
      setIsModalOpen(value);
      setIsLoading(value);

      if (!value) {
        setType(null);
      }
    };

    if (isLoading) {
      setModalParams(true);
    }

    if (!selfUser.teamId) {
      setModalParams(false);

      return;
    }

    if (!fingerprint && selfUser.teamId) {
      const response = await teamRepository.teamService.getLegalHoldState(selfUser.teamId, selfUser.id);
      if (response.status === LegalHoldMemberStatus.PENDING) {
        const newFingerprint = await cryptographyRepository.getRemoteFingerprint(
          selfUser,
          response.client.id,
          response.last_prekey,
        );
        selfUser.hasPendingLegalHold(true);
        setFingerprint(newFingerprint);
        setIsModalOpen(true);
        setIsLoading(false);
      } else {
        setModalParams(false);

        if (!isInitialized) {
          setType(LegalHoldModalType.USERS);
        }
      }
    }
  }, [
    isInitialized,
    cryptographyRepository,
    fingerprint,
    isLoading,
    selfUser,
    setFingerprint,
    setIsLoading,
    setIsModalOpen,
    teamRepository.teamService,
  ]);

  const checkLegalHoldState = useCallback(async () => {
    if (!selfUser.teamId) {
      return;
    }

    const response = await teamRepository.teamService.getLegalHoldState(selfUser.teamId, selfUser.id);
    const isPendingStatus = response.status === LegalHoldMemberStatus.PENDING;

    if (isPendingStatus) {
      setIsPending(isPendingStatus);
      setIsModalOpen(true);
    }
  }, [selfUser.id, selfUser.teamId, teamRepository.teamService]);

  useEffect(() => {
    if (type) {
      checkLegalHoldState();
    }
  }, [type, checkLegalHoldState]);

  useEffect(() => {
    if (isPending && isOpen && isRequest) {
      showRequestModal();
    }
  }, [isPending, showRequestModal, isOpen, isRequest]);

  // Show users
  const getLegalHoldUsers = useCallback(async () => {
    if (skipShowUsersRef.current) {
      skipShowUsersRef.current = false;

      closeModal();

      return;
    }

    if (currentConversation) {
      await messageRepository.updateAllClients(currentConversation, false);
      const allUsers = await conversationRepository.getAllUsersInConversation(currentConversation);
      const legalHoldUsers = allUsers.filter(user => user.isOnLegalHold());

      if (!legalHoldUsers.length) {
        setIsModalOpen(false);

        return;
      }

      setUsers(legalHoldUsers);
    } else {
      setUsers([selfUser]);
    }

    setIsLoading(false);
    setIsModalOpen(true);
  }, [conversationRepository, currentConversation, messageRepository, selfUser]);

  useEffect(() => {
    if (isOpen && isUsers) {
      getLegalHoldUsers();
    }
  }, [getLegalHoldUsers, isOpen, isUsers]);

  return (
    <ModalComponent
      isShown={isOpen}
      onBgClick={onBgClick}
      onClosed={onClose}
      data-uie-name="legal-hold-modal"
      showLoading={isLoading}
      id="legal-hold-modal"
      className="legal-hold-modal"
    >
      <div className="modal__header">
        {userDevices && (
          <button
            className="button-reset-default modal__header__button modal__header__button__left"
            type="button"
            onClick={onBackClick}
            data-uie-name="go-back-participant-devices"
          >
            <Icon.ArrowLeftIcon />
          </button>
        )}

        {isRequest ? (
          <h2 className="modal__header__title" data-uie-name="status-modal-title">
            {t('legalHoldModalTitle')}
          </h2>
        ) : (
          <button className="button-reset-default modal__header__button" data-uie-name="do-close" onClick={onBgClick}>
            <Icon.CloseIcon />
          </button>
        )}
      </div>

      <div className={cx('modal__body legal-hold-modal__wrapper', {'legal-hold-modal__wrapper--request': isRequest})}>
        {isRequest && (
          <>
            <div className="modal__text" data-uie-name="status-modal-text">
              <p
                dangerouslySetInnerHTML={{
                  __html: t('legalHoldModalText', undefined, {
                    br: '<br>',
                    fingerprint: `<span class="legal-hold-modal__fingerprint" data-uie-name="status-modal-fingerprint">${fingerprint}</span>`,
                  }),
                }}
              />

              {requiresPassword && <div>{t('legalHoldModalTextPassword')}</div>}
            </div>

            {requiresPassword && (
              <input
                className="modal__input"
                type="password"
                value={passwordValue}
                placeholder={t('login.passwordPlaceholder')}
                onChange={ev => setPasswordValue(ev.target.value)}
                onKeyDown={ev => handleEnterDown(ev, acceptRequest)}
              />
            )}

            {requestError && (
              <div className="modal__input__error" data-uie-name="status-error">
                {requestError}
              </div>
            )}

            <div className="modal__buttons">
              <button
                type="button"
                className="modal__button modal__button--secondary"
                data-uie-name="do-secondary"
                onClick={closeRequest}
              >
                {t('legalHoldModalSecondaryAction')}
              </button>

              {!isSendingApprove ? (
                <button
                  type="button"
                  className={cx('modal__button modal__button--primary', {'modal__button--disabled': disableSubmit})}
                  data-uie-name="do-action"
                  onClick={acceptRequest}
                >
                  {t('legalHoldModalPrimaryAction')}
                </button>
              ) : (
                <div className="modal__button modal__button--primary legal-hold-modal__loading-button">
                  <Icon.LoadingIcon />
                </div>
              )}
            </div>
          </>
        )}

        {!isRequest && (
          <>
            {!userDevices ? (
              <>
                <div className="legal-hold-modal__logo">
                  <LegalHoldDot large dataUieName="status-modal-legal-hold-icon" />
                </div>

                <div className="legal-hold-modal__headline" data-uie-name="status-modal-title">
                  {t('legalHoldHeadline')}
                </div>

                <p
                  className="legal-hold-modal__info"
                  data-uie-name="status-modal-text"
                  dangerouslySetInnerHTML={{
                    __html: isSelfInfo ? t('legalHoldDescriptionSelf') : t('legalHoldDescriptionOthers'),
                  }}
                />

                <div className="legal-hold-modal__subjects">{t('legalHoldSubjects')}</div>

                <UserSearchableList
                  users={users}
                  conversationRepository={conversationRepository}
                  searchRepository={searchRepository}
                  teamRepository={teamRepository}
                  onClick={setUserDevices}
                  selfUser={selfUser}
                  noUnderline
                />
              </>
            ) : (
              <UserDevices
                clientRepository={clientRepository}
                cryptographyRepository={cryptographyRepository}
                messageRepository={messageRepository}
                user={userDevices as User}
                current={userDevicesHistory.current}
                goTo={userDevicesHistory.goTo}
                noPadding
              />
            )}
          </>
        )}
      </div>
    </ModalComponent>
  );
};

export {LegalHoldModal};
