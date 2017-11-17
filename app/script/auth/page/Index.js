import React from 'react';
import {connect} from 'react-redux';
import {indexStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {Logo} from '@wireapp/react-ui-kit/Identity';
import {Small, H3, Link} from '@wireapp/react-ui-kit/Text';
import {Columns, Column, ContainerXS} from '@wireapp/react-ui-kit/Layout';

const Index = ({name, intl: {formatMessage: _}}) => (
  <ContainerXS centerText verticalCenter>
    <br />
    <Logo id="wire-logo" />
    <br />
    {_(indexStrings.claim)}
    <br />
    <br />
    <Columns>
      <Column>
        <Link href="#" data-uie-name="go-register-personal">
          <img src="#" width="100" height="100" />
          <br />
          <H3 center>{_(indexStrings.createAccount)}</H3>
          {_(indexStrings.createAccountFor)}
        </Link>
      </Column>
      <Column>
        <Link href="#" data-uie-name="go-register-team">
          <img src="#" width="100" height="100" />
          <br />
          <H3 center>{_(indexStrings.createTeam)}</H3>
          {_(indexStrings.createTeamFor)}
        </Link>
      </Column>
    </Columns>
    <br />
    <br />
    <Small>{_(indexStrings.loginInfo)}</Small>
    <br />
    <Link href="#">{_(indexStrings.login)}</Link>
  </ContainerXS>
);

export default injectIntl(
  connect(state => ({
    name: state.authState.name,
  }))(Index)
);
