---
title: NVIDIA Driver Installation
date: 2024-02-05T01:00:00Z
toc: true
tags:
  - debian
  - nvidia
  - nvidia driver
---

Installing NVIDIA drivers should go fairly smoothly after you
[set up Secure Boot](./1-secure-boot.md). This is (mostly) here just to show how
loading new kernel modules should go now that we have our Secure Boot MOK key enabled. This is because when we created
our Secure Boot keys we set up DKMS to find our kernel module signing keys.

<!--more-->

If you run into issues getting the driver installation working check the
[Secure Boot](./1-secure-boot.md) section again. What you are most likely to encounter
is an issue where the signing key used for the NVIDIA driver is not compatible with the signing keys that are in
Secure Boot.

## Add Package Channel

Add `software-common-properties` to update the repositories available:

```bash
sudo apt install software-properties-common -y
```

{{< callout type=note >}}
You can make these changes manually if you prefer instead of using `software-properties-common`.
{{</ callout >}}

Then add the `contrib`, `non-free` and `non-free-firmware` update channels to `apt`:

```bash
sudo apt-add-repository contrib non-free non-free-firmware
```

{{< callout type=note >}}
All of these are required for various components of the NVIDIA drivers to be installed.
{{</ callout >}}

## Install Linux Headers

To get DKMS to sign the NVIDIA driver, we need to install the `linux-headers` package. This package is based on CPU
architecture (`amd64` in my case):

```bash
apt install linux-headers-amd64
```

{{< callout type=note >}}
We should install the `linux-headers` package _before_ installing the NVIDIA driver. However, in practice, it seems that
if you install the NVIDIA driver first it just won't be signed or loaded into the kernel until the `linux-headers`
package is installed.
{{</ callout >}}

## Install NVIDIA Driver

Install the `nvidia-detect` package to determine which driver you should install:

```bash
apt install nvidia-detect
```

Run the `nvidia-detect` command to get the driver recommendation for your system:

```bash
nvidia-detect
```

```output
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

{{< callout type=note >}}
You'll probably get a warning about the NOUVEAU driver being loaded. We will reboot for these changes to take effect
after we make a couple of other changes.
{{</ callout >}}

## Add Modeset Kernel Flag

According to the [Arch Wiki](https://wiki.archlinux.org/title/NVIDIA) after we've installed the driver, we should add
the kernel flag for DRM. Edit the `/etc/kernel/cmdline` to add the flag:

```bash
nvidia_drm.modeset=1
```

After it's added to the `cmdline`, we need to update the initramfs for the changes to take effect (rebuilding the UKI):

```bash
update-initramfs -u -k all
```

Now that it's installed and configured **reboot** your system for the NVIDIA kernel module to take effect.

## Verify NVIDIA Driver is Loaded

Once your system comes back online, check that the NVIDIA driver has been properly loaded by running:

```bash
nvidia-smi
```

If you get output similar to the following, you're all set:

```output
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 525.147.05   Driver Version: 525.147.05   CUDA Version: 12.0     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce ...  Off  | 00000000:01:00.0  On |                  Off |
|  0%   36C    P5    55W / 480W |   1179MiB / 24564MiB |     32%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A      1399      G   /usr/lib/xorg/Xorg                848MiB |
|    0   N/A  N/A      1853      G   xfwm4                              10MiB |
|    0   N/A  N/A      1939      G   ...b/firefox-esr/firefox-esr      157MiB |
|    0   N/A  N/A      5943      G   ...RendererForSitePerProcess      160MiB |
+-----------------------------------------------------------------------------+
```

However, if you're getting an error that the NVIDIA couldn't communicate with the graphics card then something didn't
work correctly during the installation process.
