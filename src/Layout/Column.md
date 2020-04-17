Demo:

```js
import {Container, Columns, Column, COLOR} from '@wireapp/react-ui-kit';

const ColumnsStyle = {
  marginBottom: '12px',
};

const ColumnStyle = {
  backgroundColor: COLOR.GRAY_LIGHTEN_32,
  border: `1px solid ${COLOR.GRAY_LIGHTEN_24}`,
};

<Container>
  <Columns style={ColumnsStyle}>
    <Column style={ColumnStyle}>Column</Column>
  </Columns>

  <Columns style={ColumnsStyle}>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
  </Columns>

  <Columns style={ColumnsStyle}>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
  </Columns>

  <Columns style={ColumnsStyle}>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
  </Columns>

  <Columns style={ColumnsStyle}>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
    <Column style={ColumnStyle}>Column</Column>
  </Columns>

  <Columns style={ColumnsStyle}>
    <Column style={ColumnStyle}>
      <Columns>
        <Column style={ColumnStyle}>Column</Column>
        <Column style={ColumnStyle}>Column</Column>
        <Column style={ColumnStyle}>Column</Column>
      </Columns>
    </Column>
    <Column style={ColumnStyle}>
      <Columns>
        <Column style={ColumnStyle}>Column</Column>
        <Column style={ColumnStyle}>Column</Column>
        <Column style={ColumnStyle}>Column</Column>
      </Columns>
    </Column>
    <Column style={ColumnStyle}>
      <Columns>
        <Column style={ColumnStyle}>Column</Column>
        <Column style={ColumnStyle}>Column</Column>
        <Column style={ColumnStyle}>Column</Column>
      </Columns>
    </Column>
  </Columns>
</Container>;
```
