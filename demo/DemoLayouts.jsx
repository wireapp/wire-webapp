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
  Box,
  COLOR,
  Column,
  Columns,
  Container,
  ContainerLG,
  ContainerMD,
  ContainerSM,
  ContainerXS,
  H1,
  H2,
  IsMobile,
  Line,
} from '@wireapp/react-ui-kit';
import React from 'react';

class DemoLayouts extends React.PureComponent {
  state = {};

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
    return (
      <Container>
        <Line />
        <H1>Layout</H1>
        <Line />

        <H2>MediaQuery</H2>
        <Line />
        <ContainerXS centerText>
          <IsMobile>This is the mobile view</IsMobile>
          <IsMobile not>This is not the mobile view</IsMobile>
        </ContainerXS>

        <H2>Container</H2>
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
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce a mattis nibh, sed maximus leo. Fusce a lacinia
          sem, vitae ornare dolor. Quisque rhoncus, magna non lacinia sagittis, erat augue fringilla metus, eu
          consectetur leo velit non lacus. Phasellus ipsum turpis, dapibus ut purus in, lobortis consectetur mi.
        </Box>
      </Container>
    );
  }
}

export {DemoLayouts};
