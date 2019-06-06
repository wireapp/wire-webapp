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
  TabBar,
  TabBarItem,
  Text,
  TextArea,
  TextLink,
  Tooltip,
} from '@wireapp/react-ui-kit';
import React, {useRef, useState} from 'react';

export const DemoInputs = () => {
  const shakeBox = useRef();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Container>
      <Line />
      <H1>Inputs</H1>
      <Line />

      <H2>TabBar</H2>
      <Line />
      <TabBar>
        <TabBarItem active={activeTab === 0} onClick={() => setActiveTab(0)}>
          Info
        </TabBarItem>
        <TabBarItem active={activeTab === 1} onClick={() => setActiveTab(1)}>
          Download
        </TabBarItem>
        <TabBarItem active={activeTab === 2} onClick={() => setActiveTab(2)}>
          Open
        </TabBarItem>
      </TabBar>

      <H2>Button</H2>
      <Line />
      <Columns>
        <Column>Button</Column>
        <Column>
          <Button backgroundColor={COLOR.BLUE}>Button</Button>
        </Column>
      </Columns>
      <Columns>
        <Column>Disabled Button</Column>
        <Column>
          <Button disabled onClick={() => alert('This should not work')}>
            Disabled Button
          </Button>
        </Column>
      </Columns>
      <Columns>
        <Column>Loading Button</Column>
        <Column>
          <Button showLoading disabled onClick={() => alert('This should not work')}>
            Loading Button
          </Button>
        </Column>
      </Columns>
      <Columns>
        <Column>ButtonLink</Column>
        <Column>
          <ButtonLink backgroundColor={COLOR.GREEN}>ButtonLink</ButtonLink>
        </Column>
      </Columns>
      <Columns>
        <Column>Loading ButtonLink</Column>
        <Column>
          <ButtonLink showLoading backgroundColor={COLOR.GREEN}>
            ButtonLink
          </ButtonLink>
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
        <Column>TextLink</Column>
        <Column>
          <Text>
            You can download it <TextLink>here</TextLink>.
          </Text>
        </Column>
      </Columns>
      <Columns>
        <Column>Plain Link</Column>
        <Column>
          <Text>
            You can download it <a href="#">here</a>.
          </Text>
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

      <H2>ErrorMessage</H2>
      <Line />
      <Columns>
        <Column>ErrorMessage with link</Column>
        <Column>
          <ErrorMessage>
            Error. <Link>Learn more</Link>
          </ErrorMessage>
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
      <Columns>
        <Column>Invalid Select</Column>
        <Column>
          <Select markInvalid>
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
      <Columns>
        <Column>Invalid TextInput</Column>
        <Column>
          <Input markInvalid placeholder="Placeholder" />
        </Column>
      </Columns>

      <H2>TextArea</H2>
      <Line />
      <Columns>
        <Column>TextArea</Column>
        <Column>
          <TextArea rows="6" placeholder="Placeholder" />
        </Column>
      </Columns>
      <Columns>
        <Column>Disabled TextArea</Column>
        <Column>
          <TextArea rows="3" disabled placeholder="Placeholder" />
        </Column>
      </Columns>
      <Columns>
        <Column>Invalid TextArea</Column>
        <Column>
          <TextArea rows="4" markInvalid placeholder="Placeholder" />
        </Column>
      </Columns>

      <H2>Label</H2>
      <Line />
      <Label>Label</Label>
      <LabelLink block>LabelLink</LabelLink>

      <H2>Form</H2>
      <Line />
      <ContainerXS>
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
        <CodeInput markInvalid onCodeComplete={code => console.info(code)} />
      </ContainerXS>
    </Container>
  );
};
