import {GUTTER} from './sizes';
import styled from 'styled-components';

const Content = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 0 ${GUTTER + GUTTER}px;
`;

export {Content};
