---
layout: post
title: Use GraphQL fragments for better types
date: 2023-04-20
categories: ["typescript", "graphql", "fragments"]
---

[On the GraphQL website](https://graphql.org/learn/queries/#fragments), fragments are described like this:

> "Fragments let you construct sets of fields, and then include them in queries where you need to."

[In the Apollo documentation](https://www.apollographql.com/docs/react/data/fragments/), the definition is similar:

> "A GraphQL fragment is a piece of logic that can be shared between multiple queries and mutations."

What both pages don't state is the advantage that the usage of fragments has on your resulting types when using GraphQL code generation.

## Working without a fragment

Let's assume we have the following query:

```graphql
query GetBooks {
  books {
    edges {
      node {
        id
        title
      }
    }
  }
}
```

When you run codegen for it you are able to get the data e.g. like this in a React component:

```typescript
  const { data, loading, error } = useGetBooksQuery();

  const books = data?.books?.edges?.map(edge => edge?.node) ?? [])
```

With `books` being of type:

```typescript
({
    __typename?: "Book" | undefined;
    id: string;
    title: string;
} | null | undefined)[]
```

And if you want to get this type to be able to pass it around easily, you need to jump through a pretty big loop (the `NonNullable`'s are necessary to remove the `null`'s and `undefined`'s):

```
type Book = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<Pick<GetBooksQueryHookResult, 'data'>['data']>['books']
      >['edges']
    >[number]
  >['node']
>;
```

Before providing a better way, why would you want this anyways? Well, if you want to pass around a books array to other functions, you want to be able to type them properly and provide them with a clean array of books without `undefined`'s. You could create a function to extract the books from the query for example (with a type guard to let TypeScript know that an item of the array is a book):

```typescript
export const getBooksExtractBooksFromData = (
  data: GetBooksQueryHookResult['data'],
): Book[] =>
  (data?.books?.edges?.map(edge => edge?.node) ?? []).filter(
    (book: unknown): book is Book =>
      book !== null &&
      typeof book === 'object' &&
      'id' in book &&
      'title' in book &&
  );
```

## Let's use a fragment to do the typing job for us

As it turns out, each fragment you use gets its own type. So when you change the above query to:

```graphql
query GetBooks {
  books {
    edges {
      node {
        ...GetBooksBook
      }
    }
  }
}

fragment GetBooksBook on Book {
  id
  title
}
```

You will get a type called `GetBooksBookFragment` that you can import and use instead of the `Book` type we specified above:

```typescript
// From the generated file
export type GetBooksBookFragment = { __typename?: 'Book', id: string, title: string };
```

---

[See here for a commit where I introduced a fragment to improve typing.](https://github.com/peterfication/peak-tracker-app/pull/37/commits/d873d3b201db7162dbf02c310b28efb1c6128979)
