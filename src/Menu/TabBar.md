Demo:

```js
import React, {useState} from 'react';
import {TabBar, TabBarItem} from '@wireapp/react-ui-kit';

const [activeTab, setActiveTab] = useState(0);

<TabBar>
  <TabBarItem active={activeTab === 0} onClick={() => setActiveTab(0)}>
    Info
  </TabBarItem>
  <TabBarItem active={activeTab === 1} onClick={() => setActiveTab(1)}>
    Download
  </TabBarItem>
  <TabBarItem active={activeTab === 2} onClick={() => setActiveTab(2)}>
    Open
  </TabBarItem>
</TabBar>;
```
