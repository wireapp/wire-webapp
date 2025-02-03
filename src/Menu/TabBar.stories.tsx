/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {useState} from 'react';

import {Meta, StoryObj} from '@storybook/react';

import {TabBar, TabBarItem} from './TabBar';

const meta: Meta<typeof TabBar> = {
  component: TabBar,
  title: 'Menu/TabBar',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TabBar>;

export const Default: Story = {
  args: {
    children: (
      <>
        <TabBarItem active={true}>First Tab</TabBarItem>
        <TabBarItem active={false}>Second Tab</TabBarItem>
        <TabBarItem active={false}>Third Tab</TabBarItem>
      </>
    ),
  },
};

export const Interactive = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['First Tab', 'Second Tab', 'Third Tab'];

  return (
    <TabBar>
      {tabs.map((tab, index) => (
        <TabBarItem key={tab} active={activeTab === index} onClick={() => setActiveTab(index)}>
          {tab}
        </TabBarItem>
      ))}
    </TabBar>
  );
};

export const WithContent = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Details', 'History', 'Settings'];

  return (
    <div>
      <TabBar>
        {tabs.map((tab, index) => (
          <TabBarItem key={tab} active={activeTab === index} onClick={() => setActiveTab(index)}>
            {tab}
          </TabBarItem>
        ))}
      </TabBar>
      <div style={{padding: '16px'}}>
        {activeTab === 0 && <div>Details content</div>}
        {activeTab === 1 && <div>History content</div>}
        {activeTab === 2 && <div>Settings content</div>}
      </div>
    </div>
  );
};

export const WithBadge = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <TabBar>
      <TabBarItem active={activeTab === 0} onClick={() => setActiveTab(0)}>
        Messages
      </TabBarItem>
      <TabBarItem active={activeTab === 1} onClick={() => setActiveTab(1)}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          Notifications
          <span
            style={{
              backgroundColor: 'red',
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px',
              padding: '2px 6px',
            }}
          >
            3
          </span>
        </div>
      </TabBarItem>
    </TabBar>
  );
};

export const CustomStyling: Story = {
  args: {
    style: {backgroundColor: '#f5f5f5', padding: '8px'},
    children: (
      <>
        <TabBarItem active={true} style={{fontWeight: 'bold'}}>
          Bold Tab
        </TabBarItem>
        <TabBarItem active={false} style={{color: 'blue'}}>
          Blue Tab
        </TabBarItem>
        <TabBarItem active={false} style={{textTransform: 'none'}}>
          Normal Case Tab
        </TabBarItem>
      </>
    ),
  },
};
