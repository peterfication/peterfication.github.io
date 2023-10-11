---
layout: post
title: Create a ReactNative StorybookProvider
date: 2023-10-10
categories: ["typescript", "react-native", "storybook"]
---

There are different ways to integrate Storybook into your ReactNative application. [You can either use different scripts that change the application entry point based on an environment/config variable](https://storybook.js.org/tutorials/intro-to-storybook/react-native/en/get-started/) or, more conveniently, [you can add a menu item to the dev settings/menu that switches dynamically between your application and your Storybook setup](https://sophieau.com/article/react-native-storybook/). In this blog post, I will take the second approach and try to improve the solution a bit.

The problem I see with the proposed solution in the linked blog article is that you clutter up your App component quite a bit:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { addMenuItem } from 'react-native/Libraries/Utilities/DevSettings';

export const App = () => {
  const [showStorybook, setShowStorybook] = useState(false);
  const toggleStorybook = useCallback(
    () => setShowStorybook((previousState) => !previousState),
    []
  );

  useEffect(() => {
    if (__DEV__) {
      addMenuItem("Toggle Storybook", toggleStorybook);
    }
  }, []);

  if (__DEV__) {
    const Storybook = require("../../.storybook/Storybook").default;

    if (showStorybook) {
      return <Storybook />;
    }
  }

  return (
    <SomeProvider>
      <SomeOtherProvider>
        <NavigationProvider />
      </SomeOtherProvider>
    </SomeProvider>
  );
};
```

Wouldn't it be nicer if your `App` component would look like this:

```typescript
import React from 'react';

export const App = () => {
  return (
    <StorybookProvider>
      <SomeProvider>
        <SomeOtherProvider>
          <NavigationProvider />
        </SomeOtherProvider>
      </SomeProvider>
    </StorybookProvider>
  );
};
```

This is exactly what I did in [this pull request](https://github.com/peterfication/peak-tracker-app/pull/118/files#diff-a369d17a5dcc6a08663afe8ec644ed0ebc2624f39b704924078c01fd52c58fa3R12). The [`StorybookProvider`](https://github.com/peterfication/peak-tracker-app/blob/dc7548e20d9f45654281712e32e19e34f9c43c56/src/providers/StorybookProvider.tsx#L22) then handles everything related to the dev settings/menu and the loading of Storybook:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { addMenuItem } from 'react-native/Libraries/Utilities/DevSettings';

export const StorybookProvider: StorybookProviderType = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [showStorybook, setShowStorybook] = useState(false);
  const toggleStorybook = useCallback(
    () => setShowStorybook(previousState => !previousState),
    [],
  );

  useEffect(
    () => {
      if (__DEV__) {
        addMenuItem('Toggle Storybook', toggleStorybook);
      }
    },
    [],
  );

  if (__DEV__) {
    const Storybook = require('../../.storybook/Storybook').default;

    if (showStorybook) {
      return <Storybook />;
    }
  }

  return children;
};
```
