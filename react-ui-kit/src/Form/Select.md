Demo:

```js
import {Fragment} from 'react';
import {Columns, Column, ErrorMessage, Select} from '@wireapp/react-ui-kit';

const options = [
  {value: '1', label: 'Option 1'},
  {value: '2', label: 'Option 2'},
  {value: '3', label: 'Option 3'},
];

<Fragment>
  <Columns>
    <Column>Select</Column>

    <Column>
      <Select
        label="Select"
        id="firstSelect"
        options={options}
        value={options[0]}
        onChange={selectedOption => console.log('Selected option', selectedOption)}
        dataUieName="select"
      />
    </Column>
  </Columns>

  <Columns>
    <Column>Disabled Select</Column>

    <Column>
      <Select
        disabled
        label="Disabled select"
        id="disabledSelect"
        options={options}
        onChange={selectedOption => console.log('Selected option', selectedOption)}
        dataUieName="disabled-select"
      />
    </Column>
  </Columns>

  <Columns>
    <Column>Required Select</Column>

    <Column>
      <Select
        label="Required select"
        required
        id="requiredSelect"
        options={options}
        onChange={selectedOption => console.log('Selected option', selectedOption)}
        dataUieName="required-select"
      />
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
        options={options}
        onChange={selectedOption => console.log('Selected option', selectedOption)}
        dataUieName="invalid-select"
      />
    </Column>
  </Columns>
</Fragment>;
```
