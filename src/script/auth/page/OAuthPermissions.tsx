/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import React, {useState} from 'react';

import {OAuthClient} from '@wireapp/api-client/lib/oauth/OAuthClient';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {container} from 'tsyringe';

import {
  Button,
  ButtonVariant,
  ContainerXS,
  Text,
  Paragraph,
  Box,
  Link,
  LinkVariant,
  COLOR_V2,
  H2,
} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {loadDataUrl} from 'Util/util';

import {Page} from './Page';

import {Config} from '../../Config';
import {oauthStrings} from '../../strings';
import {actionRoot} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {oAuthParams, oAuthScope} from '../util/oauthUtil';

interface Props extends React.HTMLProps<HTMLDivElement> {
  assetRepository?: AssetRepository;
}

export enum Scope {
  WRITE_CONVERSATIONS = 'write:conversations',
  WRITE_CONVERSATIONS_CODE = 'write:conversations_code',
  READ_SELF = 'read:self',
  READ_FEATURE_CONFIGS = 'read:feature_configs',
}

const OAuthPermissionsComponent = ({
  doLogout,
  getOAuthApp,
  selfUser,
  selfTeamId,
  assetRepository = container.resolve(AssetRepository),
  postOauthCode,
  getSelf,
  getTeam,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const [teamImage, setTeamImage] = React.useState<string | ArrayBuffer | undefined>(undefined);

  const [oAuthApp, setOAuthApp] = useState<OAuthClient | null>(null);
  const oauthParams = oAuthParams(window.location);
  const oauthScope = oAuthScope(oauthParams);

  const onContinue = async () => {
    try {
      const url = await postOauthCode(oauthParams);
      window.location.replace(url);
    } catch (error) {
      console.error(error);
    }
  };

  const onCancel = () => {
    window.location.replace(`${oauthParams.redirect_uri}?error=access_denied`);
  };

  React.useEffect(() => {
    const getUserData = async () => {
      await getSelf();
      if (selfTeamId) {
        const team = await getTeam(selfTeamId);
        const teamIcon = AssetRemoteData.v3(team.icon, selfUser.qualified_id?.domain);
        if (teamIcon.identifier === 'default') {
          setTeamImage(`${Config.getConfig().APP_BASE}/image/logo/wire-logo-120.png`);
        } else {
          const teamImageBlob = await assetRepository.load(teamIcon);
          setTeamImage(teamImageBlob && (await loadDataUrl(teamImageBlob)));
        }
      }
      setOAuthApp(!!oauthParams.client_id ? await getOAuthApp(oauthParams.client_id) : null);
    };
    getUserData().catch(error => {
      console.error(error);
    });
  }, [
    assetRepository,
    getOAuthApp,
    getSelf,
    getTeam,
    oauthParams.client_id,
    selfTeamId,
    selfUser.qualified_id?.domain,
  ]);

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}
      >
        {!oAuthApp ? (
          <Icon.Loading width="36" height="36" css={{path: {fill: COLOR_V2.BLUE_DARK_500}}} />
        ) : (
          <>
            <H2 style={{fontWeight: 500, lineHeight: '28.64px', fontSize: '24px'}}>{_(oauthStrings.headline)}</H2>
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
              color={COLOR_V2.BLUE}
            >
              {_(oauthStrings.logout)}
            </Link>

            <Text style={{marginBottom: '24px'}}>{_(oauthStrings.subhead, {app: oAuthApp?.application_name})}</Text>

            {oauthParams.scope.length > 1 && (
              <Box
                style={{
                  marginBottom: '24px',
                  background: COLOR_V2.GRAY_20,
                  borderColor: COLOR_V2.GRAY_20,
                  padding: '8px',
                }}
              >
                <ul
                  style={{
                    marginTop: 0,
                    paddingInlineStart: '20px',
                    fontSize: '12px',
                  }}
                >
                  {oauthScope.map((scope, index) => (
                    <li key={index} style={{textAlign: 'start'}}>
                      <Text>{_(oauthStrings[scope])}</Text>
                    </li>
                  ))}
                </ul>
                <Text
                  data-uie-name="oauth-learn-more"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    display: 'block',
                  }}
                >
                  <FormattedMessage
                    {...oauthStrings.learnMore}
                    values={{
                      learnMore: (...chunks: string[] | React.ReactNode[]) => (
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          data-uie-name="go-learn-more"
                          href="https://support.wire.com/hc/en-us/articles/9628065287965-Calendar-integration"
                        >
                          {chunks}
                        </a>
                      ),
                    }}
                  />
                </Text>
              </Box>
            )}
            <Text muted style={{fontSize: '12px', lineHeight: '16px', display: 'block'}} data-uie-name="oauth-details">
              {_(oauthStrings.details)}
            </Text>
            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '74px', gap: '16px'}}>
              <Button
                variant={ButtonVariant.SECONDARY}
                style={{margin: 'auto', width: 200}}
                type="button"
                onClick={onCancel}
                data-uie-name="do-oauth-cancel"
                onKeyDown={(event: React.KeyboardEvent) => {
                  if (event.key === KEY.ESC) {
                    onCancel();
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
                onKeyDown={event => handleKeyDown(event, () => onContinue())}
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
          </>
        )}
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
      getOAuthApp: actionRoot.authAction.doGetOAuthApplication,
      doLogout: actionRoot.authAction.doLogout,
      getTeam: actionRoot.authAction.doGetTeamData,
      postOauthCode: actionRoot.authAction.doPostOAuthCode,
    },
    dispatch,
  );

const OAuthPermissions = connect(mapStateToProps, mapDispatchToProps)(OAuthPermissionsComponent);

export {OAuthPermissions};
