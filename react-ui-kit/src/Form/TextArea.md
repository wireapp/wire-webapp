Demo:

```js
import {Fragment} from 'react';
import {Columns, Column, TextArea} from '@wireapp/react-ui-kit';

<Fragment>
  <Columns>
    <Column>TextArea</Column>
    <Column>
      <TextArea rows="6" placeholder="Placeholder" />
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled TextArea</Column>
    <Column>
      <TextArea rows="3" disabled placeholder="Placeholder" />
    </Column>
  </Columns>
  <Columns>
    <Column>Invalid TextArea</Column>
    <Column>
      <TextArea rows="4" markInvalid placeholder="Placeholder" />
    </Column>
  </Columns>
</Fragment>;
```
