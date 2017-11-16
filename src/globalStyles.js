import {injectGlobal} from 'styled-components';
import styledNormalize from 'styled-normalize';

let areGlobalStylesSet = false;

export default function applyGlobalStyles() {
  if (!areGlobalStylesSet) {
    injectGlobal([styledNormalize]);
    areGlobalStylesSet = true;
  }
}
