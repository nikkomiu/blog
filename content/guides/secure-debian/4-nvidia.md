---
title: Debian NVIDIA Driver Installation
date: 2024-02-05T01:00:00Z
draft: false
prev: 3-zram
next: /guides/secure-debian/plymouth.md
tags:
  - debian
  - nvidia
  - nvidia driver
---

## Add Package Channel

Add `software-common-properties` to update the repositories available:

```bash
sudo apt install software-properties-common -y
```

> **Note:** You can make these changes manually if you prefer instead of using `software-properties-common`.

Then add the `contrib`, `non-free` and `non-free-firmware` update channels to `apt`:

```bash
sudo apt-add-repository contrib non-free non-free-firmware
```

> **Note:** all of these are required for various components of the NVIDIA drivers to be installed.

## Install NVIDIA Detect

Install the `nvidia-detect` package to determine which driver you should install:

```bash
apt install nvidia-detect
```

Run the `nvidia-detect` command to get the driver recommendation for your system:

```bash
nvidia-detect
```

```bash
Detected NVIDIA GPUs:
01:00.0 VGA compatible controller [0300]: NVIDIA Corporation TU104BM [GeForce RTX 2080 SUPER Mobile / Max-Q] [10de:1ed3] (rev a1)

Checking card:  NVIDIA Corporation TU104BM [GeForce RTX 2080 SUPER Mobile / Max-Q] (rev a1)
Your card is supported by all driver versions.
Your card is also supported by the Tesla drivers series.
Your card is also supported by the Tesla 470 drivers series.
It is recommended to install the
    nvidia-driver
package.
```

In my case, I'm installing the `nvidia-driver` package:

```bash
apt install nvidia-driver
```
