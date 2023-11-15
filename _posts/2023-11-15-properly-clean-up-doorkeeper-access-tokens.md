---
layout: post
title: Properly clean up Doorkeeper access tokens
date: 2023-11-15
categories: ["ruby", "doorkeeper", "openid-connect"]
---

In the Ruby world, one can use the [Doorkeeper gem](https://github.com/doorkeeper-gem/doorkeeper) to add an OAuth 2 provider to a web application and [the Doorkeeper OpenID connect gem](https://github.com/doorkeeper-gem/doorkeeper-openid_connect) in order to provide [OpenID connect](https://openid.net/developers/how-connect-works/) functionality.

When authenticating against Doorkeeper, access tokens are being created. These access tokens eventually expire and in case they have a refresh token, they can be used to get a new access and refresh token and the cycle continues. These acess tokens are saved in the database and [there are clean up tasks from the Doorkeeper gem to make sure the database does not fill up](https://github.com/doorkeeper-gem/doorkeeper/blob/9fc81d5009aef533ca8116285148cb6e37549ff2/lib/doorkeeper/rake/db.rake#L6). These tasks handle the following use cases:

- `revoked_tokens`: Tokens that have been revoked
- `expired_tokens`: Expired tokens that don't have a refresh token
- Same for grants

However, there is no task that deletes expired access tokens that were refreshed. So if your application runs long enough and you provide enough access tokens with refresh tokens, your database will eventually fill up by a lot anyways. Hence, it's necessary to create your own job for it if you don't care about old access tokens that were never refreshed e.g. older than 6 months or these expired and refreshed access tokens:

```ruby
# lib/tasks/doorkeeper.rb
namespace :doorkeeper do
  desc "Fully cleanup the Doorkeeper tables"
  task full_cleanup: :environment do
    DoorkeeperCleanUp.perform
  end
end
```

```ruby
# lib/doorkeeper_clean_up.rb
class DoorkeeperCleanUp
  ##
  # Increase the timeout for this job to 20 minutes, because it can take a long time.
  TEMPORARILY_EXTENDED_TIMEOUT = 20.minutes.to_i * 1000

  ##
  # This class performs additional clean ups to what the normal Doorkeeper cleanup does:
  # - Access tokens older than 6 months
  # - Expired and refreshed access tokens
  def perform
    ActiveRecord::Base.connection.execute("set statement_timeout to #{TEMPORARILY_EXTENDED_TIMEOUT}")

    delete_old_tokens
    delete_refreshed_and_expired_tokens
  ensure
    original_timeout =
      Rails.configuration.database_configuration.dig(Rails.env, "variables", "statement_timeout")

    ActiveRecord::Base.connection.execute("set statement_timeout to #{original_timeout}")
  end

  private

  ##
  # Delete all tokens that are older than 6 months, no matter what.
  def delete_old_tokens
    log_info("Delete Doorkeep::AccessToken that are older than 6 months")
    log_info("Doorkeep::AccessToken.count before: #{Doorkeeper::AccessToken.count}")

    Doorkeeper::AccessToken.where("created_at < '#{6.months.ago.iso8601}'").delete_all

    log_info("Deletion finished")
    log_info("Doorkeep::AccessToken.count after: #{Doorkeeper::AccessToken.count}")
  end

  ##
  # Join with the same table but via the previous_refresh_token column so that
  # all tokens are listed whose refresh token has been used to create a newer token,
  # so the refresh token can't be used anymore. This means these tokens are save to delete.
  REFRESHED_AND_EXPIRED_TOKENS = <<~QUERY.freeze
    refreshed_and_expired_tokens AS (
      SELECT oauth_access_tokens.id
      FROM oauth_access_tokens
      JOIN oauth_access_tokens AS refreshed_tokens ON oauth_access_tokens.refresh_token = refreshed_tokens.previous_refresh_token
      WHERE refreshed_tokens.id IS NOT NULL
        AND oauth_access_tokens.created_at + (INTERVAL '1 second' * oauth_access_tokens.expires_in) < '%<now>s'
        AND oauth_access_tokens.created_at + INTERVAL '1 day' < '%<now>s'
    )
  QUERY

  DELETE_REFRESHED_AND_EXPIRED_TOKENS = <<~QUERY.freeze
    WITH #{REFRESHED_AND_EXPIRED_TOKENS}
    DELETE FROM oauth_access_tokens
    WHERE id IN (SELECT id FROM refreshed_and_expired_tokens);
  QUERY

  ##
  # Delete all access tokens that have been refreshed already and that have been expired
  # and are at least one day old (just to be sure to not delete too much).
  def delete_refreshed_and_expired_tokens
    log_info("Delete refreshed and expired Doorkeep::AccessToken")
    log_info("Doorkeep::AccessToken.count before: #{Doorkeeper::AccessToken.count}")

    ActiveRecord::Base.connection.execute(
      format(DELETE_REFRESHED_AND_EXPIRED_TOKENS, now: Time.zone.now.iso8601)
    )

    log_info("Deletion finished")
    log_info("Doorkeep::AccessToken.count after: #{Doorkeeper::AccessToken.count}")
  end

  def log_info(message)
    Rails.logger.info("DoorkeeperCleanUp: #{message}")
  end
end
```

And the RSpec tests for it:

```ruby
# spec/lib/doorkeeper_clean_up_spec.rb
RSpec.describe DoorkeeperCleanUp do
  def create_refreshed_access_token(created_at = Time.zone.now)
    previous_access_token = create(
      :doorkeeper_access_token,
      expires_in: 7200,
      created_at: created_at
    )

    create(
      :doorkeeper_access_token,
      previous_refresh_token: previous_access_token.refresh_token
    )

    previous_access_token
  end

  let(:token_fresh) { create_refreshed_access_token }
  let(:token_expired_today) { create_refreshed_access_token(3.hours.ago) }
  let(:token_expired_yesterday) { create_refreshed_access_token(27.hours.ago) }
  let(:old_token) { create(:doorkeeper_access_token, created_at: 6.months.ago - 1.hour) }

  before do
    travel_to Time.zone.parse("2023-02-15 12:00:00")
    token_fresh
    token_expired_today
    token_expired_yesterday
    old_token
  end

  it "removes only the old tokens" do
    subject.perform

    expect(token_fresh.reload).to be_present
    expect(token_expired_today.reload).to be_present

    expect(Doorkeeper::AccessToken.find_by(id: token_expired_yesterday.id)).to be nil
    expect(Doorkeeper::AccessToken.find_by(id: old_token.id)).to be nil
  end
end
```
