Demo:

```js
import {Fragment} from 'react';
import {Columns, Column, Select} from '@wireapp/react-ui-kit';

<Fragment>
  <Columns>
    <Column>Select</Column>
    <Column>
      <Select>
        <option>a</option>
        <option>b</option>
        <option>c</option>
        <option>d</option>
      </Select>
    </Column>
  </Columns>
  <Columns>
    <Column>Labeled Select</Column>
    <Column>
      <Select label="Labeled Select">
        <option>a</option>
        <option>b</option>
        <option>c</option>
        <option>d</option>
      </Select>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Select</Column>
    <Column>
      <Select disabled>
        <option>a</option>
      </Select>
    </Column>
  </Columns>
  <Columns>
    <Column>Invalid Select</Column>
    <Column>
      <Select markInvalid>
        <option>a</option>
      </Select>
    </Column>
  </Columns>
</Fragment>;
```
