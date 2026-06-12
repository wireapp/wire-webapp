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

import {ReactNode, useState} from 'react';

import {Meta, StoryObj} from '@storybook/react';

import {Modal} from './Modal';

import {Button} from '../../Inputs';
import {H1, H2, Paragraph, Text} from '../../Typography';

const meta: Meta<typeof Modal> = {
  component: Modal,
  title: 'Surface/Modal',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalDemo = ({children}: {children: (isOpen: boolean, setIsOpen: (open: boolean) => void) => ReactNode}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{padding: '24px'}}>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      {children(isOpen, setIsOpen)}
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <ModalDemo>
      {(isOpen, setIsOpen) =>
        isOpen && (
          <Modal onClose={() => setIsOpen(false)}>
            <H2 style={{margin: 0}}>Normal Modal</H2>
            <Paragraph>
              <Text block>This is a normal modal with default styling.</Text>
            </Paragraph>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </Modal>
        )
      }
    </ModalDemo>
  ),
};

export const WithActions: Story = {
  render: () => (
    <ModalDemo>
      {(isOpen, setIsOpen) =>
        isOpen && (
          <Modal
            onClose={() => setIsOpen(false)}
            bodyStyle={{width: 360}}
            actions={[
              {title: 'Cancel', onClick: () => setIsOpen(false), bold: false},
              {title: 'Send', onClick: () => setIsOpen(false), bold: true},
            ]}
          >
            <H2 style={{margin: 0}}>Modal with actions</H2>
            <Paragraph>
              <Text block>This modal has action buttons at the bottom.</Text>
            </Paragraph>
          </Modal>
        )
      }
    </ModalDemo>
  ),
};

export const Fullscreen: Story = {
  render: () => (
    <ModalDemo>
      {(isOpen, setIsOpen) =>
        isOpen && (
          <Modal fullscreen onClose={() => setIsOpen(false)}>
            <H1>Fullscreen Modal</H1>
            <Paragraph>
              <Text block>This modal takes up the entire screen.</Text>
            </Paragraph>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </Modal>
        )
      }
    </ModalDemo>
  ),
};

export const CustomWidth: Story = {
  render: () => (
    <ModalDemo>
      {(isOpen, setIsOpen) =>
        isOpen && (
          <Modal onClose={() => setIsOpen(false)} bodyStyle={{width: 800}}>
            <H2 style={{margin: 0}}>Wide Modal</H2>
            <Paragraph>
              <Text block>This modal has a custom width of 800px.</Text>
            </Paragraph>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </Modal>
        )
      }
    </ModalDemo>
  ),
};

export const WithLongContent: Story = {
  render: () => (
    <ModalDemo>
      {(isOpen, setIsOpen) =>
        isOpen && (
          <Modal onClose={() => setIsOpen(false)}>
            <H2 style={{margin: 0}}>Modal with Long Content</H2>
            {Array.from({length: 10}).map((_, index) => (
              <Paragraph key={index}>
                <Text block>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec euismod, nisl eget ultricies ultricies,
                  nunc nunc aliquam nunc, vitae aliquam nunc nunc vitae nunc.
                </Text>
              </Paragraph>
            ))}
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </Modal>
        )
      }
    </ModalDemo>
  ),
};

export const MultipleActions: Story = {
  render: () => (
    <ModalDemo>
      {(isOpen, setIsOpen) =>
        isOpen && (
          <Modal
            onClose={() => setIsOpen(false)}
            bodyStyle={{width: 400}}
            actions={[
              {title: 'Delete', onClick: () => setIsOpen(false), bold: false},
              {title: 'Edit', onClick: () => setIsOpen(false), bold: false},
              {title: 'Save', onClick: () => setIsOpen(false), bold: true},
            ]}
          >
            <H2 style={{margin: 0}}>Multiple Actions</H2>
            <Paragraph>
              <Text block>This modal has multiple action buttons.</Text>
            </Paragraph>
          </Modal>
        )
      }
    </ModalDemo>
  ),
};
