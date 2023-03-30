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
    <Tooltip light position="top" body="This is a tooltip on top">
      <Button style={{marginBottom: 0}}>Tooltip on top</Button>
    </Tooltip>
    <br />
    <Tooltip light position="right" body="This is a tooltip on right" right>
      <Button style={{marginBottom: 0}}>Tooltip on right</Button>
    </Tooltip>
    <br />
    <Tooltip light position="left" body="This is a tooltip on left" left>
      <Button style={{marginBottom: 0}}>Tooltip on left</Button>
    </Tooltip>
    <br />
    <Tooltip light position="bottom" body="This is a tooltip on bottom" bottom>
      <Button style={{marginBottom: 0}}>Tooltip on bottom</Button>
    </Tooltip>
  </Form>
</Fragment>;
```
