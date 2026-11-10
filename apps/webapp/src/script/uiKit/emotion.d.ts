import '@emotion/react';
import type {Theme as WireTheme} from './identity/theme/theme';

declare module '@emotion/react' {
  export interface Theme extends WireTheme {}
}
