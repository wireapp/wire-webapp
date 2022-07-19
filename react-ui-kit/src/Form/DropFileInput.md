Demo:

```js
import {Columns, Column, DropFileInput} from '@wireapp/react-ui-kit';

<>
  <div>
    <DropFileInput
      onInvalidFilesDropError={console.log}
      onFilesUploaded={() => console.error('error while uploading files')}
      headingText="Drag & Drop an image \nor"
      labelText="select one from your device"
      accept="image/png, image/jpeg"
      description="Image (JPG/PNG) size up to 1 MB, minimum 200 x 600 px"
    />
  </div>
</>;
```
