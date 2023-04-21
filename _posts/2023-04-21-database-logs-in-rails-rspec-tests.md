---
layout: post
title: Database logs in Ruby on Rails RSpec tests
date: 2023-04-21
categories: ["rails", "rspec", "database", "logs"]
---

Sometimes you might create more complex database queries in Ruby on Rails and when running your tests, you want to inspect what's actually executed against the database schema. But the database logs in RSpec are hidden by default. This is a good thing because they can be pretty noisy. However, sometimes you might want to check the database logs for one specific test.

You could do this by enabling the database logger before this test and disabling it afterwards again (optionally) but you always have to remember the syntax for it then. An easier way is to create an RSpec meta tag for this, so this feature is a simple symbol away.


```ruby
# spec/support/database_log.rb

# With this helper one can get database logs for a single example by adding :log_db to its metadata.
#
# it "does something", :log_db do
#   ...
# end
RSpec.configure do |config|
  @log_db = false
  @default_logger = nil

  config.before do |example|
    @log_db = example.metadata[:log_db]

    if defined?(ActiveRecord::Base) && @log_db
      @default_logger = ActiveRecord::Base.logger
      ActiveRecord::Base.logger = Logger.new($stdout)
    end
  end

  config.after do |_example|
    ActiveRecord::Base.logger = @default_logger if defined?(ActiveRecord::Base) && @log_db
  end
end
```

You can then just add `:log_db` to your test metadata and the logs are shown:

```ruby
it "does something", :log_db do
  # ...
end
```

> NOTE: You have to require the support file explicitly or require all support files in your `spec_helper.rb`/`rails_helper.rb`.
