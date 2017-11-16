import {COLOR} from '../Identity';
import styled from 'styled-components';

const StyledApp = styled.div`
  color: ${COLOR.GRAY_DARKEN_48};
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif;
  font-weight: 300;
  line-height: 1.5;
  min-height: 100vh;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  * {
    box-sizing: border-box;
  }
`;

export {StyledApp};
