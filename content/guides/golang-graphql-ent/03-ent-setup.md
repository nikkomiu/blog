---
title: First ent Schema
author: Nikko Miu
toc: true
weight: 3
tags:
  - golang
  - ent
---

For our project, we are going to use `ent` as our backend datastore. When using ent we get the benefit
of a code-generated client with strongly typed models for the database. It also supports a few different
databases out of the box (SQLite, PostgreSQL, and MySQL), making it very easy to integrate into an
existing workflow.

<!--more-->

## Create our First Entity

With ent, unlike gqlgen, we don't need to add anything to our `tools.go` file nor do we need to do any work to begin
scaffolding our app to work with it. We can simply create our first entity using the `ent` CLI:

```bash
go run -mod=mod entgo.io/ent/cmd/ent new Note
```

{{< callout type=warning >}}
You may get an error when generating this if your version of Go isn't up-to-date. If this is the case, update your Go
installation. If you're using Dev Containers, you'll need to update the version in the Dev Container `Dockerfile`:

```dockerfile {file=".devcontainer/Dockerfile",add_lines=1,rem_lines=2}
FROM golang:1.23-alpine
FROM golang:1.22-alpine
```

Make sure to use the version specified in the error and don't just update to `1.23`.

{{</ callout >}}

With our newly created schema file, we can update the fields for the `Note` schema in the `ent/schema/note.go` file:

```go {file="ent/schema/note.go"}
// Fields of the Note.
func (Note) Fields() []ent.Field {
  return []ent.Field{
    field.String("title"),
    field.Text("body"),

    field.Time("createdAt").
      Default(time.Now),
    field.Time("updatedAt").
      Default(time.Now).
      UpdateDefault(time.Now),
  }
}
```

For our example `Note` schema we have:

- `name` as a string
- `body` as the DB type `TEXT` (string in Go)
- `createdAt` with a default value of `time.Now`
- `updatedAt` with a default value of `time.Now` and `time.Now` when the record is updated.

With this changed, we can now generate the database client as well as all the model code needed to use our new schema.

## Generate Code

To build out the database client we simply need to generate the code using:

```bash
go generate ./...
```

Running this command should result in a bunch of files getting created in the ent directory of our project. These files
that were generated will act as our entire database access layer from opening the database, to querying notes, to
updating and deleting, and even migrating the schema for us when there are changes.

## (Optional) Hide Generated File from VS Code

Generally, I don't care to see all the generated files in my workspace so just like before with the gqlgen files, I'm
going to hide them from my VS Code explorer.

Update the `files.exclude` in `.vscode/settings.json` to exclude the Ent generated files:

```json {file=".vscode/settings.json"}
  // ...
  "gql/{generated,model/*_gen}.go": true,
  "ent/{enttest/,hook/,migrate/,predicate/,runtime/,client.go,ent.go,mutation.go,runtime.go,tx.go,*_create.go,*_delete.go,*_query.go,*_update.go}": true,
  "ent/{note}/": true
  // ...
```

## (Optional) Remove Generated Files from Git

I also tend to not commit these generated files as they're large, don't really apply to our actual code, and just make
for larger and (in some ways) more confusing PRs to the code. Note that there are some downsides to not including these
generated files in Git but none that we have to worry about for this project.

{{< callout type=info >}}
Probably the single largest downside to not adding these generated files in Git is that other Go applications won't run
(as far as I can tell) the `go generate` method when adding the repo as a dependency.
{{</ callout >}}

With that in mind, we can update the `.gitignore` to include ent files except for the ones needed for code generation:

```text {file=".gitignore"}
ent/*
!ent/generate.go
!ent/schema/
```

{{< commit-ref repo="nikkomiu/gentql" sha="eb76dd0623b78df8d1180d36be4f47b67cb3e201" />}}

## Initialize Client

There are a bunch of ways that we can initialize the ent client and manage its lifecycle. For our app, we are going to
initialize the database client in **each** CLI command where we use it. However, if you don't like code duplication
you may want to move this to a more common location. I prefer to keep the database initialization within the individual
commands to avoid the side-effect of the CLI not working properly. This can happen when the database is initialized too
early in our application's call stack.

So, update the `cmd/api.cmd` to initialize our database:

```go {file="cmd/api.go"}
func runAPI(cmd *cobra.Command, args []string) error {
  entClient, err := ent.Open("postgres", os.Getenv("DATABASE_URL"))
  if err != nil {
    return err
  }
  ctx := ent.NewContext(cmd.Context(), entClient)
  defer entClient.Close()

  // ...
```

With this, we open our database using PostgreSQL reading the config from an environment variable. We will update how
we load configuration later by centralizing the config in a common area of the app instead of hardcoding it.

{{< callout type=note >}}
If you're not using the Dev Container or don't have the `DATABASE_URL` environment variable set within your Dev
Container, you should modify the second argument of `Open()` to use a static database connection string for now. When
we update this later to use a config package we will add more robust config loading.

The connection string format that we are using for the database is in the format of
`postgres://[<username>[:<password>]]@<host>[:<port>]/<db_name>?sslmode=disable`. You'll need to replace (or remove) the
parts of the connection string in `<...>` some of them will alter the formatting. When one of them alters the formatting
follow the surrounding `[]` to remove. For more information or more complex database connection settings, check the
[github.com/lib/pq GoDoc](https://pkg.go.dev/github.com/lib/pq#hdr-Connection_String_Parameters) for connection string
parameters.
{{</ callout >}}

With our newly added `ctx` that contains the ent Client, we can also inject the `ctx` into our `NewServer()` method for
the GraphQL server.

```go {file="cmd/api.go"}
srv := gql.NewServer(ctx)
```

Then update the `NewServer()` method to take the `context.Context` as a parameter. Later we'll add other dependencies
to the `context.Context` but for now we're just setting up ent. Modify the `NewServer()` method in `gql/resolver.go`:

```go {file="gql/resolver.go"}
func NewServer(ctx context.Context) *handler.Server {
  return handler.NewDefaultServer(NewExecutableSchema(NewResolver()))
}
```

For now, we won't use the context but when we go to wire `gqlgen` to `ent` we will complete this work.

Also, since we're about to add another CLI command that will also need to initialize the database, I'm going to put the
`_` imports for the individual database drivers that I plan to support within `cmd/cmd.go`:

```go {file="cmd/cmd.go"}
import (
  "context"

  _ "github.com/lib/pq"

  "github.com/spf13/cobra"
)
```

Remember that because we added additional dependencies, the database driver(s), we need to add them to our `go.mod` by
running:

```bash
go mod tidy
```

{{< commit-ref repo="nikkomiu/gentql" sha="016bc1c238f4afb792d623bd7999f6adabb4dba4" />}}

## Database Migrations

Since `ent` works against [T-SQL](https://en.wikipedia.org/wiki/Transact-SQL) databases, we will want to have support
for migrating our database schema when we modify the schema. To support this from the CLI of our app, we're going to
create a new Cobra sub-command in `cmd/migrate.go`:

```go {file="cmd/migrate.go"}
package cmd

import (
  "os"

  "github.com/spf13/cobra"

  "github.com/nikkomiu/gentql/ent"
)

var migrateCmd = &cobra.Command{
  Use:   "migrate",
  Short: "Migrate the database between versions",
  RunE:  runMigrate,
}

func init() {
  rootCmd.AddCommand(migrateCmd)
}

func runMigrate(cmd *cobra.Command, args []string) error {
  entClient, err := ent.Open("postgres", os.Getenv("DATABASE_URL"))
  if err != nil {
    return err
  }
  defer entClient.Close()

  return entClient.Schema.Create(cmd.Context())
}
```

This is similar to the API sub-command from a Cobra perspective. However, in the `runMigrate()` we just open the database
client and call `Create()` on the schema. This will create or update the database schema based on what is currently in
the database.

{{< callout type=note >}}
Another pattern for initializing the client that I'll follow for this as an alternative is to have a `pkg/client/ent.go`
where the `ent` client initialization happens. Using this abstraction, we can remove the code duplication and have our
database driver files centrally located in an easy to find place.

To set a simple PostgreSQL database connection string in your environment variables with a locally running database you
can use something like (or use the connection string part as the static string instead of `os.Getenv()`):

```bash
export DATABASE_URL=postgres://localhost/gentql_dev?sslmode=disable
```

{{</ callout >}}

For the migration we can also use the `WriteTo()` method to write it to an `io.Writer`. A simple example of this that we
can implement is to add a dry run flag which will print the schema changes to `stdout` by updating the `cmd/migrate.go`
to look like:

```go {file="cmd/migrate.go"}
package cmd

import (
  "os"

  "github.com/spf13/cobra"

  "github.com/nikkomiu/gentql/ent"
)

var migrateCmd = &cobra.Command{
  Use:   "migrate",
  Short: "Migrate the database between versions",
  RunE:  runMigrate,
}

func init() {
  migrateCmd.Flags().BoolP("dry", "d", false, "Write the schema output to stdout instead of updating the database")

  rootCmd.AddCommand(migrateCmd)
}

func runMigrate(cmd *cobra.Command, args []string) error {
  dryRun, err := cmd.Flags().GetBool("dry")
  if err != nil {
    return err
  }

  entClient, err := ent.Open("postgres", os.Getenv("DATABASE_URL"))
  if err != nil {
    return err
  }
  defer entClient.Close()

  if dryRun {
    return entClient.Schema.WriteTo(cmd.Context(), os.Stdout)
  } else {
    return entClient.Schema.Create(cmd.Context())
  }
}
```

{{< callout type=note >}}
Later, we will also remove all references to the `panic(err)` calls that are currently in our code so we can properly
handle errors. Using `panic()` is generally not recommended in Go applications and instead we should return `error` from
funcs that can create errors.
{{</ callout >}}

With this change if you get the help for the `migrate` command you'll see the new flag added:

```bash
go run . migrate --help
```

```output
Migrate the database between versions

Usage:
  gentql migrate [flags]

Flags:
  -d, --dry    Write the schema output to stdout instead of updating the database
  -h, --help   help for migrate
```

Also, because we set up the flag with a variable reference the variable will automatically be set when it is set by
someone using the CLI.

{{< commit-ref repo="nikkomiu/gentql" sha="4a4118b47551fa9fc20a95f1f80c63bbc385e972" />}}

## Perform First Migration

Now that we have the migration sub-command set up we need to migrate our database to the latest version, so we can begin
to use the newly added Note schema:

```bash
go run . migrate
```

{{< callout type=note >}}
If you don't run the `migrate` before continuing you will get an error when trying to use the schema for the first time
in a later section. However, the error for this tends to be pretty verbose, so you should get that you just need to run
migrations at that time.
{{</ callout >}}

## Add entgql Extension

The last thing we need to do in this section is to add the `entgql` extension to `ent`. To do this we need to update a
few things. Let's start by creating `ent/entc.go`:

```go {file="ent/entc.go"}
//go:build ignore
// +build ignore

package main

import (
  "log"

  "entgo.io/contrib/entgql"
  "entgo.io/ent/entc"
  "entgo.io/ent/entc/gen"
)

func main() {
  ex, err := entgql.NewExtension()
  if err != nil {
    log.Fatalf("creating entgql extension: %s", err)
  }

  if err = entc.Generate("./schema", &gen.Config{}, entc.Extensions(ex)); err != nil {
    log.Fatalf("running ent codegen: %s", err)
  }
}
```

With this file added, we need to add it to source control. Update the `.gitignore` to include this file in Git:

```text {file=".gitignore"}
ent/*
!ent/entc.go
```

Next update `ent/generate.go` to use the `entc.go` instead of the default generate command:

```go {file="ent/generate.go"}
package ent

//go:generate go run -mod=mod entc.go
```

Don't forget to regenerate the code to include the `entgql` extension addons:

```bash
go generate ./...
```

Also, this will cause more files to be generated in the `ent` directory of the project. If you want, include these
generated files in the `.vscode/settings.json` to exclude them from the explorer view as well as the others:

```json {file=".vscode/settings.json"}
  "ent/{gql_*.go}": true,
  "ent/{note}{/,.go}": true
```

This part is generally following along with the [GraphQL Integration](https://entgo.io/docs/graphql) page of ent's
documentation. We will continue to advance past this initial setup document. However, it (along with the
[GraphQL Tutorial](https://entgo.io/docs/tutorial-todo-gql)) are great resources that will expand on what we are doing
here.

{{< commit-ref repo="nikkomiu/gentql" sha="fb673ea5409ea524951640004ea20b57c3207e72" />}}

## Conclusion

Now we should have `ent` set up for our app, the first schema defined, and database migrations working in the CLI.

{{< callout type=note >}}
I don't get into it much in this guide, however, `ent` is technically a graph database adapter. Having ent designed to
work with graph databases allows for some very interesting and complex graph traversals over our data to query for data
in an easy-to-use way.

For more information on ent, take a look at [their documentation](https://entgo.io/docs/getting-started).
{{</ callout >}}

Next we're going to look at wiring `ent` to `gqlgen`, so we don't have to manually manage the connection between the
ent and gqlgen models, as well as some other GraphQL concepts that are recommended.
