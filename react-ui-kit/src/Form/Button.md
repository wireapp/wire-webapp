Demo:

```js
import {Button, Container, Columns, Column, COLOR} from '@wireapp/react-ui-kit';

<Container>
  <Columns>
    <Column>Button</Column>
    <Column>
      <Button backgroundColor={COLOR.BLUE}>Button</Button>
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
</Container>;
```
