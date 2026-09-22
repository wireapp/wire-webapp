/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {AdminlessDeleteReminderMessage as AdminlessDeleteReminderMessageEntity} from 'Repositories/entity/message/adminlessDeleteReminderMessage';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {replaceReactComponents} from 'Util/localizerUtil/reactLocalizerUtil';
import {formatLocale} from 'Util/timeUtil';

import {
  adminlessDeleteReminderContainerCss,
  adminlessDeleteReminderIconCss,
  adminlessDeleteReminderLinkCss,
  adminlessDeleteReminderTextContainerCss,
} from './adminlessDeleteReminderMessage.styles';

interface AdminlessDeleteReminderMessageProps {
  message: AdminlessDeleteReminderMessageEntity;
}

export const AdminlessDeleteReminderMessage = ({message}: AdminlessDeleteReminderMessageProps) => {
  const {translate} = useApplicationContext();

  const caption = translate(
    'conversationAdminlessDeleteReminder',
    {date: formatLocale(message.deletionScheduledFor, 'MMMM d, p')},
    {},
    true,
  );

  const content = replaceReactComponents(caption, [
    {start: '<strong>', end: '</strong>', render: text => <strong key={text}>{text}</strong>},
    {
      start: '[link]',
      end: '[/link]',
      render: text => (
        <Link
          key={text}
          css={adminlessDeleteReminderLinkCss}
          variant={LinkVariant.PRIMARY}
          href={Config.getConfig().URL.SUPPORT.ADMINLESS_GROUP_DELETE}
          targetBlank
          data-uie-name="go-adminless-group-delete-learn-more"
        >
          {text}
        </Link>
      ),
    },
  ]);

  return (
    <div css={adminlessDeleteReminderContainerCss} data-uie-name="element-message-adminless-delete-reminder">
      <div css={adminlessDeleteReminderIconCss} aria-hidden="true">
        <Icon.InfoIcon width={16} height={16} />
      </div>
      <span css={adminlessDeleteReminderTextContainerCss}>{content}</span>
    </div>
  );
};
