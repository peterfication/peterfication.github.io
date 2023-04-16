---
layout: post
title: TypeScript enums instead of 3-state booleans
date: 2023-04-16
categories: ["typescript", "enums", "react"]
---

When creating a boolean state in React (and probably in other environments that have to boot), it is tempting to just use `undefined` as the default. This then means that the state is not loaded yet. However, there is no explicit meaning in `undefined`, so you need to document it. And at every place you use it, you have to make sure that it's clear what `undefined` means at that place because you can't document the `undefined` type (you can just document the type using `undefined` and write in the comment what you intend it to be). When you're in this situation, you actually don't have a boolean anymore but you have state with 3 different values.

Let's consider the state `isAuthenticated`. At boot time, we don't know yet whether the user is authenticated. When the state is loaded we know that the user is either authenticated or not. In other parts of the code we want to act on these different possible states.

## 1. If `isAuthenticated` is a boolean

*The following code can be distributed across different files*

```typescript
/**
 * Some docs about this type ...
 *
 * undefined means that we init the value and we don't know whether it's true or false yet.
 */
type IsAuthenticated = boolean | undefined

// ...

const [isAuthenticate, setIsAuthenticated] = useState<IsAuthenticated>(undefined)

// ...

const doSomething = (isAuthenticated?: boolean) => {
  // Because of the function definition, we lost the information about what undefined means.
  // This is of course a problem with the function definition, because it should actually
  // be `(isAuthenticated: IsAuthenticated)`, but with a boolean value, this might easily
  // happen.
  //
  // So now we need to document here, what undefined actually means
  if (isAuthenticated === undefined) {
    // ...
  }
}
```

## 2. If `isAuthenticated` is an enum

*The following code can be distributed across different files*

```typescript
/**
 * Some docs about this type ...
 */
enum AuthenticatedState {
  /**
   * On startup, the authenticated state is unknown.
   */
  Init = 'INIT',
  /**
   * The user is authenticated.
   */
  Authenticated = 'AUTHENTICATED',
  /**
   * The user is not authenticated.
   */
  NotAuthenticated = 'NOT_AUTHENTICATED',
}

// ...

const [authenticatedState, setAuthenticatedState] = useState<AuthenticatedState>(AuthenticatedState.Init)

// ...

const doSomething = (authenticatedState: AuthenticatedState) => {
  // No need to document now. If a developer comes by, it's intuitive to understand
  // but it's also intuitive to check the documentation of `AuthenticatedState.Init`
  // for more information.
  if (isAuthenticated === AuthenticatedState.Init) {
    // ...
  }
}
```

## Not only for booleans

This actually does not only account for booleans, but also for other state that needs to be initialized. Let's assume you have an object that represents authentication information, e.g. `AuthState`:

```typescript
/**
 * Some information about AuthState ...
 */
interface AuthState {
  // Some fields
}
```

Implementation with `undefined` and `null`:

```typescript
/**
 * @see AuthState
 *
 * `undefined` means that the auth state is not loaded yet.
 * `null` means that there is no auth state.
 */
type MaybeAuthState = AuthState | undefined | null

// ...

if (authState === null) {
  // ...
}
```

Implementation with an enum.

```typescript
const AuthStateMode = {
  /**
   * This mode means that on startup, the auth state is not loaded yet.
   */
  Loading = 'LOADING',
  /**
   * This mode means that no auth state is available and the user is not authenticated.
   */
  NotAuthenticated = 'NOT_AUTHENTICATED',
}

/**
 * @see AuthState
 * @see AuthStateMode
 */
type MaybeAuthState = AuthState | AuthStateMode

// ...

if (authState === AuthStateMode.NotAuthenticated) {
  // ...
}
```

**As you can see in the latter example, the code is easier to grasp and no need for additional comments.**

---

[This pull request shows](https://github.com/peterfication/peak-tracker-app/pull/33/files) how I refactored a 3-state object with an enum.
