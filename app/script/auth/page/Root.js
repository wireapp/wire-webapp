/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import React from 'react';
import {connect} from 'react-redux';
import {Logo} from '@wireapp/react-ui-kit/Identity';
import {Small, H3, Link} from '@wireapp/react-ui-kit/Text';
import {StyledApp, Content, Columns, Column, ContainerXS} from '@wireapp/react-ui-kit/Layout';

const Root = ({name}) => (
  <StyledApp>
    <Content>
      <ContainerXS centerText verticalCenter>
        <br />
        <Logo id="wire-logo" />
        <br />
        Secure messaging for everyone
        <br />
        <br />
        <Columns>
          <Column>
            <Link href="#" data-uie-name="go-register-personal">
              <img src="#" width="100" height="100" />
              <br />
              <H3 center>Create an account</H3>
              for personal use
            </Link>
          </Column>
          <Column>
            <Link href="#" data-uie-name="go-register-team">
              <img src="#" width="100" height="100" />
              <br />
              <H3 center>Create a team</H3>
              for work
            </Link>
          </Column>
        </Columns>
        <br />
        <br />
        <Small>Already have an account?</Small>
        <br />
        <Link href="#">Login</Link>
      </ContainerXS>
    </Content>
  </StyledApp>
);

export default connect(state => ({
  name: state.authState.name,
}))(Root);
