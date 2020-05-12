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

import {ContainerXS} from '@wireapp/react-ui-kit';
import React, {useState, useEffect} from 'react';
// import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {RootState, bindActionCreators} from '../module/reducer';
import Page from './Page';
import {UrlUtil} from '@wireapp/commons';
import {QUERY_KEY} from '../route';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const CustomEnvironmentRedirect = ({}: Props & ConnectedProps & DispatchProps) => {
  // const {formatMessage: _} = useIntl();

  const [destinationUrl, setDestinationUrl] = useState(null);

  useEffect(() => {
    setDestinationUrl(UrlUtil.getURLParameter(QUERY_KEY.DESTINATION_URL));
  }, []);

  useEffect(() => {
    let redirectTimeoutId: number;
    if (destinationUrl) {
      redirectTimeoutId = window.setTimeout(() => {
        // console.log('destination', destinationUrl);
        // window.location.assign(destinationUrl);
      }, 5000);
    }
    return () => {
      window.clearTimeout(redirectTimeoutId);
    };
  }, [destinationUrl]);

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        hallo
        <div>{destinationUrl}</div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(CustomEnvironmentRedirect);
