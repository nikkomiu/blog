---
date: 2024-02-12T08:00:00Z
title: Set Up Go Dev Container
author: Nikko Miu
toc: true
tags:
  - dev container
  - golang
  - docker
  - gh:blog-goapp
---

We're going to set up a Dev Container for Go development.
This will allow us to develop our application in a consistent, easy to use, and reproducible development environment
with all the necessary dependencies installed, so we can jump right into working on our application.

<!--more-->

I'm going to be creating the Dev Container in this post with the name `blog-goapp`. However, kebab-case names can't be
used for the PostgreSQL database that I'm setting up, so I'm going to use `blog_goapp` as the name for the database.

You can use the [reference project](https://github.com/nikkomiu/blog-goapp) on GitHub to follow along with this post.

## Prerequisites

Before we get started, you'll need to have the following installed:

- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [VS Code](https://code.visualstudio.com/)

## About our Dev Container

This Dev Container will also have a couple of _(optional)_ handy tools installed:

- [Trivy](https://trivy.dev/) - used to help us find vulnerabilities in our code.
- [AGE](https://github.com/FiloSottile/age) and [sops](https://github.com/mozilla/sops) - for safely storing encrypted
  secrets in our Git repository.
- **Docker CLI** - for building and running our app's Docker container(s).

- **PostgreSQL Client** - for interacting with the development PostgreSQL database.

{{< callout type=note >}}
The Docker CLI does not work properly in all Dev Container hosting environments. This is because the Docker CLI requires
access to the host's Docker daemon, which is not always accessible by the Dev Container.
{{</ callout >}}

There are a few other assumptions about development workflow that we will make:

- [VS Code](https://code.visualstudio.com/) will be our editor.
- VS Code will be the editor for our Git commits
  (as well as any other time the `EDITOR` is used in the integrated terminal).
- We will be using `zsh` and [Oh My ZSH](https://ohmyz.sh/) as our shell
  with a theme configurable through a Docker build argument (`ZSH_THEME_NAME`).
- We use a jailed user (`coder`) with `sudo` access for development.
  This is particularly useful to get around some issues that arise by trying to work on a Git repository as `root`.
- The default branch on Git repositories is `main`.

## Getting Started

1. To start off, let's open an empty directory (or an existing project) in VS Code.
1. Install the
   [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
   extension to create and run our Dev Container.
1. Create the `.devcontainer` directory in the root of your project. This is where we will store our Dev Container configuration.

{{< callout type=note >}}
It isn't very easy to create a Dev Container without starting off on a local project directory. After your Dev Container
is working properly against a local folder (and you've pushed it to a Git remote) you can delete the local project
directory and clone into a Dev Container volume.
{{</ callout >}}

## Create our Dockerfile

Here is the `.devcontainer/Dockerfile` that we will use to create our Dev Container:

```dockerfile
FROM golang:1.22-alpine

# Install dev dependencies
RUN apk add --update \
    bash zsh zsh-vcs git sudo \
    age htop inotify-tools \
    nodejs npm \
    docker-cli docker-cli-buildx postgresql-client curl

# Install sops
RUN wget https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux.amd64 -O /usr/local/bin/sops && \
    chmod +x /usr/local/bin/sops

# Create and switch to a jailed admin user
RUN echo "%sudo ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/sudo && \
    addgroup sudo && addgroup docker && \
    adduser -D -s /bin/zsh coder && \
    addgroup coder sudo && \
    addgroup coder docker
USER coder

ENV EDITOR="code --wait"

RUN git config --global core.editor "$EDITOR" && git config --global init.defaultBranch main

# Install oh my zsh
ARG ZSH_THEME_NAME="agnoster"
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && \
    sed -i -e "s/ZSH_THEME=.*/ZSH_THEME=\"$ZSH_THEME_NAME\"/" ~/.zshrc
```

## Create Docker Compose

Here is the `.devcontainer/docker-compose.yml` that we will use to create our Dev Container:

```yaml
version: "3.8"
services:
  app:
    build:
      context: "."
      dockerfile: Dockerfile
    volumes:
      - ../:/workspaces/blog-goapp:cached
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      DATABASE_URL: postgres://postgres:postgres@db/blog_goapp_dev?sslmode=disable
      TEST_DATABASE_URL: postgres://postgres:postgres@db/blog_goapp_test?sslmode=disable
    command: sleep infinity
    networks:
      - backend

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: blog_goapp_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      PGDATA: /var/lib/postgresql/data/pgdata
    networks:
      - backend
    volumes:
      - postgres-data:/var/lib/postgresql/data

networks:
  backend: {}

volumes:
  postgres-data: {}
```

I typically use a `docker-compose.yml` file to define the additional development services that I need to run my application.
Depending on the application, this could be a database, a message queue, a cache, storage service, etc.

In this case, I've added a PostgreSQL service to develop an app that uses a PostgreSQL database. However, you can add
any additional services that you need to develop your application. Any services that you add to the `docker-compose.yml`
file will be available to the `app` service in the Dev Container via the service name.

{{< callout type=note >}}
The `/var/run/docker.sock` is mounted on the `app` service to allow the `docker` CLI to interact with the host's Docker
daemon.
{{</ callout >}}

## Create our Dev Container Configuration

This is the `.devcontainer/devcontainer.json` file that I'm using to create our Dev Container environment:

```json
{
  "name": "blog-goapp",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspaces/blog-goapp",
  "customizations": {
    "vscode": {
      "settings": {
        "terminal.integrated.defaultProfile.linux": "zsh"
      },
      "extensions": ["EditorConfig.EditorConfig", "GitHub.copilot", "golang.go"]
    }
  },
  "postCreateCommand": {
    "go-mod": "go mod tidy"
  },
  "postAttachCommand": "cat ./.devcontainer/README.txt",
  "forwardPorts": [4000]
}
```

A few things to note about this Dev Container configuration file:

- The `dockerComposeFile` and `service` properties are used to define the Docker Compose file and service that we want
  to use to create our Dev Container.
- The `workspaceFolder` property is used to define the path to the workspace folder in the Dev Container (make sure it
  matches the `volume` mount in the `Dockerfile` otherwise you'll get an error about a missing workspace).
- The `postCreateCommand` property is used to define a command that will be run after the Dev Container is created.
  In this case, I'm running `go mod tidy` to tidy up the Go modules.
- The `postAttachCommand` property is used to define a command that will be run after the Dev Container is attached.
  In this case, I'm running `cat ./.devcontainer/README.txt` to display a README file that I typically create for
  local development using the Dev Container. If you don't want to add a `README.txt` file, you can remove this line.
- The `forwardPorts` property is used to define the ports that we want to forward from the Dev Container to the host.
  In this case, I'm forwarding port `4000` to the host.

## Starting the Dev Container

Now that we have all the necessary configuration files in place, we can start our Dev Container by running the
`Remote-Containers: Reopen in Container` command from the Command Palette in VS Code. To get to the Command Palette,
press `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) or `F1` and type `Dev Containers: Reopen in Container`.

Everything should start up properly and drop you into the Dev Container. You're likely to get an error on the terminal
about the `go mod tidy` command not working properly. This is because we haven't initialized our Go modules yet. To fix
this, run the following command in the terminal:

```sh
go mod init github.com/nikkomiu/blog-goapp
```

## Error Handling

There are a few different places where things can go wrong when creating a Dev Container.
This is a (non-exhaustive) list of things that can go wrong and how to fix them.

### Dev Container Creation

If you run into any issues with creating the Dev Container, you can check the logs of the Dev Container.
The log will typically open on failure, but if it doesn't, you can open it by running the
`Dev Containers: Show Container Log` command from the Command Palette.

### Dubious Ownership in Git

If you get the following error when trying to use Git in the Dev Container on your application:

```text
fatal: detected dubious ownership in repository at '/workspaces/blog-goapp'
To add an exception for this directory, call:

        git config --global --add safe.directory /workspaces/blog-goapp
```

You should fix this by fixing the permissions of the application directory in the Dev Container.
This can be done from project root in the Dev Container by running the following command:

```sh
sudo chown -R coder:coder .
```

We should always try to keep our source code and other non-system files in the Dev Container owned by the
`coder` user. This is because the `coder` user is our jailed development user, and we want to avoid running
commands as `root` as much as possible.

## Clone into a Dev Container Volume

Now you should be able to clone directly into a Dev Container volume. This is useful when you don't want to
clone the repository to your local machine's disk.

1. Open the Command Palette in VS Code by pressing `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) or `F1`.
1. Type `Dev Containers: Clone Repository in Container Volume...` and press `Enter`.
1. Enter the Git clone URL of the repository that you want to clone and press `Enter`. Or you can sign in to
   GitHub to clone a repository directly from GitHub.

{{< callout type=note >}}
Check out the official documentation on [Sharing Git credentials with a Dev Container](https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials)
for cloning into a Dev Container volume with SSH.
{{</ callout >}}

## Extras

The following steps are optional and are not required to get the Dev Container up and running. However, they are
useful for improving the development experience. You can skip these steps if you don't need them.

### Add Dev Container README

I find it helpful to add a `README.txt` file to the `.devcontainer` directory to help me remember how to use the Dev
Container. Here's an example of what I typically add to the `README.txt` file:

```text

================================================================
Blog Go App Development Environment
================================================================

Start the development server:

    $ go run cmd/hello-world/main.go

(This will start the development server on port 4000)

Connecting to the PostgreSQL database:

    $ psql -h db -U postgres -d blog_goapp_dev

================================================================
```

### Add Trivy Support

Adding support for [Trivy](https://trivy.dev/) in the Dev Container is a really simple effort that can help us find
vulnerabilities in our code. You can see what the latest release is by going to their [GitHub Releases](https://github.com/aquasecurity/trivy/releases/latest).
I typically add configuration into the Dev Container `Dockerfile` as "modular" dependencies. This way, I can easily
update the version of Trivy that I'm using by changing the version number either directly in the `Dockerfile` or by
setting the build arg in the `docker-compose.yml` file.

To add Trivy support, we need to update the `Dockerfile` to install Trivy. Make sure to put the following after the
`RUN apk add --update ...` line but before creating the `coder` user (so we don't need `sudo` to install Trivy):

```dockerfile
# Install Trivy Scanner
ARG TRIVY_VERSION="0.49.1"
RUN wget https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz && \
    tar zxvf trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz && \
    mv trivy /usr/local/bin/trivy && \
    rm trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz
```

{{< callout type=note >}}
This currently does not work with an Apple Silicone macOS machine.
{{</ callout >}}

### Add KIND Support

Adding support for running [KIND](https://kind.sigs.k8s.io/) in the Dev Container is a bit cumbersome if you don't know
why it's not working out of the box. The reason is that the Docker daemon in the Dev Container is running in a different
network than the default KIND network will be running in. This means that the KIND cluster that we create in the Dev
Container won't be accessible from the Dev Container unless you specify the Docker network to use by KIND.

```yaml
services:
  app:
    environment:
      KIND_EXPERIMENTAL_DOCKER_NETWORK: blog-goapp_devcontainer_backend
```

{{< callout type=note >}}
As the environment variable name suggests this is an experimental feature and may change in the future.
{{</ callout >}}

Now that we set the environment variable, let's update the `Dockerfile` to install `kubectl`, `kind`, and `helm`.
Make sure to add the following lines to the `Dockerfile` after the `RUN apk add --update ...` line but before creating
the `coder` user (so we don't need `sudo` to install these tools):

```dockerfile
# Install Kubectl, KIND, and Helm 3
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x ./kubectl && mv kubectl /usr/local/bin/kubectl && \
    NO_PROXY=githubusercontent.com curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.17.0/kind-linux-amd64 && \
    chmod +x ./kind && mv ./kind /usr/local/bin/kind && \
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Don't forget to rebuild the Dev Container after updating the configuration files to apply the changes.
