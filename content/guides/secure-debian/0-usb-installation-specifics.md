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
[EFI Spec (page 573)](https://uefi.org/sites/default/files/resources/UEFI%20Spec%202.8B%20May%202020.pdf#page=573):

{{< callout type=note >}}
For removable media devices there must be only one UEFI-compliant system partition, and that partition must contain a
UEFI-defined directory in the root directory. The directory will be named EFI. All OS loaders and applications will be
stored in a subdirectory below EFI called BOOT. There must only be one executable EFI image for each supported processor
architecture in the BOOT directory.
{{</ callout >}}

We need to use the following path for the UKI file on the USB drive instead:

```bash
/EFI/BOOT/BOOTX64.EFI
```

{{< callout type=note >}}
If you're not using an x86_64 processor you'll need to use the appropriate filename for your architecture.
{{</ callout >}}

You could also do this for a non-portable installation. However, when using an internal drive, it's generally better to
use the "custom" paths and add the boot entry manually. This is because the UEFI firmware will generally have a boot
menu that will allow you to select the boot device. It will also allow us to maintain the "old" boot entry for the
previous kernel version in case we need to roll back an upgrade.

Keep in mind that by using the "default" path, we won't have the ability to maintain multiple kernel versions on the
same USB drive. This is because the UEFI firmware will only look for the one file in the `EFI/BOOT` directory that
matches our CPU architecture. In order to add the "old" kernel version, we need to either manually execute it from the
UEFI shell or install, and **sign** the `systemd-boot` boot manager EFI as the "default" entry to give us a menu for
selecting a specific kernel to load.

## CPU Microcode

Linux relies on _microcode_ packages that are used to fix bugs in the CPU architecture. They are loaded into the kernel
(or in our case the UKI) at boot. When using a portable Linux installation, we need to make sure that we add the
missing microcode packages to the installation. We only need the missing one(s) that we plan to support because the
installation of Debian will handle installing the microcode package for the CPU architecture that we've installed on.

To add the **AMD** microcode run:

```bash
apt install amd64-microcode
```

To add the **Intel** microcode run:

```bash
apt install intel-microcode
```

{{< callout type=note >}}
Some Linux distros will include both x64 microcode packages by default. So you may not _need_ to run these commands.
However, I generally find it to be a good idea to run them just to be sure that they're added to the kernel.
{{</ callout >}}
