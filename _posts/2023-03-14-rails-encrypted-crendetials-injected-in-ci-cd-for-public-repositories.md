---
layout: post
title: Inject Rails encrypted credentials in CI/CD for public repositories
date: 2023-03-14
categories: ["rails", "ci/cd", "environment variables"]
---

Rails offers a convenient feature called [encrypted credentials](https://edgeguides.rubyonrails.org/security.html#custom-credentials), which helps in keeping sensitive data safe from prying eyes. One reason behind it is that environment variables are not completely safe and [can potentially leak](https://towardsdatascience.com/leaking-secrets-in-web-applications-46357831b8ed) which would compromise your application's security. With encrypted credentials, there is only one environment variable left: the `RAILS_MASTER_KEY` that decrypts the credentials. If only the `RAILS_MASTER_KEY` leaks, then the attacker can't do anything with it because the attacker has no access encrypted credentials file (`config/credentials.yml.enc`). If, however, other environment variables like for example `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` leak, then the attacker can make use of it right away with no additional requirements.

If your code is not public, then this approach is fine. Every developer has a copy of the encrypted credentials on disk and the ones who are allowed to adjust them have the Rails master key. However, if your source code is public, simply committing the `config/credentials.yml.enc` file can be risky, as anyone can potentially access it. In this scenario, it's necessary to find an alternative solution. An alternative to this approach is to not commit the `config/credentials.yml.enc` file but to inject it in CI/CD just before you deploy or build your Docker image. If you deploy to fly.io for example it's enough to create this file from an environment variable in CI/CD. The Github Actions workflow could look like this:


```yml
name: Fly Deploy

# Only trigger, when the CI workflow succeeded
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    environment: main
    steps:
      - uses: actions/checkout@v3

      - name: Create credentials file and remove it from .gitignore
        env:
          CREDENTIALS_BASE64: {% raw %}${{ secrets.CREDENTIALS_BASE64 }}{% endraw %}
        run: |
          echo $CREDENTIALS_BASE64 | base64 -d > config/credentials.yml.enc
          sed -i '/config\/credentials.yml.enc/d' .gitignore

      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy to fly.io
        env:
          FLY_API_TOKEN: {% raw %}${{ secrets.FLY_API_TOKEN }}{% endraw %}
        run: flyctl deploy --remote-only
```

You will get the content for `CREDENTIALS_BASE64` with the following command in your Rails root directory:

```console
cat config/credentials.yml.enc | base64 | pbcopy
```

And you can set it directly via the Github CLI with this command:

```console
cat config/credentials.yml.enc | base64 | xargs gh secret set CREDENTIALS_BASE64 --body
```

> NOTE: base64 encoding the `credentials.yml.enc` file is probably not necessary because the file itself is already base64 encoded. But it also doesn't do any harm.
