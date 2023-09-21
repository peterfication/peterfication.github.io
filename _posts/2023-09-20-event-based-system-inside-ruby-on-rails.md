---
layout: post
title: Event based system in Ruby (on Rails)
date: 2023-09-20
categories: ["ruby", "events"]
---

In Rails, you can set up ActiveRecord callbacks to execute code, e.g. when a user is created. Let's say you want to create a notifier that let's you know when there is a new user and you want to do this asynchronously. The typical way one would do this in Rails would look like this:

```ruby
class User < ApplicationRecord
  after_commit on: :create do
    NewUserNotificationJob.perform_later({ id: })
  end
end
```

There are two possible downsides with this approach:

First, the job is now tied to the `User` model. In a small application, it might not really matter, but in a bigger application, you might want to separate areas and in this case another area would leak into the `User` model.

Second, if you want to have more jobs executed on such an event, this code grows inside the `User` model even though the `User` model doesn't really care about it.

## The event based approach

Another way would be to make your application event based. You could roll your own solution or you could use the [wisper](https://github.com/krisleech/wisper) or the [message_bus](https://github.com/discourse/message_bus) gem. In this post I will explore the message bus gem even though the wisper gem seems more suited at first sight. More on that later.

So with the `MessageBus` you would just publish an event like this:

```ruby
class User < ApplicationRecord
  after_commit on: :create do
    MessageBus.publish "/models/user/created", { id: }
  end
end
```

And then in an initializer for example you could subscribe to this event like this:

```ruby
MessageBus.subscribe "/models/user/created" do |message|
  NewUserNotificationJob.perform_later(message.data)
end
```

> NOTE: you have to subscribe in a place that gets executed on the startup of your application. Otherwise, the subscriber might not be subscribed yet when the event occurs. You can put this subscribe code anywhere in your application but you need to call it in an initializer.

This approach comes with the upside of having the job decoupled from the `User` model but with the downside that your application became a bit more complex now, especially regarding testing.

## How to test this

In the non-event-based approach you would probably just write a test that ensures that a job is enqueued when a user is created and you're done with it.

In the event-based approach, you run into multiple issues:

- The call to `MessageBus.publish` is executed asynchronously. So in order to test it, you have to implement a wait mechanism.
- You need to have an integration test that makes sure that your job is enqueued when a user is created.
- You need to make sure that for all subscribers, there is an appropriate publisher.

These two helper functions will help us in writing these tests:

```ruby
# e.g. spec/support/wait.rb

##
# Wait for a proc to be true in order to wait for
# asynchronous code to be executed.
#
# It will wait for a maximum of 1 second.
#
# @param proc [Proc] The proc to wait for.
def wait_for(proc)
  # Do an initial sleep to allow for other code to be executed.
  sleep 0.001

  x = 0
  while proc.call
    x += 1
    break if x > 1000

    sleep 0.001
  end
end

##
# This method waits for a job if a job is enqueued asynchronously
# e.g. via the MessageBus gem.
#
# @param job_class [Class] The job class to wait for.
def wait_for_job(job_class)
  wait_for(
    lambda do
      (ActiveJob::Base.queue_adapter.enqueued_jobs.select { |job| job[:job] == job_class }).empty?
    end,
  )
end

```

### Testing the `User` model

In the model test you create a test subscriber that collects the messages for the related topic, you execute the code that should produce messages and then you have to wait a bit until you can assert that the message has been published properly. It should be possible to extract this code into a custom matcher to simplify it down to what you would write in the non-event-based approach.

```ruby
# spec/models/user_spec.rb
RSpec.describe User do
  describe "callbacks" do
    describe "after_commit_on_create" do
      it "publishes a message" do
        messages = []

        MessageBus.subscribe "/models/user/created" do |message|
          messages << message.data
        end

        user = create(:user)

        wait_for(-> { messages.any? })
        expect(messages).to eq([{ "id" => user.id }])
      end
    end
  end
end
```

### Writing an integration test for it

In a new folder structure in your `spec` folder you can put the integration test for your events:

```ruby
# e.g. spec/message_bus/models/user/created_spec.rb
RSpec.describe "MessageBus - /models/user/created" do
  it "enqueues a NewUserNotificationJob" do
    expect do
      MessageBus.publish "/models/user/created", { id: "some-id" }
      wait_for_job(NewUserNotificationJob)
    end.to(
      have_enqueued_job(NewUserNotificationJob).with({ "id" => "some-id" }),
    )
  end
end
```

### Checking that each subscriber has a publisher

This is a bit more complicated. You can get all the subscribe calls while booting your application but the publish calls will not be known by starting your application. Hence, the easiest approach is to just search for the code in your application and compare it with command line utilities:

```bash
# e.g. scripts/message_bus_check.sh


#!/bin/bash

# This script checks that all subscribers are being published to.
#
# If you subscribe to a new message that has no publisher yet, this script will fail.

publishers=$(find app config lib -type f -name "*.rb" -exec grep -oP '(?<=MessageBus\.publish ")[^"]*|(?<=MessageBus\.publish\(")[^"]*' {} \;)
subscribers=$(find app config lib -type f -name "*.rb" -exec grep -oP '(?<=MessageBus\.subscribe ")[^"]*|(?<=MessageBus\.subscribe\(")[^"]*' {} \;)

if [[ $publishers == *"$subscribers"* ]]; then
  echo "All good"
  exit 0;
else
  echo "There are subscribers that are not being published to:"
  echo "$publishers" > temp_output1.txt
  echo "$subscribers" > temp_output2.txt
  diff temp_output1.txt temp_output2.txt
  rm temp_output1.txt temp_output2.txt
  exit 1;
fi
```

This script can also be executed in CI of course.

## Why not use the wisper gem?

The wisper gem seems to be more suited to what we want to accomplish: events inside a single Ruby application. The message bus gem can do way more and can also receive events from a client or could distribute events between Ruby applications. So we just used a small feature set of what the message bus gem provides.

However, the message bus gem has an interface that decouples the two places in the call completely. It doesn't matter where you publish a message or where you subscribe to a message. In a future post I might implement the same thing with the wisper gem to be able to compare both approaches.

> NOTE: [This PR](https://github.com/peterfication/peak-tracker-auth/pull/152) contains a very basic implementation of what the blog post described.
