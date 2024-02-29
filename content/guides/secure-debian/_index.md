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

This guide is primarily designed for Debian, however it should hold true for any Linux distro that is based off of
Debian. It should also generally work for any other Linux distro, but some of the commands, packages, and config file
locations may be different for your flavor of Linux. I try to keep explinations of why things are done and what the
point is of the things I do, so it may not take someone more experienced in Linux installation and configuration much
time to adapt this to another distro (with modifications I also follow this guide when installing Arch Linux).

> **Note:** I also follow this guide for installing Kali as it is based on Debian (and the Debian installer).

If you're planning to install Debian (or a Debian-based OS) onto a portable storage device (like a flash drive,
external hard drive, etc.) check the
[USB Installation Specifics]({{< relref "guides/secure-debian/0-usb-installation-specifics.md" >}}) page before you
proceed, as there are differences in the process along the way.

## Pre-Installation

My machine is configured (during installation) to have Secure Boot disabled. After completing the installation, I will
re-enable Secure Boot in the [Secure Boot section]({{< relref "guides/secure-debian/1-secure-boot" >}}) of this guide.

> **Important:** If you already have an EFI partition on your machine and don't want to use it for the EFI of your
> Debian installation, you'll either need to detach the disk that contains the EFI partition or fix the EFI partition
> mapping in `/etc/fstab` after installation completes. For the latter, you can follow
> [these instructions]({{< relref "" >}}).

## Installation

I have _manually_ set my disks up during installation as:

| Partition Type     | Size   | Mount Point | File System         |
| ------------------ | ------ | ----------- | ------------------- |
| EFI System         | 512M\* | `/boot/efi` | `EFI System/FAT 32` |
| Boot               | 512M\* | `/boot`     | `FAT32`             |
| LUKS-encrypted LVM | 100%   | `/`         | `ext4`              |

> \*: These are recommended sizes. I've gotten away with the EFI and boot partitions set to 300 MB, but you'll have to
> do a bit of clean up earlier on in the process.
