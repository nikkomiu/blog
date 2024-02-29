---
title: Debian NVIDIA Driver Installation
date: 2024-02-05T01:00:00Z
tags:
  - debian
  - nvidia
  - nvidia driver
---

Installing NVIDIA drivers should go fairly smoothly after you
[set up Secure Boot]({{< relref "guides/secure-debian/1-secure-boot" >}}). This is (mostly) here just to show how
loading new kernel modules should go now that we have our Secure Boot MOK key enabled. This is because when we created
our Secure Boot keys we set up DKMS to find our kernel module signing keys.

<!--more-->

If you run into issues getting the driver installation working check the
[Secure Boot]({{< relref "guides/secure-debian/1-secure-boot" >}}) section again. What you are most likely to encounter
is an issue where the signing key used for the NVIDIA driver is not compatible with the signing keys that are in
Secure Boot.

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
