---
title: Debian Setup zRAM
date: 2024-02-05T02:00:00Z
draft: false
tags:
  - debian
  - zram
---

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
