(function() {
  window.z = window.z || {};
  window.z.announce = z.announce || {};

  const ANNOUNCE_CONFIG = {
    CHECK_INTERVAL: 3 * 60 * 60 * 1000,
    CHECK_TIMEOUT: 5 * 60 * 1000,
    UPDATE_INTERVAL: 6 * 60 * 60 * 1000
  };

  window.z.announce.AnnounceRepository = class AnnounceRepository {
    constructor(announce_service) {
      this.logger = new z.util.Logger('z.announce.AnnounceRepository', z.config.LOGGER.OPTIONS);
      this.announce_service = announce_service;
      return this;
    }

    init() {
      return window.setTimeout(() => {
        this.check_announcements();
        this.schedule_checks();
      }, ANNOUNCE_CONFIG.CHECK_TIMEOUT);
    }

    check_announcements() {
      return this.announce_service.get_announcements()
        .then(() => this.process_announce_list())
        .catch((error) => {
          this.logger.error(`Failed to fetch announcements: ${error}`);
        });
    }

    check_version() {
      return this.announce_service.get_version()
        .then((server_version) => {
          this.logger.info(`Found new version ${server_version}`);

          if (server_version > z.util.Environment.version(false, true)) {
            amplify.publish(z.event.WebApp.LIFECYCLE.UPDATE, z.announce.UPDATE_SOURCE.WEBAPP);
          }
        })
        .catch((error) => {
          this.logger.error(`Failed to fetch version: ${error}`);
        });
    }

    schedule_checks() {
      window.setInterval(() => {
        this.check_announcements();
      }, ANNOUNCE_CONFIG.CHECK_INTERVAL);

      window.setInterval(() => {
        this.check_version();
      }, ANNOUNCE_CONFIG.CHECK_INTERVAL);
    }

    process_announce_list(announcements_list) {
      if (process_announce_list) {
        for (let announcement in announcements_list) {
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
              sticky: true,
              requireInteraction: true
            });

            amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.SENT, {campaign: announcement.campaign});
            this.logger.info(`Announcement '${announcement.title}' shown`);

            notification.onclick = () => {
              amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.CLICKED, {campaign: announcement.campaign});
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
})();
