/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {
  Button,
  ButtonLink,
  COLOR,
  Checkbox,
  CheckboxLabel,
  CodeInput,
  Column,
  Columns,
  Container,
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  H2,
  ICON_NAME,
  Input,
  InputBlock,
  InputSubmitCombo,
  Label,
  LabelLink,
  Line,
  Link,
  RoundIconButton,
  Select,
  ShakeBox,
  Tooltip,
} from '@wireapp/react-ui-kit';
import React from 'react';

let shakebox = null;

class DemoInputs extends React.PureComponent {
  state = {};

  render() {
    return (
      <Container>
        <Line />
        <H1>Inputs</H1>
        <Line />

        <H2>Button</H2>
        <Line />
        <Columns>
          <Column>Button</Column>
          <Column>
            <ButtonLink backgroundColor={COLOR.GREEN}>ButtonLink</ButtonLink>
          </Column>
        </Columns>
        <Columns>
          <Column>Disabled Button</Column>
          <Column>
            <Button disabled>Default Button</Button>
          </Column>
        </Columns>

        <H2>Link</H2>
        <Line />
        <Columns>
          <Column>Link</Column>
          <Column>
            <Link block href="#">
              Link
            </Link>
            <Link block color={COLOR.RED} href="#">
              Red Link
            </Link>
          </Column>
        </Columns>
        <Columns>
          <Column>Link with custom component</Column>
          <Column>
            <Link component={Button} color={COLOR.GREEN}>
              CustomLink
            </Link>
          </Column>
        </Columns>

        <H2>Checkbox</H2>
        <Line />
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
                <Link href="#">{'Link'}</Link>
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

        <H2>Select</H2>
        <Line />
        <Columns>
          <Column>Select</Column>
          <Column>
            <Select>
              <option>a</option>
              <option>b</option>
              <option>c</option>
              <option>d</option>
            </Select>
          </Column>
        </Columns>
        <Columns>
          <Column>Disabled Select</Column>
          <Column>
            <Select disabled>
              <option>a</option>
            </Select>
          </Column>
        </Columns>

        <H2>TextInput</H2>
        <Line />
        <Columns>
          <Column>TextInput</Column>
          <Column>
            <Input placeholder="Placeholder" />
          </Column>
        </Columns>
        <Columns>
          <Column>Disabled TextInput</Column>
          <Column>
            <Input disabled placeholder="Placeholder" />
          </Column>
        </Columns>

        <H2>Label</H2>
        <Line />
        <Label>Label</Label>
        <LabelLink block>LabelLink</LabelLink>

        <H2>Form</H2>
        <Line />
        <ContainerXS>
          <ShakeBox ref={node => (shakebox = node)}>
            <Form
              onSubmit={event => {
                shakebox.shake();
                event.preventDefault();
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
                <Tooltip text="Lots of icons here">
                  <InputSubmitCombo>
                    <Input placeholder="InputSubmitCombo" name="password" />
                    <RoundIconButton type="submit" icon={ICON_NAME.ARROW} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.ATTACHMENT} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.CHECK} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.CLOSE} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.GIF} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.IMAGE} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.PING} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.PLANE} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.PROFILE} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.TEAM} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.TIMED} formNoValidate />
                    <RoundIconButton type="submit" icon={ICON_NAME.TRASH} formNoValidate />
                    <RoundIconButton type="submit" formNoValidate>
                      M
                    </RoundIconButton>
                  </InputSubmitCombo>
                </Tooltip>
              </InputBlock>
            </Form>
          </ShakeBox>
          <ErrorMessage>Submit form for shake effect</ErrorMessage>
          <CodeInput onCodeComplete={code => console.info(code)} />
        </ContainerXS>
      </Container>
    );
  }
}

export default DemoInputs;
