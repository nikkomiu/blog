---
date: 2024-08-15T00:00:00Z
title: Setting Up gqlgen
author: Nikko Miu
toc: true
tags:
  - golang
  - graphql
  - gqlgen
---

Now that we have an application scaffolded with Cobra we can set up gqlgen. This library is great because it will allow
us to create our GraphQL schema files and generate the scaffolding for the parts of the app that need code to resolve
them. It's super developer friendly so don't worry if it doesn't make sense yet.

<!--more-->

Since we're going to be touching on our first GraphQL concepts here, if you're not already familiar with GraphQL or just
need a refresh, I recommend taking a look at the [Introduction to GraphQL](https://graphql.org/learn/). This will help
you to understand the concepts of the GraphQL language and how it's going to be relevant to you. However, I'll tend to
keep the concepts within GraphQL to a minimum.

## Adding gqlgen Tools

The first thing we need to do is add the tools that are used to our project via a pattern were tools get included as
development dependencies through a `tools.go` file at the root of the project. Create the `tools.go` file and put the
following in it:

```go {file="tools.go"}
//go:build tools

package tools

import (
  _ "github.com/99designs/gqlgen"
  _ "github.com/99designs/gqlgen/graphql/introspection"
)
```

Let's break down what's in this file. First we put a comment to define the Go build environment. In this case we set it
to tools so that (by default when building the app) this file isn't included in the build. Next we setting the
package for this file. Since we aren't including it in the build we can call it whatever we want (so don't worry that
it doesn't match the root-level `package` in `main.go`). Finally, we just need to use the `_` (blank identifier) for
the packages since we don't actually _use_ them.

Doing all of this will allow us to keep our tools versioned and managed through our `go.mod` and `go.sum` files. Now
that we have that file created we can add them to the `go.mod` by running:

```bash
go mod tidy
```

{{< commit-ref repo="nikkomiu/gentql" sha="a19a97599f243b6af71c0e8d34514b8156f86e95" />}}

## Initialize gqlgen

With the tools added, we can now initialize `gqlgen` in our project. In a terminal session from the root of the project
run the following command to generate the initial resources:

```bash
go run github.com/99designs/gqlgen init
```

A handful of files will be created to get us started. However, since we're managing our app from Cobra we are going to
delete the `server.go` file that was created at the top-level of our project. We will be reimplementing what's in there
within the `cmd/api.go` file. Feel free to take a look at the contents of it to see how our version will be similar to
the default one.

## (Optional) Configure Code Generation

I'm fairly particular about the structure of my projects so I am going to modify the generation settings by editing the
`gqlgen.yml`:

```yaml {file="gqlgen.yml"}
schema:
  - gql/schema/*.graphql

exec:
  filename: gql/generated.go
  package: gql

model:
  filename: gql/model/models_gen.go
  package: model

resolver:
  layout: follow-schema
  dir: gql
  package: gql
  filename_template: "{name}.resolvers.go"
  omit_template_comment: false

models:
  ID:
    model:
      - github.com/99designs/gqlgen/graphql.ID
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
      - github.com/99designs/gqlgen/graphql.Int32
  Int:
    model:
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
      - github.com/99designs/gqlgen/graphql.Int32
```

I'm making a handful of changes that make it a little bit cleaner. This is all personal preference so don't feel like
you need to follow this:

- I prefer all of my top-level packages to be three letters (`gql` in our case). It's not a requirement by any
  means, it's just a convention that the community has tended to adopt.
- Keeping my schema files in their own directory
- Split up my schema files by their top level resource (project, task, note, etc.) with one common file.

With the config file updated, we can delete the old `graph` directory. We don't need it as the content within our new
`gql` directory will be regenerated when we run the generate command.

## Generate Hello World

Let's create our first schema file. We'll create the common schema (`gql/schema/common.graphql`) with a "hello world"
example:

```graphql {file="gql/schema/common.graphql"}
type Query {
  hello(name: String!): String!
}
```

This file will contain all of the definitions that aren't tied to a specific resource and are generally used in many
of the schema files. For now though, we're just going to create the handler to [query](https://graphql.org/learn/queries/)
our GraphQL instance a "hello world" example.

Now that we've updated our schema file we can generate our code again:

```bash
go run github.com/99designs/gqlgen generate
```

## (Optional) Hide Generated Files in VS Code

I prefer that VS Code not show me generated code in the file explorer (when you go to a definition it will still open
that file and show you what you're looking for). Create the `.vscode/settings.json` file with the following:

```json {file=".vscode/settings.json"}
{
  "files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,
    "**/Thumbs.db": true,
    "gql/{generated,model/*_gen}.go": true
  }
}
```

{{< callout type=note >}}
We are only adding the last of the `files.exclude`. The other entries in this are all excluded in VS Code
by default.
{{</ callout >}}

## (Optional) Add to .gitingore

Before we commit our changes, we're going to add the generated code that we don't change (more on that later) to a
`.gitignore` file:

```text {file=".gitignore"}
gql/model/*_gen.go
gql/generated.go
```

{{< commit-ref repo="nikkomiu/gentql" sha="cb0d64bbeef6959e89939293e82a8208330405e9" />}}

## Create the Resolver

To get our GraphQL server to a usable state, we need to modify the `gql/resolver.go` file:

```go {file="gql/resolver.go"}
package gql

import "github.com/99designs/gqlgen/graphql/handler"

//go:generate go run github.com/99designs/gqlgen generate

type Resolver struct{}

func NewResolver() Config {
  return Config{
    Resolvers: &Resolver{},
  }
}

func NewServer() *handler.Server {
  return handler.NewDefaultServer(NewExecutableSchema(NewResolver()))
}
```

For now, we are just keeping the code more self-contained within the `gql` package. This will later provide us the place
where we can inject dependencies into the resolver methods that we add to the GraphQL API.

## Initialize the HTTP Server

Next up we need to set up the GraphQL server to run within our API command. Modify the `cmd/api.go` to create our
GraphQL server:

```go {file="cmd/api.go"}
package cmd

import (
  "net/http"

  "github.com/99designs/gqlgen/graphql/playground"
  "github.com/go-chi/chi/v5"
  "github.com/spf13/cobra"

  "github.com/nikkomiu/gentql/gql"
)

var apiCMD = &cobra.Command{
  Use:   "api",
  Short: "Start the API services for gentql",
  Run:   runAPI,
}

func init() {
  rootCMD.AddCommand(apiCMD)
}

func runAPI(cmd *cobra.Command, args []string) {
  router := chi.NewRouter()

  srv := gql.NewServer()
  router.Handle("/graphql", srv)
  router.Handle("/graphiql", playground.Handler("GentQL", "/graphql"))

  err := http.ListenAndServe(":8080", router)
  if err != nil {
    panic(err)
  }
}
```

Since we added Chi for the HTTP router, we need to update our dependencies:

```bash
go mod tidy
```

## Testing our Endpoint

We can start our API now and test our `hello(name)` query. Run the following from your terminal:

```bash
go run . api
```

Navigate to the GraphQL UI endpoint ([http://localhost:8080/graphiql](http://localhost:8080/graphiql)) where we can
interact with our GraphQL API directly within a browser. We can now query for our hello method with the following:

```graphql
query {
  hello(name: "Joe")
}
```

If we execute this we should get back something like:

```json
{
  "errors": [
    {
      "message": "internal system error",
      "path": ["hello"]
    }
  ],
  "data": null
}
```

This error is coming from our resolver method. When we generated our code there was a method created for us to query
for the `hello(name)`. Currently, this method is set to cause the app to `panic()` but the GraphQL server will properly
catch the panic within our resolver to keep it contained to just the single request.

Open the `gql/common.resolvers.go` file and update the `Hello(context.Context, string)` method:

```go {file="gql/common.resolvers.go"}
// Hello is the resolver for the hello field.
func (r *queryResolver) Hello(ctx context.Context, name string) (string, error) {
  return fmt.Sprintf("Hello, %s!", name), nil
}
```

This way we will return a string (and no error) from our `Hello(context.Context, string)` method. Now, restart the app
and re-run the query in your browser to get back the response we were hoping for:

```json
{
  "data": {
    "hello": "Hello, Joe!"
  }
}
```

## Adding Chi Middleware

Chi includes middleware with it. Some of them are useful to have enabled by default. Let's add them to our API now:

```go {file="cmd/api.go"}
  router := chi.NewRouter()

  router.Use(
    middleware.RequestID,
    middleware.RealIP,
    middleware.Logger,
    middleware.Recoverer,
  )

  srv := gql.NewServer()
  //...
```

{{< callout type=note >}}
If you get an error on importing `chi`, make sure the `middleware` import has `v5` in it. If it doesn't fix the import
manually:

```go {file="cmd/api.go",add_lines="6"}
import (
  "net/http"

  "github.com/99designs/gqlgen/graphql/playground"
  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
  // ...
```

{{</ callout >}}

## Conclusion

You should now have your GraphQL API endpoints created and wired into your app CLI. We also explored how Go methods
get generated for us with the request and response properties automatically mapped to function arguments and return
parameters.

Next up, we're going to add `ent` to manage our database layer for us using code-generation as well.
