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

import {ReactNode, useState} from 'react';

import {Meta, StoryObj} from '@storybook/react';

import {
  BottomUpMovement,
  LeftRightMovement,
  Opacity,
  RightLeftMovement,
  TopDownMovement,
  XAxisMovement,
  YAxisMovement,
} from './Animation';

import {COLOR} from '../colors/colors';

const meta: Meta = {
  title: 'Identity/Animation',
  decorators: [
    Story => (
      <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

const AnimationDemo = ({
  title,
  children,
}: {
  title: string;
  children: (isAnimating: boolean, toggle: () => void) => ReactNode;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const toggle = () => setIsAnimating(!isAnimating);

  return (
    <div style={{marginBottom: '32px'}}>
      <div style={{marginBottom: '16px'}}>
        <h3 style={{marginBottom: '8px'}}>{title}</h3>
        <button
          onClick={toggle}
          style={{
            backgroundColor: COLOR.BLUE,
            border: 'none',
            borderRadius: '4px',
            color: COLOR.WHITE,
            cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          Toggle Animation
        </button>
      </div>
      <div
        style={{
          backgroundColor: COLOR.GRAY_LIGHTEN_72,
          borderRadius: '4px',
          minHeight: '100px',
          padding: '24px',
        }}
      >
        {children(isAnimating, toggle)}
      </div>
    </div>
  );
};

export const AllAnimations = () => (
  <div>
    <AnimationDemo title="Opacity">
      {isAnimating => (
        <Opacity in={isAnimating}>
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>Fade in/out content</div>
        </Opacity>
      )}
    </AnimationDemo>

    <AnimationDemo title="Top Down Movement">
      {isAnimating => (
        <TopDownMovement in={isAnimating}>
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>Moving from top</div>
        </TopDownMovement>
      )}
    </AnimationDemo>

    <AnimationDemo title="Bottom Up Movement">
      {isAnimating => (
        <BottomUpMovement in={isAnimating}>
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>Moving from bottom</div>
        </BottomUpMovement>
      )}
    </AnimationDemo>

    <AnimationDemo title="Y-Axis Movement">
      {isAnimating => (
        <YAxisMovement in={isAnimating} startValue="50%" endValue="-50%">
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>
            Custom vertical movement
          </div>
        </YAxisMovement>
      )}
    </AnimationDemo>

    <AnimationDemo title="Left Right Movement">
      {isAnimating => (
        <LeftRightMovement in={isAnimating}>
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>Moving from left</div>
        </LeftRightMovement>
      )}
    </AnimationDemo>

    <AnimationDemo title="Right Left Movement">
      {isAnimating => (
        <RightLeftMovement in={isAnimating}>
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>Moving from right</div>
        </RightLeftMovement>
      )}
    </AnimationDemo>

    <AnimationDemo title="X-Axis Movement">
      {isAnimating => (
        <XAxisMovement in={isAnimating} startValue="10vh" endValue="-10vh">
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>
            Custom horizontal movement
          </div>
        </XAxisMovement>
      )}
    </AnimationDemo>

    <AnimationDemo title="Combined Animations">
      {isAnimating => (
        <TopDownMovement in={isAnimating}>
          <Opacity in={isAnimating}>
            <XAxisMovement in={isAnimating} startValue="40vh" endValue="10vh">
              <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>
                Combined fade, vertical and horizontal movement
              </div>
            </XAxisMovement>
          </Opacity>
        </TopDownMovement>
      )}
    </AnimationDemo>
  </div>
);

export const CustomizableAnimation: StoryObj = {
  render: function Render() {
    const [isAnimating, setIsAnimating] = useState(false);
    const toggle = () => setIsAnimating(!isAnimating);

    return (
      <div>
        <button
          onClick={toggle}
          style={{
            backgroundColor: COLOR.BLUE,
            border: 'none',
            borderRadius: '4px',
            color: COLOR.WHITE,
            cursor: 'pointer',
            marginBottom: '24px',
            padding: '8px 16px',
          }}
        >
          Toggle Animation
        </button>
        <Opacity in={isAnimating} timeout={2000}>
          <div style={{padding: '16px', backgroundColor: COLOR.WHITE, borderRadius: '4px'}}>
            Customizable animation duration (2 seconds)
          </div>
        </Opacity>
      </div>
    );
  },

  parameters: {
    docs: {
      description: {
        story: 'Animations can be customized with different durations and timing functions.',
      },
    },
  },
};
