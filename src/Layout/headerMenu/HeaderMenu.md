Demo:

```js
import {useState} from 'react';
import {HeaderMenu, MenuLink, HeaderSubMenu, Logo, isDesktop, COLOR} from '@wireapp/react-ui-kit';

const [showFirstDropdown, setShowFirstDropdown] = useState(false);
const [showSecondDropdown, setShowSecondDropdown] = useState(false);

<HeaderMenu logoElement={<Logo width={72} />}>
  <MenuLink href="#" color={COLOR.GREEN} button>
    test1
  </MenuLink>
  <MenuLink href="#">test1</MenuLink>
  <MenuLink href="#">test2</MenuLink>
  <HeaderSubMenu
    caption={'Dropdown1'}
    isOpen={showFirstDropdown}
    onMouseLeave={isDesktop ? () => setShowFirstDropdown(false) : undefined}
    onMouseOver={() => {
      if (isDesktop) {
        setShowFirstDropdown(true);
        setShowSecondDropdown(false);
      }
    }}
    onClick={event => {
      event.stopPropagation();
      setShowFirstDropdown(!showFirstDropdown);
      setShowSecondDropdown(false);
    }}
  >
    <MenuLink noWrap>{'Messaging1'}</MenuLink>
    <MenuLink noWrap>{'Voice & video1'}</MenuLink>
    <MenuLink noWrap>{'File sharing & productivity1'}</MenuLink>
  </HeaderSubMenu>
  <HeaderSubMenu
    caption={'Dropdown2'}
    isOpen={showSecondDropdown}
    onMouseLeave={isDesktop ? () => setShowSecondDropdown(false) : undefined}
    onMouseOver={() => {
      if (isDesktop) {
        setShowFirstDropdown(false);
        setShowSecondDropdown(true);
      }
    }}
    onClick={event => {
      event.stopPropagation();
      setShowFirstDropdown(false);
      setShowSecondDropdown(!showSecondDropdown);
    }}
  >
    <MenuLink noWrap>{'Messaging2'}</MenuLink>
    <MenuLink noWrap>{'Voice & video2'}</MenuLink>
    <MenuLink noWrap>{'File sharing & productivity2'}</MenuLink>
  </HeaderSubMenu>
  <MenuLink href="#">test3</MenuLink>
  <MenuLink href="#">test4</MenuLink>
  <MenuLink href="#">test5</MenuLink>
</HeaderMenu>;
```
