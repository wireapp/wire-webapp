Demo:

```js
import React, {useState} from 'react';
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

const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
const [isModalOpen, setIsModalOpen] = useState(false);
const [isModalWidthActionsOpen, setIsModalWidthActionsOpen] = useState(false);
const [isOverlayOpen, setIsOverlayOpen] = useState(false);

<Container>
  {isModalOpen && (
    <Modal onClose={() => setIsModalOpen(false)}>
      <H2 style={{margin: 0}}>Normal Modal</H2>
      <Paragraph>
        <Text block>Normal Modal</Text>
      </Paragraph>
      <Button>Button</Button>
    </Modal>
  )}
  {isModalWidthActionsOpen && (
    <Modal
      onClose={() => setIsModalWidthActionsOpen(false)}
      bodyStyle={{width: 360}}
      actions={[
        {title: 'Cancel', onClick: () => {}, bold: false},
        {title: 'Send', onClick: () => {}, bold: true},
      ]}
    >
      <H2 style={{margin: 0}}>Modal with actions</H2>
      <Paragraph>
        <Text block>Modal with actions</Text>
      </Paragraph>
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
    <Column>Modal with actions</Column>
    <Column>
      <Button onClick={() => setIsModalWidthActionsOpen(true)}>Open</Button>
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
</Container>;
```
