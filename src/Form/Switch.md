Demo:

```js
import {useState} from 'react';
import {Switch, Container, Columns, Column, COLOR} from '@wireapp/react-ui-kit';

const [checked, setChecked] = useState(false);

<Container>
  <Columns>
    <Column>Switch</Column>
    <Column style={{margin: '1px'}}>
      <Switch
        checked={checked}
        onToggle={isChecked => {
          setChecked(isChecked);
        }}
      />
    </Column>
  </Columns>
  <Columns>
    <Column>Switch checked</Column>
    <Column style={{margin: '1px'}}>
      <Switch checked={true} onToggle={() => {}} />
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Switch</Column>
    <Column style={{margin: '1px'}}>
      <Switch disabled />
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled and checked Switch</Column>
    <Column style={{margin: '1px'}}>
      <Switch checked disabled />
    </Column>
  </Columns>
  <Columns>
    <Column>Loading Switch</Column>
    <Column style={{margin: '1px'}}>
      <Switch showLoading />
    </Column>
  </Columns>
</Container>;
```
