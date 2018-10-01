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
  AddPeopleIcon,
  AndroidIcon,
  AppleIcon,
  ArrowIcon,
  AttachmentIcon,
  AudioVideoIcon,
  Bold,
  BottomUpMovement,
  Box,
  Button,
  ButtonLink,
  COLOR,
  CallIcon,
  CamIcon,
  CheckIcon,
  Checkbox,
  CheckboxLabel,
  ChromeIcon,
  CodeInput,
  Column,
  Columns,
  Container,
  ContainerLG,
  ContainerMD,
  ContainerSM,
  ContainerXS,
  Content,
  DeviceIcon,
  DownloadIcon,
  EditIcon,
  ErrorMessage,
  FacebookIcon,
  FileIcon,
  Footer,
  Form,
  GifIcon,
  GitHubIcon,
  H1,
  H2,
  H3,
  H4,
  HangupIcon,
  HeaderMenu,
  HeaderSubMenu,
  Heading,
  ICON_NAME,
  ImageIcon,
  Input,
  InputBlock,
  InputSubmitCombo,
  IsMobile,
  Label,
  LabelLink,
  Large,
  Lead,
  LeaveIcon,
  LeftRightMovement,
  Line,
  Link,
  LinkedInIcon,
  LinuxIcon,
  Loading,
  Logo,
  MenuItem,
  MenuLink,
  MenuModal,
  MessageIcon,
  MicrosoftIcon,
  Modal,
  MoreIcon,
  MuteIcon,
  Muted,
  Opacity,
  OptionsIcon,
  Overlay,
  PILL_TYPE,
  Pagination,
  Paragraph,
  Pill,
  PingIcon,
  PlaneIcon,
  ProfileIcon,
  RightLeftMovement,
  RoundIconButton,
  Select,
  ServicesIcon,
  SettingsIcon,
  ShakeBox,
  Small,
  SpeakerIcon,
  StyledApp,
  TeamIcon,
  Text,
  TimedIcon,
  Title,
  Tooltip,
  TopDownMovement,
  TrashIcon,
  TwitterIcon,
  Uppercase,
  WireIcon,
  XAxisMovement,
  YAxisMovement,
} from '@wireapp/react-ui-kit';
import Color from 'color';
import Helmet from 'react-helmet';
import React from 'react';
import styled from 'styled-components';

let shakebox = null;

const ColorElement = styled.div.attrs({
  'data-text': props => `${props.name}
${props.value}${
    props.alpha
      ? `
α: ${props.alpha}`
      : ''
  }`,
  style: ({color}) => ({backgroundColor: color}),
})`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  border: 1px solid black;
  position: relative;
  display: inline-block;
  &::after {
    width: 100%;
    position: absolute;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    content: attr(data-text);
    color: #fff
    font-size: 10px;
    font-weight: 600;
    transition: all 0.2s ease-in-out;
    opacity: 0;
    transform: scale(1.2);
    text-shadow: #000 0 0 2px;
    text-align: center;
    white-space: pre-wrap;
    z-index:1;
  }
  &:hover::after {
    opacity: 1;
    transform: scale(1);
  }
`;

class Demo extends React.PureComponent {
  state = {
    animationToggleTimerId: undefined,
    currentPage: 0,
    isFullscreenModalOpen: false,
    isMenuModalOpen: false,
    isModalOpen: false,
    isOverlayOpen: false,
    showAnimation: false,
  };

  componentDidMount() {
    const animationInterval = 1000;
    this.setState({
      animationToggleTimerId: window.setInterval(() => {
        this.setState(({showAnimation}) => ({showAnimation: !showAnimation}));
      }, animationInterval),
    });
  }

  componentWillUnmount() {
    window.clearInterval(this.state.animationToggleTimerId);
  }

  goPage = index => this.setState(state => ({currentPage: index}));

  closeMenuModal = () => this.setState({isMenuModalOpen: false});

  renderColorSection() {
    const baseColors = ['BLUE', 'GRAY', 'GREEN', 'ORANGE', 'RED', 'YELLOW'];
    const additionalColors = ['WHITE', 'BLACK', 'LINK', 'TEXT', 'ICON', 'DISABLED'];
    const allColors = [...baseColors, ...additionalColors];
    const steps = [];
    const percent = 100;
    const stepSize = 8;
    for (let index = stepSize; index < percent; index += stepSize) {
      steps.push(index);
    }

    return (
      <Container>
        <H2>Base Colors </H2>
        {allColors.map(this.renderColor)}
        <H2>Darken</H2>
        {baseColors.map(color => (
          <Container key={color}>{steps.map(step => this.renderColor(`${color}_DARKEN_${step}`))}</Container>
        ))}
        <H2>Lighten</H2>
        {baseColors.map(color => (
          <Container key={color}>{steps.map(step => this.renderColor(`${color}_LIGHTEN_${step}`))}</Container>
        ))}
        <H2>Opaque</H2>
        {baseColors.map(color => (
          <Container
            key={color}
            style={{
              backgroundImage:
                "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAL0lEQVQ4T2N88ODBfwY8QEFBgRGfPOOoAQzDIQzwxTFIjlA0400kowZAgnfwByIAPbI9Ca+UKQsAAAAASUVORK5CYII=')",
            }}
          >
            {steps.map(step => this.renderColor(`${color}_OPAQUE_${step}`))}
          </Container>
        ))}
      </Container>
    );
  }

  renderColor(name) {
    const color = Color(COLOR[name]);
    const value = color.hex().toString();
    const digits = 2;
    const alpha = color.alpha() < 1 ? color.alpha().toFixed(digits) : 0;

    return (
      <ColorElement
        onClick={() => navigator.clipboard.writeText(alpha ? color.toString() : value)}
        key={name}
        name={name}
        color={COLOR[name]}
        value={value}
        alpha={alpha}
      />
    );
  }

  render() {
    const ColumnsStyle = {
      marginBottom: '12px',
    };

    const ColumnStyle = {
      backgroundColor: COLOR.GRAY_LIGHTEN_72,
      border: `1px solid ${COLOR.GRAY_LIGHTEN_24}`,
    };

    const ContainerStyle = {
      ...ColumnsStyle,
      ...ColumnStyle,
      alignItems: 'center',
      display: 'flex',
      height: '48px',
      justifyContent: 'center',
    };

    const paginatedList = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18]]; // eslint-disable-line no-magic-numbers

    return (
      <StyledApp>
        <Helmet
          meta={[
            {
              content: 'width=device-width, initial-scale=1, user-scalable=no',
              name: 'viewport',
            },
          ]}
        />

        {this.state.isModalOpen && (
          <Modal onClose={() => this.setState({isModalOpen: false})}>
            <H2 style={{margin: 0}}>Normal Modal</H2>
            <Paragraph>
              <Text block>Normal Modal</Text>
            </Paragraph>
            <Button>Button</Button>
          </Modal>
        )}
        {this.state.isFullscreenModalOpen && (
          <Modal fullscreen onClose={() => this.setState({isFullscreenModalOpen: false})}>
            <H1>Fullscreen Modal</H1>
          </Modal>
        )}
        {this.state.isOverlayOpen && (
          <Overlay>
            <H1>Overlay</H1>
            <Button onClick={() => this.setState({isOverlayOpen: false})}>Close</Button>
          </Overlay>
        )}
        {this.state.isMenuModalOpen && (
          <MenuModal data-uie-name="should-be-there" onBackgroundClick={this.closeMenuModal}>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Like
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Edit
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Delete for me...
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Delete for everyone...
            </MenuItem>
            <MenuItem data-uie-name="should-be-there" onClick={this.closeMenuModal}>
              Cancel
            </MenuItem>
          </MenuModal>
        )}
        <HeaderMenu logoElement={<Logo width={72} />}>
          <MenuLink href="#" color={COLOR.GREEN} button>
            test1
          </MenuLink>
          <MenuLink href="#">test1</MenuLink>
          <MenuLink href="#">test2</MenuLink>
          <HeaderSubMenu caption={'Drowdown'}>
            <MenuLink noWrap>{'Messaging'}</MenuLink>
            <MenuLink noWrap>{'Voice & video'}</MenuLink>
            <MenuLink noWrap>{'File sharing & productivity'}</MenuLink>
          </HeaderSubMenu>
          <MenuLink href="#">test3</MenuLink>
          <MenuLink href="#">test4</MenuLink>
          <MenuLink href="#">test5</MenuLink>
        </HeaderMenu>

        <Content>
          <ContainerXS centerText>
            <IsMobile>This is the mobile view</IsMobile>
            <IsMobile not>This is not the mobile view</IsMobile>
          </ContainerXS>
          <Container style={{alignItems: 'center', display: 'flex', justifyContent: 'space-around'}}>
            <Tooltip light right text="This is our logo with a whole bunch of text in here">
              <Logo scale={3} color={COLOR.BLUE} />
            </Tooltip>
            <Tooltip text="This is our logo with a whole bunch of text in here">
              <Loading />
            </Tooltip>
            <Loading progress={0.33} />
            <Loading progress={0.66} size={100} />
          </Container>
          <Container>
            <H1>Pagination</H1>
            <ContainerXS>
              {paginatedList[this.state.currentPage].map(item => (
                <Small key={item} center bold block style={{border: `1px solid ${COLOR.GRAY}`, margin: 10}}>
                  {`- ${item}`}
                </Small>
              ))}
              <Pagination
                currentPage={this.state.currentPage}
                goPage={this.goPage}
                nextPageComponent={() => 'Next'}
                numberOfPages={paginatedList.length}
                previousPageComponent={() => 'Previous'}
              />
            </ContainerXS>
          </Container>
          <Container>
            <H1>Pills</H1>
            <Pill>Default Pill</Pill>
            <Pill active>Active default Pill</Pill>
            <Pill type={PILL_TYPE.error}>Error Pill</Pill>
            <Pill type={PILL_TYPE.success}>Success Pill</Pill>
            <Pill type={PILL_TYPE.warning}>Warning Pill</Pill>
          </Container>
          <Container>
            <H1>Icons</H1>
            <Container
              style={{alignItems: 'center', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around'}}
            >
              <AddPeopleIcon height={32} />
              <ArrowIcon direction="up" height={32} />
              <AttachmentIcon height={32} />
              <AudioVideoIcon height={32} />
              <CallIcon height={32} />
              <CamIcon width={32} />
              <CheckIcon width={32} />
              <DeviceIcon height={32} />
              <DownloadIcon height={32} />
              <EditIcon height={32} />
              <FileIcon height={32} />
              <GifIcon width={32} />
              <HangupIcon width={32} />
              <ImageIcon height={32} />
              <LeaveIcon height={32} />
              <MessageIcon height={32} />
              <MoreIcon height={32} />
              <MuteIcon height={32} />
              <OptionsIcon height={32} />
              <PingIcon height={32} />
              <PlaneIcon height={32} />
              <ProfileIcon height={32} />
              <ServicesIcon height={32} />
              <SettingsIcon height={32} />
              <SpeakerIcon height={32} />
              <TeamIcon height={32} />
              <TimedIcon height={32} />
              <TrashIcon height={32} />
              <WireIcon width={32} />
            </Container>
            <Line />
            <H1>Brand Icons</H1>
            <Container style={{alignItems: 'center', display: 'flex', justifyContent: 'space-around'}}>
              <AndroidIcon width={48} />
              <AppleIcon width={48} />
              <ChromeIcon width={48} />
              <FacebookIcon width={48} />
              <GitHubIcon width={48} />
              <LinkedInIcon width={48} />
              <LinuxIcon width={48} />
              <MicrosoftIcon width={48} />
              <TwitterIcon width={48} />
            </Container>
            <Line />
            <H1>Layout</H1>
            <Line />
            <ContainerXS style={ContainerStyle}>ContainerXS</ContainerXS>
            <ContainerSM style={ContainerStyle}>ContainerSM</ContainerSM>
            <ContainerMD style={ContainerStyle}>ContainerMD</ContainerMD>
            <ContainerLG style={ContainerStyle}>ContainerLG</ContainerLG>
            <H2>Columns</H2>
            <Line />

            <Columns style={ColumnsStyle}>
              <Column style={ColumnStyle}>Column</Column>
            </Columns>

            <Columns style={ColumnsStyle}>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
            </Columns>

            <Columns style={ColumnsStyle}>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
            </Columns>

            <Columns style={ColumnsStyle}>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
            </Columns>

            <Columns style={ColumnsStyle}>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
              <Column style={ColumnStyle}>Column</Column>
            </Columns>

            <Columns style={ColumnsStyle}>
              <Column style={ColumnStyle}>
                <Columns>
                  <Column style={ColumnStyle}>Column</Column>
                  <Column style={ColumnStyle}>Column</Column>
                  <Column style={ColumnStyle}>Column</Column>
                </Columns>
              </Column>
              <Column style={ColumnStyle}>
                <Columns>
                  <Column style={ColumnStyle}>Column</Column>
                  <Column style={ColumnStyle}>Column</Column>
                  <Column style={ColumnStyle}>Column</Column>
                </Columns>
              </Column>
              <Column style={ColumnStyle}>
                <Columns>
                  <Column style={ColumnStyle}>Column</Column>
                  <Column style={ColumnStyle}>Column</Column>
                  <Column style={ColumnStyle}>Column</Column>
                </Columns>
              </Column>
            </Columns>
            <H2>Box</H2>

            <Box>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce a mattis nibh, sed maximus leo. Fusce a
              lacinia sem, vitae ornare dolor. Quisque rhoncus, magna non lacinia sagittis, erat augue fringilla metus,
              eu consectetur leo velit non lacus. Phasellus ipsum turpis, dapibus ut purus in, lobortis consectetur mi.
            </Box>

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
            <Columns>
              <Column>MenuModal</Column>
              <Column>
                <Button onClick={() => this.setState({isMenuModalOpen: true})}>Open</Button>
              </Column>
            </Columns>
            <Columns>
              <Column>Overlay</Column>
              <Column>
                <Button onClick={() => this.setState({isOverlayOpen: true})}>Open</Button>
              </Column>
            </Columns>

            <H1>Typography</H1>
            <Line />
            <Columns>
              <Column>Title</Column>
              <Column>
                <Title>Title</Title>
              </Column>
            </Columns>
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
            <Columns>
              <Column>Large text</Column>
              <Column>
                <Large>Large text</Large>
              </Column>
            </Columns>
            <Line />
            <H2>Paragraph</H2>
            <Paragraph>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Odit, nemo. Voluptates rerum harum accusamus
              dignissimos modi rem, quod quia. Delectus nesciunt, provident rerum maiores vero consequatur, nostrum quod
              ad, ipsam reprehenderit iure laborum error amet voluptate aliquam cum! Error nulla nobis, quia beatae
              nesciunt ex doloribus eius temporibus nihil explicabo eveniet architecto, ipsam doloremque. Pariatur,
              reiciendis voluptatem? Modi voluptatibus fugiat aliquid, ipsum quisquam corrupti labore molestiae optio,
              voluptate iste incidunt laborum ullam obcaecati veniam harum deleniti nobis beatae aspernatur inventore
              in, quibusdam sunt itaque ipsam veritatis! Inventore corporis eaque voluptatum quaerat facilis illo
              architecto unde consequatur veniam modi nam, eveniet perferendis aliquid in deleniti! Officiis obcaecati
              repudiandae harum sequi. Eum ab qui, eaque sapiente, quod perspiciatis totam voluptate neque enim facere
              repudiandae nemo! Soluta sunt aliquid voluptatem molestiae fugiat, iure iste assumenda, non quia nisi
              voluptatibus odio perferendis qui debitis facere dignissimos perspiciatis sapiente laborum voluptatum.
              Quia provident aperiam id veniam natus inventore distinctio, error, quibusdam nulla iusto maxime!
              Necessitatibus quo vitae veritatis repellat unde placeat tempora est nobis aut cumque quis, autem, quae
              maiores nihil consectetur quasi? Error repudiandae similique adipisci quasi autem necessitatibus labore
              cumque, exercitationem consequuntur fugiat nemo aliquam, architecto animi inventore explicabo sint iure
              molestias laborum.
            </Paragraph>
            <Line />
            <H2>Truncated text</H2>
            <Paragraph noWrap truncate>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut at eveniet numquam non aperiam, provident sed
              atque quibusdam! Vitae velit tempore ea pariatur voluptatum. Iure dolorum laudantium, rem iusto eveniet
              obcaecati perspiciatis. Dolorem quisquam laborum ab ipsam unde eum rerum incidunt quia magnam harum
              itaque, obcaecati fugiat debitis aliquid nihil, voluptatum commodi, sit quidem! Delectus itaque
              consectetur consequatur quis dignissimos pariatur, incidunt ipsam in velit deleniti voluptatum numquam
              minima. Optio repudiandae deleniti nemo modi, eligendi sit rem? Sapiente facere quam laboriosam ratione
              tenetur inventore repellendus adipisci dolorem sit vero cum explicabo consequatur voluptatibus quis modi
              fuga mollitia, maiores expedita dolor nostrum magni nesciunt cupiditate. Itaque voluptatibus totam
              asperiores quisquam nisi nihil, eos accusantium similique, praesentium illo neque repellendus nam placeat.
              Quibusdam minima repudiandae blanditiis iste esse voluptas in! Cumque distinctio consequatur animi sit
              incidunt nostrum aut mollitia, voluptatum dolores reprehenderit eius qui praesentium officiis delectus,
              non neque, cupiditate quis obcaecati recusandae odit? Minus officiis sed, nemo quos in laudantium
              consequatur soluta accusamus ea adipisci magni consequuntur optio incidunt eligendi, rerum cupiditate
              repudiandae tempore dolores neque laborum commodi, libero voluptatibus dolorum! Magnam perferendis alias
              porro, placeat totam molestiae similique reiciendis harum consequuntur, earum autem excepturi expedita
              molestias laborum quae non cupiditate!
            </Paragraph>
            <H2>Lead</H2>
            <Lead>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut at eveniet numquam non aperiam, provident sed
              atque quibusdam! Vitae velit tempore ea pariatur voluptatum. Iure dolorum laudantium, rem iusto eveniet
              obcaecati perspiciatis. Dolorem quisquam laborum ab ipsam unde eum rerum incidunt quia magnam harum
              itaque, obcaecati fugiat debitis aliquid nihil, voluptatum commodi, sit quidem!
            </Lead>
            <Label>Label</Label>
            <LabelLink block>LabelLink</LabelLink>
            <Line />
            <H1>Animations</H1>
            <Columns>
              <Column>
                <Opacity in={this.state.showAnimation} startValue={'0'} endValue={'1'}>
                  <div>Opacity</div>
                </Opacity>
              </Column>
              <Column>
                <TopDownMovement in={this.state.showAnimation}>
                  <div>TopDown</div>
                </TopDownMovement>
              </Column>
              <Column>
                <BottomUpMovement in={this.state.showAnimation}>
                  <div>BottomUpMovement</div>
                </BottomUpMovement>
              </Column>
              <Column>
                <YAxisMovement in={this.state.showAnimation} startValue={'50%'} endValue={'-50%'}>
                  <div>YAxisMovement</div>
                </YAxisMovement>
              </Column>
            </Columns>
            <br />
            <br />
            <Columns>
              <Column>
                <LeftRightMovement in={this.state.showAnimation}>
                  <div>LeftRightMovement</div>
                </LeftRightMovement>
              </Column>
              <Column>
                <XAxisMovement in={this.state.showAnimation} startValue={'10vh'} endValue={'-10vh'}>
                  <div>XAxisMovement</div>
                </XAxisMovement>
              </Column>
              <Column>
                <RightLeftMovement in={this.state.showAnimation}>
                  <div>RightLeftMovement</div>
                </RightLeftMovement>
              </Column>
            </Columns>
            <br />
            <TopDownMovement in={this.state.showAnimation}>
              <Opacity in={this.state.showAnimation} isInnerAnimation>
                <XAxisMovement in={this.state.showAnimation} startValue={'40vh'} endValue={'10vh'} isInnerAnimation>
                  <div>Combined Animation</div>
                </XAxisMovement>
              </Opacity>
            </TopDownMovement>
            <H1>Colors</H1>
            {this.renderColorSection()}
          </Container>
        </Content>
        <Footer>Footer</Footer>
      </StyledApp>
    );
  }
}

export default Demo;
