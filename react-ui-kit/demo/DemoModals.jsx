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
import React from 'react';

class DemoModals extends React.PureComponent {
  state = {
    isFullscreenModalOpen: false,
    isMenuModalOpen: false,
    isModalOpen: false,
    isOverlayOpen: false,
  };

  closeMenuModal = () => this.setState({isMenuModalOpen: false});

  render() {
    return (
      <Container>
        <Line />
        <H1>Modals</H1>
        {this.state.isModalOpen && (
          <Modal onClose={() => this.setState({isModalOpen: false})}>
            <H2 style={{margin: 0}}>Normal Modal</H2>
            <Paragraph>
              <Text block>Normal Modal</Text>
            </Paragraph>
            <Button>Button</Button>
          </Modal>
        )}
        {this.state.isFullscreenModalOpen && (
          <Modal fullscreen onClose={() => this.setState({isFullscreenModalOpen: false})}>
            <H1>Fullscreen Modal</H1>
          </Modal>
        )}
        {this.state.isOverlayOpen && (
          <Overlay>
            <H1>Overlay</H1>
            <Button onClick={() => this.setState({isOverlayOpen: false})}>Close</Button>
          </Overlay>
        )}
        {this.state.isMenuModalOpen && (
          <MenuModal data-uie-name="should-be-there" onBackgroundClick={this.closeMenuModal}>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Like
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Edit
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Delete for me...
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Delete for everyone...
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Cancel
            </MenuItem>
          </MenuModal>
        )}
        <Columns>
          <Column>Normal</Column>
          <Column>
            <Button onClick={() => this.setState({isModalOpen: true})}>Open</Button>
          </Column>
        </Columns>
        <Columns>
          <Column>Full screen</Column>
          <Column>
            <Button onClick={() => this.setState({isFullscreenModalOpen: true})}>Open</Button>
          </Column>
        </Columns>
        <Columns>
          <Column>MenuModal</Column>
          <Column>
            <Button onClick={() => this.setState({isMenuModalOpen: true})}>Open</Button>
          </Column>
        </Columns>
        <Columns>
          <Column>Overlay</Column>
          <Column>
            <Button onClick={() => this.setState({isOverlayOpen: true})}>Open</Button>
          </Column>
        </Columns>
      </Container>
    );
  }
}

export default DemoModals;
