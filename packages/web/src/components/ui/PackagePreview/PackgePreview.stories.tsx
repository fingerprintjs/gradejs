import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import PackagePreview from './PackagePreview';

export default {
  title: 'Interface / PackagePreview',
  component: PackagePreview,
  parameters: {
    layout: 'centered',
  },
} as ComponentMeta<typeof PackagePreview>;

export const Closed: ComponentStory<typeof PackagePreview> = () => (
  <PackagePreview name='name' version='1.0.0' />
);

export const Opened: ComponentStory<typeof PackagePreview> = () => (
  <PackagePreview name='name' version='1.0.0' opened />
);
