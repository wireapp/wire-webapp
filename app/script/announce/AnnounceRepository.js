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
      window.setInterval(this.check_announcements, ANNOUNCE_CONFIG.CHECK_INTERVAL);
      window.setInterval(this.check_version, ANNOUNCE_CONFIG.CHECK_INTERVAL);
    }

    process_announce_list(announcements_list) {
      // TODO
    }
  };
})();
