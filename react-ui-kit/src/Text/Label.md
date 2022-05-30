Demo:

```jsx
import React from 'react';
import {
  Container,
  InputLabel,
  LabelLink,
  InputSubmitCombo,
  RoundIconButton,
  ArrowIcon,
  Input,
  TextArea,
  Select,
  Line,
} from '@wireapp/react-ui-kit';

<Container>
  <InputLabel>InputLabel</InputLabel>
  <LabelLink block>LabelLink</LabelLink>

  <Line />
  <InputLabel>
    <div style={{marginLeft: '16px'}}>{"I'm a label!"}</div>
    <Input placeholder="Focus me!" />
  </InputLabel>
  <InputLabel markInvalid>
    <div style={{marginLeft: '16px'}}>{'Uh error!'}</div>
    <Input placeholder="Error" markInvalid />
  </InputLabel>

  <InputLabel>
    <div style={{marginLeft: '16px'}}>{'TextArea!'}</div>
    <TextArea placeholder="Text" />
  </InputLabel>

  <InputLabel markInvalid>
    <div style={{marginLeft: '16px'}}>{'Uh error!'}</div>
    <TextArea placeholder="Text" markInvalid />
  </InputLabel>

  <InputLabel>
    <div style={{marginLeft: '16px'}}>{'Select!'}</div>
    <Select>
      <option>a</option>
      <option>b</option>
      <option>c</option>
    </Select>
  </InputLabel>

  <InputLabel markInvalid>
    <div style={{marginLeft: '16px'}}>{'Uh error!'}</div>
    <Select markInvalid>
      <option>a</option>
      <option>b</option>
      <option>c</option>
    </Select>
  </InputLabel>

  <InputLabel>
    <div style={{marginLeft: '16px'}}>{'SubmitCombo label'}</div>
    <InputSubmitCombo>
      <Input placeholder="Input submit Combo" name="password" />
      <RoundIconButton type="submit" formNoValidate>
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  </InputLabel>

  <InputLabel markInvalid>
    <div style={{marginLeft: '16px'}}>{'SubmitCombo label'}</div>
    <InputSubmitCombo markInvalid>
      <Input placeholder="Input submit Combo" name="password" />
      <RoundIconButton type="submit" formNoValidate>
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  </InputLabel>
</Container>;
```
