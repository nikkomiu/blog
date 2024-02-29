---
title: USB Installation Specifics
date: 2024-02-05T05:00:00Z
tags:
  - debian
  - usb linux
---

These are general guidelines before you start to install the OS onto a portable drive. The nice thing about the approach
that I take when setting up Debian makes it fairly simple to extend these same instructions onto USB storage. If you're
not using USB storage for your Debian installation, you can safely skip this section.

<!--more-->

## Different EFI Path

During the regular installation, I'll be using the path `/EFI/my-debian/Linux.efi` for the Unified Kernel Image that
gets created in our EFI partition. However, in order to make UEFI recognize that the USB storage is bootable, we need
to use the "default" path that UEFI will use to look for an EFI. So, according to the
[EFI Spec](https://uefi.org/sites/default/files/resources/UEFI%20Spec%202.8B%20May%202020.pdf#page=573), we need to use:

```bash
/EFI/BOOT/BOOTX64.EFI
```

> **Note:** If you're not using an x86_64 processor you'll need to use the appropriate filename for your architecture.
