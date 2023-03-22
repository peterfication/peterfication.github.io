---
layout: post
title: Git jump in Neovim with Telescope
date: 2023-03-22
categories: ["git", "neovim", "telescope"]
---

When [Git 2.40 was released](https://github.com/git/git/blob/master/Documentation/RelNotes/2.40.0.txt) on 12th March 2023, [Github published again a blog article about the highlights of this release](https://github.blog/2023-03-13-highlights-from-git-2-40/).
One aspect that truly piqued my curiosity and excitement was the mention of `git jump`! As the Github blog article explains it:

> `git jump` is an optional tool that ships with Git in its `contrib` directory. `git jump` wraps other Git commands, like `git grep` and feeds their results into Vim’s quickfix list. This makes it possible to write something like `git jump grep foo` and have Vim be able to quickly navigate between all matches of “foo” in your project.

The new thing in Git 2.40 from the release notes:

> "git jump" (in contrib/) learned to present the "quickfix list" to its standard output (instead of letting it consumed by the editor it invokes), and learned to also drive emacs/emacsclient.

First of all, before reading this article I wasn't aware of `git jump` at all. It's a pretty nice command! [A few months ago I quickly hacked together a Ruby script to achieve the same thing](https://github.com/axkirillov/easypick.nvim/issues/6#issuecomment-1318612088) but with worse performance of course.

Second of all, having standard output for the `git jump` command enables easy usage in other tools. I will present one such use case in this blog article.

---

My daily code editor is [Neovim](https://neovim.io/) with heavy usage of [Telescope](https://github.com/nvim-telescope/telescope.nvim). One of all the amazing builtin pickers of Telescope is a picker for jumping to files that are listed via `git status`. This is nice, but it's missing one important part: jumping to specific hunks. If you have a lot of changes in one file, the builtin `git status` does not really help.

{:.text-center.mt-6}
![Git status in Telescope](/assets/images/git-jump/git-status.jpg)
*`git status` only shows the file once, even if there are 3 different hunks.*

## Enter `git jump` or more precisely `git jump diff`:

As `git jump` lives in `git/contrib`, it's not available by default. In order to use it, you can simply create an alias in your Git config for it.

```
# Alias if you're on a Mac and you're using Homebrew to install Git
[alias]
  jump = "!$(brew --prefix git)/share/git-core/contrib/git-jump/git-jump"
```

```
$ git jump
usage: git jump [--stdout] <mode> [<args>]

Jump to interesting elements in an editor.
The <mode> parameter is one of:

diff: elements are diff hunks. Arguments are given to diff.

merge: elements are merge conflicts. Arguments are ignored.

grep: elements are grep hits. Arguments are given to git grep or, if
      configured, to the command in `jump.grepCmd`.

ws: elements are whitespace errors. Arguments are given to diff --check.

If the optional argument `--stdout` is given, print the quickfix
lines to standard output instead of feeding it to the editor.
```

{:.mt-6.mb-6}
With the `--stdout` option added, we get a quickfix style formatted list of Git hunks that we can use in scripts. Because Telescope is easy extensible, we are able to write a function that runs `git jump` for us and presents us with a Telescope picker. Here is the Lua code for it:

```lua
local git_hunks = function()
  require("telescope.pickers")
    .new({
      finder = require("telescope.finders").new_oneshot_job({ "git", "jump", "--stdout", "diff" }, {
        entry_maker = function(line)
          local filename, lnum_string = line:match("([^:]+):(%d+).*")

          -- I couldn't find a way to use grep in new_oneshot_job so we have to filter here.
          -- return nil if filename is /dev/null because this means the file was deleted.
          if filename:match("^/dev/null") then
            return nil
          end

          return {
            value = filename,
            display = line,
            ordinal = line,
            filename = filename,
            lnum = tonumber(lnum_string),
          }
        end,
      }),
      sorter = require("telescope.sorters").get_generic_fuzzy_sorter(),
      previewer = require("telescope.config").values.grep_previewer({}),
      results_title = "Git hunks",
      prompt_title = "Git hunks",
      layout_strategy = "flex",
    }, {})
    :find()
end

vim.keymap.set("n", "<Leader>gh", git_hunks, {})
```

{:.text-center.mt-6.mb-6.text-xl}
-- With this, you can enjoy the power of Telescope with `git jump` :) --

{:.text-center}
![Git jump in Telescope](/assets/images/git-jump/git-hunks.jpg)
*`git jump diff` shows the file 3 times, once for each hunk.*

## Remarks

- New files won't show up with `git jump`.
- The "Grep Preview" does not show Git colors but only normal color highlighting.
