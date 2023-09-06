---
title: System Programming Concepts
author: Nikko Miu
date: 2022-05-22T16:00:00Z
toc: true
tags:
  - linux-programming-interface
---

Introduction to prerequisite concepts of Linux system programming.
These include the following:

- System calls
- Library functions
- Standard C library
- Issues related to portability

<!--more-->

## Alternative to `glibc`

There are alternative implementations of the C standard library that are not `glibc`.
These are a couple that look interesting:

- [musl](https://musl.libc.org/)
- [uclibc](https://www.uclibc.org/)

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
