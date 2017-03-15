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
  };
})();
