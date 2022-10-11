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

import {FC, useEffect, useState} from 'react';

import {LegalHoldMemberStatus} from '@wireapp/api-client/src/team/legalhold/';
import {amplify} from 'amplify';
import cx from 'classnames';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import ko from 'knockout';

import Icon from 'Components/Icon';
import LegalHoldDot from 'Components/LegalHoldDot';
import ModalComponent from 'Components/ModalComponent';
import UserDevices, {UserDevicesState, useUserDevicesHistory} from 'Components/UserDevices';
import UserSearchableList from 'Components/UserSearchableList';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {ClientRepository} from '../../../client/ClientRepository';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {MessageRepository} from '../../../conversation/MessageRepository';
import {CryptographyRepository} from '../../../cryptography/CryptographyRepository';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {LegalHoldModalState} from '../../../legal-hold/LegalHoldModalState';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserState} from '../../../user/UserState';

export interface LegalHoldModalProps {
  userState: UserState;
  conversationRepository: ConversationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  clientRepository: ClientRepository;
  cryptographyRepository: CryptographyRepository;
  messageRepository: MessageRepository;
}

const LegalHoldModal: FC<LegalHoldModalProps> = ({
  userState,
  conversationRepository,
  searchRepository,
  teamRepository,
  clientRepository,
  cryptographyRepository,
  messageRepository,
}) => {
  const [isShown, setIsShown] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSelfInfo, setIsSelfInfo] = useState<boolean>(false);
  const [showRequest, setShowRequest] = useState<boolean>(false);
  const [requiresPassword, setRequiresPassword] = useState<boolean>(true);
  const [skipShowUsers, setSkipShowUsers] = useState<boolean>(false);
  const [isSendingApprove, setIsSendingApprove] = useState<boolean>(false);

  const [requestFingerprint, setRequestFingerprint] = useState<string>('');
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [requestError, setRequestError] = useState<string>('');

  const [userDevices, setUserDevices] = useState<User | undefined>(undefined);

  const [users, setUsers] = useState<User[]>([]);

  const [conversationId, setConversationId] = useState<string | null>(null);

  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const disableSubmit = requiresPassword && passwordValue.length < 1;

  const userDevicesHistory = useUserDevicesHistory();
  const showDeviceList = userDevicesHistory.current.state === UserDevicesState.DEVICE_LIST;

  const onClose = () => {
    setIsShown(false);
    setUsers([]);
    setUserDevices(undefined);
    setShowRequest(false);
    setPasswordValue('');
    setRequestError('');
    setIsLoading(false);
  };

  const hideModal = () => {
    onClose();
    setConversationId(null);
  };

  const onBgClick = () => {
    if (!showRequest) {
      hideModal();
    }
  };

  const onBackClick = () => {
    if (!showDeviceList) {
      return userDevicesHistory.goBack();
    }

    setUserDevices(undefined);
  };

  const closeRequest = () => {
    if (showRequest) {
      hideModal();
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

      const password = requiresPassword ? passwordValue : '';
      await teamRepository.teamService.sendLegalHoldApproval(selfUser.teamId, selfUser.id, password);

      onClose();
      setIsSendingApprove(false);
      setSkipShowUsers(true);
      selfUser.hasPendingLegalHold(false);

      await clientRepository.updateClientsForSelf();
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

  const showRequestModal = async (showLoading?: boolean, fingerprint?: string) => {
    setShowRequest(true);
    setIsShown(true);

    const setModalParams = (value: boolean) => {
      setIsShown(value);
      setIsLoading(value);
      setShowRequest(value);
    };

    if (showLoading) {
      setModalParams(true);
    }

    setRequiresPassword(!selfUser.isNoPasswordSSO);

    if (!selfUser.inTeam()) {
      setModalParams(false);

      return;
    }

    if (!fingerprint) {
      if (!selfUser.teamId) {
        return;
      }

      const response = await teamRepository.teamService.getLegalHoldState(selfUser.teamId, selfUser.id);

      if (response.status === LegalHoldMemberStatus.PENDING) {
        fingerprint = await cryptographyRepository.getRemoteFingerprint(
          selfUser,
          response.client.id,
          response.last_prekey,
        );
        selfUser.hasPendingLegalHold(true);
      } else {
        setModalParams(false);

        return;
      }
    }

    setIsShown(true);
    setIsLoading(false);

    const formattedFingerprint = splitFingerprint(fingerprint || '')
      .map(part => `<span>${part} </span>`)
      .join('');

    setRequestFingerprint(formattedFingerprint);
  };

  const showUsers = async (conversation?: Conversation) => {
    if (skipShowUsers) {
      setSkipShowUsers(false);

      return;
    }

    setShowRequest(false);

    if (conversation === undefined) {
      setUsers([selfUser]);
      setIsSelfInfo(true);
      setIsLoading(false);
      setIsShown(true);

      setConversationId('self');
      return;
    }

    conversation = ko.unwrap(conversation);

    setIsSelfInfo(false);
    setIsLoading(true);
    setIsShown(true);

    await messageRepository.updateAllClients(conversation, false);
    const allUsers = await conversationRepository.getAllUsersInConversation(conversation);
    const legalHoldUsers = allUsers.filter(user => user.isOnLegalHold());

    if (!legalHoldUsers.length) {
      setIsShown(false);

      return;
    }

    setUsers(legalHoldUsers);
    setConversationId(conversation.id);

    setIsLoading(false);
  };

  const hideLegalHoldModal = (currentConversationId?: string) => {
    const isCurrentConversation = conversationId === currentConversationId;

    if (!showRequest && isCurrentConversation) {
      hideModal();
    }
  };

  useEffect(() => {
    amplify.subscribe(LegalHoldModalState.SHOW_REQUEST, (fingerprint?: string) => showRequestModal(false, fingerprint));
    amplify.subscribe(LegalHoldModalState.HIDE_REQUEST, hideModal);
    amplify.subscribe(LegalHoldModalState.SHOW_DETAILS, showUsers);
    amplify.subscribe(LegalHoldModalState.HIDE_DETAILS, hideLegalHoldModal);

    return () => {
      amplify.unsubscribe(LegalHoldModalState.SHOW_REQUEST, (fingerprint?: string) =>
        showRequestModal(false, fingerprint),
      );
      amplify.unsubscribe(LegalHoldModalState.HIDE_REQUEST, hideModal);
      amplify.unsubscribe(LegalHoldModalState.SHOW_DETAILS, showUsers);
      amplify.unsubscribe(LegalHoldModalState.HIDE_DETAILS, hideLegalHoldModal);
    };
  }, []);

  return (
    <ModalComponent
      isShown={isShown}
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
            className="button-reset-default"
            type="button"
            onClick={onBackClick}
            data-uie-name="go-back-participant-devices"
          >
            <Icon.ArrowLeft className="modal__header__button modal__header__button__left" />
          </button>
        )}

        {showRequest ? (
          <h2 className="modal__header__title" data-uie-name="status-modal-title">
            {t('legalHoldModalTitle')}
          </h2>
        ) : (
          <button className="button-reset-default modal__header__button" data-uie-name="do-close" onClick={onBgClick}>
            <Icon.Close />
          </button>
        )}
      </div>

      <div className={cx('modal__body legal-hold-modal__wrapper', {'legal-hold-modal__wrapper--request': showRequest})}>
        {showRequest && (
          <>
            <div className="modal__text" data-uie-name="status-modal-text">
              <p
                dangerouslySetInnerHTML={{
                  __html: t(
                    'legalHoldModalText',
                    {},
                    {
                      br: '<br>',
                      fingerprint: `<span class="legal-hold-modal__fingerprint" data-uie-name="status-modal-fingerprint">${requestFingerprint}</span>`,
                    },
                  ),
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
                  <Icon.Loading />
                </div>
              )}
            </div>
          </>
        )}

        {!showRequest && !userDevices ? (
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
              userState={userState}
              conversationRepository={conversationRepository}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              onClick={setUserDevices}
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
      </div>
    </ModalComponent>
  );
};

export default LegalHoldModal;
