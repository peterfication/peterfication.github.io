---
layout: post
title: Rails update with Neovim mergetool
date: 2024-01-18
categories: ["rails", "neovim", "mergetool"]
---

This is just a quick reminder of how to use the Neovim mergetool for Rails updates because I don't do it that often and then I forget it again.

```console
THOR_MERGE="nvim -d $1 $2" rails app:update
```

## Neovim mergetool keybindings

- `dp` (`diff put`): Put the hunk from the active window to the inactive window
- `do` (`diff obtain`): Get the hunk from the inactive window into the active window
