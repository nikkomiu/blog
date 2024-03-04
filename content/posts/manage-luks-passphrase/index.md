---
title: Manage LUKS Passphrase
date: 2024-03-01T01:00:00Z
author: Nikko Miu
toc: true
tags:
  - linux
  - luks
  - encryption key
  - password
---

This is just a simple reference for changing passwords on a LUKS-encrypted volume. There are plenty
of places you could go to find this information, but I have it here for my own reference more than
anything.

<!--more-->

For the sake of this guide, I'm going to be using `/dev/nvme0n1p3` for the LUKS encrypted volume.

## Determine the Disk

If you don't know how to identify the disk you're trying to change the passphrase to, you can do
one of the following:

### Use `crypttab`

Check the `crypttab` file to see which encrypted disks are mounted:

```bash
cat /etc/crypttab
```

If you've got a UUID in the `crypttab`, you can just reverse look it up by UUID:

```bash
ls -l /dev/disk/by-uuid/
```

Which should give you back the `symlink` to the actual disk we're trying to edit.

### Use `fdisk`

If you know which physical disk it is you can check `fdisk` to see which disk it is using:

```bash
fdisk -l
```

Locate the disk by device, size, or other info to determine which one you're trying to change.

## Get LUKS Information

Now that we know which partition we're trying to change, we can get info about the LUKS volume:

```bash
cryptsetup luksDump /dev/nvme0n1p3
```

Under the `Keyslots` section you'll see some info about the keys that are currently able to unlock
the disk. You can have up to 8 (0-7) keys on a disk.

## Determine Keyslot

We can determine which keyslot that we're trying to change with:

```bash
cryptsetup open --verbose --test-passphrase /dev/nvme0n1p3
```

```output
Enter passphrase for /dev/nvme0n1p3:
Key slot 0 unlocked.
Command successful.
```

{{< callout type=note >}}
We need to use `--verbose` in order for it to log **which** keyslot opened the device.
{{</ callout >}}

## Change a Key

After we have [determined the keyslot](#determine-keyslot), we can change the passphrase for the
keyslot that was unlocked (in my case it's keyslot `0`):

```bash
cryptsetup luksChangeKey /dev/nvme0n1p3 -S 0
```

```output
Enter passphrase to be changed:
Enter new passphrase:
Verify passphrase:
```

Test the new key after you've added it to be sure it was changed correctly:

```bash
cryptsetup --verbose open --test-passphrase /dev/nvme0n1p3
```

As an alternative, you can just reboot your system.

## Remove a Key

Once we have [determined the keyslot](#determine-keyslot), we can remove the key from the disk
(in my case it will be keyslot `0`):

```bash
cryptsetup luksRemoveKey -S 0
```
