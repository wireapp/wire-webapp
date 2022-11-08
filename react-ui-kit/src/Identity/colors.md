```js
import {jsx} from '@emotion/react';
import {COLOR, Container, H1, H2, Line} from '@wireapp/react-ui-kit';
import Color from 'color';

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
  backgroundColor: props.backgroundColor,
  border: '1px solid black',
  borderRadius: '40px',
  display: 'inline-block',
  height: '80px',
  position: 'relative',
  width: '80px',
});

const ColorElement = ({name}) => {
  const backgroundColor = COLOR[name];
  const color = Color(backgroundColor);
  const value = color.hex().toString();
  const digits = 2;
  const alpha = color.alpha() < 1 ? color.alpha().toFixed(digits) : 0;
  return (
    <div
      onClick={() => navigator.clipboard.writeText(alpha ? color.toString() : value)}
      css={colorElementStyle({backgroundColor})}
      data-text={`${name}\n${value}${alpha ? `\nα: ${alpha}` : ''}`}
    />
  );
};

const lightenableColors = ['BLACK', 'GRAY'];
const darkenableColors = ['WHITE', 'GRAY'];
const baseColors = ['BLACK', 'WHITE', 'GRAY', 'BLUE', 'GREEN', 'ORANGE', 'RED', 'YELLOW'];
const additionalColors = ['LINK', 'TEXT', 'ICON', 'DISABLED'];
const allColors = [...baseColors, ...additionalColors];
const steps = [];
const percent = 100;
const stepSize = 8;
for (let index = stepSize; index < percent; index += stepSize) {
  steps.push(index);
}

<Container>
  <H2>Base Colors </H2>
  {allColors.map(color => (
    <ColorElement name={color} key={color} />
  ))}
  <H2>Darken</H2>
  {darkenableColors.map(color => (
    <Container key={color}>
      {steps.map(step => {
        const name = `${color}_DARKEN_${step}`;
        return <ColorElement name={name} key={name} />;
      })}
    </Container>
  ))}
  <H2>Lighten</H2>
  {lightenableColors.map(color => (
    <Container key={color}>
      {steps.map(step => {
        const name = `${color}_LIGHTEN_${step}`;
        return <ColorElement name={name} key={name} />;
      })}
    </Container>
  ))}
  <H2>Opaque</H2>
  {baseColors.map(color => (
    <Container
      key={color}
      style={{
        backgroundImage:
          "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAL0lEQVQ4T2N88ODBfwY8QEFBgRGfPOOoAQzDIQzwxTFIjlA0400kowZAgnfwByIAPbI9Ca+UKQsAAAAASUVORK5CYII=')",
      }}
    >
      {steps.map(step => {
        const name = `${color}_OPAQUE_${step}`;
        return <ColorElement name={name} key={name} />;
      })}
    </Container>
  ))}
</Container>;
```
