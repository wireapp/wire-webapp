Demo:

```jsx
import React from 'react';
import {Column, Columns, Container, H1, H2, H3, H4, Heading} from '@wireapp/react-ui-kit';

<Container>
  <Columns>
    <Column>Default heading</Column>
    <Column>
      <Heading>Heading default</Heading>
    </Column>
  </Columns>
  <Columns>
    <Column>Heading1</Column>
    <Column>
      <H1>Heading1</H1>
    </Column>
  </Columns>
  <Columns>
    <Column>Heading2</Column>
    <Column>
      <H2>Heading2</H2>
    </Column>
  </Columns>
  <Columns>
    <Column>Heading3</Column>
    <Column>
      <H3>Heading3</H3>
    </Column>
  </Columns>
  <Columns>
    <Column>Heading4</Column>
    <Column>
      <H4>Heading4</H4>
    </Column>
  </Columns>
</Container>;
```
