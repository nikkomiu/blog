---
title: Debian Unlock LUKS with TPM2
date: 2024-02-05T03:00:00Z
draft: false
tags:
  - debian
  - luks
  - tpm2
  - auto unlock
---

## Install OS Dependencies

```bash
apt install tpm2-initramfs-tool xxd
```

## Generate and Add Random LUKS Key

```bash
dd if=/dev/random bs=64 count=1 | xxd -p -c999 | tr -d '\n' > /root/luks_key
cryptsetup luksAddKey /dev/nvme0n1p3 /root/luks_key --pbkdf-force-iterations=4 --pbkdf-parallel=1 --pbkdf-memory=32
```

## Register the Key in TPM

```bash
tpm2-initramfs-tool seal --data $(cat /root/luks_key) --pcrs 0,2,7
```

## Add Fallback Method

Create the script that will read from the TPM during boot and ask for a passphrase if it fails at `/etc/initramfs-tools/tpm2-cryptsetup`:

```bash
#!/bin/sh

[ "$CRYPTTAB_TRIED" -lt "1" ] && exec tpm2-initramfs-tool unseal --pcrs 0,2,7

/usr/bin/askpass "Passphrase for $CRYPTTAB_SOURCE ($CRYPTTAB_NAME): "
```

Make the script executable:

```bash
chmod +x /etc/initramfs-tools/tpm2-cryptsetup
```

Next create the hook in the initramfs at `/etc/initramfs-tools/hooks/tpm2-initramfs-tool`:

```bash
#!/bin/sh

PREREQ=""
prereqs()
{
   echo "$PREREQ"
}

case $1 in
prereqs)
   prereqs
   exit 0
   ;;
esac

. /usr/share/initramfs-tools/hook-functions

copy_exec /usr/lib/x86_64-linux-gnu/libtss2-tcti-device.so.0
copy_exec /usr/bin/tpm2-initramfs-tool
copy_exec /usr/lib/cryptsetup/askpass /usr/bin

copy_exec /etc/initramfs-tools/tpm2-cryptsetup
```

The long beginning of this script is required according to the [initramfs-tool manual](https://manpages.debian.org/buster/initramfs-tools-core/initramfs-tools.7.en.html#Header).

Make this script executable as well:

```bash
chmod +x /etc/initramfs-tools/hooks/tpm2-initramfs-tool
```

Update the `/etc/crypttab` to include the `keyscript` option:

```bash
nvme0n1p3_crypt UUID=<<UUID>> none luks,discard,keyscript=/etc/initramfs-tools/tpm2-cryptsetup
```

Now rebuild all of the initrd images:

```bash
update-initramfs -u -k all
```
