---
layout: post
title: Heroku CLI meets fzf
date: 2017-08-14
categories: ["heroku", "fzf"]
---

While working with tmux and [fzf](https://github.com/junegunn/fzf) I came across another interesting fzf use case: Use a fuzzy finder to simplify the use of the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).

Imagine you have some apps on Heroku and now and then you want to tail their logs or you want to ssh into one of them. There is one problem with that: You always have to memorize the exact app name in order to run `$ heroku logs -t -a awesome-app-staging`. Or was it `staging-awesome-app`? Well, you see the problem with that. Another solution might be to define an alias for every app. However, this doesn’t scale too well…

**But what about a fuzzy finder for your Heroku apps in the CLI? 🤖**

When I switched to vim, I first heard about fzf and began using it with joy to open my files. I recently started using tmux and there fzf can be a great help as well. [This stackoverflow post](https://stackoverflow.com/questions/37730996/tmux-script-for-fast-window-switching-with-fzf-tmux-gives-me-the-wrong-options) showed me how to use fzf for switching between tmux windows. I also used this approach to switch between tmux sessions (and shared the solution in the linked stackoverflow post). This eventually lead to the idea of using fzf in combination with the Heroku CLI.

![Heroku CLI meets fzf](/assets/images/heroku-fzf.webp)

The magic command for this is:

```bash
$ heroku apps --all | grep '(' | sed 's/ .*$//' | fzf --header='Select the app you want to tail the logs' | xargs heroku logs -t -a
```

Of course you should create aliases for that:

```bash
alias heroku-logs="heroku apps --all | grep '(' | sed 's/ .*$//' | fzf --header='Select the app you want to tail the logs' | xargs heroku logs -t -a"
alias heroku-bash="heroku apps --all | grep '(' | sed 's/ .*$//' | fzf --header='Select the app you want to bash into' | xargs heroku logs -t -a"
```

## Step by step explanation

The first command should be self explanatory. It gives you a list of all your apps on Heroku. But the format here is important! The command returns two lists. Your own apps and the apps on which you are a collaborator:

```bash
$ heroku apps --all

=== peterfication@example.com Apps
obscure-tundra-15966 (us)
nameless-basin-19036 (eu)

=== Collaborated Apps
shrouded-fortress-18816 (eu)          someone-else@example.com
```

First, we remove all the lines by piping the output to grep. Every line with an app contains brackets so we use the brackets to filter the lines.

```bash
$ heroku apps --all | grep '('

obscure-tundra-15966 (us)
nameless-basin-19036 (eu)
shrouded-fortress-18816 (eu)          someone-else@example.com
```

Next, we have to ensure that we only take the app name with nothing else. So we remove everything after the app name, starting with the empty space.

```bash
$ heroku apps --all | grep '(' | sed 's/ .*$//'

obscure-tundra-15966
nameless-basin-19036
shrouded-fortress-18816
```

This is a nice list we can pipe to fzf. The result of fzf is then piped to the heroku command that we want to execute:

```bash
$ heroku apps --all | grep '(' | sed 's/ .*$//' | fzf --header='Select the app you want to bash into' | xargs heroku logs -t -a
```

After selecting the desired app with fzf, the command finally expands for example to:

```bash
$ heroku logs -t -a shrouded-fortress-18816
```

💪
