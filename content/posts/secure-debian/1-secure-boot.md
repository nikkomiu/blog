---
title: Debian Secure Boot
date: 2024-02-05T01:00:00Z
draft: false
tags:
  - debian
  - secure boot
---

## Prerequisite Packages

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

## Install `systemd-ukify`

This package is not yet available, so I am manually pulling down the archive from [Debian Sid](https://packages.debian.org/sid/systemd-ukify).

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

## EFI Image Generator

Get the root disk UUID from GRUB:

```bash
cat grub.cfg | grep root=UUID=
```

Take the first line of the output, and you'll use it in the next part.

Create a file to contain the command line arguments for the kernel `/etc/kernel/cmdline`:

```bash
root=UUID=<<UUID>> panic=0 ro quiet
```

> **Note:** Make sure to add `panic=0` to this as this prevents a bad actor from corrupting the startup and
falling back to an emergency shell.

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

## Run Script on initramfs Update

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

## Reboot

Reboot and go into the UEFI setup to _append_ the key to the `db` keys under **Secure Boot**.

If everything was set up correctly when you go back into your system you should boot into to your newly signed
Unified Kernel Image.

## Clean Up

Now we can remove GRUB from the system:

```bash
apt remove --purge grub
apt autoremove --purge
```

We can also remove the `systemd-boot` bootloader that was added when we installed it:

```bash
bootctl remove
```

In `/boot/efi` we can also remove the old GRUB kernels:

```bash
# remove the one for your machine id
rm -rf /boot/efi/1474289c99204e339ed4ed9bc00f87cb/
rm -rf /boot/efi/EFI/debian
rm -rf /boot/grub
```

Finally, remove the boot record for the old GRUB-based `debian` bootloader.

To do so we will need to get the list of boot records:

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

## (Optional) Update Kernel Compression

Update the fields in `/etc/initramfs-tools/initramfs.conf` to use `lz4` for compression with a level of 9:

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

Add a `/etc/kernel/splash.bmp` for the splash image and add the splash argument to `ukify` in `/etc/kernel/postinst.d/zz-update-efistub`:

```bash
ukify
    ...
    --splash /etc/kernel/splash.bmp
    ...
```

## (Optional) Add "Old" Linux Image to EFI

Go back into the `/etc/kernel/postinst.d/zz-update-efistub` script and add another ukify and sbsign to create the
Unified Kernel Image for the "old" Debian kernel image:

```bash
...

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

Next we can create the EFI directory for the new image and run the script again to generate the new image:

```bash
mkdir -p /boot/efi/EFI/my-debian-old

/etc/kernel/postinst.d/zz-update-efistub
```

Finally, just add the new (old) image to UEFI:

```bash
efibootmgr --disk /dev/nvme0n1 --create --label "Debian Old" --loader '\EFI\my-debian-old\Linux.efi'
```

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
