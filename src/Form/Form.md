Demo:

```js
import {Fragment, useRef} from 'react';
import {
  ShakeBox,
  Form,
  Tooltip,
  Text,
  COLOR,
  InputSubmitCombo,
  Button,
  ErrorMessage,
  Input,
  InputBlock,
  RoundIconButton,
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

const shakeBox = useRef();

<Fragment>
  <ShakeBox ref={shakeBox}>
    <Form
      onSubmit={event => {
        event.preventDefault();
        shakeBox.current.shake();
      }}
    >
      <Tooltip text="This shows a placeholder input">
        <Input placeholder="Placeholder" type="email" required />
      </Tooltip>
      <Button type="submit" formNoValidate>
        Submit Button
      </Button>
      <InputBlock>
        <Input placeholder="InputBlock" markInvalid />
        <Input placeholder="Second Input" markInvalid />
        <Tooltip text="Lots of icons here">
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
        </Tooltip>
      </InputBlock>
    </Form>
  </ShakeBox>
  <ErrorMessage>Submit form for shake effect</ErrorMessage>
</Fragment>;
```
