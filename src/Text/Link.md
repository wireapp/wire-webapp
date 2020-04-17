Demo:

```jsx
import React from 'react';
import {Column, Columns, Container, COLOR, Link, Text, TextLink} from '@wireapp/react-ui-kit';

<Container>
  <Columns>
    <Column>Link</Column>
    <Column>
      <Link block href="#">
        Link
      </Link>
      <Link block color={COLOR.RED} href="#">
        Red Link
      </Link>
    </Column>
  </Columns>
</Container>;
```
