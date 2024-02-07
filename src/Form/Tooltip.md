Demo:

```js
import {Fragment} from 'react';
import {Form, Tooltip, Input, Button} from '@wireapp/react-ui-kit';

<Fragment>
  <Form
    style={{display: 'flex', flexDireciton: 'column', margin: '0 auto'}}
    onSubmit={event => {
      event.preventDefault();
    }}
  >
    <Tooltip body="This is a tooltip">
      <Button>Tooltip on top</Button>
    </Tooltip>
  </Form>
</Fragment>;
```
