Demo:

```js
import {Input} from '@wireapp/react-ui-kit';
import {useState} from 'react';

const [value, setValue] = useState('');

<>
  <form>
    <Input
      type="password"
      label="Password"
      autocomplete="on"
      value={value}
      onChange={event => setValue(event.currentTarget.value)}
    />
  </form>
</>;
```
