import '@emotion/react';
import type {Theme as WireTheme} from './src/identity/Theme';

declare module '@emotion/react' {
  export interface Theme extends WireTheme {}
}
