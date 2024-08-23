---
date: 2024-08-16T00:00:00Z
title: Project Setup
author: Nikko Miu
toc: true
tags:
  - golang
  - graphql
  - ent
---

This first section is all about setting up the project. We will initialize our Go project and set up Cobra
for handling the CLI parts of our application. Once we have this scaffolding in place we can move on to the
larger parts of this.

<!--more-->

## Add Dev Container

I'm going to start off with using a Dev Container to do the development of this project within. The main
benefit of using Dev Containers as opposed to just doing the development directly on your machine is that
we don't have to maintain our development environment since it will be created and torn down automatically
based on the configuration defined in the Dev Container.

I've written a post all about this so I'm not going to cover how to do it here. Check out the
[Set Up Go Dev Container](/posts/set-up-golang-dev-container) post.

## Create the Project

First thing we need to do once we're in the Dev Container (or if you set up your development machine with
all the necessary dependencies) is to create our project directory and initialize our Go module (project):

```bash
go mod init github.com/nikkomiu/spectral
```

I tend to take this time to initialize my Git repository, set up the remote repository (like on GitHub),
set up my remote, as well as commit and push my initial code.

```bash
git init .
```

## Create the Root Command

Lets, start by creating `cmd/cmd.go` where we will define the root level command for the app.
This app will have multiple subcommands, so to make our lives a bit easier I'm going to use the
[cobra](https://github.com/spf13/cobra) package to manage commands, flags, autocomplete, help, etc.

```go {file="cmd/cmd.go"}
package cmd

import (
  "context"

  "github.com/spf13/cobra"
)

var rootCMD = &cobra.Command{
  Use: "spectral",
}

func Execute(ctx context.Context) error {
  return rootCMD.ExecuteContext(ctx)
}
```

As of right now, this isn't going to do much for us since the top-level command is essentially blank.
At this point we're just laying scaffolding for the commands that we will write.

Also, since we added a new package (`github.com/spf13/cobra`) we need to download it and add it to our `go.mod`.
We can do this simply by running:

```bash
go mod tidy
```

## Create the API Command

With our root command in place, we can add the API command that we're going to use to start the API server.
Create the `cmd/api.go` file with the following:

```go {file="cmd/api.go"}
package cmd

import (
  "fmt"

  "github.com/spf13/cobra"
)

var apiCMD = &cobra.Command{
  Use: "api",
  Run: runAPI,
}

func init() {
  rootCMD.AddCommand(apiCMD)
}

func runAPI(cmd *cobra.Command, args []string) {
  fmt.Println("hello api")
}
```

In this we created an `apiCMD` where the **Use** property is the name of the command you'll run in the CLI
and **Run** is the method we will use to execute the command if it's called.
Then in the `init()` method, we register the `apiCMD` with the `rootCMD` as a subcommand.
Finally, we define the `runAPI()` method where, for now, we will just print `hello api`.

## Initial main.go

Create the `main.go` at the root of the project. For now, this will just create a context, run the
`cmd.Execute(context.Context) error` method we just created, and exit with an error code if an `error` is returned.

```go {file=main.go}
package main

import (
  "context"
  "fmt"
  "os"

  "github.com/nikkomiu/spectral/cmd"
)

func main() {
  ctx := context.Background()

  if err := cmd.Execute(ctx); err != nil {
    fmt.Fprintf(os.Stderr, "failed to execute spectral: %s\n", err)
    os.Exit(1)
  }
}
```

We will end up coming back to this file to expand on why we create and pass the context from the `main.go`.
Until that time, basically we just create a new `context.Context` passing it into our `cmd.Execute(context.Context) error`
method and handle any error that comes back by printing it out to the console and returning with a status of 1.

## Test our CLI

Since we are using Cobra, we get some useful things out of the box. We can run the app with our `api` subcommand now to
see the `fmt.Println()` that we put above since we registered this subcommand with the `rootCMD`:

```bash
go run . api
```

```output
hello api
```

We can also run an unknown command, in this case the root command (since we didn't define `Run` for the root command)
and Cobra will print the auto generated help text:

```bash
go run .
```

```output
Usage:
  spectral [command]

Available Commands:
  api
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command

Flags:
  -h, --help   help for spectral

Use "spectral [command] --help" for more information about a command.
```

As you can see, we get a nice interface for our console app just by using Cobra. It also has the nice benefit
of making it easier to have clean code by splitting up commands into their respective dedicated functions.

{{< commit-ref repo="nikkomiu/spectral" sha="3e23d2906834e88b21a951bead957558054cafb7" />}}

## (Optional) Add Description to API and Root Commands

With Cobra we can also add short and long descriptions to our commands. Let's start by adding a short description of our
app to the root command (`cmd/cmd.go`):

```go {linenos=table,hl_lines="3",linenostart=9}
var rootCMD = &cobra.Command{
  Use:   "spectral",
  Short: "Spectral backend application services.",
}
```

Let's also update the API sub-command to include a short description:

```go {linenos=table,hl_lines="3"}
var apiCMD = &cobra.Command{
  Use:   "api",
  Short: "Start the API services for spectral",
  Run:   runAPI,
}
```

We can now see the newly added descriptions within the help of our command:

```bash
go run . --help
```

```output
Spectral backend application services.

Usage:
  spectral [command]

Available Commands:
  api         Start the API services for spectral
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command

Flags:
  -h, --help   help for spectral

Use "spectral [command] --help" for more information about a command.
```

{{< commit-ref repo="nikkomiu/spectral" sha="3b0a3ac3892ef638a83fa2bc61898b7a3d736e78" />}}

## Conclusion

We now have our project set up using Cobra for managing the CLI parts of the app for us and are ready to start adding
the GraphQL API.

In the next section we will use `gqlgen` to scaffold and generate the Go code for us based on GraphQL schema files.
