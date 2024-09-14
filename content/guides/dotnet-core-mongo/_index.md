---
date: 2024-09-09T00:00:00Z
title: .NET Core API
author: Nikko Miu
tags:
  - dotnet
  - mongodb
---

Let's build a .NET Core API with a MongoDB backend. The goal of this is to create a fully tested .NET API with multiple
models in MongoDB. Throughout this process we're going to follow recommended practices for writing .NET code. We will
also be bringing in packages and utilities to make using, writing, and testing our API easier.

<!--more-->

I am going to be building an app for tracking items at a given property. This will allow us to track the things that we
own, their value, and any other important information about them. The principles that we are going to cover are pretty
generic and can be applied to a wide variety of applications. So if you'd rather build an app with a different intent
feel free to do so.
