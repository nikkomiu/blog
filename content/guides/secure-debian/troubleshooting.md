---
date: 2024-02-04T00:00:00Z
title: Troubleshooting
toc: true
---

This is a list of some common issues that I've had while running through this process and how to get out of them. It is
by no means exhaustive, but I'll do my best to keep it up-to-date as I go through this more.

<!--more-->

## Reinstall Linux Image

If you've accidently deleted the `initrd.img` and/or `vmlinuz` files from the boot partition (or forgot to move them)
from the boot partition while removing it) you just need to find the kernel versions that are currently installed and
reinstall them.

We can get the kernel version from symlink at the root of the filesystem for either the `initrd.img` or `vmlinuz` files:

```bash
ls -l /
```

```text
...
lrwxrwxrwx   1 root root    30 Feb  2 17:46 initrd.img -> boot/initrd.img-6.1.0-17-amd64
...
lrwxrwxrwx   1 root root    27 Feb  2 17:46 vmlinuz -> boot/vmlinuz-6.1.0-17-amd64
...
```

If you look in the path of the file that it is symlink'd to you should see the version and CPU architecture of the Linux
image. In this case, my kernel version is `6.1.0-17` and architecture is `amd64`. We'll need those pieces of information
when installing the kernel again.

Now that we have the kernel version, we can reinstall the appropriate Linux image packages:

```bash
apt-get install --reinstall linux-image-6.1.0-17-amd64
```

If you can't seem to find yours, try checking the `apt-cache` to find which `linux-image` package needs to be installed:

```bash
apt-cache search linux-image-
```

## Chroot Into OS

We can get back into our OS if it's failing by using either a live Linux distro (like Ubuntu), or another Linux distro
running on your machine. Once you're in that environment, unlock your LUKS-encrypted root filesystem under the name
`debian_root` (or whatever you want the unlocked drive to be called):

```bash
cryptsetup luksOpen /dev/sda3 debian_root
```

Then, we can mount the **mapped** partition as normal:

```bash
mount /dev/mapper/debian_root /mnt
```

Finally, mount the other (possibly two) partitions by checking the `/etc/fstab` from within the Debian root filesystem:

```bash
mount /dev/sda1 /mnt/boot
mount /dev/sda2 /mnt/boot/efi # or /efi depending on what's in your fstab
```

With all of our partitions mounted we can `chroot` into the Debian OS (if needed) to be able to run commands, install
packages, etc. using:

```bash
chroot /mnt
```

Now you can do what you need to do within your Debian OS. When you're done make sure to `exit` as you can't restart the
machine from inside of a `chroot` session.

> **Note:** You can also provide a second argument for what command to run using `chroot`. For example, if the shell
> in your current Linux distro doesn't exist inside of your Debian one you may need to add `bash` as an argument.
