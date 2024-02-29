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
Debian. It should also generally work for any other Linux distro, but some commands, packages, and config file
locations may be different for your flavor of Linux. I try to keep explanations of why things are done and what the
point is of the things I do, so it may not take someone more experienced in Linux installation and configuration much
time to adapt this to another distro (with modifications I also follow this guide when installing Arch Linux).

> **Note:** I also follow this guide for installing Kali as it is based on Debian (and the Debian installer).

If you're planning to install Debian (or a Debian-based OS) onto a portable storage device (like a flash drive,
external hard drive, etc.) check the
[USB Installation Specifics](./0-usb-installation-specifics.md) page before you
proceed, as there are differences in the process along the way.
