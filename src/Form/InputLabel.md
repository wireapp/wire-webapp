Demo:

```js
import {Fragment} from 'react';
import {Columns, Column} from '@wireapp/react-ui-kit';
import InputLabel from './InputLabel';

<Fragment>
  <Columns>
    <Column>InputLabel Default</Column>

    <Column>
      <InputLabel>InputLabel</InputLabel>
    </Column>
  </Columns>

  <Columns>
    <Column>InputLabel - Mandatory</Column>

    <Column>
      <InputLabel isRequired>InputLabel</InputLabel>
    </Column>
  </Columns>

  <Columns>
    <Column>InputLabel - Invalid</Column>

    <Column>
      <InputLabel markInvalid>InputLabel</InputLabel>
    </Column>
  </Columns>
</Fragment>;
```
