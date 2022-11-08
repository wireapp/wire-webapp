import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

const Wrapper = ({children}) => {
  return (
    <div>
      <StyledApp themeId={THEME_ID.LIGHT}>
        <div style={{padding: 16}}>{children}</div>
      </StyledApp>
    </div>
  );
};

export default Wrapper;
