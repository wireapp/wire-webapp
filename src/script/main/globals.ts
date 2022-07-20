/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import ko from 'knockout';

import '../script/Config';

import 'Components/CopyToClipboard';
import 'Components/UserSearchableList';
import 'Components/toggle/BaseToggle';
import 'Components/icons';
import 'Components/Image';
import 'Components/toggle/InfoToggle';
import 'Components/calling/FullscreenVideoCall';
import 'Components/avatar/GroupAvatar';
import 'Components/MessagesList';
import 'Components/TitleBar';
import 'Components/Modals/GroupCreation/GroupCreationModal';
import '../script/page/AppLock';
import 'Components/modal';
import 'Components/panel/ServiceDetails';
import 'Components/panel/UserDetails';
import 'Components/ServiceList';
import 'Components/SearchInput';
import 'Components/calling/CallingOverlayContainer';

import 'Util/LocalizerUtil';

import '../script/localization/Localizer';
import '../script/view_model/bindings/CommonBindings';
import '../script/view_model/bindings/ConversationListBindings';
import '../script/view_model/bindings/MessageListBindings';
import '../script/view_model/bindings/VideoCallingBindings';

import '../script/view_model/MainViewModel';
import '../script/view_model/PanelViewModel';

window.amplify = amplify;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
