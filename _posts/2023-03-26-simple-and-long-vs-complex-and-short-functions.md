---
layout: post
title: Simple and long vs complex and short functions
date: 2023-03-26
categories: ["coding style"]
---

When writing code, I mostly start writing a function in a circuitous and longer way first, add tests along the way and in the end I try to shorten the implementation which should ideally be less complex.

Simple vs. complex in this context mean to me two things:

1. Is my future self able to easily understand what's going on?
2. Is a junior developer able to easily understand what's going on?

I really like elegant solutions, especially if they result in simple one-liners. For TypeScript, this often means an arrow function that consists of a single return without brackets.

```typescript
// Longer form with brackets
const isGreen = (color: string) => {
  return color === 'green'
}

// Shorter form without brackets
const isGreen = (color: string) => color === 'green'
```

Sometimes, however, it's just better to not shorten a function for the sake of being a one-liner, e.g. if the complexity increases. Recently, I was faced with such a decision where I went with the longer version in order to keep it simpler and to be able to easily reason about it in the future. The following two functions, which implement the same thing, are for determining whether the auth state should be refreshed or not.

## Simple, but longer version

This is my preferred version, as it is easy to grasp and easy to debug in the future.

```typescript
export const shouldRefresh = (
  authState: MaybeAuthState,
  authLoading: boolean | undefined,
): boolean => {
  if (
    // If the auth state is not present yet, we don't want to trigger a refresh
    !isAuthState(authState) ||
    // If the auth state is present, but the refresh token is null, we don't
    // want to trigger a refresh.
    authState.refreshToken === null ||
    // If the auth state is present, but the authLoading is true, we don't
    // want to trigger another refresh.
    authLoading
  ) {
    return false;
  }

  // If the auth state is present, but the authLoading is undefined, we
  // want to trigger a refresh just to be sure
  if (authLoading === undefined) {
    return true;
  }

  // If the auth state is expired, we want to refresh it.
  return isExpired(authState.expiresAt);
};
```

## Complex, but shorter version

This version looks elegant at first, but if you really need to know what's going on, you need to pause to really understand what's happening where.

```typescript
export const shouldRefreshComplex = (
  authState: MaybeAuthState,
  authLoading: boolean | undefined,
): boolean =>
  !(
    // If the auth state is not present yet, we don't want to trigger a refresh
    (
      !isAuthState(authState) ||
      // If the auth state is present, but the refresh token is null, we don't
      // want to trigger a refresh.
      authState.refreshToken === null ||
      // If the auth state is present, but the authLoading is true, we don't
      // want to trigger another refresh.
      authLoading
    )
  ) &&
  // If the auth state is present, but the authLoading is undefined, we
  // want to trigger a refresh just to be sure
  (authLoading === undefined ||
    // If the auth state is expired, we want to refresh it.
    isExpired(authState.expiresAt));
```
