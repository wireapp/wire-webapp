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

import {render, type RenderResult} from '@testing-library/react';
import {CONVERSATION_TYPE} from '../../../apiClient/conversation/conversation';
import {QualifiedUserClients} from '../../../apiClient/conversation/qualifiedUserClients';
import {CONVERSATION_PROTOCOL} from '../../../apiClient/team/feature/featureList.types';
import {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {RecursivePartial} from '../../../commons/util/TypeUtil';
import ko from 'knockout';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {HashRouter as Router} from 'react-router';
import {AnyAction} from 'redux';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';

import {StyledApp} from '../../../uiKit/layout/styledApp/styledApp';
import {THEME_ID} from '../../../uiKit/identity/theme/theme';
import type {JSX} from '@emotion/react/jsx-runtime';

import cs from '../../../../i18n/cs-CZ.json';
import da from '../../../../i18n/da-DK.json';
import de from '../../../../i18n/de-DE.json';
import el from '../../../../i18n/el-GR.json';
import en from '../../../../i18n/en-US.json';
import es from '../../../../i18n/es-ES.json';
import et from '../../../../i18n/et-EE.json';
import fi from '../../../../i18n/fi-FI.json';
import fr from '../../../../i18n/fr-FR.json';
import hr from '../../../../i18n/hr-HR.json';
import hu from '../../../../i18n/hu-HU.json';
import it from '../../../../i18n/it-IT.json';
import lt from '../../../../i18n/lt-LT.json';
import nl from '../../../../i18n/nl-NL.json';
import pl from '../../../../i18n/pl-PL.json';
import pt from '../../../../i18n/pt-BR.json';
import ro from '../../../../i18n/ro-RO.json';
import ru from '../../../../i18n/ru-RU.json';
import si from '../../../../i18n/si-LK.json';
import sk from '../../../../i18n/sk-SK.json';
import sl from '../../../../i18n/sl-SI.json';
import tr from '../../../../i18n/tr-TR.json';
import uk from '../../../../i18n/uk-UA.json';
import {CallingRepository} from '../../../repositories/calling/CallingRepository';
import {Participant} from '../../../repositories/calling/Participant';
import {Conversation} from '../../../repositories/entity/Conversation';
import {User} from '../../../repositories/entity/User';
import {BackgroundEffectsController} from '../../../repositories/media/backgroundEffects/backgroundEffectsController';
import {BackgroundEffectsHandler} from '../../../repositories/media/backgroundEffectsHandler';
import {MediaDevicesHandler} from '../../../repositories/media/MediaDevicesHandler';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {setStrings, translate} from '../../../util/localizerUtil';
import {translateForTest} from '../../../util/test/translateForTest';
import {createUuid} from '../../../util/uuid';

import {mapLanguage} from '../../localeConfig';
import {Api, RootState} from '../../module/reducer';

const internalizationStrings = {
  cs,
  da,
  de,
  el,
  en,
  es,
  et,
  fi,
  fr,
  hr,
  hu,
  it,
  lt,
  nl,
  pl,
  pt,
  ro,
  ru,
  si,
  sk,
  sl,
  tr,
  uk,
};

const withStore = (
  children: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
): JSX.Element => {
  return <Provider store={store}>{children}</Provider>;
};

function withRouter(component: React.ReactNode): React.ReactElement {
  return <Router>{component}</Router>;
}

const rootContextValue = createRootContextValueForTest({translate});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

const loadLanguage = (language: string): typeof en => {
  return require(`../../../../i18n/${mapLanguage(language)}.json`);
};

export const withIntl = (component: React.ReactNode): JSX.Element => {
  setStrings(internalizationStrings);

  return (
    <IntlProvider locale="en" messages={loadLanguage('en-US')}>
      {component}
    </IntlProvider>
  );
};

export function withTheme(component: React.ReactNode): React.ReactElement {
  return <StyledApp themeId={THEME_ID.DEFAULT}>{rootProviderWrapper({children: component})}</StyledApp>;
}

export function withThemeAndRootContext(
  component: React.ReactNode,
  rootProviderWrapperForTest: ReturnType<typeof createRootProviderWrapperForTest>,
): React.ReactElement {
  return <StyledApp themeId={THEME_ID.DEFAULT}>{rootProviderWrapperForTest({children: component})}</StyledApp>;
}

const wrapComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
): React.ReactElement => {
  return withRouter(withTheme(withStore(withIntl(component), store)));
};

export const mountComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
): RenderResult => {
  return render(wrapComponent(component, store));
};

export function generateUsers(nbUsers: number, domain: string): User[] {
  const users: User[] = [];
  for (let i = 0; i < nbUsers; i++) {
    const user = new User(createUuid(), domain, translateForTest);
    user.name(`User ${i}`);
    users.push(user);
  }
  return users;
}

export function generateUserClients(users: User[]): QualifiedUserClients {
  const userClients: QualifiedUserClients = {};
  users.forEach(user => {
    const domainUsers = userClients[user.qualifiedId.domain] ?? {};
    domainUsers[user.qualifiedId.id] = [];
    userClients[user.qualifiedId.domain] = domainUsers;
  });
  return userClients;
}

export function generateQualifiedIds(nbUsers: number, domain: string): QualifiedId[] {
  const users: QualifiedId[] = [];
  for (let i = 0; i < nbUsers; i++) {
    users.push({id: createUuid(), domain});
  }
  return users;
}

export const createConversation = (
  type: CONVERSATION_TYPE = CONVERSATION_TYPE.ONE_TO_ONE,
  protocol: CONVERSATION_PROTOCOL = CONVERSATION_PROTOCOL.PROTEUS,
  conversationId: QualifiedId = {id: createUuid(), domain: ''},
  groupId = 'group-id',
): Conversation => {
  const conversation = new Conversation(conversationId.id, conversationId.domain, protocol, translateForTest);
  conversation.participating_user_ets.push(new User(createUuid(), '', translateForTest));
  conversation.type(type);
  if (protocol === CONVERSATION_PROTOCOL.MLS) {
    conversation.groupId = groupId;
  }
  return conversation;
};

export const createSelfParticipant = (): Participant => {
  const selfUser = new User('', '', translateForTest);
  selfUser.isMe = true;
  return new Participant(selfUser, 'client1');
};

const mediaDevices = {
  audioinput: ko.pureComputed(() => {
    return 'test';
  }),
  audiooutput: ko.pureComputed(() => {
    return 'test';
  }),
  screeninput: ko.pureComputed(() => {
    return 'test';
  }),
  videoinput: ko.pureComputed(() => {
    return 'test';
  }),
};

export const buildMediaDevicesHandler = (): MediaDevicesHandler => {
  return {
    currentAvailableDeviceId: mediaDevices,
    setOnMediaDevicesRefreshHandler: jest.fn(),
  } as unknown as MediaDevicesHandler;
};

export const buildCallingRepository = (): CallingRepository => {
  const controller: BackgroundEffectsController = {
    getQuality: jest.fn(),
    getCapabilityInfo: jest.fn(),
  } as unknown as BackgroundEffectsController;
  const backgroundEffectsHandler = new BackgroundEffectsHandler(controller);

  return {
    getBackgroundEffectsHandler: () => {
      return backgroundEffectsHandler;
    },
    isSuperhighQualityTierAllowed: jest.fn(),
  } as unknown as CallingRepository;
};
