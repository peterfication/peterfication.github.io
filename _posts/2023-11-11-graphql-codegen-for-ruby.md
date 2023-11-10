---
layout: post
title: GraphQL codegen for Ruby
date: 2023-11-11
categories: ["graphql", "codegen", "ruby"]
---

[Code generation is a main ingredient when working with GraphQL](https://the-guild.dev/graphql/codegen). There are a lot of different [plugins and presets](https://the-guild.dev/graphql/codegen/plugins) for the different languages.

Code generation makes sense when you consume a GraphQL API and want to have type safety in the consuming project. Most of the time GraphQL APIs are only consumed by clients. Ruby is neither a typical client language nor does it have good support for types. So why would you need it then?

In GraphQL, you can do [schema stitching](https://the-guild.dev/graphql/stitching) or setup [federation](https://www.apollographql.com/docs/federation/) to combine multiple GraphQL APIs. But let's say you already have a Ruby GraphQL API and you have a new upstream service that provides a GraphQL API on its own. The upstream service is not handling authentication or authorization so you can get everything from it. The user of your main GraphQL API only should see the things belonging to this user. That's why you hook up the upstream GraphQL API as a field to an already authorized field in your main GraphQL API.

Let's have an example:

```graphql
query GetCars {
  cars { # <-- This just returns cars of the current user via the main GraphQL API
    stats { # <-- This is requested from the upstrem service via a DataLoader
      totalMilage
    }
  }
}
```

But now, you need to create all these types and descriptions again, so they are properly exposed to the client. Wouldn't it be nice to automate this step? **This is exactly what GraphQL codegen can do for Ruby**.

Potentially, this could be done via a generic [GraphQL codegen plugin](https://the-guild.dev/graphql/codegen/docs/custom-codegen). For now, I created a custom GraphQL codegen plugin in an example repo to demonstrate how it can work. You can see the current status in this repo: [peak-tracker-ruby-graphql-codegen](https://github.com/peterfication/peak-tracker-ruby-graphql-codegen)
