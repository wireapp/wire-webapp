Demo:

```js
import {Columns, Column, IndicatorRangeInput} from '@wireapp/react-ui-kit';
import {useState} from 'react';

const dataListOptions = [
  {value: 10, label: '10px', heading: 'Small'},
  {value: 12, label: '12px'},
  {value: 14, label: '14px'},
  {value: 16, label: '16px', heading: 'Default'},
  {value: 18, label: '18px'},
  {value: 20, label: '20px'},
  {value: 24, label: '24px', heading: 'Large'},
  {value: 30, label: '30px'},
  {value: 36, label: '36px', heading: 'Huge'},
];

const [fontValue, setFontValue] = useState(3);

const handleChange = e => {
  setFontValue(+e.target.value);
};

<>
  <div>
    <IndicatorRangeInput
      label="Font size"
      onChange={handleChange}
      value={fontValue}
      min={0}
      step={1}
      dataListOptions={dataListOptions}
    />
  </div>
</>;
```
