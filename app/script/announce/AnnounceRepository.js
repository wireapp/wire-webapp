/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.announce = z.announce || {};

z.announce.AnnounceRepository = class AnnounceRepository {
  static get CONFIG() {
    return {
      CHECK_INTERVAL: 3 * 60 * 60 * 1000,
      CHECK_TIMEOUT: 5 * 60 * 1000,
      UPDATE_INTERVAL: 6 * 60 * 60 * 1000,
    };
  }

  constructor(announce_service) {
    this.logger = new z.util.Logger('z.announce.AnnounceRepository', z.config.LOGGER.OPTIONS);
    this.announce_service = announce_service;
  }

  init() {
    window.setTimeout(() => {
      this.check_announcements();
      this.schedule_checks();
    }, AnnounceRepository.CONFIG.CHECK_TIMEOUT);
  }

  check_announcements() {
    if (navigator.onLine) {
      return this.announce_service.get_announcements().then(announcements_list => {
        this.process_announce_list(announcements_list);
      });
    }
  }

  check_version() {
    if (navigator.onLine) {
      return this.announce_service.get_version().then(server_version => {
        this.logger.info(
          `Checking current webapp version. Server '${server_version}' vs. local '${z.util.Environment.version(
            false,
            true
          )}'`
        );

        if (server_version > z.util.Environment.version(false, true)) {
          amplify.publish(z.event.WebApp.LIFECYCLE.UPDATE, z.announce.UPDATE_SOURCE.WEBAPP);
        }
      });
    }
  }

  schedule_checks() {
    window.setInterval(() => {
      this.check_announcements();
    }, AnnounceRepository.CONFIG.CHECK_INTERVAL);

    window.setInterval(() => {
      this.check_version();
    }, AnnounceRepository.CONFIG.CHECK_INTERVAL);
  }

  process_announce_list(announcements_list) {
    if (announcements_list) {
      for (const announcement of announcements_list) {
        if (!z.util.Environment.frontend.is_localhost()) {
          if (announcement.version_max && z.util.Environment.version(false) > announcement.version_max) {
            continue;
          }
          if (announcement.version_min && z.util.Environment.version(false) < announcement.version_min) {
            continue;
          }
        }

        const key = `${z.storage.StorageKey.ANNOUNCE.ANNOUNCE_KEY}@${announcement.key}`;
        if (!z.util.StorageUtil.get_value(key)) {
          z.util.StorageUtil.set_value(key, 'read');
          if (!z.util.Environment.browser.supports.notifications) {
            return;
          }

          if (window.Notification.permission === z.system_notification.PermissionStatusState.DENIED) {
            return;
          }

          if (z.localization.Localizer.locale !== 'en') {
            announcement.title = announcement[`title_${z.localization.Localizer.locale}`] || announcement.title;
            announcement.message = announcement[`message_${z.localization.Localizer.locale}`] || announcement.message;
          }

          const notification = new window.Notification(announcement.title, {
            body: announcement.message,
            icon: z.util.Environment.electron && z.util.Environment.os.mac ? '' : '/image/logo/notification.png',
            requireInteraction: true,
            sticky: true,
          });

          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.SENT, {
            campaign: announcement.campaign,
          });
          this.logger.info(`Announcement '${announcement.title}' shown`);

          notification.onclick = () => {
            amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.CLICKED, {
              campaign: announcement.campaign,
            });
            this.logger.info(`Announcement '${announcement.title}' clicked`);

            if (announcement.link) {
              z.util.safe_window_open(announcement.link);
            }

            if (announcement.refresh) {
              amplify.publish(z.event.WebApp.LIFECYCLE.REFRESH);
            }

            notification.close();
          };
          break;
        }
      }
    }
  }
};
