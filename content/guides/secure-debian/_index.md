---
date: 2024-02-05T00:00:00Z
title: Secure Debian Installation Guide
author: Nikko Miu
tags:
  - debian
  - uefi
  - secure boot
---

A step-by-step guide to installing Debian with Secure Boot, custom signed modules,
LUKS Full Disk Encryption with TPM2 auto-unlock, and installation of the DKMS
NVIDIA driver. There are also a few other random tidbits along the way that may
prove to be useful depending on your specific needs.

<!--more-->

I've set my disks up during installation as:

| Partition Type | Size   | Mount Point | File System         |
| -------------- | ------ | ----------- | ------------------- |
| EFI System     | 512M\* | `/boot/efi` | `EFI System/FAT 32` |
| Boot           | 512M\* | `/boot`     | `FAT32`             |
| Encrypted LVM  | 100%   | `/`         | `ext4`              |

> \*: These are recommended sizes. I've gotten away with these two disk sizes at 300 MB, but you'll have to do a
> bit of clean up earlier on in the process.
