Demo:

```js
import {Fragment} from 'react';
import {Form, Tooltip, Input} from '@wireapp/react-ui-kit';

<Fragment>
  <Form
    style={{width: 100, display: 'flex', flexDireciton: 'column', margin: '0 auto'}}
    onSubmit={event => {
      event.preventDefault();
    }}
  >
    <Tooltip text="This is a tooltip on top">
      <Input placeholder="Tooltip on top" />
    </Tooltip>
    <Tooltip text="This is a tooltip on right" right>
      <Input placeholder="Tooltip on right" />
    </Tooltip>
    <Tooltip text="This is a tooltip on left" left>
      <Input placeholder="Tooltip on left" />
    </Tooltip>
    <Tooltip text="This is a tooltip on bottom" bottom>
      <Input placeholder="Tooltip on bottom" />
    </Tooltip>
  </Form>
</Fragment>;
```
