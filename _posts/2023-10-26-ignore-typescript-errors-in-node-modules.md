---
layout: post
title: Ignore Typescript errors in `node_modules`
date: 2023-10-26
categories: ["typescript", "errors", "CI"]
---

The other day I wanted to add a type check CI step to a ReactNative project. Besides the usual amount of type check errors you would expect from a project not running the type checker yet, I noticed that Typescript reported errors from the `node_modules` folder. This seemed a bit strange because I haven't seen it in other projects before. So I started digging.

The errors all came from [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/). The `tsconfig.json` should exclude the `node_modules` folder but this works only if you don't have a direct import statement to a file in an excluded folder. After some more digging, I realized that the test files were importing from a file inside the library instead of from the compiled library:

```typescript
import { setUpTests } from 'react-native-reanimated/src/reanimated2/jestUtils';

// instead of

import { setUpTests } from 'react-native-reanimated';
```

This meant that the actual Typescript files related to `jestUtils` were included in the compilation. And they didn't have the same `tsconfig.json` compiler options like my project which means that they have errors that are not reported to them but to me they are. So let's get rid of those falsy imports, right? Well, unfortunately not. The project is using version 2 (2.17.0) of `react-native-reanimated` and it can't update to version 3 easily for now I was told. However, in version 2 there is no proper export of the `jestUtils`. So no getting rid of the falsy imports :/

```
Module '"react-native-reanimated"' has no exported member 'setUpTests'. Did you mean to use 'import setUpTests from "react-native-reanimated"' instead? typescript (2614)
```

## How to ignore those errors then?

This was harder than expected I have to admit. There is no `.typescriptignore` file or any similar mechanism and the files are not in my project so I can't easily add `@ts-ignore` to them. Turns out I can! With [`patch-package`](https://github.com/ds300/patch-package) I can create a patch for these type errors and add a `@ts-nocheck` to all the problematic files in `node_modules/react-native-reanimated/...`.

Finally the type checker is pleased and the rest of project can rely on a CI step for the types now 🎉
