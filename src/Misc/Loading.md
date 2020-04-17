Demo:

```js
import {Container, Loading} from '@wireapp/react-ui-kit';

<Container style={{alignItems: 'center', display: 'flex', justifyContent: 'space-around'}}>
  <Loading />
  <Loading progress={0.33} />
  <Loading progress={0.66} size={100} />
</Container>;
```
