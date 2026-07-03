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

import {ReactElement, useEffect, useRef, useState} from 'react';

import {FireAndForgetInvoker} from '@wireapp/core';

import {CellsShareModalContent} from 'Components/Cells/ShareModal/CellsShareModalContent';
import {serializeShareModalInput} from 'Components/Cells/ShareModal/shareModalSerializer';
import {useCellExpirationToggle} from 'Components/Cells/ShareModal/useCellExpirationToggle';
import {useCellPasswordToggle} from 'Components/Cells/ShareModal/useCellPasswordToggle';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {RootContextValue} from 'src/script/page/rootProvider';
import {createUuid} from 'Util/uuid';

import {
  inputStyles,
  inputWrapperStyles,
  passwordActionButtonStyles,
  passwordContentStyles,
  passwordCopyButtonStyles,
  passwordInputLabelStyles,
  passwordInputRowStyles,
  passwordInputStyles,
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
} from './CellsShareModal.styles';
import {useCellGlobalPublicLink} from './useCellGlobalPublicLink';

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

interface ShareModalParams {
  type: 'file' | 'folder';
  uuid: string;
  cellsRepository: CellsRepository;
  fireAndForgetInvoker: FireAndForgetInvoker;
  translate: RootContextValue['translate'];
}

type CellsShareModalProps = ShareModalParams & {
  modalId: string;
};

const submitHandlers = new Map<string, () => Promise<void> | void>();
const ACCESS_END_SECONDS_TO_MILLISECONDS = 1000;

export const showShareModal = (properties: ShareModalParams): void => {
  const {type, uuid, cellsRepository, fireAndForgetInvoker, translate} = properties;
  const modalId = createUuid();
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      closeOnConfirm: false,
      size: 'large',
      primaryAction: {
        action: () => {
          const submitHandler = submitHandlers.get(modalId);
          if (submitHandler !== null && submitHandler !== undefined) {
            fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
              await submitHandler();
            });
          }
        },
        text: translate('cells.shareModal.primaryAction'),
      },
      text: {
        message: (
          <CellsShareModal
            type={type}
            uuid={uuid}
            cellsRepository={cellsRepository}
            fireAndForgetInvoker={fireAndForgetInvoker}
            modalId={modalId}
            translate={translate}
          />
        ),
        title: translate('cells.shareModal.heading'),
      },
    },
    modalId,
    translate,
  );
};

export const CellsShareModal = (properties: CellsShareModalProps): ReactElement => {
  const {type, uuid, cellsRepository, fireAndForgetInvoker, modalId, translate} = properties;
  const {status, link, linkData, isEnabled, togglePublicLink, updatePublicLink} = useCellGlobalPublicLink({
    uuid,
    cellsRepository,
    fireAndForgetInvoker,
  });
  const node = useCellsStore(state => state.nodes.find(cellNode => cellNode.id === uuid));
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
  const hasExistingPassword = linkData?.PasswordRequired === true;

  // Initialize toggles and values based on existing link data
  useEffect(() => {
    if (!isEnabled) {
      initializedLinkIdRef.current = null;
      return;
    }

    if (linkData !== null && status === 'success' && initializedLinkIdRef.current !== linkData.Uuid) {
      setIsPasswordEnabled(linkData.PasswordRequired === true);

      // Always sync expiration toggle and date with linkData state
      if (linkData.AccessEnd !== undefined && linkData.AccessEnd.length > 0) {
        setIsExpirationEnabled(true);
        // Convert Unix timestamp (in seconds) to Date
        const expirationDate = new Date(parseInt(linkData.AccessEnd) * ACCESS_END_SECONDS_TO_MILLISECONDS);
        setExpirationDateTime(expirationDate);
      } else {
        setIsExpirationEnabled(false);
        setExpirationDateTime(null);
      }
      if (linkData.Uuid !== undefined && linkData.Uuid.length > 0) {
        initializedLinkIdRef.current = linkData.Uuid;
      }
    }
  }, [isEnabled, linkData, status, setIsPasswordEnabled, setIsExpirationEnabled]);

  const handlePasswordToggle = (): void => {
    if (isPasswordEnabled) {
      setWasPasswordDisabled(true);
      setIsEditingPassword(false);
    } else {
      if (wasPasswordDisabled || !hasExistingPassword) {
        setIsEditingPassword(true);
        setPasswordValue('');
      } else {
        setIsEditingPassword(false);
      }
      setWasPasswordDisabled(false);
    }
    togglePassword();
  };

  // Handle "Change Password" button click
  const handleChangePasswordClick = (): void => {
    setIsEditingPassword(true);
    setPasswordValue('');
  };

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
      if (
        !isEnabled ||
        status !== 'success' ||
        node?.publicLink?.uuid === undefined ||
        node.publicLink.uuid.length === 0
      ) {
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
      translate={translate}
      publicLinkDescription={translate(
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
