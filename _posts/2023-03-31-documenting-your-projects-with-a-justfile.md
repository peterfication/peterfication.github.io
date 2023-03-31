---
layout: post
title: Documenting your projects with a Justfile
date: 2023-03-31
categories: ["documentation", "just"]
---

In different programming languages / frameworks / tools there are different ways to define commands and there are different ways to document them. For example In Ruby you would create [Rake](https://github.com/ruby/rake) or [Thor](https://github.com/rails/thor) tasks, in Javascript/TypeScript you would define scripts in the `package.json` file and in Elixir you would create [Mix](https://hexdocs.pm/mix/1.12.3/Mix.Task.html) tasks.

Then there are often other commands you might want to run from time to time, e.g. commands related to your deployment service like fly.io. Defining them in a language specific way is doable but sometimes feels not right. Sometimes you have projects that contain for example Ruby tasks and Javascript scripts or you switch between projects and you have to remember which command runner to call.

Also, you might want to document your commands and list them for an overview. Some language specific tools provide you with a way of documenting tasks and even listing them. Often they list every possible task, also the ones that are provided by a certain framework and you loose some oversight quickly. In both cases you might start adding documentation about your project commands to your `README`. This documentation then has to be kept in sync with your actual commands.

In some projects I worked on there were [`Makefiles`](https://www.gnu.org/software/make/manual/make.html) used to define and document commands. However, `Makefiles` were not created for running tasks but as a utility *"... which determines automatically which pieces of a large program need to be recompiled, and issues the commands to recompile them"*. So you might run into weird cases where a command might not execute  because `make` decides not to or you have set it up in a certain way.


## [`just`](https://github.com/casey/just) to the rescue

> `just` is a handy way to save and run project-specific commands.

`just` is exactly meant as a way to solve the issues described above. You define all your important commands in a `Justfile` (similar to a `Makefile`) and you optionally document them. In the `README` you only need a hint to the usage of `just` and that's it. All your commands are easy to discover without out-of-date documentation.

And if you define the default command to be `just --list`, all you need to do is to run `just` and you know what's possible in the project you want to work on.

![just](/assets/images/just/justfile.png)

![just](/assets/images/just/just-list.png)
