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
import {indexStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {Profile, RoundContainer, Team} from '@wireapp/react-ui-kit/Icon';
import {Logo, COLOR} from '@wireapp/react-ui-kit/Identity';
import {Link as RRLink} from 'react-router-dom';
import {Small, Link, Paragraph, Text, Bold} from '@wireapp/react-ui-kit/Text';
import {Columns, Column, ContainerXS} from '@wireapp/react-ui-kit/Layout';

const Index = ({name, history, intl: {formatMessage: _}}) => (
  <ContainerXS centerText verticalCenter>
    <Logo id="wire-logo" scale={1.68} />
    <Paragraph fontSize="16px" center>
      {_(indexStrings.claim)}
    </Paragraph>
    <Columns style={{margin: '70px auto'}}>
      <Column>
        <Link data-uie-name="go-register-personal">
          <RoundContainer style={{marginBottom: 12}}>
            <Profile color={COLOR.WHITE} />
          </RoundContainer>
          <Bold fontSize="24px">{_(indexStrings.createAccount)}</Bold>
          <br />
          <Text light fontSize="24px">
            {_(indexStrings.createAccountFor)}
          </Text>
        </Link>
      </Column>
      <Column>
        <Link to="/newteam" data-uie-name="go-register-team" component={RRLink}>
          <RoundContainer color={COLOR.GREEN} style={{marginBottom: 12}}>
            <Team color={COLOR.WHITE} />
          </RoundContainer>
          <Bold fontSize="24px">{_(indexStrings.createTeam)}</Bold>
          <br />
          <Text light fontSize="24px">
            {_(indexStrings.createTeamFor)}
          </Text>
        </Link>
      </Column>
    </Columns>
    <Small>{_(indexStrings.loginInfo)}</Small>
    <br />
    <Link href="#" bold>
      {_(indexStrings.login)}
    </Link>
  </ContainerXS>
);

export default injectIntl(Index);
