Demo:

```js
import {Fragment} from 'react';
import {Columns, Column, ErrorMessage, Select} from '@wireapp/react-ui-kit';

<Fragment>
  <Columns>
    <Column>Select</Column>

    <Column>
      <Select label="Select" id="firstSelect">
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
      <Select disabled label="Disabled select" id="disabledSelect">
        <option>a</option>
      </Select>
    </Column>
  </Columns>

  <Columns>
    <Column>Required Select</Column>

    <Column>
      <Select label="Required select" required id="requiredSelect">
        <option>a</option>
      </Select>
    </Column>
  </Columns>

  <Columns>
    <Column>Invalid Select</Column>

    <Column>
      <Select
        markInvalid
        label="InputLabel"
        id="invalidSelect"
        required
        error={<ErrorMessage>Error message</ErrorMessage>}
      >
        <option>a</option>
      </Select>
    </Column>
  </Columns>
</Fragment>;
```
