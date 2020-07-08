Demo:

```js
import {Fragment} from 'react';
import {InputSubmitCombo, RoundIconButton, ArrowIcon, Input} from '@wireapp/react-ui-kit';

<Fragment>
  <Input label={"I'm a label!"} placeholder="Focus me!" />
  <Input label={'Uh error!'} placeholder="Error" markInvalid />

  <InputSubmitCombo label="SubmitCombo Label">
    <Input placeholder="InputSubmitCombo" name="password" />
    <RoundIconButton type="submit" formNoValidate>
      <ArrowIcon />
    </RoundIconButton>
  </InputSubmitCombo>
</Fragment>;
```
