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

import {render} from '@testing-library/react';
import {CONVERSATION_TYPE, ConversationProtocol, QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {RecursivePartial} from '@wireapp/commons/lib/util/TypeUtil';
import ko from 'knockout';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {HashRouter as Router} from 'react-router-dom';
import {AnyAction} from 'redux';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import cs from 'I18n/cs-CZ.json';
import da from 'I18n/da-DK.json';
import de from 'I18n/de-DE.json';
import el from 'I18n/el-GR.json';
import en from 'I18n/en-US.json';
import es from 'I18n/es-ES.json';
import et from 'I18n/et-EE.json';
import fi from 'I18n/fi-FI.json';
import fr from 'I18n/fr-FR.json';
import hr from 'I18n/hr-HR.json';
import hu from 'I18n/hu-HU.json';
import it from 'I18n/it-IT.json';
import lt from 'I18n/lt-LT.json';
import nl from 'I18n/nl-NL.json';
import pl from 'I18n/pl-PL.json';
import pt from 'I18n/pt-BR.json';
import ro from 'I18n/ro-RO.json';
import ru from 'I18n/ru-RU.json';
import si from 'I18n/si-LK.json';
import sk from 'I18n/sk-SK.json';
import sl from 'I18n/sl-SI.json';
import tr from 'I18n/tr-TR.json';
import uk from 'I18n/uk-UA.json';
import {Participant} from 'Repositories/calling/Participant';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {setStrings} from 'Util/LocalizerUtil';
import {createUuid} from 'Util/uuid';

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
) => <Provider store={store}>{children}</Provider>;

const withRouter = (component: React.ReactNode) => <Router>{component}</Router>;

const loadLanguage = (language: string) => {
  return require(`I18n/${mapLanguage(language)}.json`);
};

export const withIntl = (component: React.ReactNode) => {
  setStrings(internalizationStrings);

  return (
    <IntlProvider locale="en" messages={loadLanguage('en-US')}>
      {component}
    </IntlProvider>
  );
};

export const withTheme = (component: React.ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

const wrapComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => withRouter(withTheme(withStore(withIntl(component), store)));

export const mountComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => render(wrapComponent(component, store));

export function generateUsers(nbUsers: number, domain: string) {
  const users: User[] = [];
  for (let i = 0; i < nbUsers; i++) {
    const user = new User(createUuid(), domain);
    user.name(`User ${i}`);
    users.push(user);
  }
  return users;
}

export function generateUserClients(users: User[]): QualifiedUserClients {
  const userClients: QualifiedUserClients = {};
  users.forEach(user => {
    const domainUsers = userClients[user.qualifiedId.domain] || {};
    domainUsers[user.qualifiedId.id] = [];
    userClients[user.qualifiedId.domain] = domainUsers;
  });
  return userClients;
}

export function generateQualifiedIds(nbUsers: number, domain: string) {
  const users: QualifiedId[] = [];
  for (let i = 0; i < nbUsers; i++) {
    users.push({id: createUuid(), domain});
  }
  return users;
}

export const createConversation = (
  type: CONVERSATION_TYPE = CONVERSATION_TYPE.ONE_TO_ONE,
  protocol: ConversationProtocol = ConversationProtocol.PROTEUS,
  conversationId: QualifiedId = {id: createUuid(), domain: ''},
  groupId = 'group-id',
) => {
  const conversation = new Conversation(conversationId.id, conversationId.domain, protocol);
  conversation.participating_user_ets.push(new User(createUuid()));
  conversation.type(type);
  if (protocol === ConversationProtocol.MLS) {
    conversation.groupId = groupId;
  }
  return conversation;
};

export const createSelfParticipant = () => {
  const selfUser = new User();
  selfUser.isMe = true;
  return new Participant(selfUser, 'client1');
};

const mediaDevices = {
  audioinput: ko.pureComputed(() => 'test'),
  audiooutput: ko.pureComputed(() => 'test'),
  screeninput: ko.pureComputed(() => 'test'),
  videoinput: ko.pureComputed(() => 'test'),
};

export const buildMediaDevicesHandler = () => {
  return {
    currentAvailableDeviceId: mediaDevices,
    setOnMediaDevicesRefreshHandler: jest.fn(),
  } as unknown as MediaDevicesHandler;
};
