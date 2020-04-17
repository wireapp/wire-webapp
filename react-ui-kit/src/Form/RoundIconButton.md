Demo:

```js
import {Fragment} from 'react';
import {
  RoundIconButton,
  Text,
  COLOR,
  InputSubmitCombo,
  Input,
  TextArea,
  ArrowIcon,
  AttachmentIcon,
  CheckIcon,
  CloseIcon,
  GifIcon,
  ImageIcon,
  PingIcon,
  PlaneIcon,
  ProfileIcon,
  TeamIcon,
  TimedIcon,
  TrashIcon,
} from '@wireapp/react-ui-kit';

<Fragment>
  <InputSubmitCombo markInvalid>
    <Input placeholder="InputSubmitCombo" name="password" />
    <RoundIconButton type="submit" formNoValidate>
      <ArrowIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <AttachmentIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <CheckIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <CloseIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <GifIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <ImageIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <PingIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <PlaneIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <ProfileIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <TeamIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <TimedIcon />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <TrashIcon color={COLOR.GREEN} />
    </RoundIconButton>
    <RoundIconButton type="submit" formNoValidate>
      <Text color={COLOR.GREEN}>M</Text>
    </RoundIconButton>
  </InputSubmitCombo>
</Fragment>;
```
