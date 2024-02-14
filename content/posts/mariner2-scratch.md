---
date: 2024-02-13T08:00:00Z
title: Minimal Docker Container with Mariner 2.0
author: Nikko Miu
draft: true
toc: true
tags:
  - cbl mariner 2.0
  - docker
  - scratch
---

Let's build a minimal Docker container using Microsoft's CBL-Mariner 2.0.

If you use the CBL-Mariner 2.0 images that Microsoft provides directly you're bound
to notice that the container image size is **much** larger than it's Alpine counterpart.
However, there are a number of things that can be done to optimize the usage of this image
to meet (or in some cases outperform) Alpine.

<!--more-->

## Getting Started

We're going to start out with a basic application that we want to create a Docker image out of.

For the purpouses of this article I'm going to be creating a simple Go application using the
post for [setting up a Go Devcontainer]({{< relref "set-up-golang-dev-container" >}}) which will allow us
to develop our application in a Dev Container with all the dev dependencies installed so we
can jump right into working on our Docker container. However, the principles used in this should
be transferrable to any other language since we're making changes that would optimize the build
and runtime of the Linux environment running within a Docker container.

> TODO: explain difference between this dev container and the Go app one (Trivy scanner installed)

## Naive Docker Build

We will start with a very simple and naive build for our Docker image. To do so, we're going to
create our Docker image from the Microsoft Go CBL Mariner image. When we think about runtime efficiency
this method is very bad since the base image is **HUGE** at **~580MB** and contains a _ton_ of stuff
we don't need in the final image. We will be fixing this as we go,
but for now create a `Dockerfile` at the root of the project directory with the following:

```dockerfile
FROM mcr.microsoft.com/oss/go/microsoft/golang:1.22.0-1-cbl-mariner2.0

RUN tdnf install -y git

WORKDIR /src

# Install Go Deps
COPY go.* ./
RUN go mod download

# Build Application
RUN go build -ldflags="-s -w" -o app main.go
```

> **Note:** We're adding `-ldflags="-s -w"` to remove some debugging parts from the final Go
> binary that aren't needed for anything in a staging/production build and cause the binary to bloat.

Right now our final image size is: **TODO MB**

As said before, this isn't a very optimal build right now. So, let's start to fix this.

## Split Buid from Final Image

> **Question:** Ok, but why does it matter how big our base image is?
>
> **Answer:** When we're building Docker containers start up time is a large cost in the
> (typically) highly elastic infrastructure environments these applications usually run in.
> Because of this, we want to make sure that we reduce the start up time of our application
> as much as possible. The easiest way to reduce this start up time of our container is to
> reduce the size of the final image that's being created. It's important because when the Docker
> daemon starts a new instance of your container it's going to pull down the container image
> _(typically if it's not already installed, but in some cases **[always](https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy)**)_
> from the registry which will scale (generally) linear with the size of the image itself.

To reduce the image size we will be employing several optimizations to our build process.
The first optimization we're going to use is to split the building of our application from the running of our app.
To do so we will use [Multi-Stage Docker Builds](https://docs.docker.com/build/building/multi-stage/)
to split dependencies needed during compile-time (like Go, GCC, CMake, etc.) from the
dependencies needed during runtime.

```dockerfile
FROM x AS builder

...

FROM x

...
```

## Compressing Binary with UPX

After we download OS dependencies from TDNF we can download [UPX](https://upx.github.io/)
from the [UPX Release](https://github.com/upx/upx/releases/latest) page. To make this a little
bit more generic and "reusable" I'm going to set a Docker build arg with a default version
(the latest version at the time of writing this) that can be overriden later though a `--build-arg` to the Docker builder.

Add the following after the `RUN tdnf install` step to include UPX:

```dockerfile
ARG UPX_VERSION=4.2.2
RUN curl https://github.com/upx/upx/releases/download/v${UPX_VERSION}/upx-${UPX_VERSION}-${TARGETARCH}_linux.tar.xz | tar -xvf - && \
  mv upx-${UPX_VERSION}-${TARGETARCH}_linux/upx /usr/local/bin && \
  rm -rf upx*
```

> TODO: Verify (and expand on?) this step

## Install Runtime Dependencies to Fakeroot

> TODO

## Cleaning Up Files

> TODO

## Trivy Scanning

Now that we have a working and minimal Docker container we can work on getting container scanning working.
I'm going to be using [Trivy](https://trivy.dev/) to scan my Docker image for security vulnerabilities.
If you're using something else for scanning the following steps may differ for your scanning tool.

### OS Reporting

> TODO

### RPM Dependency Detection for Trivy

> TODO
