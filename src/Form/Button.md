Demo:

```js
import {Button, Container, Columns, Column, COLOR, COLOR_V2, H2, PlaneIcon} from '@wireapp/react-ui-kit';

<Container>
  <H2>Primary Button</H2>
  <Columns>
    <Column>Button</Column>
    <Column>
      <Button>Button</Button>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Button</Column>
    <Column>
      <Button disabled onClick={() => alert('This should not work')}>
        Disabled Button
      </Button>
    </Column>
  </Columns>
  <Columns>
    <Column>Loading Button</Column>
    <Column>
      <Button showLoading disabled onClick={() => alert('This should not work')}>
        Loading Button
      </Button>
    </Column>
  </Columns>

  <H2>Secondary Button</H2>
  <Columns>
    <Column>Button</Column>
    <Column>
      <Button variant="secondary">Button</Button>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Button</Column>
    <Column>
      <Button variant="secondary" disabled onClick={() => alert('This should not work')}>
        Disabled Button
      </Button>
    </Column>
  </Columns>
  <Columns>
    <Column>Loading Button</Column>
    <Column>
      <Button variant="secondary" showLoading disabled onClick={() => alert('This should not work')}>
        Loading Button
      </Button>
    </Column>
  </Columns>

  <H2>Tertiary Button</H2>
  <Columns>
    <Column>Button</Column>
    <Column>
      <Button variant="tertiary">Copy link</Button>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Button</Column>
    <Column>
      <Button variant="tertiary" disabled onClick={() => alert('This should not work')}>
        Copy link
      </Button>
    </Column>
  </Columns>

  <H2>Send Button</H2>
  <Columns>
    <Column>Button</Column>
    <Column>
      <Button variant="send">
        <PlaneIcon color={COLOR_V2.WHITE} />
      </Button>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Button</Column>
    <Column>
      <Button variant="send" disabled onClick={() => alert('This should not work')}>
        <PlaneIcon color={COLOR_V2.WHITE} />
      </Button>
    </Column>
  </Columns>
</Container>;
```
