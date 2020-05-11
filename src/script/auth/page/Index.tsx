/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {UrlUtil} from '@wireapp/commons';
import * as AuthSelector from '../module/selector/AuthSelector';
import {Button, COLOR, ContainerXS, ErrorMessage, Text} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import useReactRouter from 'use-react-router';
import {Config} from '../../Config';
import {indexStrings, logoutReasonStrings} from '../../strings';
import {QUERY_KEY, ROUTE} from '../route';
import Page from './Page';
import {RootState, bindActionCreators} from '../module/reducer';
import {AnyAction, Dispatch} from 'redux';
import {connect} from 'react-redux';
import SVGProvider from '../util/SVGProvider';
import {SVGIcon} from '@wireapp/react-ui-kit/dist/Icon/SVGIcon';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const Index = ({defaultSSOCode}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [logoutReason, setLogoutReason] = useState<string>();

  useEffect(() => {
    // Redirect to prefilled SSO login if default SSO code is set on backend
    if (defaultSSOCode) {
      history.push(`${ROUTE.SSO}/wire-${defaultSSOCode}`);
    }
  }, [defaultSSOCode]);

  useEffect(() => {
    const queryLogoutReason = UrlUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    if (queryLogoutReason) {
      setLogoutReason(queryLogoutReason);
    }
  }, []);

  useEffect(() => {
    // Navigate directly to email login because it's the only available option on the index page
    if (
      !Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY &&
      !Config.getConfig().FEATURE.ENABLE_SSO &&
      !Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION
    ) {
      history.push(ROUTE.LOGIN);
    }
  }, []);
  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '380px'}}>
        <SVGIcon scale={1.3} realWidth={75} realHeight={75} style={{marginBottom: '80px'}} data-uie-name="ui-wire-logo">
          <g id="sn_logo" data-name="sn logo" transform="translate(0 0)">
            <g id="Group_884" data-name="Group 884">
              <path
                id="Path_6377"
                data-name="Path 6377"
                d="M122.7,1363.738a9.045,9.045,0,0,1-12.352.406,25.371,25.371,0,0,1-5.8,1.814,14.575,14.575,0,1,0,22.058-18.928,14.7,14.7,0,0,0-1.684-1.448,25.379,25.379,0,0,1-1.813,5.8A9.047,9.047,0,0,1,122.7,1363.738Z"
                transform="translate(-68.906 -1309.946)"
                fill="#008a3b"
              />
              <path
                id="Path_6378"
                data-name="Path 6378"
                d="M104.242,1367.643a14.7,14.7,0,0,0,1.448-1.684,25.4,25.4,0,0,1-5.8-1.814,9.041,9.041,0,0,1-12.759-12.759,25.381,25.381,0,0,1-1.814-5.8,14.576,14.576,0,1,0,18.928,22.06Z"
                transform="translate(-79.362 -1309.946)"
                fill="#f77e0b"
              />
              <path
                id="Path_6379"
                data-name="Path 6379"
                d="M87.535,1328.576a9.047,9.047,0,0,1,12.352-.407,25.378,25.378,0,0,1,5.8-1.813,14.575,14.575,0,1,0-20.375,20.376,25.357,25.357,0,0,1,1.814-5.8A9.045,9.045,0,0,1,87.535,1328.576Z"
                transform="translate(-79.362 -1320.403)"
                fill="#ae0721"
              />
              <path
                id="Path_6380"
                data-name="Path 6380"
                d="M122.7,1328.576a9.047,9.047,0,0,1,.408,12.353,25.355,25.355,0,0,1,1.813,5.8,14.727,14.727,0,0,0,1.684-1.448,14.575,14.575,0,1,0-22.058-18.928,25.367,25.367,0,0,1,5.8,1.813A9.047,9.047,0,0,1,122.7,1328.576Z"
                transform="translate(-68.906 -1320.403)"
                fill="#008fa6"
              />
              <path
                id="Path_6381"
                data-name="Path 6381"
                d="M124.732,1365.771a23.465,23.465,0,1,0-33.185,0A23.465,23.465,0,0,0,124.732,1365.771Zm-26.9-26.9a14.575,14.575,0,1,1,0,20.612A14.577,14.577,0,0,1,97.833,1338.873Z"
                transform="translate(-77.157 -1318.197)"
                fill="#002143"
              />
            </g>
          </g>
        </SVGIcon>
        <Text
          block
          center
          style={{fontSize: '32px', fontWeight: 300, marginBottom: '48px'}}
          data-uie-name="welcome-text"
        >
          {_(indexStrings.welcome, {brandName: Config.getConfig().BACKEND_NAME})}
        </Text>
        {Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION ? (
          <>
            <Button
              onClick={() => history.push(ROUTE.SET_ACCOUNT_TYPE)}
              block
              backgroundColor={'#002143'}
              style={{fontSize: '13px'}}
              data-uie-name="go-set-account-type"
            >
              {_(indexStrings.createAccount)}
            </Button>
            <Button
              onClick={() => history.push(ROUTE.LOGIN)}
              block
              backgroundColor={'transparent'}
              color={'#002143'}
              style={{border: `1px solid #002143`, fontSize: '13px'}}
              data-uie-name="go-login"
            >
              {_(indexStrings.logIn)}
            </Button>
            {logoutReason && (
              <ErrorMessage center data-uie-name="status-logout-reason">
                <FormattedMessage
                  {...logoutReasonStrings[logoutReason]}
                  values={{
                    newline: <br />,
                  }}
                />
              </ErrorMessage>
            )}
          </>
        ) : (
          <>
            <Button onClick={() => history.push(ROUTE.LOGIN)} block style={{fontSize: '13px'}} data-uie-name="go-login">
              {_(indexStrings.logIn)}
            </Button>
            {(Config.getConfig().FEATURE.ENABLE_SSO || Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY) && (
              <Button
                onClick={() => history.push(ROUTE.SSO)}
                block
                backgroundColor={'transparent'}
                color={COLOR.BLUE}
                style={{border: `1px solid ${COLOR.BLUE}`, fontSize: '13px'}}
                data-uie-name="go-sso-login"
              >
                {_(
                  Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY ? indexStrings.enterprise : indexStrings.ssoLogin,
                )}
              </Button>
            )}
            {logoutReason && (
              <ErrorMessage center data-uie-name="status-logout-reason">
                <FormattedMessage
                  {...logoutReasonStrings[logoutReason]}
                  values={{
                    newline: <br />,
                  }}
                />
              </ErrorMessage>
            )}
          </>
        )}
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  defaultSSOCode: AuthSelector.getDefaultSSOCode(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Index);
