Demo:

```js
import {Button, Container, Columns, Column, H2, PlusIcon} from '@wireapp/react-ui-kit';

<Container>
  <H2>Button Group</H2>

  <div style={{marginBottom: '20px'}}>
    <ButtonGroup>
      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} />

      <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />}>Button</ButtonGroup.Button>

      <ButtonGroup.Button>Text only</ButtonGroup.Button>
    </ButtonGroup>
  </div>

  <ButtonGroup>
    <ButtonGroup.Button>Text only</ButtonGroup.Button>
  </ButtonGroup>

  <ButtonGroup>
    <ButtonGroup.Button icon={<PlusIcon height={12} width={12} />} disabled />
  </ButtonGroup>
</Container>;
```
