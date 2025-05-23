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

import {Input, Label, Switch} from '@wireapp/react-ui-kit';

import {CopyToClipboardButton} from 'Components/CopyToClipboardButton/CopyToClipboardButton';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {
  inputStyles,
  inputWrapperStyles,
  labelStyles,
  loaderWrapperStyles,
  publicLinkDescriptionStyles,
  switchContainerStyles,
  switchWrapperStyles,
  wrapperStyles,
} from './CellsNodeShareModal.styles';
import {useCellPublicLink} from './useCellPublicLink';

import {CellsTableLoader} from '../../../common/CellsTableLoader/CellsTableLoader';

interface ShareFileModalParams {
  uuid: string;
  conversationId: string;
  cellsRepository: CellsRepository;
}

export const showShareFileModal = ({uuid, conversationId, cellsRepository}: ShareFileModalParams) => {
  PrimaryModal.show(PrimaryModal.type.CONFIRM, {
    primaryAction: {action: () => {}, text: t('cells.shareFileModal.primaryAction')},
    text: {
      message: (
        <CellsShareFileModalContent uuid={uuid} conversationId={conversationId} cellsRepository={cellsRepository} />
      ),
      title: t('cells.shareFileModal.heading'),
    },
  });
};

const CellsShareFileModalContent = ({uuid, conversationId, cellsRepository}: ShareFileModalParams) => {
  const {status, link, isEnabled, togglePublicLink} = useCellPublicLink({uuid, conversationId, cellsRepository});

  const isInputDisabled = ['loading', 'error'].includes(status);

  return (
    <div css={wrapperStyles}>
      <div css={switchContainerStyles}>
        <div>
          <Label htmlFor="switch-public-link" css={labelStyles}>
            {t('cells.shareFileModal.enablePublicLink')}
          </Label>
          <p id="switch-public-link-description" css={publicLinkDescriptionStyles}>
            {t('cells.shareFileModal.enablePublicLink.description')}
          </p>
        </div>
        <div css={switchWrapperStyles}>
          <Switch
            id="switch-public-link"
            aria-describedby="switch-public-link-description"
            checked={isEnabled}
            onToggle={togglePublicLink}
            disabled={status === 'loading'}
          />
        </div>
      </div>
      {isEnabled && status === 'success' && link && (
        <div css={inputWrapperStyles}>
          <label htmlFor="generated-public-link" className="visually-hidden">
            {t('cells.shareFileModal.generatedPublicLink')}
          </label>
          <Input id="generated-public-link" value={link} wrapperCSS={inputStyles} disabled={isInputDisabled} readOnly />
          <CopyToClipboardButton
            textToCopy={link}
            displayText={t('cells.shareFileModal.copyLink')}
            copySuccessText={t('cells.shareFileModal.linkCopied')}
          />
        </div>
      )}
      {status === 'loading' && (
        <div css={loaderWrapperStyles}>
          <CellsTableLoader />
        </div>
      )}
      {status === 'error' && <div>{t('cells.shareFileModalError.loadingLink')}</div>}
    </div>
  );
};
