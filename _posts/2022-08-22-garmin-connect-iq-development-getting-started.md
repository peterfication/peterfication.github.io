---
layout: post
title: Garmin Connect IQ development - Getting started
date: 2022-08-22
categories: ["garmin"]
---

I recently got a Garmin Smartwatch and I thought it would be interesting to get to know it as well from a development platform perspective. First, I tried to find resources and examples online to get a grasp of Garmin Connect IQ development. This is how my [Awesome List Garmin Connect IQ](https://github.com/peterfication/awesome-garmin-connect-iq) started.

While searching for how to get started, I came across [this post from 2018 from Joshua Miller](https://medium.com/@JoshuaTheMiller/making-a-watchface-for-garmin-devices-8c3ce28cae08) which explains how to get started with Garmin Connect IQ development back then with Eclipse. It seemed simple so I was eager to create a simple Garmin Watchface myself. However, I wasn't looking forward to install Eclipse ...

To my pleasant surprise, while reading through the install steps on the Garmin IQ website, I found out that Eclipse is a thing of the past when talking about Garmin Connect IQ development. Now, everything is set up to work with Visual Studio Code. Event though I mostly work with Vim, this is ok for a small project, at least for starting with it.

I have to say, Garmin did a very good job on their documentation and developer experience! This means, my article is not really long.

1. Install VS Code
2. Walk through the ["Getting started" page](https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started) from Garmin
3. Walk through the ["Your first app" page](https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/) from Garmin

And then you already have a simulated watchface on your machine.

![Garmin Simulator Watchface](/assets/images/garmin/garmin-simulator-watchface-basic.jpg)

One final tip for getting started: The location on a Mac of the official samples from the SDK are here:

```
~/Library/Application Support/Garmin/ConnectIQ/Sdks/{YOUR_CURRENT_SDK}.
```
