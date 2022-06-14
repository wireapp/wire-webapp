Demo:

```js
import {Fragment, useState} from 'react';
import {Columns, Column, ErrorMessage, Select} from '@wireapp/react-ui-kit';

const options = [
  {value: '1', label: 'Option 1'},
  {value: '2', label: 'Option 2'},
  {value: '3', label: 'Option 3'},
  {value: '4', label: 'Option 4'},
  {value: '5', label: 'Option 5'},
  {value: '6', label: 'Option 6'},
];

const [firstSelectOption, setFirstSelectOption] = useState(options[0].value);
const [secondSelectOption, setSecondSelectOption] = useState(null);
const [thirdSelectOption, setThirdSelectOption] = useState(null);

<Fragment>
  <Columns>
    <Column>Select</Column>

    <Column>
      <Select
        label="Select"
        id="firstSelect"
        options={options}
        value={firstSelectOption ? options.find(option => option.value === firstSelectOption) : null}
        onChange={setFirstSelectOption}
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
        value={secondSelectOption ? options.find(option => option.value === secondSelectOption) : null}
        onChange={setSecondSelectOption}
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
        value={thirdSelectOption ? options.find(option => option.value === thirdSelectOption) : null}
        onChange={setThirdSelectOption}
        dataUieName="invalid-select"
      />
    </Column>
  </Columns>
</Fragment>;
```
