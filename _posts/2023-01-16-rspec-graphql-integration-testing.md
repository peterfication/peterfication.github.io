---
layout: post
title: RSpec GraphQL integration testing
date: 2023-01-16
categories: ["ruby", "rspec", "graphql"]
---

While working on different Ruby projects, I noticed one pattern when writing integration tests for GraphQL: You write your query in a multiline string, get the response, parse it (probably with a helper) and write some expectations, maybe even expecting a whole multi-dimensional `Hash`. This could then look something like this:

```ruby
RSpec.describe "Query.currentUser" do
  subject(:query_result) { MySchema.execute(query, context: context).as_json }

  let(:user) { create(:user) }
  let(:context) { { current_user: user } }
  let(:query) { <<~GRAPHQL }
      query {
        currentUser {
          id
          email
        }
      }
    GRAPHQL
  let(:expected_result) do
    { "data" => { "currentUser" => { "id" => user.id.to_s, "email" => user.email } } }.as_json
  end

  it "returns the current user" do
    expect(query_result).to eq(expected_result)
  end
end
```

For small queries, this is fine. But for big queries (and hence, big responses) this gets unhandy very fast. This is subjective of course ;)

Another issue is that we can't leverage the GraphQL language server while writing/maintaining these integration tests.

## A solution to this

I decided to use this opportunity to write my first gem: [`rspec-graphql-integration`](https://github.com/peterfication/rspec-graphql-integration)

This gem tries to improve this situation by moving the query and the response in their own files with a proper file type. This way, the integration test files are smaller and can focus on mocking data/instances. Also, the GraphQL language server will give you autocompletion/linting in your GraphQL files (if you've set up your editor for it).

The simple integration test from above then looks like this:

_`current_user_spec.rb`_

```ruby
RSpec.describe "Query.currentUser" do
  let(:user) { create(:user) }
  let(:context) { { current_user: user } }
  let(:response_variables) { { user_id: user.id, user_email: user.email } }

  it { is_expected.to match_graphql_response }
end
```

_`current_user.graphql`_

```graphql
query {
  currentUser {
    id
    email
  }
}
```

_`current_user.json`_

```json
{
  "data": {
    "currentUser": {
      "id": "{{user_id}}",
      "email": "{{user_email}}"
    }
  }
}
```
