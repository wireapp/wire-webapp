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

import {CellsShareModalContent} from 'Components/Cells/ShareModal/CellsShareModalContent';
import {useCellExpirationToggle} from 'Components/Cells/ShareModal/useCellExpirationToggle';
import {useCellPasswordToggle} from 'Components/Cells/ShareModal/useCellPasswordToggle';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {
  inputStyles,
  inputWrapperStyles,
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

interface ShareModalParams {
  type: 'file' | 'folder';
  uuid: string;
  cellsRepository: CellsRepository;
}

export const showShareModal = ({type, uuid, cellsRepository}: ShareModalParams) => {
  PrimaryModal.show(PrimaryModal.type.CONFIRM, {
    size: 'large',
    primaryAction: {action: () => {}, text: t('cells.shareModal.primaryAction')},
    text: {
      message: <CellsShareModal type={type} uuid={uuid} cellsRepository={cellsRepository} />,
      title: t('cells.shareModal.heading'),
    },
  });
};

const CellsShareModal = ({type, uuid, cellsRepository}: ShareModalParams) => {
  const {status, link, isEnabled, togglePublicLink} = useCellPublicLink({uuid, cellsRepository});
  const {isEnabled: isPasswordEnabled, toggle: togglePassword} = useCellPasswordToggle();
  const {isEnabled: isExpirationEnabled, toggle: toggleExpiration} = useCellExpirationToggle();

  const isInputDisabled = ['loading', 'error'].includes(status);

  return (
    <CellsShareModalContent
      publicLinkDescription={t(
        type === 'file'
          ? 'cells.shareModal.enablePublicLink.file.description'
          : 'cells.shareModal.enablePublicLink.folder.description',
      )}
      labels={{
        enablePublicLink: t('cells.shareModal.enablePublicLink'),
        password: t('cells.shareModal.password'),
        passwordDescription: t('cells.shareModal.password.description'),
        expiration: t('cells.shareModal.expiration'),
        expirationDescription: t('cells.shareModal.expiration.description'),
        generatedPublicLink: t('cells.shareModal.generatedPublicLink'),
        copyLink: t('cells.shareModal.copyLink'),
        linkCopied: t('cells.shareModal.linkCopied'),
        errorLoadingLink: t('cells.shareModal.error.loadingLink'),
      }}
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
      }}
      expiration={{
        isEnabled: isExpirationEnabled,
        onToggle: toggleExpiration,
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
        loaderWrapperStyles,
      }}
    />
  );
};
