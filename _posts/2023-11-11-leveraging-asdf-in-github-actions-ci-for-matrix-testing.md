---
layout: post
title: Leveraging the asdf version manager in Github Actions CI for matrix testing.
date: 2023-11-11
categories: ["asdf", "ci", "github actions", "matrix testing"]
---

The other day I faced myself with the task to add CI to a Neovim plugin. The code is open source and on Github so it made sense to just use Github Actions for it. I wanted to introduce [StyLua](https://github.com/JohnnyMorganz/StyLua) to not discuss code style issues. This tool has a [Github action](https://github.com/JohnnyMorganz/stylua-action), so it should be super easy to setup, right?

Well the thing is, this Github Action requires a Github token to run because it downloads the configured version of StyLua from [its releases page](https://github.com/JohnnyMorganz/StyLua/releases) via [Octokit](https://github.com/octokit). This doesn't sound very convenient to me because setting up a Github token for downloading something that's publicly available feels wrong. Hence I looked into other options to run it in CI.

The [`asdf` version manager](https://asdf-vm.com/) let's you easily describe your projects dependencies of certain tools via a `.tool-versions` file. I use this quite a lot and it makes a lot of sense for StyLua because we want to pin down the version of it for a project so everyone uses the same. Turns out, there are [`asdf` Github Actions](https://github.com/asdf-vm/actions) to also use `asdf` in CI 🎉

With a `.tool-versions` file setup:

```
stylua 0.18.2
```

You just need to add the following config to your repo:

```yml
# .github/workflows/ci.yml
name: CI

on: [pull_request]

jobs:
  StyLua:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install asdf & tools
      uses: asdf-vm/actions/install@v2
    - name: Run StyLua
      run: stylua --check .
```

So simple!

## Now to the Neovim tests

For the Neovim tests I looked around for examples in other plugins. What I found where different ways of downloading Neovim manually and making sure the Github Actions runner has its executable in its `PATH`. E.g.

```bash
mkdir -p /tmp/nvim
wget -q https://github.com/neovim/neovim/releases/download/nightly/nvim.appimage -O /tmp/nvim/nvim.appimage
cd /tmp/nvim
chmod a+x ./nvim.appimage
./nvim.appimage --appimage-extract
echo "/tmp/nvim/squashfs-root/usr/bin/" >> $GITHUB_PATH
```

I was about to do just the same when I thought about the approach I took for the StyLua job. Compared to what I was doing in the StyLua step this seemed a bit complicated to me, so I thought this could be done a bit easier with `asdf` :)

With a `.tool-versions` file setup:

```
neovim 0.9.4
```

You just need this:

```yml
name: CI

on: [pull_request]

jobs:
  Tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install asdf & tools
      uses: asdf-vm/actions/install@v2
    - name: Run tests
      run: ./tests/run.sh # Or however you run the tests ...
```

## Matrix testing

When you develop a plugin you want to make sure it runs with different versions of your runtime. It turns out that `asdf` is a really good tool for this as well and its Github Action has support for this:

```yml
name: CI

on: [pull_request]

jobs:
  Tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          # For all versions see https://github.com/neovim/neovim/tags
          - neovim: 0.8.3
          - neovim: 0.9.4
          - neovim: nightly
    name: "Test with Neovim ${{ matrix.neovim }}"
    steps:
    - uses: actions/checkout@v4
    - name: Install asdf & tools
      uses: asdf-vm/actions/install@v2
      with:
        tool_versions: |
          neovim ${{ matrix.neovim }}
    - name: Run tests
      run: |
        nvim --version
        ./tests/run.sh
```

## Conclusion

I'm really happy how easy and clean the setup for all of this turned out in the end.
