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

import {ArrowIcon, PlaneIcon, ProfileIcon, TeamIcon} from '@wireapp/react-ui-kit/Icon';
import {
  Bold,
  H1,
  H2,
  H3,
  H4,
  Heading,
  Label,
  LabelLink,
  Line,
  Link,
  Muted,
  Paragraph,
  Small,
  Text,
  Uppercase,
} from '@wireapp/react-ui-kit/Text';
import {
  Button,
  ButtonLink,
  Checkbox,
  CodeInput,
  ErrorMessage,
  Form,
  Input,
  InputBlock,
  InputSubmitCombo,
  RoundIconButton,
  Select,
  ShakeBox,
} from '@wireapp/react-ui-kit/Form';
import {COLOR, Logo} from '@wireapp/react-ui-kit/Identity';
import {
  Column,
  Columns,
  Container,
  ContainerMD,
  ContainerSM,
  ContainerXS,
  Content,
  Footer,
  Header,
  StyledApp,
} from '@wireapp/react-ui-kit/Layout';
import {CheckboxLabel} from '../src/Form/index';
import Color from 'color';
import {Loading} from '@wireapp/react-ui-kit/Progress';
import {Modal} from '@wireapp/react-ui-kit/Modal';
import React from 'react';

let shakebox = null;

class Demo extends React.PureComponent {
  state = {
    isFullscreenModalOpen: false,
    isModalOpen: false,
  };

  render() {
    return (
      <StyledApp>
        {this.state.isModalOpen && (
          <Modal onClose={() => this.setState({isModalOpen: false})}>
            <H1>Normal Modal</H1>
          </Modal>
        )}
        {this.state.isFullscreenModalOpen && (
          <Modal fullscreen onClose={() => this.setState({isFullscreenModalOpen: false})}>
            <H1>Fullscreen Modal</H1>
          </Modal>
        )}
        <Header>
          <Logo />
          <Loading />
          <Loading progress={0.33} />
          <Loading progress={0.66} />
          <Logo scale="3" hover />
          <ProfileIcon />
          <TeamIcon />
          <ArrowIcon direction="up" />
          <PlaneIcon />
        </Header>
        <Content>
          <Container>
            <H1>Layout</H1>
            <Line />
            <ContainerXS>
              <Button block disabled>
                ContainerXS
              </Button>
            </ContainerXS>
            <ContainerSM>
              <Button block disabled>
                ContainerSM
              </Button>
            </ContainerSM>
            <ContainerMD>
              <Button block disabled>
                ContainerMD
              </Button>
            </ContainerMD>
            <H2>Columns</H2>
            <Line />
            <Columns>
              <Column>Column</Column>
              <Column>Column</Column>
              <Column>Column</Column>
            </Columns>

            <H1>Input</H1>
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
                <Link href="#">Link</Link>
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
                <Checkbox id="ToU">
                  <Text bold fontSize="11px" textTransform="uppercase">
                    {'ToU '}
                  </Text>
                  <Link href="#">{'Link'}</Link>
                </Checkbox>
              </Column>
            </Columns>
            <Columns>
              <Column>Disabled Checkbox</Column>
              <Column>
                <Checkbox id="disabled" disabled>
                  <Text bold fontSize="11px" textTransform="uppercase">
                    {'Disabled'}
                  </Text>
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
                  <Input placeholder="Placeholder" type="email" required />
                  <Button type="submit" formNoValidate>
                    Submit Button
                  </Button>
                  <InputBlock>
                    <Input placeholder="InputBlock" markInvalid />
                    <InputSubmitCombo>
                      <Input placeholder="InputSubmitCombo" />
                      <RoundIconButton type="submit" icon="plane" formNoValidate />
                    </InputSubmitCombo>
                  </InputBlock>
                </Form>
              </ShakeBox>
              <ErrorMessage>Submit form for shake effect</ErrorMessage>
              <CodeInput onCodeComplete={code => console.log(code)} />
            </ContainerXS>

            <H1>Modals</H1>
            <Columns>
              <Column>Normal</Column>
              <Column>
                <Button onClick={() => this.setState({isModalOpen: true})}>Open</Button>
              </Column>
            </Columns>
            <Columns>
              <Column>Full screen</Column>
              <Column>
                <Button onClick={() => this.setState({isFullscreenModalOpen: true})}>Open</Button>
              </Column>
            </Columns>

            <H1>Typography</H1>
            <Line />
            <Columns>
              <Column>Default heading</Column>
              <Column>
                <Heading>Heading default</Heading>
              </Column>
            </Columns>
            <Columns>
              <Column>Heading1</Column>
              <Column>
                <H1>Heading1</H1>
              </Column>
            </Columns>
            <Columns>
              <Column>Heading2</Column>
              <Column>
                <H2>Heading2</H2>
              </Column>
            </Columns>
            <Columns>
              <Column>Heading3</Column>
              <Column>
                <H3>Heading3</H3>
              </Column>
            </Columns>
            <Columns>
              <Column>Heading4</Column>
              <Column>
                <H4>Heading4</H4>
              </Column>
            </Columns>

            <Columns>
              <Column>Unformatted text</Column>
              <Column>Unformatted text</Column>
            </Columns>
            <Columns>
              <Column>Normal text</Column>
              <Column>
                <Text>Normal text</Text>
              </Column>
            </Columns>
            <Columns>
              <Column>Bold text</Column>
              <Column>
                <Bold>Bold text</Bold>
              </Column>
            </Columns>
            <Columns>
              <Column>Muted text</Column>
              <Column>
                <Muted>Muted text</Muted>
              </Column>
            </Columns>
            <Columns>
              <Column>Small text</Column>
              <Column>
                <Small>Small text</Small>
              </Column>
            </Columns>
            <Columns>
              <Column>Uppercase text</Column>
              <Column>
                <Uppercase>upper case</Uppercase>
              </Column>
            </Columns>
            <Line />
            <Paragraph>
              Paragraph<br />Lorem ipsum dolor, sit amet consectetur adipisicing elit. Odit, nemo. Voluptates rerum
              harum accusamus dignissimos modi rem, quod quia. Delectus nesciunt, provident rerum maiores vero
              consequatur, nostrum quod ad, ipsam reprehenderit iure laborum error amet voluptate aliquam cum! Error
              nulla nobis, quia beatae nesciunt ex doloribus eius temporibus nihil explicabo eveniet architecto, ipsam
              doloremque. Pariatur, reiciendis voluptatem? Modi voluptatibus fugiat aliquid, ipsum quisquam corrupti
              labore molestiae optio, voluptate iste incidunt laborum ullam obcaecati veniam harum deleniti nobis beatae
              aspernatur inventore in, quibusdam sunt itaque ipsam veritatis! Inventore corporis eaque voluptatum
              quaerat facilis illo architecto unde consequatur veniam modi nam, eveniet perferendis aliquid in deleniti!
              Officiis obcaecati repudiandae harum sequi. Eum ab qui, eaque sapiente, quod perspiciatis totam voluptate
              neque enim facere repudiandae nemo! Soluta sunt aliquid voluptatem molestiae fugiat, iure iste assumenda,
              non quia nisi voluptatibus odio perferendis qui debitis facere dignissimos perspiciatis sapiente laborum
              voluptatum. Quia provident aperiam id veniam natus inventore distinctio, error, quibusdam nulla iusto
              maxime! Necessitatibus quo vitae veritatis repellat unde placeat tempora est nobis aut cumque quis, autem,
              quae maiores nihil consectetur quasi? Error repudiandae similique adipisci quasi autem necessitatibus
              labore cumque, exercitationem consequuntur fugiat nemo aliquam, architecto animi inventore explicabo sint
              iure molestias laborum.
            </Paragraph>
            <Line />
            <Paragraph noWrap truncate>
              Truncated text<br />Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut at eveniet numquam non
              aperiam, provident sed atque quibusdam! Vitae velit tempore ea pariatur voluptatum. Iure dolorum
              laudantium, rem iusto eveniet obcaecati perspiciatis. Dolorem quisquam laborum ab ipsam unde eum rerum
              incidunt quia magnam harum itaque, obcaecati fugiat debitis aliquid nihil, voluptatum commodi, sit quidem!
              Delectus itaque consectetur consequatur quis dignissimos pariatur, incidunt ipsam in velit deleniti
              voluptatum numquam minima. Optio repudiandae deleniti nemo modi, eligendi sit rem? Sapiente facere quam
              laboriosam ratione tenetur inventore repellendus adipisci dolorem sit vero cum explicabo consequatur
              voluptatibus quis modi fuga mollitia, maiores expedita dolor nostrum magni nesciunt cupiditate. Itaque
              voluptatibus totam asperiores quisquam nisi nihil, eos accusantium similique, praesentium illo neque
              repellendus nam placeat. Quibusdam minima repudiandae blanditiis iste esse voluptas in! Cumque distinctio
              consequatur animi sit incidunt nostrum aut mollitia, voluptatum dolores reprehenderit eius qui praesentium
              officiis delectus, non neque, cupiditate quis obcaecati recusandae odit? Minus officiis sed, nemo quos in
              laudantium consequatur soluta accusamus ea adipisci magni consequuntur optio incidunt eligendi, rerum
              cupiditate repudiandae tempore dolores neque laborum commodi, libero voluptatibus dolorum! Magnam
              perferendis alias porro, placeat totam molestiae similique reiciendis harum consequuntur, earum autem
              excepturi expedita molestias laborum quae non cupiditate!
            </Paragraph>

            <Label>Label</Label>
            <LabelLink block>LabelLink</LabelLink>

            <H1>Colors</H1>
            <Line />
            {Object.keys(COLOR).map(colorKey => (
              <div key={colorKey} style={{backgroundColor: COLOR[colorKey], color: Color(COLOR[colorKey]).negate()}}>
                {colorKey} ({Color(COLOR[colorKey])
                  .hex()
                  .toString()})
              </div>
            ))}
          </Container>
        </Content>
        <Footer>Footer</Footer>
      </StyledApp>
    );
  }
}

export default Demo;
