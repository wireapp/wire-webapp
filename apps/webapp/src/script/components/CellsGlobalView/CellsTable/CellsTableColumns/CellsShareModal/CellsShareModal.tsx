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

import {useEffect, useState} from 'react';

import {CellsShareModalContent} from 'Components/Cells/ShareModal/CellsShareModalContent';
import {serializeShareModalInput} from 'Components/Cells/ShareModal/shareModalSerializer';
import {useCellExpirationToggle} from 'Components/Cells/ShareModal/useCellExpirationToggle';
import {useCellPasswordToggle} from 'Components/Cells/ShareModal/useCellPasswordToggle';
import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
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
import {useCellPublicLink} from './useCellPublicLink';

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

interface ShareModalParams {
  type: 'file' | 'folder';
  uuid: string;
  cellsRepository: CellsRepository;
}

const submitHandlers = new Map<string, () => Promise<void> | void>();

export const showShareModal = ({type, uuid, cellsRepository}: ShareModalParams) => {
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
        message: <CellsShareModal type={type} uuid={uuid} cellsRepository={cellsRepository} modalId={modalId} />,
        title: t('cells.shareModal.heading'),
      },
    },
    modalId,
  );
};

const CellsShareModal = ({type, uuid, cellsRepository, modalId}: ShareModalParams & {modalId: string}) => {
  const {status, link, isEnabled, togglePublicLink, updatePublicLink} = useCellPublicLink({uuid, cellsRepository});
  const node = useCellsStore(state => state.nodes.find(cellNode => cellNode.id === uuid));
  const {isEnabled: isPasswordEnabled, toggle: togglePassword} = useCellPasswordToggle();
  const {isEnabled: isExpirationEnabled, toggle: toggleExpiration} = useCellExpirationToggle();
  const [passwordValue, setPasswordValue] = useState('');
  const [expirationDateTime, setExpirationDateTime] = useState<Date | null>(null);
  const [isExpirationInvalid, setIsExpirationInvalid] = useState(false);

  const isInputDisabled = ['loading', 'error'].includes(status);

  useEffect(() => {
    submitHandlers.set(modalId, async () => {
      if (!isEnabled || status !== 'success' || !node?.publicLink?.uuid) {
        removeCurrentModal();
        return;
      }

      const serialized = serializeShareModalInput({
        passwordEnabled: isPasswordEnabled,
        passwordValue,
        expirationEnabled: isExpirationEnabled,
        expirationDateTime,
        expirationInvalid: isExpirationInvalid,
      });

      if (!serialized.isValid) {
        return;
      }

      try {
        await updatePublicLink({
          password: serialized.updatePassword,
          passwordEnabled: serialized.passwordEnabled,
          ...(serialized.accessEnd ? {accessEnd: serialized.accessEnd} : {}),
        });
        removeCurrentModal();
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
        onToggle: togglePassword,
        value: passwordValue,
        onChange: setPasswordValue,
        onGeneratePassword: setPasswordValue,
      }}
      expiration={{
        isEnabled: isExpirationEnabled,
        onToggle: toggleExpiration,
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
