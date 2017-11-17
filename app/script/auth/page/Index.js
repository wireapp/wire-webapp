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
import {Profile, RoundContainer, Team} from '@wireapp/react-ui-kit/Icon';
import {Logo, COLOR} from '@wireapp/react-ui-kit/Identity';
import {Link as RRLink} from 'react-router-dom';
import {Small, Link, Paragraph, Text, Bold} from '@wireapp/react-ui-kit/Text';
import {Columns, Column, ContainerXS, Spacer} from '@wireapp/react-ui-kit/Layout';

const Root = ({name, history}) => (
  <ContainerXS centerText verticalCenter>
    <Logo id="wire-logo" scale={1.68} />
    <Paragraph fontSize="16px" center>
      {'Secure messaging for everyone.'}
    </Paragraph>
    <Columns style={{margin: '70px auto'}}>
      <Column>
        <Link to="/newteam" data-uie-name="go-register-personal" component={RRLink}>
          <RoundContainer>
            <Profile color={COLOR.WHITE} />
          </RoundContainer>
          <Spacer size={12} />
          <Bold fontSize="24px">{'Create an account'}</Bold>
          <br />
          <Text light fontSize="24px">
            {'for personal use'}
          </Text>
        </Link>
      </Column>
      <Column>
        <Link href="#" data-uie-name="go-register-team">
          <RoundContainer color={COLOR.GREEN}>
            <Team color={COLOR.WHITE} />
          </RoundContainer>
          <Spacer size={12} />
          <Bold fontSize="24px">{'Create a team'}</Bold>
          <br />
          <Text light fontSize="24px">
            {'for work'}
          </Text>
        </Link>
      </Column>
    </Columns>
    <Small>{'Already have an account?'}</Small>
    <br />
    <Link href="#" bold>
      {'Log In'}
    </Link>
  </ContainerXS>
);

export default connect(state => ({
  name: state.authState.name,
}))(Root);
