---
title: Plymouth Installation
date: 2024-02-05T00:00:00Z
tags:
  - debian
  - plymouth
  - boot
  - splash screen
---

As an (optional) nicety I like having Plymouth installed for showing a boot splash screen on the loader. What's
especially nice is that after this is enabled you can still press `Esc` to show the output (for debugging startup
issues).

<!--more-->

## Install Plymouth

```bash
apt install plymouth plymouth-themes
```

## Configure Plymouth Theme

List themes available for Plymouth:

```bash
plymouth-set-default-theme -l
```

Set the theme:

```bash
plymouth-set-default-theme -R bgrt
```

## Set Command Line Arguments

Edit the `/etc/kernel/cmdline` (or wherever you set command line arguments for the kernel)
and add the `quiet` and `splash` arguments to show the Plymouth splash screen:

```bash
root=... quiet splash
```

{{< callout type=note >}}
This assumes that you have previously followed the [Secure Boot](./debian-secure-boot.md) guide.
{{</ callout >}}

## Hide the Cursor on Startup

Hide the cursor on boot by setting the following (additional) kernel parameter:

```text
vt.global_cursor_default=0
```

To recover the cursor in TTY, run the following:

```bash
setterm -cursor on >> /etc/issue
```

## Update initramfs

For the changes to take effect, update your initramfs:

```bash
update-initramfs -u -k all
```
