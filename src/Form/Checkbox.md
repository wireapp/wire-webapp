Demo:

```js
import {Fragment, useState} from 'react';
import {Column, Columns, Checkbox, CheckboxLabel, Link} from '@wireapp/react-ui-kit';

const [isChecked, setIsChecked] = useState(true);

<Fragment>
  <Columns>
    <Column>Checkbox</Column>
    <Column>
      <Checkbox id="ToU" checked={isChecked} onChange={ev => setIsChecked(ev.target.checked)}>
        <CheckboxLabel>{'ToU'}</CheckboxLabel>
      </Checkbox>
    </Column>
  </Columns>
  <Columns>
    <Column>Checkbox</Column>
    <Column>
      <Checkbox id="ToULink" defaultChecked={true}>
        <CheckboxLabel>
          {'ToU '}
          <Link href="#">{'Component link'}</Link>
          {' text '}
          <a href="#">{'plain link'}</a>
        </CheckboxLabel>
      </Checkbox>
    </Column>
  </Columns>
  <Columns>
    <Column>Disabled Checkbox</Column>
    <Column>
      <Checkbox id="disabled" disabled>
        <CheckboxLabel>{'Disabled'}</CheckboxLabel>
      </Checkbox>
    </Column>
  </Columns>
  <Columns>
    <Column>Invalid Checkbox</Column>
    <Column>
      <Checkbox markInvalid id="ToU">
        <CheckboxLabel>{'ToU'}</CheckboxLabel>
      </Checkbox>
    </Column>
  </Columns>
</Fragment>;
```
