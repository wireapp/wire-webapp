Demo:

```jsx
import React from 'react';
import {
  Container,
  Label,
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
  <Label>Label</Label>
  <LabelLink block>LabelLink</LabelLink>

  <Line />
  <Label>
    <div style={{marginLeft: '16px'}}>{"I'm a label!"}</div>
    <Input placeholder="Focus me!" />
  </Label>
  <Label markInvalid>
    <div style={{marginLeft: '16px'}}>{'Uh error!'}</div>
    <Input placeholder="Error" markInvalid />
  </Label>

  <Label>
    <div style={{marginLeft: '16px'}}>{'TextArea!'}</div>
    <TextArea placeholder="Text" />
  </Label>

  <Label markInvalid>
    <div style={{marginLeft: '16px'}}>{'Uh error!'}</div>
    <TextArea placeholder="Text" markInvalid />
  </Label>

  <Label>
    <div style={{marginLeft: '16px'}}>{'Select!'}</div>
    <Select>
      <option>a</option>
      <option>b</option>
      <option>c</option>
    </Select>
  </Label>

  <Label markInvalid>
    <div style={{marginLeft: '16px'}}>{'Uh error!'}</div>
    <Select markInvalid>
      <option>a</option>
      <option>b</option>
      <option>c</option>
    </Select>
  </Label>

  <Label>
    <div style={{marginLeft: '16px'}}>{'SubmitCombo label'}</div>
    <InputSubmitCombo>
      <Input placeholder="Input submit Combo" name="password" />
      <RoundIconButton type="submit" formNoValidate>
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  </Label>

  <Label markInvalid>
    <div style={{marginLeft: '16px'}}>{'SubmitCombo label'}</div>
    <InputSubmitCombo markInvalid>
      <Input placeholder="Input submit Combo" name="password" />
      <RoundIconButton type="submit" formNoValidate>
        <ArrowIcon />
      </RoundIconButton>
    </InputSubmitCombo>
  </Label>
</Container>;
```
