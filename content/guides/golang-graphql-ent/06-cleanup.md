---
title: Clean Up Code
author: Nikko Miu
toc: true
weight: 6
tags:
  - golang
  - graphql
  - ent
---

At this point, we have created our first entity and used it with `gqlgen` to build our GraphQL API. Now let's take a
quick to fix up some issues that have been left around up to this point.

<!--more-->

## Replace Hello Resolver with Ping

We no longer have a need for our `hello(String!): String!` resolver. To show what happens when we remove a resolver from
our GraphQL API, let's replace this with another, similar, resolver. First, remove the resolver from the `common.graphql`
schema so the `Query` should now look like:

```graphql {file="gql/schema/common.graphql"}
type Query {
  node(nodeId: ID!): Node
}
```

Once removed, we can regenerate our code:

```bash
go generate ./...
```

Now if you open the `common.go` file, you should see that our resolver wasn't exactly removed. Instead, when we
regenerated our code the resolver was moved to the bottom of the file with a very large daunting comment about how it
was going to be deleted, but it was saved here just in case you still needed it:

```go {file="gql/common.go"}
// !!! WARNING !!!
// The code below was going to be deleted when updating resolvers. It has been copied here so you have
// one last chance to move it out of harms way if you want. There are two reasons this happens:
//   - When renaming or deleting a resolver the old code will be put in here. You can safely delete
//     it when you're done.
//   - You have helper methods in this file. Move them out to keep these resolver files clean.
func (r *queryResolver) Hello(ctx context.Context, name string) (string, error) {
  return fmt.Sprintf("Hello, %s!", name), nil
}
```

We need to get rid of this code since we no longer need it and keeping it here isn't going to work. With this removed,
we can add our new `ping` endpoint. This will be a resolver that just responds with the static string "pong" when it's
called.

```graphql {file="gql/schema/common.graphql"}
type Query {
  ping: String!
}
```

I tend to keep this method around, so I can test if there is an error reaching our service. Think of it like a GraphQL
liveness probe we can use in our apps to make sure the API is working.

Once this is added to the `Query` we can regenerate our code again:

```bash
go generate ./...
```

Then all we need to do is implement our resolver. As I said before, all we really want here is to return the static
string "pong":

```go {file="gql/common.go"}
// Ping is the resolver for the ping field.
func (r *queryResolver) Ping(ctx context.Context) (string, error) {
  return "pong", nil
}
```

That's all there is to it! We now have a ping endpoint that we can use. We also got to see what happens to our code when
we remove a resolver when `gqlgen`.

{{< commit-ref repo="nikkomiu/gentql" sha="188f4ef9d974bbdfbafc58cb922d62ca6fe9a469" />}}

## Exit Code Error

We now have the ability to exit our app when there is an error. However, it would be great if we could generate an error
that contains a **specific** exit code to return when the app fails instead of just returning the hard-coded `2`.

Let's create this all in `pkg/errors/exitcode.go`:

```go {file="pkg/errors/exitcode.go"}
package errors

type ExitCoder interface {
  error
  ExitCode() int
}

type ExitCodeError struct {
  innerErr   error
  statusCode int
}

var _ ExitCoder = ExitCodeError{}

func NewExitCode(innerErr error, statusCode int) ExitCodeError {
  return ExitCodeError{
    innerErr:   innerErr,
    statusCode: statusCode,
  }
}

func (e ExitCodeError) Error() string {
  return e.innerErr.Error()
}

func (e ExitCodeError) String() string {
  return e.Error()
}

func (e ExitCodeError) Unwrap() error {
  return e.innerErr
}

func (e ExitCodeError) ExitCode() int {
  return e.statusCode
}
```

First, we're creating an interface (remember that interfaces in go should end in **er**) where we inherit the `error`
interface and extend it with an `ExitCode() int` method. So any struct that implements both `error` and `ExitCode() int`
can now be considered an `ExitCoder`.

Then, we're just creating the struct that implements this interface (with a static compilation check that we do actually
properly implement this interface). We also include the `Unwrap() error` method, so the error can be unwrapped using the
`errors.Unwrap() error` method that is in the Go `errors` package.

We can now check for this interface in the `main()` func:

```go {file="main.go"}
func main() {
  ctx := context.Background()
  ctx, cancel := signal.NotifyContext(ctx, syscall.SIGHUP, syscall.SIGINT, syscall.SIGQUIT, syscall.SIGTERM)
  defer cancel()

  if err := cmd.Execute(ctx); err != nil {
    var exitCode int
    switch typedErr := err.(type) {
    case errors.ExitCodeError:
      exitCode = typedErr.ExitCode()

    default:
      exitCode = 1
    }

    os.Exit(exitCode)
  }
}
```

Here we're updating the `os.Exit(int)` to take a variable that we initialize to our default value of `2`. Then we do a
check on the underlying type of `err` to see if it implements the `errors.ExitCodeError` interface. If it does, we can
access it by the assigned variable of `typedErr` which will essentially cast the `err` to the type in the switch
statement. If we didn't do this, we would need to manually cast it and check that the cast works correctly (check for `nil`).

{{< commit-ref repo="nikkomiu/gentql" sha="85f92d256f190c1946a6332c4b35ac345c7cfc80" />}}

Now that this is all in place, we can use it anywhere in our code (where errors are bubbled up to the `run` commands).

```go {file="cmd/api.go"}
entClient, err := ent.Open("postgres", os.Getenv("DATABASE_URL"))
if err != nil {
  return errors.NewExitCode(err, 3)
}
ctx := ent.NewContext(cmd.Context(), entClient)
defer entClient.Close()
```

This is by no means required, but sometimes it is nice to be able to customize errors with additional fields, info, and
wrapping/unwrapping. I have only used this specific error type in a few different situations. However, the principles
can be reapplied to things like wrapping HTTP errors, so you can return an error from an HTTP endpoint safely. This can
be accomplished by using an extra method for `HTTPError() string` where if it doesn't exist just returns some default
error text instead of leaking internal errors back to users of our API. Which I've found to be especially useful for
things like request validations in HTTP APIs written in Go.

{{< commit-ref repo="nikkomiu/gentql" sha="6375bf095915e9e843c633bdf3743dd2c2b1b89e" />}}

## Centralizing Configuration

I want to have my configuration centralized to a single place that has a simple API for getting the configuration for
the application. We could use something like [Viper](https://github.com/spf13/viper) from the creator of
[Cobra](https://github.com/spf13/viper). However, I tend to only load configuration from environment variables since I
follow [The Twelve-Factor App](https://12factor.net/) which loads configuration from environment variables. Another
great reason for using environment variables is my deployment environment for apps is almost always Kubernetes which
is great at handling environment variable based configuration.

### Relocate Configuration

First thing we will do is create our new configuration home at `pkg/config/app.go`:

```go {file="pkg/config/app.go"}
package config

import (
  "fmt"
  "os"
)

type App struct {
  Server   HTTPServer
  Database Database
}

type HTTPServer struct {
  Host string
  Port int
}

type Database struct {
  Driver string
  URL    string
}

func (hs HTTPServer) DisplayAddr() string {
  host := hs.Host
  if host == "" {
    host = "localhost"
  }
  return fmt.Sprintf("http://%s:%d/", host, hs.Port)
}

func (hs HTTPServer) Addr() string {
  return fmt.Sprintf("%s:%d", hs.Host, hs.Port)
}

func GetApp() App {
  return App{
    Server: HTTPServer{
      Host: "",
      Port: 8080,
    },
    Database: Database{
      Driver: "postgres",
      URL:    os.Getenv("DATABASE_URL"),
    },
  }
}
```

We just have a few structs (could be one large one if you prefer) with a couple of helper methods (`DisplayAddr() string`
and `Addr() string`) and finally the `GetApp() App` func which returns our app config. Later we will update the
`GetApp() App` method to use a singleton to only load the configuration once.

### Update Commands to Use Config

Now, let's update our CLI commands to use the configuration instead of using the hard-coded values. First up, let's do
the migrate command:

```go {file="cmd/migrate.go"}
  cfg := config.GetApp()

  entClient, err := ent.Open(cfg.Database.Driver, cfg.Database.URL)
  if err != nil {
    return errors.NewExitCode(err, 3)
  }
  defer entClient.Close()
```

Then we can update our API command to also use the config:

```go {file="cmd/api.go"}
func runAPI(cmd *cobra.Command, args []string) (err error) {
  cfg := config.GetApp()

  entClient, err := ent.Open(cfg.Database.Driver, cfg.Database.URL)
  if err != nil {
    return errors.NewExitCode(err, 3)
  }
  ctx := ent.NewContext(cmd.Context(), entClient)
  defer entClient.Close()

  router := chi.NewRouter()

  router.Use(
    middleware.RequestID,
    middleware.RealIP,
    middleware.Logger,
    middleware.Recoverer,
  )

  srv := gql.NewServer(ctx)
  router.Handle("/graphql", srv)
  router.Handle("/graphiql", playground.Handler("GentQL", "/graphql"))

  fmt.Printf("starting server at %s\n", cfg.Server.DisplayAddr())
  return http.ListenAndServe(cfg.Server.Addr(), router)
}
```

{{< commit-ref repo="nikkomiu/gentql" sha="f678a2a82d1d15c8b077c60abaacddbb0a79639f" />}}

### Environment Variable Package

Let's start with creating a new package that is responsible for loading and parsing properties from environment
variables. You could import a package to do this, but I usually just write it myself in the app I'm working on. This is
mainly because when the need arises to map environment variables to custom types (like an Enum or `zap` Config) I don't
need even more dependencies and/or introspection to get it to work well. So I'm just going to create `pkg/env/env.go`
with the following:

```go {file="pkg/env/env.go"}
package env

import (
  "os"
  "strconv"
)

func Str(key, defaultValue string) string {
  if val, ok := os.LookupEnv(key); ok {
    return val
  }

  return defaultValue
}

func Int(key string, defaultValue int) int {
  if val, err := strconv.Atoi(os.Getenv(key)); err == nil {
    return val
  }

  return defaultValue
}
```

### Using our Environment Variable Package

```go {file="pkg/config/app.go"}
func GetApp() App {
  return App{
    Server: HTTPServer{
      Host: env.Str("ADDRESS", ""),
      Port: env.Int("PORT", 8080),
    },
    Database: Database{
      Driver: env.Str("DATABASE_DRIVER", "postgres"),
      URL:    env.Str("DATABASE_URL", "postgres://localhost/gentql_dev?sslmode=disable"),
    },
  }
}
```

{{< commit-ref repo="nikkomiu/gentql" sha="b0c29dba5142d6e7e775a424f6eb79749b4c1a27" />}}

### App Config Singleton

With everything in place it would be nice if every time there was a call to `GetApp() App` it didn't re-fetch the
environment variables and do all of that logic. Instead, we could create a singleton instance for the configuration and
on the first call to `GetApp() App` it can just load the configuration.

Let see how we can accomplish this:

```go {file="pkg/config/app.go"}
var currentApp *App

func loadApp() {
  currentApp = &App{
    Server: HTTPServer{
      Host: env.Str("ADDRESS", ""),
      Port: env.Int("PORT", 8080),
    },
    Database: Database{
      Driver: env.Str("DATABASE_DRIVER", "postgres"),
      URL:    env.Str("DATABASE_URL", "postgres://localhost/gentql_dev?sslmode=disable"),
    },
  }
}

func GetApp() App {
  if currentApp == nil {
    loadApp()
  }
  return *currentApp
}
```

The `GetApp() App` func has been refactored to check the package-level variable `currentApp`. If this variable is
`nil`, we load the app config using the `loadApp()` func. Either way we will return a **copy** of the app config at the
end.

{{< commit-ref repo="nikkomiu/gentql" sha="9a75e2e5263657985824e053e59e760b1d9bbc11" />}}

## OS Signal Handling

Now I want to respond to OS signals where if a signal is passed to the running application (like `SIGHUP`) it will be
shut down gracefully.

The HTTP Server in Go doesn't support running with a `context.Context`. This means that the server can't be stopped by
the `Done() chan` being closed for a `context.Context`. First I want to create a wrapper around the `ListenAndServe()`
func to take a context that will shut down the HTTP server when the context is canceled.

```go {file="pkg/sig/sig.go"}
package sig

import (
  "context"
  "net/http"
  "time"
)

func ListenAndServe(ctx context.Context, addr string, handler http.Handler, shutdownTimeout time.Duration) error {
  server := &http.Server{Addr: addr, Handler: handler}

  errChan := make(chan error)
  go func() {
    if err := server.ListenAndServe(); err != nil {
      errChan <- err
    }
  }()

  select {
  case err := <-errChan:
    return err

  case <-ctx.Done():
    // do nothing
  }

  ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
  defer cancel()

  return server.Shutdown(ctx)
}
```

Then we can simply use it by updating our API sub-command:

```go {file="cmd/api.go"}
return sig.ListenAndServe(ctx, cfg.Server.Addr(), router, 3*time.Second)
```

{{< commit-ref repo="nikkomiu/gentql" sha="aad03f7f10b7914b8ab4abdbdf3d7f50a3d206f1" />}}

### (Optional) Load Shutdown Timeout from Config

Also, take a minute to move the final parameter (the shutdown timeout) into a property on the `HTTPServer` app config
and read the value from a new `env.Duration(key string, defaultValue time.Duration) time.Duration` that parses the
duration from a string.

{{< section title="Step By Step" >}}

Add the `env.Duration(string, time.Duration) time.Duration` to the `pkg/env/env.go` file:

```go {file="pkg/env/env.go"}
func Duration(key string, defaultValue time.Duration) time.Duration {
  if val, err := time.ParseDuration(os.Getenv(key)); err == nil {
    return val
  }

  return defaultValue
}
```

Update the `pkg/config/app.go` to add the property to the struct and set the value:

```go {file="pkg/config/app.go"}
type HTTPServer struct {
  Host string
  Port int

  ShutdownTimeout time.Duration
}

// ...

func loadApp() {
  currentApp = &App{
    Server: HTTPServer{
      Host: env.Str("ADDRESS", ""),
      Port: env.Int("PORT", 8080),

      ShutdownTimeout: env.Duration("SERVER_SHUTDOWN_TIMEOUT", 10*time.Second),
    },
    Database: Database{
      Driver: env.Str("DATABASE_DRIVER", "postgres"),
      URL:    env.Str("DATABASE_URL", "postgres://localhost/gentql_dev?sslmode=disable"),
    },
    // ...
```

Finally, update the `cmd/api.go` to use the property:

```go {file="cmd/api.go"}
return sig.ListenAndServe(ctx, &http.Server{Addr: cfg.Server.Addr(), Handler: router}, cfg.Server.ShutdownTimeout)
```

{{</ section >}}

{{< commit-ref repo="nikkomiu/gentql" sha="1ee540a88b95f64fbac906a791f85fe287374762" />}}
