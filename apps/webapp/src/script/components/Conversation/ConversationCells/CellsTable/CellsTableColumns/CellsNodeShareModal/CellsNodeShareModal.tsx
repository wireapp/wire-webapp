/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, useRef, useState} from 'react';

import {CellsShareModalContent} from 'Components/Cells/ShareModal/CellsShareModalContent';
import {serializeShareModalInput} from 'Components/Cells/ShareModal/shareModalSerializer';
import {useCellExpirationToggle} from 'Components/Cells/ShareModal/useCellExpirationToggle';
import {useCellPasswordToggle} from 'Components/Cells/ShareModal/useCellPasswordToggle';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
import {createUuid} from 'Util/uuid';

import {
  inputStyles,
  inputWrapperStyles,
  passwordContentStyles,
  passwordInputRowStyles,
  passwordInputLabelStyles,
  passwordInputStyles,
  passwordActionButtonStyles,
  passwordCopyButtonStyles,
  labelStyles,
  loaderWrapperStyles,
  dividerStyles,
  publicLinkDescriptionStyles,
  passwordDescriptionStyles,
  expirationDescriptionStyles,
  switchContentStyles,
  switchContainerStyles,
  switchWrapperStyles,
  toggleContentStyles,
  wrapperStyles,
} from './CellsNodeShareModal.styles';
import {useCellPublicLink} from './useCellPublicLink';

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

interface ShareModalParams {
  type: 'file' | 'folder';
  uuid: string;
  conversationId: string;
  cellsRepository: CellsRepository;
}

const submitHandlers = new Map<string, () => Promise<void> | void>();

export const showShareModal = ({type, uuid, conversationId, cellsRepository}: ShareModalParams) => {
  const modalId = createUuid();
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      closeOnConfirm: false,
      size: 'large',
      primaryAction: {
        action: () => {
          const submitHandler = submitHandlers.get(modalId);
          if (submitHandler) {
            void submitHandler();
          }
        },
        text: t('cells.shareModal.primaryAction'),
      },
      text: {
        message: (
          <CellShareModalContent
            type={type}
            uuid={uuid}
            conversationId={conversationId}
            cellsRepository={cellsRepository}
            modalId={modalId}
          />
        ),
        title: t('cells.shareModal.heading'),
      },
    },
    modalId,
  );
};

const CellShareModalContent = ({
  type,
  uuid,
  conversationId,
  cellsRepository,
  modalId,
}: ShareModalParams & {modalId: string}) => {
  const {status, link, linkData, isEnabled, togglePublicLink, updatePublicLink} = useCellPublicLink({
    uuid,
    conversationId,
    cellsRepository,
  });
  const node = useCellsStore(state =>
    state.nodesByConversation[conversationId]?.find(cellNode => cellNode.id === uuid),
  );
  const {
    isEnabled: isPasswordEnabled,
    toggle: togglePassword,
    setIsEnabled: setIsPasswordEnabled,
  } = useCellPasswordToggle();
  const {
    isEnabled: isExpirationEnabled,
    toggle: toggleExpiration,
    setIsEnabled: setIsExpirationEnabled,
  } = useCellExpirationToggle();
  const [passwordValue, setPasswordValue] = useState('');
  const [expirationDateTime, setExpirationDateTime] = useState<Date | null>(null);
  const [isExpirationInvalid, setIsExpirationInvalid] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [wasPasswordDisabled, setWasPasswordDisabled] = useState(false);
  const initializedLinkIdRef = useRef<string | null>(null);

  // Derive hasExistingPassword from linkData
  const hasExistingPassword = Boolean(linkData?.PasswordRequired);

  // Handle password toggle with tracking for OFF then ON behavior
  const handlePasswordToggle = () => {
    if (isPasswordEnabled) {
      // Password is being turned OFF - track this
      setWasPasswordDisabled(true);
      setIsEditingPassword(false);
    } else {
      // Password is being turned ON
      if (wasPasswordDisabled || !hasExistingPassword) {
        // If it was disabled and now re-enabled, or no existing password, show input fields
        setIsEditingPassword(true);
        setPasswordValue('');
      } else {
        // Opening fresh with existing password - show "Change Password" button
        setIsEditingPassword(false);
      }
      setWasPasswordDisabled(false);
    }
    togglePassword();
  };

  // Handle "Change Password" button click
  const handleChangePasswordClick = () => {
    setIsEditingPassword(true);
    setPasswordValue('');
  };

  // Initialize toggles and values based on existing link data
  useEffect(() => {
    if (!isEnabled) {
      initializedLinkIdRef.current = null;
      return;
    }

    if (linkData && status === 'success' && initializedLinkIdRef.current !== linkData.Uuid) {
      // Always sync password toggle with linkData state
      setIsPasswordEnabled(!!linkData.PasswordRequired);

      // Always sync expiration toggle and date with linkData state
      if (linkData.AccessEnd) {
        setIsExpirationEnabled(true);
        // Convert Unix timestamp (in seconds) to Date
        const expirationDate = new Date(parseInt(linkData.AccessEnd) * 1000);
        setExpirationDateTime(expirationDate);
      } else {
        setIsExpirationEnabled(false);
        setExpirationDateTime(null);
      }

      if (linkData?.Uuid) {
        initializedLinkIdRef.current = linkData.Uuid;
      }
    }
  }, [isEnabled, linkData, status, setIsPasswordEnabled, setIsExpirationEnabled]);

  const isInputDisabled = ['loading', 'error'].includes(status);

  useEffect(() => {
    if (!isEnabled) {
      setIsPasswordEnabled(false);
      setIsExpirationEnabled(false);
      setPasswordValue('');
      setExpirationDateTime(null);
      setIsExpirationInvalid(false);
    }
  }, [isEnabled, setIsPasswordEnabled, setIsExpirationEnabled]);

  useEffect(() => {
    if (!isExpirationEnabled) {
      setExpirationDateTime(null);
      setIsExpirationInvalid(false);
    }
  }, [isExpirationEnabled]);

  useEffect(() => {
    if (!isPasswordEnabled) {
      setPasswordValue('');
    }
  }, [isPasswordEnabled]);

  useEffect(() => {
    submitHandlers.set(modalId, async () => {
      if (!isEnabled || status !== 'success' || !node?.publicLink?.uuid) {
        return;
      }

      const serialized = serializeShareModalInput({
        passwordEnabled: isPasswordEnabled,
        passwordValue,
        expirationEnabled: isExpirationEnabled,
        expirationDateTime,
        expirationInvalid: isExpirationInvalid,
        hasExistingPassword,
        isEditingPassword,
      });

      if (!serialized.isValid) {
        return;
      }

      try {
        await updatePublicLink({
          password: serialized.updatePassword,
          passwordEnabled: serialized.passwordEnabled,
          accessEnd: serialized.accessEnd,
        });
      } catch {
        // Keep the modal open if the update fails.
      }
    });

    return () => {
      submitHandlers.delete(modalId);
    };
  }, [
    modalId,
    cellsRepository,
    isEnabled,
    status,
    node?.publicLink?.uuid,
    isPasswordEnabled,
    passwordValue,
    isExpirationEnabled,
    expirationDateTime,
    isExpirationInvalid,
    updatePublicLink,
    hasExistingPassword,
    isEditingPassword,
  ]);

  return (
    <CellsShareModalContent
      publicLinkDescription={t(
        type === 'file'
          ? 'cells.shareModal.enablePublicLink.file.description'
          : 'cells.shareModal.enablePublicLink.folder.description',
      )}
      publicLink={{
        status,
        link,
        isEnabled,
        onToggle: togglePublicLink,
        disabled: status === 'loading',
      }}
      password={{
        isEnabled: isPasswordEnabled,
        onToggle: handlePasswordToggle,
        value: passwordValue,
        onChange: setPasswordValue,
        onGeneratePassword: setPasswordValue,
        hasExistingPassword,
        isEditingPassword,
        onChangePasswordClick: handleChangePasswordClick,
      }}
      expiration={{
        isEnabled: isExpirationEnabled,
        onToggle: toggleExpiration,
        dateTime: expirationDateTime,
        onChange: selection => {
          setExpirationDateTime(selection.dateTime);
          setIsExpirationInvalid(selection.isInvalid);
        },
      }}
      isInputDisabled={isInputDisabled}
      styles={{
        wrapperStyles,
        labelStyles,
        publicLinkDescriptionStyles,
        passwordDescriptionStyles,
        expirationDescriptionStyles,
        dividerStyles,
        switchContentStyles,
        toggleContentStyles,
        switchContainerStyles,
        switchWrapperStyles,
        inputStyles,
        inputWrapperStyles,
        passwordContentStyles,
        passwordInputRowStyles,
        passwordInputLabelStyles,
        passwordInputStyles,
        passwordActionButtonStyles,
        passwordCopyButtonStyles,
        loaderWrapperStyles,
      }}
    />
  );
};
