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

import React from 'react';

// import {ClientType} from '@wireapp/api-client/lib/client/index';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
// import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';
import {container} from 'tsyringe';

import {
  Button,
  ButtonVariant,
  ContainerXS,
  H2,
  Text,
  Paragraph,
  Box,
  Link,
  LinkVariant,
  COLOR_V2,
} from '@wireapp/react-ui-kit';

import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {KEY} from 'Util/KeyboardUtil';
import {loadDataUrl} from 'Util/util';

import {Page} from './Page';

import {Config} from '../../Config';
import {oauthStrings} from '../../strings';
import {actionRoot} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
// import {ROUTE} from '../route';

interface Props extends React.HTMLProps<HTMLDivElement> {
  assetRepository?: AssetRepository;
}

export enum Scope {
  WRITE_CONVERSATIONS = 'write:conversations',
  WRITE_CONVERSATIONS_CODE = 'write:conversations_code',
  READ_SELF = 'read:self',
  READ_FEATURE_CONFIGS = 'read:feature_configs',
}
interface AuthParams {
  client_id: string;
  scope: Scope[];
  redirect_uri: string;
  state: string;
  response_type: string;
}

const OAuthPermissionsComponent = ({
  doLogout,
  selfUser,
  selfTeamId,
  assetRepository = container.resolve(AssetRepository),
  getSelf,
  getTeam,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const [teamImage, setTeamImage] = React.useState<string | ArrayBuffer | undefined>(undefined);
  // const navigate = useNavigate();
  const params = decodeURIComponent(window.location.search.slice(1))
    .split('&')
    .reduce((acc, param) => {
      const [key, value] = param.split('=');
      if (key === 'scope') {
        return {
          ...acc,
          [key]: value.split(/\+|%20/).filter(scope => Object.values(Scope).includes(scope as Scope)) as Scope[],
        };
      }
      return {...acc, [key]: value};
    }, {} as AuthParams);

  const onContinue = () => {
    // return navigate(ROUTE.SET_EMAIL);
  };

  React.useEffect(() => {
    const getUserData = async () => {
      await getSelf();
      const team = await getTeam(selfTeamId);
      const teamIcon = AssetRemoteData.v3(team.icon, selfUser.qualified_id?.domain);
      const teamImageBlob = await assetRepository.load(teamIcon);
      setTeamImage(teamImageBlob && (await loadDataUrl(teamImageBlob)));
    };
    getUserData().catch(error => {
      console.error(error);
    });
  }, [assetRepository, getSelf, getTeam, selfTeamId, selfUser.qualified_id?.domain]);

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}
      >
        <H2 center>{_(oauthStrings.headline)}</H2>
        {typeof teamImage === 'string' && (
          <img
            src={teamImage}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              border: 'black 1px solid',
              padding: '2px',
              margin: '15px',
            }}
            alt="teamIcon"
          />
        )}
        <Text style={{marginBottom: '8px'}}>{selfUser.email}</Text>
        <Link
          style={{marginBottom: '32px'}}
          onClick={doLogout}
          data-uie-name="go-logout"
          variant={LinkVariant.PRIMARY}
          center
          // color={COLOR_V2.SECONDARY}
        >
          {_(oauthStrings.logout)}
        </Link>
        <Text center>{_(oauthStrings.subhead, {app: Config.getConfig().BACKEND_NAME})}</Text>
        {params.scope.length > 1 && (
          <Box
            style={{
              marginTop: '24px',
              marginBottom: '24px',
              background: COLOR_V2.GRAY_20,
              borderColor: COLOR_V2.GRAY_20,
            }}
          >
            <ul>
              {params.scope.map((scope, index) => (
                <li key={index}>
                  <Text>{_(oauthStrings[scope])}</Text>
                </li>
              ))}
            </ul>
          </Box>
        )}
        <Text
          muted
          center
          style={{fontSize: '12px', lineHeight: '16px', display: 'block'}}
          data-uie-name="oauth-detail-learn-more"
        >
          <FormattedMessage
            {...oauthStrings.details}
            values={{
              // eslint-disable-next-line react/display-name
              learnMore: ((...chunks: string[] | React.ReactNode[]) => (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  data-uie-name="go-learn-more"
                  href={Config.getConfig().URL.PRIVACY_POLICY} //update to correct learn more link
                >
                  {chunks}
                </a>
              )) as any,
            }}
          />
        </Text>
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '16px', gap: '16px'}}>
          <Button
            variant={ButtonVariant.SECONDARY}
            style={{margin: 'auto', width: 200}}
            type="button"
            onClick={() => {
              window.open('', '_self', '');
              window.close();
            }}
            data-uie-name="do-oauth-cancel"
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === KEY.ESC) {
                window.open('', '_self', '');
                window.close(); //this doesnt work
              }
            }}
          >
            {_(oauthStrings.cancel)}
          </Button>
          <Button
            style={{margin: 'auto', width: 200}}
            type="button"
            onClick={onContinue}
            data-uie-name="do-oauth-allow"
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === KEY.ENTER) {
                onContinue();
              }
            }}
          >
            {_(oauthStrings.allow)}
          </Button>
        </div>
        <Paragraph center style={{marginTop: 40}}>
          <FormattedMessage
            {...oauthStrings.privacyPolicy}
            values={{
              // eslint-disable-next-line react/display-name
              privacypolicy: ((...chunks: string[] | React.ReactNode[]) => (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  data-uie-name="go-privacy-policy"
                  href={Config.getConfig().URL.PRIVACY_POLICY}
                >
                  {chunks}
                </a>
              )) as any,
            }}
          />
        </Paragraph>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  selfUser: SelfSelector.getSelf(state),
  selfTeamId: SelfSelector.getSelfTeamId(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      getSelf: actionRoot.selfAction.fetchSelf,
      doLogout: actionRoot.authAction.doLogout,
      getTeam: actionRoot.authAction.doGetTeamData,
    },
    dispatch,
  );

const OAuthPermissions = connect(mapStateToProps, mapDispatchToProps)(OAuthPermissionsComponent);

export {OAuthPermissions};
