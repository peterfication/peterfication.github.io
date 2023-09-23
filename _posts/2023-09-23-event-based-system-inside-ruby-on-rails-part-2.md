---
layout: post
title: Event based system in Ruby (on Rails) - Part 2
date: 2023-09-23
categories: ["ruby", "events"]
---

[In my previous post about an "event based system in Ruby (on Rails) - Part 1"](https://www.petergundel.de/ruby/events/2023/09/20/event-based-system-inside-ruby-on-rails.html) I stated that I like the way of using the [MessageBus gem](https://github.com/discourse/message_bus) more than the ergonomics of the [Wisper gem](https://github.com/krisleech/wisper). In the this blog post I'd like to show how one would achieve the same thing with Wisper and I might have changed my opinion on this.

The `User` model will be adjusted to this:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  include Wisper::Publisher

  after_commit on: :create do
    broadcast(:models_user_created, id)
  end
end
```

The initializer will look like this:

```ruby
# e.g. config/initializer/wisper.rb
Rails.application.reloader.to_prepare do
  Wisper.subscribe(
    Class.new do
      def models_user_created(user_id)
        NewUserNotificationJob.perform_later({ "id" => user_id })
      end
    end.new,
    scope: User, on: :models_user_created,
  )
end
```

As you can see, the changes are nearly the same. And if you consider that the MessageBus gem can do much more than this, it might be overkill to what I wanted to achieve.

## A cleaner initializer

You could also achieve a cleaner initializer if you add a listener method to the `NewUserNotificationJob` and just add this listener in the initializer:

```ruby
# e.g. config/initializer/wisper.rb
Rails.application.reloader.to_prepare do
  Wisper.subscribe(NewUserNotificationJobV2, scope: User, on: :models_user_created)
end
```

```ruby
# app/jobs/new_user_notification_job.rb
class NewUserNotificationJob < ApplicationJob
  def self.models_user_created(user_id)
    NewUserNotificationJobV2.perform_later({ "id" => user_id })
  end

  # Rest of the job implementation ...
end
```

> NOTE: [This PR](https://github.com/peterfication/peak-tracker-auth/pull/154) contains a very basic implementation of what the blog post described.
