---
layout: post
title: SimpleCov terminal summary of test coverage
date: 2024-01-04
categories: ["ruby", "simplecov", "formatter"]
---

I recently had an issue with [SimpleCov](https://github.com/simplecov-ruby/simplecov) test coverage of my [RSpec](http://rspec.info/) tests in CI. The test coverage on my local machine was like expected but in CI, it was failing due to not meeting the coverage threshold. For that specific project I had no test coverage service like CodeCov set up yet, so I only saw a number that was lower than expected.

From the Javascript world, I'm used to the test coverage terminal report with [Jest](https://jestjs.io/)/[Istanbul](https://istanbul.js.org/) that looks like this:

![Screenshot of Jest](/assets/images/simplecov-formatter/jest.png)

If I had this for SimpleCov, it would be easy to track down what's going on. SimpleCov provides a simple formatter for that: `SimpleCov::Formatter::SimpleFormatter`. With that, you **could** get a really simple output of the files that are taken into account and their coverage. The SimpleCov README gives an example of the usage:

```ruby
# spec/spec_helper.rb
require 'simplecov'

SimpleCov.start 'rails' do
  formatter SimpleCov::Formatter::MultiFormatter.new([
    SimpleCov::Formatter::SimpleFormatter,
    SimpleCov::Formatter::HTMLFormatter
  ])
end

# ...
```

The problem here is, that the `SimpleFormatter` does not produce any output. This means you would need an adapted formatter, that uses the `SimpleFormatter` and takes its return value to `puts` it to the console:

```ruby
# spec/spec_helper.rb
require 'simplecov'

class SimpleCov::Formatter::SimpleFormatterTerminal
  def format(result)
    puts SimpleCov::Formatter::SimpleFormatter.new.format(result)
  end
end

SimpleCov.start 'rails' do
  formatter SimpleCov::Formatter::MultiFormatter.new([
    SimpleCov::Formatter::SimpleFormatterTerminal,
    SimpleCov::Formatter::HTMLFormatter
  ])
end

# ...
```

![Screenshot of SummaryFormatter](/assets/images/simplecov-formatter/summary_formatter.png)

This already helped me in finding the problem: my `SimpleCov` setup was wrong. I was missing the `rails` part.

```ruby
# I had this
SimpleCov.start do
# instead of this
SimpleCov.start 'rails' do
```

However, the output of the `SimpleFormatter` is not really easy to grasp. It's not aligned, not colored and the full paths are not really needed. Hence, I looked for better options.

I only found a gem that hasn't been updated in 5 years that might do the job: [simplecov-summary](https://github.com/inossidabile/simplecov-summary). In the end, [it's just a single file](https://github.com/inossidabile/simplecov-summary/blob/master/lib/simplecov-summary.rb), so I copied it over.

It only prints the SimpleCov groups though. As I already had copied it over to my project, I adapted it to also print the files and make some more changes. This is what came out of it:

![Screenshot of improved SummaryFormatter](/assets/images/simplecov-formatter/summary_formatter_improved.png)

It's not as nice as the output from Jest/Istanbul, but maybe I will adapt it even more in the future. I might also make a new gem out of it. But for now, this is the code (MIT licensed):

```ruby
require "colorize"

##
# Terminal summary formatter for SimpleCov.
#
# Adapted from https://github.com/inossidabile/simplecov-summary/blob/master/lib/simplecov-summary.rb
class SimpleCov::Formatter::SummaryFormatter
  def initialize(output = nil)
    @output = output || $stdout
  end

  def format(result) # rubocop:disable Metrics/MethodLength,Metrics/AbcSize
    @output.puts "SimpleCov stats:"
    @output.puts "----------------"

    name_length = (result.groups.keys + ["Total"]).map { |x| x.length }.max

    result.groups.each do |name, files|
      percentage = files.covered_percent.round(2)

      @output.puts "  #{name.rjust(name_length)}: #{percentage.to_s.rjust(5)}%"
        .colorize(color: color(percentage), mode: :bold)

      files
        .sort_by { |f| f.covered_percent }
        .each do |file|
          percentage = file.covered_percent.round(2)
          filename = file.filename.gsub(%r{^#{Dir.pwd}/}, "")

          @output.puts "  #{
                         name.rjust(name_length).gsub(/./, " ")
          }  #{percentage.to_s.rjust(5)}% #{filename}".colorize(color(percentage))
        end

      @output.puts ""
    end

    percentage = result.covered_percent.round(2)
    @output.puts "  #{"Total".rjust(name_length)}: #{percentage.to_s.rjust(5)}%"
      .colorize(color: color(percentage), mode: :bold)
    @output.puts ""
  end

  def color(percent)
    case percent
    when 90..100
      :green
    when 80..90
      :yellow
    else
      :red
    end
  end
end
```
