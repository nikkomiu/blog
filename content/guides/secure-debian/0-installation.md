---
title: OS Installation
date: 2024-02-05T06:00:00Z
author: Nikko Miu
tags:
  - debian
  - secure boot
  - installation
---

## Pre-Installation

My machine is configured (during installation) to have Secure Boot disabled. After completing the installation, I will
re-enable Secure Boot in the [Secure Boot section](./1-secure-boot.md) of this guide.

{{< callout type=warning title=Important >}}
If you already have an EFI partition on your machine and don't want to use it for the EFI of your
Debian installation, you'll either need to detach the disk that contains the EFI partition or fix the EFI partition
mapping in `/etc/fstab` after installation completes. For the latter, you can follow
[these instructions](./troubleshooting.md#fix-efi-partition-mapping).
{{</ callout >}}

## Installation

I have _manually_ set my disks up during installation as:

| Partition Type     | Size   | Mount Point | File System         |
| ------------------ | ------ | ----------- | ------------------- |
| EFI System         | 512M\* | `/boot/efi` | `EFI System/FAT 32` |
| Boot               | 512M\* | `/boot`     | `FAT32`             |
| LUKS-encrypted LVM | 100%   | `/`         | `ext4`              |

_**\*:** These are recommended sizes. I've gotten away with the EFI and boot partitions set to 300 MB, but you'll have to
do a bit of clean up earlier on in the process._
