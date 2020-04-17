Demo:

```js
import {ButtonLink, Container, Columns, Column, COLOR} from '@wireapp/react-ui-kit';

<Container>
  <Columns>
    <Column>ButtonLink</Column>
    <Column>
      <ButtonLink backgroundColor={COLOR.GREEN}>ButtonLink</ButtonLink>
    </Column>
  </Columns>
  <Columns>
    <Column>Loading ButtonLink</Column>
    <Column>
      <ButtonLink showLoading backgroundColor={COLOR.GREEN}>
        ButtonLink
      </ButtonLink>
    </Column>
  </Columns>
</Container>;
```
