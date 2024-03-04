---
title: Build a Simple Linux Kernel Module
date: 2024-03-01T01:00:00Z
author: Nikko Miu
toc: true
tags:
  - c
  - linux
  - linux kernel module
  - secure boot
  - kernel module signing
---

Let's build a simple Linux kernel module in C. I tend to use this to test a Secure Boot setup as you'll be able to see
the errors from loading an unsigned module into a kernel where the system requires all kernel modules to be signed.
This could also be used as a jumping off point to building an actual kernel module using C.

<!--more-->

I'll be starting off in an empty "project" directory (`lkm`) for our kernel module.

## Writing our Module

The first thing we're going to do is write a simple kernel module. This really only requires three files in total to
work with a minimal example.

### Install Linux Headers

In order to create a kernel module, we're first going to need to add the Linux headers package for your _current_ kernel
version. For Debian, you can search for the kernel headers using `apt`:

```bash
sudo apt search linux-headers-$(uname -r)
```

Then, find the correct one for your system and install it:

```bash
sudo apt install linux-headers-$(uname -r)
```

{{< callout type=note >}}
The command, the package, or the name may be different depending on your distro. You may need to find out what the name
of the Linux headers package is for your distro/package manager.
{{</ callout >}}

### Kernel Module Source

I'm going to create our simple, hello world, module in a `lkm.c` file:

```c
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/module.h>

MODULE_DESCRIPTION("My simple kernel module");
MODULE_AUTHOR("Nikko Miu");
MODULE_LICENSE("GPL");

static int lkm_init(void)
{
    printk(KERN_INFO "Hello, kernel module\n");
    return 0;
}

static void lkm_exit(void)
{
    printk(KERN_INFO "Goodbye, kernel module\n");
}

module_init(lkm_init);
module_exit(lkm_exit);
```

### Makefile

For the `Makefile` we only need a build and clean target. For a kernel module, we're going to be building from the
kernel modules directory and pointing to our project directory for the module we want to build (the `M` parameter):

```makefile
KDIR = /lib/modules/`uname -r`/build

kbuild:
	@make -C ${KDIR} M=`pwd`

clean:
	@make -C ${KDIR} M=`pwd` clean
```

{{< callout type=warning >}}
The `@` before the commands in the `Makefile` just suppress outputting the command to the terminal when running `make`.
{{</ callout >}}

### Kbuild

We also need to have a `Kbuild` file which will contain kernel build instructions and options for our kernel module.
Since we are building a simple module, we don't need many options for ours:

```makefile
EXTRA_CFLAGS = -Wall -g

obj-m = lkm.o
```

## Building our Module

Now that we have all the files needed for our kernel module we can build it:

```bash
make
```

```output
make[1]: Entering directory '/usr/src/linux-headers-6.6.9-amd64'
make[1]: Leaving directory '/usr/src/linux-headers-6.6.9-amd64'
```

## Load Unsigned Module

With the module built we can load it into our kernel:

```bash
sudo insmod lkm.ko
```

{{< callout type=warning >}}
If you're on a machine where Secure Boot is enabled, you won't be able to _successfully_ load it into the kernel at this
point. This is because we haven't signed our module yet and the signing of all kernel modules is required by UEFI when
Secure Boot is enabled on a system.

```output
insmod: ERROR: could not insert module lkm.ko: Key was rejected by service
```

{{</ callout >}}

## Sign the Module

Before we can sign the module we need a signing key that's been added to the UEFI of your system. I've generated my
_MOK_ (Machine Owned Key) at `/var/lib/shim-signed/mok/` with the `MOK.der` being the public cert and the `MOK.priv`
being the private key.

We can sign the module manually by running:

```bash
export SIGN_CRT=/var/lib/shim-signed/mok/MOK.der
export SIGN_KEY=/var/lib/shim-signed/mok/MOK.priv
sudo /lib/modules/`uname -r`/build/scripts/sign-file sha256 ${SIGN_KEY} ${SIGN_CRT} lkm.ko
```

If all goes well your module should now be signed. For convenience, we can also add this as a build target (or step) to
our Makefile:

```makefile
KDIR = /lib/modules/`uname -r`/build

SIGN_CRT = /var/lib/shim-signed/mok/MOK.der
SIGN_KEY = /var/lib/shim-signed/mok/MOK.priv

kbuild:
	@make -C ${KDIR} M=`pwd`

sign:
	@/lib/modules/`uname -r`/build/scripts/sign-file sha256 ${SIGN_KEY} ${SIGN_CRT} lkm.ko

clean:
	@make -C ${KDIR} M=`pwd` clean
```

Then you can build and sign using our `Makefile` by running:

```bash
make kbuild
sudo make sign
```

{{< callout type=note >}}
You can also add a `.PHONY` for building and signing all in one "step". However, I've decided not to do this mainly
because building does not require privilege escalation for building but does to gain access to my MOK private key during
signing of the module.

If you don't require root permission for your key you probably won't need to use `sudo` for signing.
{{</ callout >}}

## Load the Signed Module

With our newly signed module, we can load it into the kernel again:

```bash
sudo insmod lkm.ko
```

Since our simple module just prints a message, we can see the message now in the kernel log by running:

```bash
sudo dmesg
```

You should see, near the end of the output, that our `module_init` handler was called:

```output
[ 4219.888350] ...
[ 5844.122110] Hello, kernel module
```

Also, if you had tried to load the unsigned kernel, you'll see another log message for the rejection of inserting that
module into the kernel (since it was unsigned):

```output
[  196.822385] ...
[ 4219.888350] Loading of unsigned module is rejected
```

## Unloading the Kernel Module

Now that we have tested our kernel module, we can remove it from the kernel by running:

```bash
sudo rmmod lkm.ko
```

If you remember from the C source file we also logged a message when the kernel module was exiting (from our
`module_exit` handler function). You can view the log message from the unloading of our module by checking the kernel
log with `dmesg` again:

```bash
sudo dmesg
```

And we should see that our module was unloaded in the log:

```output
[ 5844.122110] ...
[ 6059.401840] Goodbye, kernel module
```

## Clean Up

Now that we are done, we can clean up the files from our project directory using the `clean` make target:

```bash
make clean
```

## Conclusion

If you've made it this far, **Congrats!** You've managed to write a simple Linux kernel module, sign it, load it, and
unload it from the kernel.
