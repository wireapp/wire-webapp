Demo:

```js
import {ContainerXS, ContainerSM, ContainerMD, ContainerLG, COLOR} from '@wireapp/react-ui-kit';

const ColumnsStyle = {
  marginBottom: '12px',
};

const ColumnStyle = {
  backgroundColor: COLOR.GRAY_LIGHTEN_32,
  border: `1px solid ${COLOR.GRAY_LIGHTEN_24}`,
};

const ContainerStyle = {
  ...ColumnsStyle,
  ...ColumnStyle,
  alignItems: 'center',
  display: 'flex',
  height: '48px',
  justifyContent: 'center',
};

<>
  <ContainerXS style={ContainerStyle}>ContainerXS</ContainerXS>
  <ContainerSM style={ContainerStyle}>ContainerSM</ContainerSM>
  <ContainerMD style={ContainerStyle}>ContainerMD</ContainerMD>
  <ContainerLG style={ContainerStyle}>ContainerLG</ContainerLG>
</>;
```
