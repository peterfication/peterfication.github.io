---
layout: post
title: Ruby Concurrent::Future with ActiveRecord / PostgreSQL
date: 2023-09-14
categories: ["ruby", "concurrency", "activerecord", "postgresql"]
---

In Ruby, you can achieve concurrency by manually using [`Threads`](https://www.rubyguides.com/2015/07/ruby-threads/) or you can use a higher level library like [`concurrent-ruby`](https://github.com/ruby-concurrency/concurrent-ruby). In any case, if you work with database connections eg. via ActiveRecord to PostgreSQL, you need to think about what to do with them.

When I started using `Concurrent::Future`, my goal was, in order to avoid this problem, to not do any database calls in them. But as the code base grows, you might easily execute database calls in some function call because some other developer was not aware of it and it wasn't caught in code reviews. Eventually, you start leaking connections and your database is struggling to keep up. Some of the errors that could be the result of this issue:

```
ActiveRecord::QueryCanceled
PG::QueryCanceled: ERROR: canceling statement due to statement timeout (ActiveRecord::QueryCanceled)
CONTEXT: while updating tuple (x,y) in relation "some_table"

PG::QueryCanceled
ERROR: canceling statement due to statement timeout (PG::QueryCanceled)
CONTEXT: while updating tuple (x,y) in relation "some_table"
```

```
ActiveRecord::ConnectionNotEstablished
connection to server at "x.x.x.x", port 5432 failed: FATAL: remaining connection slots are reserved for non-replication superuser connections (ActiveRecord::ConnectionNotEstablished)

PG::ConnectionBad
connection to server at "x.x.x.x", port 5432 failed: FATAL:  remaining connection slots are reserved for non-replication superuser connections (PG::ConnectionBad)
```

```
ActiveRecord::StatementInvalid
PG::TooManyConnections: ERROR: remaining connection slots are reserved for non-replication superuser connections (ActiveRecord::StatementInvalid)
CONTEXT: parallel worker

PG::TooManyConnections
ERROR: remaining connection slots are reserved for non-replication superuser connections (PG::TooManyConnections)
CONTEXT: parallel worker
```

```
ActiveRecord::ConnectionTimeoutError:
could not obtain a database connection within 5.000 seconds
```

When these errors started to happen, I cleaned up some code to not call the database anymore. But I felt like this was not enough. I wanted to prevent this from happening again so I started to research a bit more about the use of `Concurrent::Future` together with `ActiveRecord`. That's when I found this [blog article (Ruby Threads and ActiveRecord Connections)](https://jakeyesbeck.com/2016/02/14/ruby-threads-and-active-record-connections/) ([Reddit post with additional comments](https://www.reddit.com/r/ruby/comments/4637u0/ruby_threads_and_managing_activerecord_connections/)) about the issue I was facing. There the author explains that in order to avoid database connection issues in `Threads`, you need to wrap its block in a `ActiveRecord::Base.connection_pool.with_connection` block.

For the usage of `Concurrent::Future` this will look like this:

```ruby
Concurrent::Future.execute do
  ActiveRecord::Base.connection_pool.with_connection do
    # Do some stuff ...
  end
end
```
