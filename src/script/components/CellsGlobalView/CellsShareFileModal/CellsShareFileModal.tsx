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

import {
  inputStyles,
  inputWrapperStyles,
  labelStyles,
  loaderWrapperStyles,
  publicLinkDescriptionStyles,
  switchContainerStyles,
  switchWrapperStyles,
  wrapperStyles,
} from './CellsShareFileModal.styles';
import {useCellPublicLink} from './useCellPublicLink';

import {CellsTableLoader} from '../CellsTableLoader/CellsTableLoader';

interface ShareFileModalParams {
  uuid: string;
  cellsRepository: CellsRepository;
}

export const showShareFileModal = ({uuid, cellsRepository}: ShareFileModalParams) => {
  PrimaryModal.show(PrimaryModal.type.CONFIRM, {
    primaryAction: {action: () => {}, text: 'Done'},
    text: {
      message: <CellsShareFileModalContent uuid={uuid} cellsRepository={cellsRepository} />,
      title: 'Share file via link',
    },
  });
};

const CellsShareFileModalContent = ({uuid, cellsRepository}: ShareFileModalParams) => {
  const {status, link, isEnabled, togglePublicLink} = useCellPublicLink({uuid, cellsRepository});

  const isInputDisabled = status === 'loading' || status === 'error';

  return (
    <div css={wrapperStyles}>
      <div css={switchContainerStyles}>
        <div>
          <Label htmlFor="switch-public-link" css={labelStyles}>
            Enable public link
          </Label>
          <p id="switch-public-link-description" css={publicLinkDescriptionStyles}>
            Your file will be uploaded and shared via a public link. Only those with the link can view it—ensure you
            trust your recipients.
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
            Generated public link
          </label>
          <Input id="generated-public-link" value={link} wrapperCSS={inputStyles} disabled={isInputDisabled} />
          <CopyToClipboardButton textToCopy={link} displayText="Copy link" copySuccessText="Link copied!" />
        </div>
      )}
      {status === 'loading' && (
        <div css={loaderWrapperStyles}>
          <CellsTableLoader />
        </div>
      )}
      {status === 'error' && <div>Error loading link</div>}
    </div>
  );
};
