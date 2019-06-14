/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {
  Button,
  Column,
  Columns,
  Container,
  H1,
  H2,
  Line,
  MenuItem,
  MenuModal,
  Modal,
  Overlay,
  Paragraph,
  Text,
} from '@wireapp/react-ui-kit';
import React, {useState} from 'react';

export const DemoModals = () => {
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  return (
    <Container>
      <Line />
      <H1>Modals</H1>
      {isModalOpen && (
        <Modal onClose={() => this.setIsModalOpen(false)}>
          <H2 style={{margin: 0}}>Normal Modal</H2>
          <Paragraph>
            <Text block>Normal Modal</Text>
          </Paragraph>
          <Button>Button</Button>
        </Modal>
      )}
      {isFullscreenModalOpen && (
        <Modal fullscreen onClose={() => setIsFullscreenModalOpen(false)}>
          <H1>Fullscreen Modal</H1>
        </Modal>
      )}
      {isOverlayOpen && (
        <Overlay>
          <H1>Overlay</H1>
          <Button onClick={() => setIsOverlayOpen(false)}>Close</Button>
        </Overlay>
      )}
      {isMenuModalOpen && (
        <MenuModal data-uie-name="should-be-there" onBackgroundClick={() => setIsMenuModalOpen(false)}>
          <MenuItem data-uie-name="should-be-there" onClick={() => setIsMenuModalOpen(false)}>
            Like
          </MenuItem>
          <MenuItem data-uie-name="should-be-there" onClick={() => setIsMenuModalOpen(false)}>
            Edit
          </MenuItem>
          <MenuItem data-uie-name="should-be-there" onClick={() => setIsMenuModalOpen(false)}>
            Delete for me...
          </MenuItem>
          <MenuItem data-uie-name="should-be-there" onClick={() => setIsMenuModalOpen(false)}>
            Delete for everyone...
          </MenuItem>
          <MenuItem data-uie-name="should-be-there" onClick={() => setIsMenuModalOpen(false)}>
            Cancel
          </MenuItem>
        </MenuModal>
      )}
      <Columns>
        <Column>Normal</Column>
        <Column>
          <Button onClick={() => setIsModalOpen(true)}>Open</Button>
        </Column>
      </Columns>
      <Columns>
        <Column>Full screen</Column>
        <Column>
          <Button onClick={() => setIsFullscreenModalOpen(true)}>Open</Button>
        </Column>
      </Columns>
      <Columns>
        <Column>MenuModal</Column>
        <Column>
          <Button onClick={() => setIsMenuModalOpen(true)}>Open</Button>
        </Column>
      </Columns>
      <Columns>
        <Column>Overlay</Column>
        <Column>
          <Button onClick={() => setIsOverlayOpen(true)}>Open</Button>
        </Column>
      </Columns>
    </Container>
  );
};
