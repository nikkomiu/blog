---
date: 2024-02-13T08:00:00Z
title: Minimal Docker Container with Mariner 2.0
author: Nikko Miu
toc: true
tags:
  - cbl mariner 2.0
  - docker
  - scratch
---

Let's build a minimal Docker container using Microsoft's CBL-Mariner 2.0.

If you use the CBL-Mariner 2.0 images that Microsoft provides directly you're bound to notice that the container
image size is **much** larger than its Alpine counterpart. However, there are a number of things that can be done to
optimize the usage of this image to get close to an Alpine-based Docker image.

<!--more-->

## Getting Started

We're going to start out with a basic application that we want to create a Docker image out of.

For the purposes of this article I'm going to be creating a simple Go application using the development
environment from my post on [Go Dev Container]({{< relref "set-up-golang-dev-container" >}}) which will allow us
to develop our application in a Dev Container with all the dev dependencies installed, so we can jump right into
working on our Docker container. However, the principles used in this should be transferrable to any other
language since we're making changes that would optimize the build and runtime of the Linux environment running
within a Docker container.

{{< callout type=note >}}
When we check the container for Linux distribution later in this article we will be using [Trivy](https://trivy.dev/) to
scan the container for vulnerabilities. If you're following along make sure to follow the extra step to add Trivy to
your Dev Container.
{{</ callout >}}

If you're going to be following along with my sample repository, the `Dockerfile`s aren't going to be in the root
of the repository. They're located in the `rel` directory and are named `mariner.Dockerfile` and `alpine.Dockerfile`.
The `mariner.Dockerfile` is the Dockerfile that we're going to be working on in this article. The `alpine.Dockerfile`
is a Dockerfile that I've created to show the difference in size between a CBL-Mariner 2.0-based image and an
Alpine-based image. Using a `rel` directory is a common pattern for me when I'm working on a project that has
many release specific files (like Dockerfiles, Helm charts, encrypted release secrets, etc.).

## Naive Docker Build

We will start with a very simple and naive build for our Docker image. To do so, we're going to
create our Docker image from the Microsoft Go CBL Mariner image. When we think about runtime efficiency
this method is very bad since the base image is **HUGE** at **~580 MB** and contains a _ton_ of stuff
we don't need in the final image. We will be fixing this as we go,
but for now create a `Dockerfile` at the root of the project directory with the following:

```dockerfile
FROM mcr.microsoft.com/oss/go/microsoft/golang:1.22.0-1-cbl-mariner2.0

RUN tdnf install -y git ca-certificates

WORKDIR /src

# Install Go Deps
COPY go.* ./
RUN go mod download

# Build Application
RUN go build -ldflags="-s -w" -o app main.go
```

{{< callout type=note >}}
We're adding `-ldflags="-s -w"` to remove some debugging parts from the final Go binary that aren't needed for anything
in a staging/production build and cause the binary to bloat.
{{</ callout >}}

Now we can build our Docker image with the following command:

```bash
docker buildx build -t blog-goapp .
```

Right now our final image size is: **912 MB!!!**

As said before, this is a highly unoptimized build. So, with that in mind, let's start to fix this.

## Split Build from Final Image

{{< callout type=question >}}
Ok, but why does it matter how big our base image is?

**Answer:** When we're building Docker containers start up time is a large cost in the
(typically) highly elastic infrastructure environments these applications usually run in.
Because of this, we want to make sure that we reduce the startup time of our application
as much as possible. The easiest way to reduce this start up time of our container is to
reduce the size of the final image that's being created. It's important because when the Docker
daemon starts a new instance of your container it's going to pull down the container image
_(typically if it's not already installed, but in some cases **[always](https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy)**)_
from the registry which will scale (generally) linear with the size of the image itself.
{{</ callout >}}

To reduce the image size we will be employing several optimizations to our build process.
The first optimization we're going to use is to split the building of our application from the running of our app.
To do so we will use [Multi-Stage Docker Builds](https://docs.docker.com/build/building/multi-stage/)
to split dependencies needed during compile-time (like Go, GCC, CMake, etc.) from the
dependencies needed during runtime.

```dockerfile
# ... (previous Dockerfile)

FROM mcr.microsoft.com/cbl-mariner/base/core:2.0

# Install ca-certificates (not necessarily required but it's a pretty typical dependency for most Go applications)
RUN tdnf install -y ca-certificates

COPY --from=0 /src/app /usr/local/bin/app

ENTRYPOINT ["/usr/local/bin/app"]
```

By splitting the build from the final image we've reduced the size of our final image to **~171 MB**.
We're gaining a lot by just splitting our build into these two parts:

- We're not including the Go compile tool chain in our final image (which is only needed during the build).
- There aren't OS dependencies specific to our build in our final image (`git` in this case).
- Our original source code isn't hanging around our final container image.

This is a much more optimal size for our final image, but we can do better!

## Compressing Binary with UPX

After we download OS dependencies from TDNF we can download [UPX](https://upx.github.io/)
from the [UPX Release](https://github.com/upx/upx/releases/latest) page. To make this a bit more generic and "reusable"
I'm going to set a Docker build arg with a default version (the latest version at the time of writing this) that can be
overridden later though a `--build-arg` to the Docker builder.

Add the following after the `RUN tdnf install` step (I typically include it before the `WORKDIR` command) to
include UPX:

```dockerfile
ARG TARGETARCH
ARG UPX_VERSION=4.2.2
RUN wget https://github.com/upx/upx/releases/download/v${UPX_VERSION}/upx-${UPX_VERSION}-${TARGETARCH}_linux.tar.xz && \
  tar -xvf upx-${UPX_VERSION}-${TARGETARCH}_linux.tar.xz && \
  mv upx-${UPX_VERSION}-${TARGETARCH}_linux/upx /usr/local/bin && \
  rm -rf upx*
```

Now we can compress our binary with UPX after we build it (`RUN go build ...`):

```dockerfile
# Compress Application
RUN upx app
```

We don't get a bunch of savings in our very simple example application, but in a real application UPX can save a
lot of space. For example, in a real application I've seen UPX reduce the size of a CGO binary to ~20% of its
original size.

{{< callout type=note >}}
The `TARGETARCH` build arg is used to determine the CPU architecture of the final container. It is set by the Docker
Buildx builder. If you are not using Buildx you can set this manually to the planned architecture of your Docker image.
For example, `amd64`, `arm64`, etc.
{{</ callout >}}

## Install Runtime Dependencies to Fakeroot

In our simple example application we don't have any runtime dependencies. However, in a real application you're
likely to need some runtime dependencies. For this example, we're going to include `ca-certificates` as a runtime
dependency (as we did above). To do so, we're going to be changing the build parts of our Dockerfile to:

```dockerfile
# ...

# Install Go Deps
COPY go.* ./
RUN go mod download

# Install runtime dependencies to /mnt
RUN tdnf install --releasever 2.0 -y ca-certificates --installroot /mnt

# Build Application to /mnt
COPY . ./
RUN go build -ldflags="-s -w" -o /mnt/usr/local/bin/app cmd/hello-world/main.go

# Compress Application
RUN upx /mnt/usr/local/bin/app

FROM scratch

COPY --from=0 /mnt /

ENTRYPOINT ["/usr/local/bin/app"]
```

Ok, so we changed a lot in this pass. Let's go through what we've changed step-by-step:

- Install `ca-certificates` to `/mnt` using `tdnf` (the `--installroot` flag is used to install the package to a
  different root directory) **before we build** (to ensure the directory where we build our app to will exist
  when we build).
- Build our application to `/mnt/usr/local/bin/app` (the `/mnt` is the root directory of our fakeroot).
- Compress our application with UPX (in `/mnt/usr/local/bin/app`).
- We can now base our final image on `scratch` since we install all of our runtime dependencies to `/mnt` in the
  build image which will become our final image's root (`/`).
- No longer installing packages in our final image (since we installed them to `/mnt` in the build image).
- Simply copy the root filesystem from our build (`/mnt`) to our final image's root (`/`).

At this point, we've reduced the size of our final image to **~137 MB**. This is getting better, but we can still
improve these numbers. If you were to build this using `alpine` our image would still be much less than **100 MB**.

## Cleaning Up Files

Now that we have a working Docker image with minimal dependencies we can start to clean up the files that we don't
need in our final image. This is a pretty simple step, but it's important to do to ensure that we're not including
files in our final image that we don't need. Based on our current image size there should be a lot of files that we
can remove from the final image.

Let's start by creating an instance of our Docker image with a shell to poke around in:

```bash
docker run --rm -it --entrypoint sh blog-goapp
```

Once we're in our container shell let's look at what the makeup of the root of our filesystem is:

```bash
du -h -d 1 /
```

This will give us a list of the top-level directories in our root filesystem and their sizes. We can use this to
narrow down what we need to remove from our final image. For example, we can see that the `/var` directory is
**~95 MB**. Let's dig into that directory to see what's taking up so much space:

```bash
du -h /var
```

As we can see the `/var/cache/tdnf` directory is taking up **~94 MB** of space. This is a good candidate for removal
from our final image. We don't really need this around since this directory contains cached package indexes and
packages that we've installed. Since our final image isn't even going to have `tdnf` installed we don't need this.
Let's remove this directory from our final image by adding the following to our Dockerfile after we do
`tdnf install --installroot /mnt`:

```dockerfile
# Remove unnecessary files
RUN rm -rf /mnt/var/cache/tdnf
```

Keep looking around the filesystem and look for other files that can be removed. If you don't know what a file or
directory is used for you can look it up on the internet or ask in the comments below, and I'll do my best to help.

{{< section title="My Final Removal List" >}}

Here is my final list of files to remove from the final image:

```dockerfile
# Remove unnecessary files
RUN rm -rf /mnt/var/lib/rpm /mnt/var/cache/tdnf /mnt/usr/lib/debug /mnt/usr/share/{man,doc} /mnt/usr/local/share/{man,doc}
```

> **Note:** There are a lot of files remaining that could be removed to improve the overall numbers that I have here.
> However, I'm going to leave it at this for now. If you're looking to get the smallest possible image size you can,
> I would say you should just keep looking at the output of `du -h -d 1 /` as well as `du -h /<dir>` and see what else
> you can remove from the final image.

For example, you could remove the `/usr/share/terminfo` directory if you don't need terminal information in your
final image. You could remove the `/usr/share/licenses` directory from the final image to save a few more MB if you
don't need the licenses for the packages installed in your final image. You could also get rid of some PKI
directories `/etc/pki` (used for SSL/TLS certificates in different languages).

{{< / section >}}

After removing these files from my final image I reduced the overall size of my Docker image down to **~35 MB**!. This
is a huge improvement over our original image size of **~912 MB**. And at this size we're now more competitive with
the final image size of an Alpine-based image. For reference the sample repo also contains a Dockerfile for building
the same application with Alpine (`alpine.Dockerfile`). The final image size of the Alpine-based image is
**~8.4 MB**.

{{< callout type=note >}}
As we will see in the Trivy section below, you may not want to remove the `/mnt/var/lib/rpm` directory from your final
image. This directory contains the RPM database which is used by `tdnf` to manage packages. If you remove this directory
from your final image you won't be able to use a code scanner like Trivy to scan packages installed in your final image.
If you're not using a code scanner like Trivy you can remove this directory from your final image to save that space.
{{</ callout >}}

## Split our Dockerfile into 3 Stages

You can also split your `Dockerfile` into 3 stages instead of 2. There are really only two main benefits from doing this:

1. You can more easily see what's happening in each stage of your build.
1. Docker Buildx can parallelize each of the stages of the build which can speed up your build time.

   For this reason, try to put the actions that require something from another step **after** the most
   time-consuming tasks in the stage.

There isn't a lot to _explain_ here, so I'm just going to show the `Dockerfile` after changing it to 3 stages:

```dockerfile
#########################
#   Build Application   #
#########################
FROM mcr.microsoft.com/oss/go/microsoft/golang:1.22.0-1-cbl-mariner2.0 AS build

# Install build dependencies
RUN tdnf install -y git ca-certificates

ARG TARGETARCH

# Install UPX
ARG UPX_VERSION=4.2.2
RUN wget https://github.com/upx/upx/releases/download/v${UPX_VERSION}/upx-${UPX_VERSION}-${TARGETARCH}_linux.tar.xz && \
  tar -xvf upx-${UPX_VERSION}-${TARGETARCH}_linux.tar.xz && \
  mv upx-${UPX_VERSION}-${TARGETARCH}_linux/upx /usr/local/bin && \
  rm -rf upx*

WORKDIR /src

# Install Go Deps
COPY go.* ./
RUN go mod download

# Build Application
COPY . ./
RUN go build -ldflags="-s -w" -o app cmd/hello-world/main.go

# Compress Application
RUN upx app

#########################
# Build Root Filesystem #
#########################
FROM mcr.microsoft.com/cbl-mariner/base/core:2.0 AS rootfs

# Install runtime dependencies to /mnt
RUN tdnf install --releasever 2.0 -y ca-certificates --installroot /mnt

# Remove unnecessary files
RUN rm -rf /mnt/var/lib/rpm /mnt/var/cache/tdnf /mnt/usr/lib/debug /mnt/usr/share/{man,doc} /mnt/usr/local/share/{man,doc}

# Copy the built application
COPY --from=build /src/app /mnt/usr/local/bin/app

#########################
#   Build Final Image   #
#########################
FROM scratch

COPY --from=rootfs /mnt /

ENTRYPOINT ["/usr/local/bin/app"]
```

## Trivy Scanning

Now that we have a working and minimal Docker container we can work on getting container scanning working.
I'm going to be using [Trivy](https://trivy.dev/) to scan my Docker image for security vulnerabilities.
If you're using something else for scanning the following steps may differ for your scanning tool.

This step is going to be adding some files _back_ into our final Docker image. The total size of these files is
fairly negligible, but it's important to note that we're adding files back into our final image. If you don't
need to scan your final image for vulnerabilities and/or don't want to add these files back, you can skip this step.

For this section we're just going to be running the Trivy scanner locally against the image that we've built.
This is the command we will use:

```bash
trivy image blog-goapp
```

If we run this command now we won't see any information about the operating system that our container is running. We
also aren't going to see any packages that are installed in our final image. This is because Trivy can't determine
the operating system and therefore can't determine which package manager database to use to scan for vulnerabilities.

### OS Reporting

To add OS reporting to our final image we need to add the `/etc/*-release` files to our final image. I've been doing
this step in the same `RUN` step that I use to install packages to the fakeroot:

```dockerfile
# Install runtime dependencies to /mnt
RUN tdnf install --releasever 2.0 -y ca-certificates --installroot /mnt && \
  cp /etc/*-release /mnt/etc/
```

These files are used by Trivy (and various other tools) to determine the OS that the container is running. If you
don't add these files to your final image you won't be able to scan your final image for vulnerabilities (as it won't
understand what OS your container is running).

Once these files are copied over to the fakeroot, and we rebuild our final image we can run the Trivy scanner again.
This time we will see information about the OS that our container is running:

```text
WARN    No OS package is detected. Make sure you haven't deleted any files that contain information about the installed packages.
WARN    e.g. files under "/lib/apk/db/", "/var/lib/dpkg/" and "/var/lib/rpm"
INFO    Detected OS: cbl-mariner
INFO    Detecting CBL-Mariner vulnerabilities...
```

However, as the warnings suggest we still don't have any information about the packages that are installed in our
final image. This is because we removed the `/mnt/var/lib/rpm` directory from our final image. This directory
contains the RPM database which is used by `tdnf` to manage packages. If you remove this directory from your final
image you won't be able to use a code scanner like Trivy to scan packages installed in your final image.

### RPM Dependency Detection for Trivy

To add RPM dependency detection to our final image we just need to **not** remove the `/mnt/var/lib/rpm` directory in
the "_Remove unnecessary files_" step of our Dockerfile.

With that change made we can rebuild our final image and run the Trivy scanner again. This time we will see
information about the packages that are installed in our final image:

```text
2024-02-16T21:46:31.596Z        INFO    Detected OS: cbl-mariner
2024-02-16T21:46:31.596Z        INFO    Detecting CBL-Mariner vulnerabilities...
2024-02-16T21:46:31.596Z        INFO    Number of language-specific files: 0

blog-goapp (cbl-mariner 2.0.20240123)

Total: 0 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0)
```

We now see total information about the packages that are installed in our final image. This is important because
it allows us to scan our final image for vulnerabilities in the packages that are installed in our final image.
We don't have any vulnerabilities in our final image, but if we did, we would see them here.

Adding these two things back into our application only result in about a **1.5 MB** increase in the size of our final
image. This is a small price to pay for the ability to scan our final image for vulnerabilities as well as generating
an SBOM for our Docker images.

## Final Thoughts

There are some benefits to using the Microsoft maintained CBL-Mariner 2.0 image over an Alpine-based image. Since
CBL-Mariner 2.0 is maintained, and heavily used by, Microsoft their packages tend to get updated much faster when
vulnerabilities are found. This means that you _(may)_ have a more secure image if you're using CBL-Mariner 2.0 over
an Alpine-based image.

If you're using CBL-Mariner 2.0, and you're looking to optimize your Docker images for size, I hope this article has
helped you. If you have any questions or comments about this article, or if you have any other tips for optimizing
Docker images with CBL-Mariner 2.0, please leave a comment below.
