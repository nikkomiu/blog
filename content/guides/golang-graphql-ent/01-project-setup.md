---
title: Project Setup
author: Nikko Miu
toc: true
weight: 1
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
go mod init github.com/nikkomiu/gentql
```

{{< callout type=warning title=Modification >}}
I am initializing this project on GitHub (`github.com`) under my user account (`nikkomiu`). However, you should modify
this to refer to your own project/git repository. For example, use `gitlab.com/go-nm/gentql` if you are going to host
your repository on GitLab in the `go-nm` group.
{{</ callout >}}

I tend to take this time to initialize my Git repository, set up the remote repository (like on GitHub),
set up my remote, as well as commit and push my initial code.

```bash
git init .
```

{{< commit-ref repo="nikkomiu/gentql" sha="202d14dd3f05a8c643665f82fca49cd061ebd831" />}}

## Create the Root Command

Lets, start by creating `cmd/cmd.go` where we will define the root level command for the app.
This app will have multiple sub-commands, so to make our lives a bit easier I'm going to use the
[cobra](https://github.com/spf13/cobra) package to manage commands, flags, autocomplete, help, etc.

```go {file="cmd/cmd.go"}
package cmd

import (
  "context"

  "github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
  Use: "gentql",

  SilenceUsage: true,
}

func Execute(ctx context.Context) error {
  return rootCmd.ExecuteContext(ctx)
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

var apiCmd = &cobra.Command{
  Use:  "api",
  RunE: runAPI,

  SilenceUsage: true,
}

func init() {
  rootCmd.AddCommand(apiCmd)
}

func runAPI(cmd *cobra.Command, args []string) error {
  fmt.Println("hello api")
  return nil
}
```

In this we created an `apiCmd` where the **Use** property is the name of the command you'll run in the CLI
and **Run** is the method we will use to execute the command if it's called.
Then in the `init()` method, we register the `apiCmd` with the `rootCmd` as a sub-command.
Finally, we define the `runAPI() error` method where, for now, we will just print `hello api`.

## Initial main.go

Create the `main.go` at the root of the project. For now, this will just create a context, run the
`cmd.Execute(context.Context) error` method we just created, and exit with an error code if an `error` is returned.

```go {file=main.go}
package main

import (
  "context"
  "fmt"
  "os"

  "github.com/nikkomiu/gentql/cmd"
)

func main() {
  ctx := context.Background()

  if err := cmd.Execute(ctx); err != nil {
    fmt.Fprintf(os.Stderr, "failed to execute gentql: %s\n", err)
    os.Exit(1)
  }
}
```

We will end up coming back to this file to expand on why we create and pass the context from the `main.go`.
Until that time, basically we just create a new `context.Context` passing it into our `cmd.Execute(context.Context) error`
method and handle any error that comes back by printing it out to the console and returning with a status of 1.

{{< commit-ref repo="nikkomiu/gentql" sha="903b150ed23eb6f9f471f495aa2eddb4c1654195" />}}

## Test our CLI

Since we are using Cobra, we get some useful things out of the box. We can run the app with our `api` sub-command now to
see the `fmt.Println()` that we put above since we registered this sub-command with the `rootCmd`:

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
  gentql [command]

Available Commands:
  api
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command

Flags:
  -h, --help   help for gentql

Use "gentql [command] --help" for more information about a command.
```

As you can see, we get a nice interface for our console app just by using Cobra. It also has the nice benefit
of making it easier to have clean code by splitting up commands into their respective dedicated functions.

## (Optional) Add Description to API and Root Commands

With Cobra we can also add short and long descriptions to our commands. Let's start by adding a short description of our
app to the root command (`cmd/cmd.go`):

```go {file="cmd/cmd.go",add_lines="3",linenostart=9}
var rootCmd = &cobra.Command{
  Use:   "gentql",
  Short: "GentQL backend application services.",

  SilenceUsage: true,
}
```

Let's also update the API sub-command to include a short description:

```go {file="cmd/api.go",add_lines="3"}
var apiCmd = &cobra.Command{
  Use:   "api",
  Short: "Start the API services for gentql",
  RunE:  runAPI,
}
```

We can now see the newly added descriptions within the help of our command:

```bash
go run . --help
```

```output
GentQL backend application services.

Usage:
  gentql [command]

Available Commands:
  api         Start the API services for gentql
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command

Flags:
  -h, --help   help for gentql

Use "gentql [command] --help" for more information about a command.
```

{{< commit-ref repo="nikkomiu/gentql" sha="a296fe4980a1ad52be4aa5809a82e1c10b27008c" />}}

## Conclusion

We now have our project set up using Cobra for managing the CLI parts of the app for us and are ready to start adding
the GraphQL API.

In the next section we will use `gqlgen` to scaffold and generate the Go code for us based on GraphQL schema files.
