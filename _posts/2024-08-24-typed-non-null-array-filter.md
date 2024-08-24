---
layout: post
title: Typed non-null array filter
date: 2024-08-24
categories: ["typescript"]
---

This post is a reminder for myself about how to filter out nulls in an array in Typescript in an easy way.

In Typescript, let's assume we have the following code:

```typescript
interface User {
  name: string;
}

const users = [null, { name: 'John' }, null, { name: 'Doe' }];
// The type users is (User | null)[]
```

We might have an external library that returns an array of elements that can be a thing or `null`. If you want to filter out the `null`'s, you will realize, Typescript is not happy with it:

```typescript
const filteredUsers = users.filter((user) => user !== null);

// The type of filteredUsers is still (User | null)[]
```

For proper filtering, we need a typeguard inside the filter:

```typescript
const filteredUsers = users.filter((user): user is User => user !== null);
// The type of filteredUsers is now User[]
```

The problem with this typeguard is that we need the type `User` for it. Sometimes, it might be hard or annoying to import the type that is coming from an external library or is generated code. There is a nicer way of doing this without the type by leveraging `NonNullable` and `typeof` with each element of the array:

```typescript
const filteredUsers = users.filter((user): user is NonNullable<typeof user> => user !== null);
// The type of filteredUsers is now User[]
```

The code for this is available here: https://github.com/peterfication/peterfication.github.io/blob/main/code/typescript/array-filter/
