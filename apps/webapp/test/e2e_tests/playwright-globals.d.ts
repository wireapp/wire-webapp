// Keep this declaration local to avoid importing the complete application type graph into Playwright.
type PlaywrightNotification = {
  readonly title?: string;
  readonly body?: string;
  readonly data?: unknown;
  readonly icon?: string;
  readonly onclick?: (event: Event) => void;
};

declare global {
  interface Window {
    wire: {
      readonly env: unknown;
      readonly app: {
        readonly repository: {
          readonly notification: {
            notifications: PlaywrightNotification[];
          };
        };
      };
    };
  }
}

export {};
