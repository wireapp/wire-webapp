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

import {useState} from 'react';

import {Input, Label} from '@wireapp/react-ui-kit';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';

import {inputStyles, inputWrapperStyles, wrapperStyles} from './CellsNewItemModal.styles';

interface CellsNewItemModalProps {
  type: 'folder' | 'file';
  onSubmit: () => void;
  onChange: (name: string) => void;
}

export const showNewCellsItemModal = ({onSubmit, type, onChange}: CellsNewItemModalProps) => {
  //   PrimaryModal.show(PrimaryModal.type.CONFIRM, {
  //     primaryAction: {action: onSubmit, text: 'Create'},
  //     text: {
  //       message: <CellsNewItemModalContent type={type} onSubmit={onSubmit} onChange={onChange} />,
  //       title: type === 'folder' ? 'Create new folder' : 'Create new file',
  //     },
  //   });
  PrimaryModal.show(PrimaryModal.type.INPUT, {
    primaryAction: {
      action: (name: string) => {
        console.log(name);
      },
      text: 'Create',
    },
    text: {
      closeBtnLabel: 'Close',
      input: 'Enter name',
      title: 'Create new folder',
      message: 'Enter name ads',
      inputLabel: 'Name',
    },
  });
};

const CellsNewItemModalContent = ({type, onSubmit, onChange}: CellsNewItemModalProps) => {
  const [name, setName] = useState(type === 'folder' ? 'Empty folder' : 'Empty file.txt');

  return (
    <div css={wrapperStyles}>
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div css={inputWrapperStyles}>
          <Label htmlFor="generated-public-link">Name</Label>
          <Input
            id="generated-public-link"
            value={name}
            onChange={event => {
              setName(event.currentTarget.value);
              onChange(event.currentTarget.value);
            }}
            wrapperCSS={inputStyles}
          />
        </div>
      </form>
    </div>
  );
};
