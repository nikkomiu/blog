---
title: Debian Secure Boot
date: 2024-02-05T04:00:00Z
toc: true
tags:
  - debian
  - secure boot
---

After installing Debian the first thing I'm going to do is set up Secure Boot. Usually, I'll start with Secure Boot
since some other setup and configuration requires the signing of kernel modules and I like keeping Secure Boot itself
out of the equation when those steps come up.

<!--more-->

> **Note:** To start, I have Secure Boot disabled in the UEFI settings. You don't need to have Secure Boot disabled on
> your system if you're using the Debian signed kernel. However, I find it a bit less frustrating to start without it
> enabled.

Throughout this guide, I'll be using `my-debian` as the dirname for the EFI loader. However, you can name this whatever
you want it to be called.

> **Note:** If you're going to be installing Debian on a removable storage device you will need to use a different
> ("common") structure for it to properly pick up the removable disk.

## Prerequisite Packages

First, we'll install some packages that we need to manage the signing of the kernel and boot management utilities.

```bash
apt install sbsigntool efitools mokutil efibootmgr systemd-boot
```

## Create Certificates in Common Location

Now we're going to create the certificates that will be used to sign our kernel.
The `MOK.der` will need to be added to your **Secure Boot** in UEFI settings.

1. We create and go into the directory for the MOK keys.
1. Generate the 4096 RSA certificates (you may need to change to 2048 depending on your system).
1. Copy the `MOK.der` to the EFI partition (so we can register the certificate in the UEFI settings later).

```bash
# create the cert directory
mkdir -p /var/lib/shim-signed/mok/
cd /var/lib/shim-signed/mok/

# Generate a RSA 4096 key to sign the kernel
openssl req -nodes -new -x509 -newkey rsa:4096 -keyout MOK.priv -outform DER -out MOK.der -days 36500 -subj "/CN=Local Linux/"
openssl x509 -inform der -in MOK.der -out MOK.pem

# Copy the DER cert to the EFI partition to install on UEFI
cp /var/lib/shim-signed/mok/MOK.der /boot/efi/
```

## Install `system-ukify`

You can check to see if `systemd-ukify` is available with `apt-cache`:

```bash
apt-cache search systemd-ukify
```

If it's avaliable, then install it from `apt`:

```bash
apt-get install systemd-ukify
```

Otherwise, follow the manual installation instructions.

### Manually Installation

> **Note:** As of the time of writing this the `systemd-ukify` package is not yet available on the stable Debian
> version, so I am manually pulling down the archive from [Debian Sid](https://packages.debian.org/sid/systemd-ukify).
> However, when it becomes available directly through `apt` you should install it that way instead of this manual way.

This package can't be installed directly as it requires a version of `systemd` that isn't installed.
Instead, just manually extract it to get the ukify Python script:

```bash
apt install binutils
ar x systemd-ukify_255.3-2_all.deb
tar -xvf data.tar.xz
mv ./usr/bin/ukify /usr/bin/
```

There is probably a missing Python package dependency that needs to be added:

```bash
apt install python3-pefile
```

## Create a Unified Kernel Image

Now that we have all the necessary tools installed, we can start setting up the _Unified Kernel Module_.

### Find Root UUID

Get the root disk UUID from GRUB:

```bash
cat /boot/grub/grub.cfg | grep root=UUID=
```

Take the first line of the output, and you'll use it in the next part.

As an alternative to finding it from the GRUB config, you can also locate the UUID by using `fdisk` to find the disk and
get the UUID from `/dev/disk/by-uuid`:

```bash
fdisk -l # locate the disk
ls -l /dev/disk/by-uuid/
```

### Create Kernel `cmdline`

Create a file to contain the command line arguments for the kernel `/etc/kernel/cmdline`. This file will take the place
of adding command line options to the GRUB config (or the _loader config_ if you're coming from `systemd-boot`):

```bash
root=UUID=<<UUID>> panic=0 ro quiet
```

> **Note:** Make sure to add `panic=0` to this as this prevents a bad actor from corrupting the startup and
> falling back to an emergency shell.

### Create EFI Stub Generation Script

Create the script `/etc/kernel/postinst.d/zz-update-efistub` to update our EFI image(s) after the kernel changes:

```bash
#!/bin/bash

INITRD=/initrd.img
INITRD_NAME=$(basename $(readlink ${INITRD}))
UNAME=${INITRD_NAME//initrd.img-/}

ukify build \
    --os-release @/usr/lib/os-release \
    --cmdline @/etc/kernel/cmdline \
    --linux /vmlinuz \
    --initrd ${INITRD} \
    --uname ${UNAME} \
    --output "/boot/efi/EFI/my-debian/Linux.efi"

if [ $? -ne 0 ]; then
    echo "Failed to build the unified kernel image"
    exit 1
fi

sbsign \
    --key /var/lib/shim-signed/mok/MOK.priv \
    --cert /var/lib/shim-signed/mok/MOK.pem \
    --output /boot/efi/EFI/my-debian/Linux.efi \
    /boot/efi/EFI/my-debian/Linux.efi

if [ $? -ne 0 ]; then
    echo "Failed to sign the unified kernel image"
    exit 1
fi
```

> **Note:** Make sure to start the file name with `zz` (this will make it the last script to run).

## Run Script on `initramfs` Update

We also need to run the script whenever the initramfs is updated:

```bash
mkdir -p /etc/initramfs/post-update.d
ln -s /etc/kernel/postinst.d/zz-update-efistub /etc/initramfs/post-update.d/zz-update-efistub
chmod +x /etc/kernel/postinst.d/zz-update-efistub
```

## Run the Script to Generate

Now we need to run the script and make sure there are no errors in generating our unified kernel:

```bash
mkdir /boot/efi/EFI/my-debian
/etc/kernel/postinst.d/zz-update-efistub
```

## Add Boot Entry

Finally, we can add the bootloader to UEFI:

```bash
efibootmgr --disk /dev/nvme0n1 --create --label "Debian" --loader '\EFI\my-debian\Linux.efi'
```

## Reboot Your System

Reboot and go into the UEFI setup to _append_ the key to the `db` keys under **Secure Boot**.

If everything was set up correctly when you go back into your system you should boot into to your newly signed
Unified Kernel Image.

> **Note:** Because we used the kernel parameter `panic=0`, we aren't going to be allowed, by the kernel, to drop into
> an emergency shell if there's a failure during the startup of the OS. Because of this we have to switch to another
> Linux distro, decrypt and mount our disks, and manually fix the issues from there.

If there is an issue booting after these steps, you'll need to check the output from the shell to see what is going
wrong. You can then look at the
[Chroot for Debugging]({{< relref "guides/secure-debian/troubleshooting#chroot-into-os" >}}) guide for how to get
into your Debian instance from either a live Linux distro or another Linux distro installed on your system.

## DKMS Setup

Install DKMS to allow the signing of newly installed dynamic kernel modules in the future:

```bash
apt install dkms
```

### Update DKMS MOK Signing Key

Edit the `/etc/dkms/framework.conf` and add the following two variables to sign dynamic kernel modules:

```bash
mok_signing_key="/var/lib/shim-signed/mok/MOK.priv"
mok_certificate="/var/lib/shim-signed/mok/MOK.der"
```

## (Recommended) Add "Old" Linux Image to EFI

Debian will maintin the last kernel version that was installed on the system. This is useful when there are issues
loading the current kernel version (usually after an update to the system). It's also pretty straightforward to add this
backup kernel, so we may as well.

Go back into the `/etc/kernel/postinst.d/zz-update-efistub` script and add another `ukify` and `sbsign` to create the
Unified Kernel Image for the "old" Debian kernel image after the original one:

```bash
# Create Old Image
INITRD=/initrd.img.old
INITRD_NAME=$(basename $(readlink ${INITRD}))
UNAME=${INITRD_NAME//initrd.img.old-/}

ukify build \
    --os-release @/usr/lib/os-release \
    --cmdline @/etc/kernel/cmdline \
    --linux /vmlinuz.old \
    --initrd ${INITRD} \
    --uname ${UNAME} \
    --output "/boot/efi/EFI/my-debian-old/Linux.efi"

if [ $? -ne 0 ]; then
    echo "Failed to build the unified kernel image (old)"
    exit 1
fi

sbsign \
    --key /var/lib/shim-signed/mok/MOK.priv \
    --cert /var/lib/shim-signed/mok/MOK.pem \
    --output /boot/efi/EFI/my-debian-old/Linux.efi \
    /boot/efi/EFI/my-debian-old/Linux.efi

if [ $? -ne 0 ]; then
    echo "Failed to sign the unified kernel image (old)"
    exit 1
fi
```

> A better name for this may be "fallback" or "previous" since it is really only used to allow you to load the previous
> Linux kernel image when the current one is failing.

Next we can create the EFI directory for the new image and run the script again to generate the new image:

```bash
mkdir -p /boot/efi/EFI/my-debian-old

/etc/kernel/postinst.d/zz-update-efistub
```

Finally, just add the new (old) image to UEFI:

```bash
efibootmgr --disk /dev/nvme0n1 --create --label "Debian Old" --loader '\EFI\my-debian-old\Linux.efi'
```

## Clean Up

Now that everything should be working with Secure Boot we can clean up some of the things that we no longer need. In
general, we can get rid of GRUB (and it's associated boot record), `systemd-boot`, and even the original `/boot`
partition if we want to (since we don't really need it separate from our root now that we have a Unified Kernel Image).

### Removing the GRUB Bootloader

Now we can remove GRUB from the system:

```bash
apt remove --purge grub
apt autoremove --purge
```

In `/boot/efi` we can also remove the old GRUB kernels that don't seem to get cleaned up when removing GRUB from `apt`:

```bash
# remove the one for your machine id
rm -rf /boot/efi/1474289c99204e339ed4ed9bc00f87cb/
rm -rf /boot/efi/EFI/debian
rm -rf /boot/grub
```

We can also remove the boot record for the old GRUB-based `debian` bootloader now that we don't use GRUB anymore. To do
so we will need to get the list of boot records:

```bash
efibootmgr
```

```text
BootCurrent: 0004
Timeout: 1 seconds
BootOrder: 0004,0003,0000,0001,0002
Boot0000* Windows Boot Manager
Boot0002* debian
Boot0004* Debian
```

Find the one named `debian` and remove it by its ID:

```bash
efibootmgr -b 2 -B
```

### Removing `systemd-boot` Loader

We can also remove the `systemd-boot` bootloader that was added when we installed it:

```bash
bootctl remove
```

Running this command will cause the `postinst.d` script that is added during the installation of `systemd-boot` to be
removed so it doesn't get run when the initramfs is updated.

> **Note:** We installed `systemd-boot` for some of the utilities that are included with it. However, I'm not going to
> be using `systemd-boot` as the bootloader for my OS. If you want to use it, you just need to sign the bootloader
> whenever it is updated using a post update script.

### Remove `/boot` Partition

Now that we use the Unified Kernel Module (which is installed on our EFI partition), we can also remove our existing
`/boot` partition. To remove it, we can start by commenting out the mount of the `/boot` partition in `/etc/fstab`:

```text
# /boot/efi was on /dev/nvme0n1p1 during installation
# UUID=<<UUID>> /boot ext2 defaults 0 2
```

Now, reboot your system. It may seem like the system won't boot if you've had previous experience working on Linux with
the `initrd.img` and `vmlinuz` files living in your `/boot` partition. However, as long as your UKI is set up properly
they won't be _needed_ to boot your system.

After you get back into your system, manually mount the old boot partition to `/mnt`:

```bash
mount /dev/nvme0n1p3 /mnt
```

> **Note:** You may need to find your old boot partition if you don't know what the name of it is. You can do this by
> checking `fdisk -l` to see what partition it is. Alternatively, you can find it by UUID by taking the UUID from the
> commented out line in the `/etc/fstab` and running `ls -l /dev/disk/by-uuid/` to find which disk name the symlink
> of the disk points to.

Now that it's mounted at `/mnt` we can just copy the `config`, `initrd.img`, and `vmlinuz` files from the old boot
partition to the (now root disk) `/boot` directory:

```bash
cp /mnt/config-* /mnt/initrd.img-* /mnt/vmlinuz-* /boot
```

Make sure the files all got copied over. Then you can unmount the partition and delete it using `fdisk` if you'd like.

```bash
umount /mnt
```

Just to make sure everything is working correctly, I like to validate that rebuilding the initramfs works:

```bash
update-initramfs -u -k all
```

As long at that command works properly, you should no longer depend on the `/boot` partition.

### Move `/boot/efi` to `/efi`

Another clean up task _I_ like to perform is to move the `/boot/efi` partition to `/efi`. I think the partition map
tends to make a bit more sense when the _core_ filesystem requirements are mounted directly on the root.

To start, update the `/etc/fstab` to change the mount point:

```text
# /boot/efi was on /dev/nvme0n1p1 during installation
UUID=<<UUID>> /efi ext2 defaults 0 2
```

Then, we just need to update the efistub script that we created earlier (`/etc/kernel/postinst.d/zz-update-efistub`)
to use the new `/efi` path. Anywhere in the script that currently says `/boot/efi/EFI/` we just need to update it to
`/efi/EFI/`.

## (Recommended) Update Kernel Compression

I typically use `lz4` compression due to its fast read time compared some other compression algorithms.

To sart make sure you have the `lz4` package installed:

```bash
apt-get install lz4
```

Then, update the fields in `/etc/initramfs-tools/initramfs.conf` to use `lz4` for compression with level 9 (highest):

```bash
COMPRESS=lz4

...

COMPRESSLEVEL=9
```

Then update the kernel by running:

```bash
update-initramfs -u -k all
```

Doing so will save space on the EFI partition and (hopefully) speed up your boot time too.

## (Optional) Add Splash Image to Boot

Ukify can show a splash image during startup. However, I generally don't add this to my kernel image and instead opt for
using [Plymouth]({{< relref "guides/secure-debian/plymouth" >}}) for displaying the boot splash screen.

Add an image to `/etc/kernel/splash.bmp` for the ukify splash. Then, add the splash argument to `ukify` in
`/etc/kernel/postinst.d/zz-update-efistub`:

```bash
ukify
    ...
    --splash /etc/kernel/splash.bmp
    ...
```

## Conclusion

If you've managed to get all the way here, **CONGRATULATIONS!!!** You've successfully managed to change Debian from
using (shim-signed) GRUB to using a **signed** Unified Kernel Image. This process is fairly complicated and involved to
switch Debian over. However, I hope it wasn't too painful to follow along. If you run into any issues along the way,
feel free to leave a comment on this page and I'll try my best to help!

Also, now that all of this is done you should make sure to lock your UEFI using at least a supervisor password so a
malicious user can't go into your settings and add a new key to the DB and use a malicious kernel image to boot into
your system anyways. You should also be **highly** suspicious if your kernel image signature is no longer valid, as this
is likely an indicator that someone is trying to replace your kernel with an untrusted one. Remember, our EFI partition
is the only one that's not encrypted, and therefore the only one that can be easily comprimised by an attacker.
