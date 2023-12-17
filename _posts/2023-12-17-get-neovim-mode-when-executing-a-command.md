---
layout: post
title: Get Neovim mode when executing a command
date: 2023-12-17
categories: ["neovim", "lua", "hack"]
---

I recently started to contribute to [text-case.nvim](https://github.com/johmsalas/text-case.nvim). One feature is a command called `Subs` which will search and replace all ocurrences of all possible casings of a word in a file or a viusual range with another word. This is a lot like [vim-abolish](https://github.com/tpope/vim-abolish) but with the additional feature of using the LSP, if a language server is available.

The intended way to use the `Subs` command is using it like you would use the normal `substitute` command. So instead of `:s/lorem/ipsum`, you would type `:Subs/lorem/ipsum`. As with the normal `substitute` command, the `Subs` command should also cope with visual line and visual block mode. And here is where the challenge starts: when you execute a command with `:` in visual line or visual block mode, the mode changes to normal mode. So you have no immediate way to find out the mode you were in just before executing the command. So in the `Subs` command, we cannot do this:

```lua
function some_command(opts, preview_ns, preview_buffer)
  -- This is NOT possible for commands executed with `:`
  local mode = vim.api.nvim_get_mode()

  -- ...
end

vim.api.nvim_create_user_command(
  "SomeCommand",
  some_command,
  { nargs = "?", range = "%", addr = "lines", preview = some_command }
)
```

**There is a workaround though!**

What we can do first is to check the `count` option. `-1` means "no range" which we can interpret as "the command was executed from normal mode" (if we don't care about other modes than normal mode and visual modes).

```lua
function some_command(opts, preview_ns, preview_buffer)
  if opts.count == -1
    -- The command was executed neither in visual line nor in visual block mode

    -- ...
  else
    -- The command was executed in a visual mode

    -- ...
  end
end
```

For the `Subs` command, we are interested in whether the visual mode was either visual line mode or visual block mode so that we know exactly what characters were selected. For that, we can check the `<` and `>` marks of the current buffer that store the last visual selection for what was selected. The second value of the marks is the column. For a visual block selection it's a "normal" number, meaning something that you would expect from a visual block selection e.g. `115`. For the visual line mode though, it's a very very large number. On my machine with Neovim 0.9, it was `2147483647`. This means, we can check the column part of the marks for a number higher than e.g. `1000000`. Of course this would fail for the use case where you actually have a line that long. But we don't care about this use case.

```lua
function some_command(opts, preview_ns, preview_buffer)
  if opts.count == -1
    -- The command was executed neither in visual line nor in visual block mode

    -- ...
  else
    -- The command was executed in a visual mode

    -- preview_buffer indicates the buffer to be modified
    local current_buffer = (preview_ns ~= nil) and preview_buffer or vim.api.nvim_get_current_buf()

    local range_start_mark = vim.api.nvim_buf_get_mark(current_buffer, "<")
    local range_end_mark = vim.api.nvim_buf_get_mark(current_buffer, ">")

    local visual_mode = "\22" -- Visual block mode as default
    if range_start_mark[2] > 1000000 or range_end_mark[2] > 1000000 then
      -- If one of the mark has a huge value, it means that "the range
      -- goes until the end of the line" aka visual line mode
      visual_mode = "v" -- Visual line mode
    end

    -- ...
  end
end
```

> Disclaimer: I'm still pretty new to Neovim plugin development. There might be a better way than this!
