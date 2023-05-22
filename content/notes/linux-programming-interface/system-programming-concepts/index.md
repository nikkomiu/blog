---
title: System Programming Concepts
author: Nikko Miu
date: 2020-01-26T23:11:13Z
draft: true
toc: true
tags:
- linux-programming-interface
---

TODO: PUT HEADING HERE

<!--more-->

## Determining `glibc` Version on System

You can determine the verison of `glibc` by:

```bash
/lib/glibc.so.6
```

You can also determine the version of `glibc` via the _(list dynamic dependencies)_ program:

```bash
ldd myprog | grep libc
```

## Determining `glibc` Version Programatically

You can determine the version of `glibc` via two constants that can be tested at compile time by `#ifdef`.
These variables will contain the major and minor version of `glibc`. In this example the `glibc` version is `2.12`:

```c
__GLIBC__ // 2
__GLIBC_MINOR__ // 12
```
