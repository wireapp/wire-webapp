Demo:

```js
import {useState} from 'react';
import {Container, Loading, Small, COLOR} from '@wireapp/react-ui-kit';

const [currentPage, setCurrentPage] = useState(0);

const paginatedList = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12],
  [13, 14],
  [15, 16],
  [17, 18],
];

<Container>
  {paginatedList[currentPage].map(item => (
    <Small key={item} center bold block style={{border: `1px solid ${COLOR.GRAY}`, margin: 10}}>
      {`- ${item}`}
    </Small>
  ))}
  <Pagination
    currentPage={currentPage}
    goPage={setCurrentPage}
    nextPageComponent={() => 'Next'}
    numberOfPages={paginatedList.length}
    previousPageComponent={() => 'Previous'}
  />
</Container>;
```
