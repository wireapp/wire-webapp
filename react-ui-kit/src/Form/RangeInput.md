Demo:

```js
import {Columns, Column, RangeInput} from '@wireapp/react-ui-kit';
import {useState} from 'react';

const [zoom, setZoom] = useState(1);

const handleChange = e => {
  setZoom(+e.target.value);
};

<>
  <div>
    <RangeInput
      label={'Zoom'}
      minValueLabel="-"
      maxValueLabel="+"
      onChange={handleChange}
      value={zoom}
      min={1}
      max={3}
      step={0.1}
    />
  </div>
</>;
```
