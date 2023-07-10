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
import {useLocation} from 'react-router';
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

import {
  boxCSS,
  buttonCSS,
  buttonsCSS,
  containerCSS,
  headerCSS,
  listCSS,
  teamImageCSS,
  textCSS,
} from './OauthPermissions.styles';
import {Page} from './Page';

import {Config} from '../../Config';
import {oauthStrings} from '../../strings';
import {actionRoot} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {oAuthParams, oAuthScope, oAuthScopesToString} from '../util/oauthUtil';

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
  const location = useLocation();
  const [teamImage, setTeamImage] = React.useState<string | ArrayBuffer | undefined>(undefined);
  const [oAuthApp, setOAuthApp] = useState<OAuthClient | null>(null);
  const oauthParams = oAuthParams(window.location.hash);
  const oauthScope = oAuthScope(oauthParams);
  console.log('oauthParams', location.state.hash);
  const cleanedScopes = oAuthScopesToString(oauthScope);

  const onContinue = async () => {
    try {
      const url = await postOauthCode({...oauthParams, scope: cleanedScopes});
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
      if (error.message === 'OAuth client not found') {
        window.location.replace('/');
      } else {
        doLogout().catch(error => {
          console.error(error);
        });
      }
    });
  }, [
    assetRepository,
    doLogout,
    getOAuthApp,
    getSelf,
    getTeam,
    oauthParams.client_id,
    selfTeamId,
    selfUser.qualified_id?.domain,
  ]);

  return (
    <Page>
      <ContainerXS centerText verticalCenter css={containerCSS}>
        {!oAuthApp ? (
          <Icon.Loading width="36" height="36" css={{path: {fill: COLOR_V2.BLUE_DARK_500}}} />
        ) : (
          <>
            <H2 css={headerCSS}>{_(oauthStrings.headline)}</H2>
            {typeof teamImage === 'string' && <img src={teamImage} css={teamImageCSS} alt="teamIcon" />}
            <Text css={{marginBottom: '8px'}}>{selfUser.email}</Text>
            <Link
              css={{marginBottom: '32px'}}
              onClick={doLogout}
              data-uie-name="go-logout"
              variant={LinkVariant.PRIMARY}
              color={COLOR_V2.BLUE}
            >
              {_(oauthStrings.logout)}
            </Link>

            <Text data-uie-name="oauth-permissions-requester" css={{marginBottom: '24px'}}>
              {_(oauthStrings.subhead)}
            </Text>

            {oauthParams.scope.length > 1 && (
              <Box css={boxCSS}>
                <ul css={listCSS} data-uie-name="oauth-permissions-list">
                  {oauthScope.map((scope, index) => (
                    <li key={index} css={{textAlign: 'start'}}>
                      <Text>{_(oauthStrings[scope])}</Text>
                    </li>
                  ))}
                </ul>
                <Text data-uie-name="oauth-learn-more" css={textCSS}>
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
            <Text muted css={textCSS} data-uie-name="oauth-details">
              {_(oauthStrings.details)}
            </Text>
            <div css={buttonsCSS}>
              <Button
                variant={ButtonVariant.SECONDARY}
                css={buttonCSS}
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
                css={buttonCSS}
                type="button"
                onClick={onContinue}
                data-uie-name="do-oauth-allow"
                onKeyDown={event => handleKeyDown(event, () => onContinue())}
              >
                {_(oauthStrings.allow)}
              </Button>
            </div>
            <Paragraph center css={{marginTop: 40}}>
              <FormattedMessage
                {...oauthStrings.privacyPolicy}
                values={{
                  privacypolicy: (...chunks: string[] | React.ReactNode[]) => (
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      data-uie-name="go-privacy-policy"
                      href={Config.getConfig().URL.PRIVACY_POLICY}
                    >
                      {chunks}
                    </a>
                  ),
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
