Demo:

```js
import {IconButton, Container, Columns, Column, H2, InfoIcon} from '@wireapp/react-ui-kit';

<Container>
  <H2>Primary</H2>
  <Columns>
    <Column>Enabled</Column>
    <Column>
      <IconButton>
        <InfoIcon />
      </IconButton>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled</Column>
    <Column>
      <IconButton disabled onClick={() => alert('This should not work')}>
        <InfoIcon />
      </IconButton>
    </Column>
  </Columns>

  <H2>Secondary</H2>
  <Columns>
    <Column>Enabled</Column>
    <Column>
      <IconButton variant="secondary">
        <InfoIcon />
      </IconButton>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled</Column>
    <Column>
      <IconButton variant="secondary" disabled onClick={() => alert('This should not work')}>
        <InfoIcon />
      </IconButton>
    </Column>
  </Columns>
</Container>;
```
