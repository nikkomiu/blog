---
title: Debian Setup zRAM
date: 2024-02-05T02:00:00Z
tags:
  - debian
  - zram
---

For adding a swap space on the system, I prefer using zRAM for having a compressed memory space. This, in theory, should
be faster than using a traditional swap space since zRAM compresses the memory that it's using which would result in
lower disk space usage, and faster swapping from disk to memory.

<!--more-->

The steps for installing zRAM are pretty straightforward and there are plenty of options. This is just how I set up
zRAM for my machines.

## Install zRAM Setup

```bash
apt install systemd-zram-generator
```

## Configure zRAM

Edit `/etc/systemd/zram-generator.conf` to configure the size of the zram space:

```ini
[zram0]
zram-size = ram / 2
```

## Initialize zRAM

Reload the daemon and start the zram setup:

```bash
systemctl daemon-reload
systemctl start systemd-zram-setup@zram0.service
```

## Verify

zRAM has been configured properly if running `zramctl` returns the zRAM device:

```bash
zramctl
```
