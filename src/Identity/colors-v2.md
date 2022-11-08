```js
import {jsx} from '@emotion/react';
import {COLOR, Container, H1, H2, H3, Line} from '@wireapp/react-ui-kit';
import Color from 'color';
import {COLOR_V2 as Colors, BASE_LIGHT_COLOR, BASE_DARK_COLOR} from './colors-v2';

const colorElementStyle = props => ({
  '&::after': {
    alignItems: 'center',
    color: '#fff',
    content: 'attr(data-text)',
    display: 'flex',
    fontSize: '10px',
    fontWeight: 600,
    height: '100%',
    justifyContent: 'center',
    opacity: 0,
    position: 'absolute',
    textAlign: 'center',
    textShadow: '#000 0 0 2px',
    transform: 'scale(1.2)',
    transition: 'all 0.2s ease-in-out',
    whiteSpace: 'pre-wrap',
    width: '100%',
    zIndex: 1,
  },
  '&:hover::after': {
    opacity: 1,
    transform: 'scale(1)',
  },
  cursor: 'pointer',
  backgroundColor: props.backgroundColor,
  border: '1px solid black',
  borderRadius: '40px',
  display: 'inline-block',
  height: '80px',
  position: 'relative',
  width: '80px',
});

const ColorElement = ({name, backgroundColor}) => {
  return (
    <div
      onClick={() => navigator.clipboard.writeText(backgroundColor)}
      css={colorElementStyle({backgroundColor})}
      data-text={`${name}\n${backgroundColor}`}
    />
  );
};

const filterAndRenderColors = colorToFilter =>
  Object.entries(Colors)
    .filter(([name]) => name.includes(colorToFilter))
    .map(([name, color]) => <ColorElement key={name} name={name} backgroundColor={color} />);

<Container>
  <H2>Light UI</H2>
  <H3>Main Accent Colors</H3>

  {Object.entries(BASE_LIGHT_COLOR).map(([name, color]) => (
    <ColorElement key={name} name={name} backgroundColor={color} />
  ))}

  <H3>Blue</H3>
  {filterAndRenderColors('BLUE_LIGHT')}

  <H3>Green</H3>
  {filterAndRenderColors('GREEN_LIGHT')}

  <H3>Petrol</H3>
  {filterAndRenderColors('PETROL_LIGHT')}

  <H3>Purple</H3>
  {filterAndRenderColors('PURPLE_LIGHT')}

  <H3>Red</H3>
  {filterAndRenderColors('RED_LIGHT')}

  <H3>Amber</H3>
  {filterAndRenderColors('AMBER_LIGHT')}

  <H2>Dark UI</H2>
  <H3>Main Accent Colors</H3>

  {Object.entries(BASE_DARK_COLOR).map(([name, color]) => (
    <ColorElement key={name} name={name} backgroundColor={color} />
  ))}

  <H3>Blue</H3>
  {filterAndRenderColors('BLUE_DARK')}

  <H3>Green</H3>
  {filterAndRenderColors('GREEN_DARK')}

  <H3>Petrol</H3>
  {filterAndRenderColors('PETROL_DARK')}

  <H3>Purple</H3>
  {filterAndRenderColors('PURPLE_DARK')}

  <H3>Red</H3>
  {filterAndRenderColors('RED_DARK')}

  <H3>Amber</H3>
  {filterAndRenderColors('AMBER_DARK')}

  <H2>Grays</H2>
  {filterAndRenderColors('GRAY')}
</Container>;
```
