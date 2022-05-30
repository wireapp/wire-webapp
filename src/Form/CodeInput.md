Demo:

```js
import {onCodeComplete} from '@wireapp/react-ui-kit';

<>
  <div style={{marginBottom: '20px'}}>
    <CodeInput markInvalid onCodeComplete={code => console.info(code)} />
  </div>

  <div>
    <CodeInput onCodeComplete={code => console.info(code)} />
  </div>
</>;
```
