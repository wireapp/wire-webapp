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
    <Button>
      <Tooltip body="This is a tooltip" selector="#rsg-root">
        Tooltip on top
      </Tooltip>
    </Button>

    <p>If You want to test tooltip bottom scroll this button to top of the page :)</p>
  </Form>
</Fragment>;
```
