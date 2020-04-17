Demo:

```js
import {Fragment} from 'react';
import {Column, Columns, Checkbox, CheckboxLabel, Link} from '@wireapp/react-ui-kit';

<Fragment>
  <Columns>
    <Column>Checkbox</Column>
    <Column>
      <Checkbox id="ToU">
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
          <Link href="#">{'component link'}</Link>
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
