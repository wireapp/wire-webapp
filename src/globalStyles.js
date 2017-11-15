import baseStyle from './Base';
import {injectGlobal} from 'styled-components';
import styledNormalize from 'styled-normalize';

let areGlobalStylesSet = false;

export default function applyGlobalStyles() {
  if (!areGlobalStylesSet) {
    injectGlobal([styledNormalize]);
    injectGlobal([baseStyle]);
    areGlobalStylesSet = true;
  }
}
