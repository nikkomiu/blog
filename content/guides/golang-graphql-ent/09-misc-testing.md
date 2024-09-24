---
title: Add Remaining Tests
author: Nikko Miu
toc: true
weight: 9
tags:
  - golang
  - golang testing
---

With our resolver tests in place, we can turn our attention to testing the remainder of the application. Here we're
going to test the `pkg/config`, `pkg/env`, `pkg/errors`, `pkg/sig`, and finally the `cmd`. We won't be testing `main.go`
right now as testing `main.go` will be more of an end-to-end test. We can always create tests for it, but with the
current simplicity of our `main.go` I'm not too worried about testing it using this method.

<!--more-->

## pkg

Let's look first at our `pkg` tests. These are going to be pretty simple, and after we completed the resolvers there are
only a couple of new things that we need to cover in order to complete these tests. Let's build them up starting from
the `env` package.

### Env

For the `env` package, we are going to use the `t.Setenv()` func in order to set environment variables that will be
unset after the test has completed (basically it registers a `Cleanup()` handler to set the value back to the original
on when we're done testing).

```go {file="pkg/env/env_test.go"}
package env_test

import (
  "testing"
  "time"

  "github.com/stretchr/testify/assert"

  "github.com/nikkomiu/gentql/pkg/env"
)

func TestStr(t *testing.T) {
  key := "TEST_ENV_STR"
  defaultValue := "DEFAULT_STRING_VALUE"

  tt := []struct {
    name     string
    value    string
    expected string
  }{
    {name: "base", value: "some", expected: "some"},
    {name: "default", expected: defaultValue},
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      if tc.value != "" {
        t.Setenv(key, tc.value)
      }

      // Act
      val := env.Str(key, defaultValue)

      // Assert
      assert.Equal(t, tc.expected, val)
    })
  }
}

func TestInt(t *testing.T) {
  key := "TEST_ENV_INT"
  defaultValue := 33

  tt := []struct {
    name     string
    value    string
    expected int
  }{
    {name: "base", value: "30", expected: 30},
    {name: "bad value", value: "string", expected: defaultValue},
    {name: "default", expected: defaultValue},
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      if tc.value != "" {
        t.Setenv(key, tc.value)
      }

      // Act
      val := env.Int(key, defaultValue)

      // Assert
      assert.Equal(t, tc.expected, val)
    })
  }
}

func TestDuration(t *testing.T) {
  key := "TEST_ENV_DURATION"
  defaultValue := time.Minute

  tt := []struct {
    name     string
    value    string
    expected time.Duration
  }{
    {name: "base", value: "1m30s", expected: time.Minute + (30 * time.Second)},
    {name: "bad value", value: "string", expected: defaultValue},
    {name: "default", expected: defaultValue},
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      if tc.value != "" {
        t.Setenv(key, tc.value)
      }

      // Act
      val := env.Duration(key, defaultValue)

      // Assert
      assert.Equal(t, tc.expected, val)
    })
  }
}
```

{{< commit-ref repo="nikkomiu/gentql" sha="d158f4ce9ce9c71748f56da4c9704e8b25c0ae61" />}}

### Config

Building on the `env` package, we can now test our `config` package. We only have a few test cases for the config
package:

- initial loading of the config (**default**)
- initial loading of the config (**explicit**)
- getting the existing config

The reason I'm splitting these up is to ensure that our _singleton_ is working as expected, and we aren't trying to
reload the config from environment variables on every `GetApp()` call.

```go {file="pkg/config/app_test.go"}
package config_test

import (
  "os"
  "testing"
  "time"

  "github.com/stretchr/testify/assert"

  "github.com/nikkomiu/gentql/pkg/config"
)

func unsetenv(t *testing.T, key string) {
  val, ok := os.LookupEnv(key)
  if !ok {
    return
  }

  if err := os.Unsetenv(key); err != nil {
    t.Fatalf("failed to unset env var (%s): %s", key, err)
  }
  t.Cleanup(func() {
    os.Setenv(key, val)
  })
}

func TestApp(t *testing.T) {
  t.Run("initial default", testAppInitialDefault)
  t.Run("initial override", testAppInitialOverride)
  t.Run("existing", testAppExisting)
}

func testAppInitialDefault(t *testing.T) {
  // Arrange
  unsetenv(t, "ADDRESS")
  unsetenv(t, "PORT")
  unsetenv(t, "SERVER_SHUTDOWN_TIMEOUT")
  unsetenv(t, "DATABASE_DRIVER")
  unsetenv(t, "DATABASE_URL")

  // Act
  cfg := config.GetApp()

  // Assert
  assert.Equal(t, cfg.Server.Host, "")
  assert.Equal(t, cfg.Server.Port, 8080)
  assert.Equal(t, cfg.Server.Addr(), ":8080")
  assert.Equal(t, cfg.Server.DisplayAddr(), "http://localhost:8080/")
  assert.Equal(t, cfg.Server.ShutdownTimeout, 10*time.Second)
  assert.Equal(t, cfg.Database.Driver, "postgres")
  assert.Equal(t, cfg.Database.URL, "postgres://localhost/gentql_dev?sslmode=disable")
}

func testAppInitialOverride(t *testing.T) {
  // Arrange
  t.Setenv("ADDRESS", "10.0.0.10")
  t.Setenv("PORT", "9999")
  t.Setenv("SERVER_SHUTDOWN_TIMEOUT", "1m")
  t.Setenv("DATABASE_DRIVER", "sqlite")
  t.Setenv("DATABASE_URL", "file:ent?mode=memory&_fk=1")

  // Act
  cfg := config.GetApp()

  // Assert
  assert.Equal(t, cfg.Server.Host, "10.0.0.10")
  assert.Equal(t, cfg.Server.Port, 9999)
  assert.Equal(t, cfg.Server.Addr(), "10.0.0.10:9999")
  assert.Equal(t, cfg.Server.DisplayAddr(), "http://10.0.0.10:8080/")
  assert.Equal(t, cfg.Server.ShutdownTimeout, time.Minute)
  assert.Equal(t, cfg.Database.Driver, "sqlite")
  assert.Equal(t, cfg.Database.URL, "file:ent?mode=memory&_fk=1")
}

func testAppExisting(t *testing.T) {
  // Arrange
  unsetenv(t, "ADDRESS")
  unsetenv(t, "PORT")
  unsetenv(t, "SERVER_SHUTDOWN_TIMEOUT")
  unsetenv(t, "DATABASE_DRIVER")
  unsetenv(t, "DATABASE_URL")
  config.GetApp()
  t.Setenv("ADDRESS", "10.0.0.11")

  // Act
  cfg := config.GetApp()

  // Assert
  assert.Equal(t, cfg.Server.Host, "10.0.0.11")
}
```

If you try to run the tests for this, you'll see that it fails. Our testing concept is sound, however, because we rely
on a global variable that can't be unset (because of our implementation), we need to refactor our code to make our
`GetApp()` func testable:

```go
package config

import (
  "context"
  "fmt"
  "time"

  "github.com/nikkomiu/gentql/pkg/env"
)

type contextKey string

const (
  appContextKey contextKey = "appConfig"
)

type App struct {
  Server   HTTPServer
  Database Database
}

type HTTPServer struct {
  Host string
  Port int

  ShutdownTimeout time.Duration
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

func WithApp(ctx context.Context) (context.Context, App) {
  cfg := &App{
    Server: HTTPServer{
      Host: env.Str("ADDRESS", ""),
      Port: env.Int("PORT", 8080),

      ShutdownTimeout: env.Duration("SERVER_SHUTDOWN_TIMEOUT", 10*time.Second),
    },
    Database: Database{
      Driver: env.Str("DATABASE_DRIVER", "postgres"),
      URL:    env.Str("DATABASE_URL", "postgres://localhost/gentql_dev?sslmode=disable"),
    },
  }

  return context.WithValue(ctx, appContextKey, cfg), *cfg
}

func AppFromContext(ctx context.Context) App {
  c, ok := ctx.Value(appContextKey).(*App)
  if !ok {
    fmt.Println("failed to load app config from context")
  }

  return *c
}
```

We have fixed the issue by putting our "global" variable into our `context.Context`. Now we still maintain the singleton
of our app config, but we get testability at the same time. Just go back and update the `GetApp()` calls to pass our app
context for the `cmd/api.go`:

```go {file="cmd/api.go",add_lines="1 8",rem_lines="2 9"}
  ctx, cfg := config.WithApp(cmd.Context())
  cfg := config.GetApp()

  entClient, err := ent.Open(cfg.Database.Driver, cfg.Database.URL)
  if err != nil {
    return
  }
  ctx = ent.NewContext(ctx, entClient)
  ctx = ent.NewContext(cmd.Context(), entClient)
  defer entClient.Close()
```

As well as the `api/migrate.go`:

```go {file="cmd/migrate.go",add_lines="7 17 20",rem_lines="8 18 21"}
func runMigrate(cmd *cobra.Command, args []string) (err error) {
  dryRun, err := cmd.Flags().GetBool("dry")
  if err != nil {
    return
  }

  ctx, cfg := config.WithApp(cmd.Context())
  cfg := config.GetApp()

  entClient, err := ent.Open(cfg.Database.Driver, cfg.Database.URL)
  if err != nil {
    return
  }
  defer entClient.Close()

  if dryRun {
    err = entClient.Schema.WriteTo(ctx, os.Stdout)
    err = entClient.Schema.WriteTo(cmd.Context(), os.Stdout)
  } else {
    err = entClient.Schema.Create(ctx)
    err = entClient.Schema.Create(cmd.Context())
  }

  return
}
```

And finally, the `api/seed.go`:

```go {file="api/seed.go",add_lines="2 21",rem_lines="3 22"}
func runSeed(cmd *cobra.Command, args []string) (err error) {
  ctx, cfg := config.WithApp(cmd.Context())
  cfg := config.GetApp()

  entClient, err := ent.Open(cfg.Database.Driver, cfg.Database.URL)
  if err != nil {
    return
  }
  defer entClient.Close()

  notes := []*ent.NoteCreate{
    entClient.Note.Create().
      SetTitle("My First Note").
      SetBody("## My First Note Section\n\nSome content for the note. With a [link](https://blog.miu.guru) to a cool site!"),
    entClient.Note.Create().
      SetTitle("My Second Note").
      SetBody("## My Other Note\n\nMore random note content...\n\n- with\n- a\n- list\n\nAll this formatting and no where to go."),
  }

  fmt.Println("Seeding notes...")
  err = entClient.Note.CreateBulk(notes...).Exec(ctx)
  err = entClient.Note.CreateBulk(notes...).Exec(cmd.Context())

  // create additional seeds here

  return
}
```

Now that our `GetApp()` is updated, and our app has been fixed (and should be working again), we can refactor our tests,
so they will pass now:

```go {file="pkg/config/app_test.go"}
package config_test

import (
  "context"
  "os"
  "testing"
  "time"

  "github.com/stretchr/testify/assert"

  "github.com/nikkomiu/gentql/pkg/config"
)

func unsetenv(t *testing.T, key string) {
  val, ok := os.LookupEnv(key)
  if !ok {
    return
  }

  if err := os.Unsetenv(key); err != nil {
    t.Fatalf("failed to unset env var (%s): %s", key, err)
  }
  t.Cleanup(func() {
    os.Setenv(key, val)
  })
}

func TestApp(t *testing.T) {
  t.Run("initial default", testAppInitialDefault)
  t.Run("initial override", testAppInitialOverride)
  t.Run("existing", testAppExisting)
}

func testAppInitialDefault(t *testing.T) {
  // Arrange
  unsetenv(t, "ADDRESS")
  unsetenv(t, "PORT")
  unsetenv(t, "SERVER_SHUTDOWN_TIMEOUT")
  unsetenv(t, "DATABASE_DRIVER")
  unsetenv(t, "DATABASE_URL")
  ctx, _ := config.WithApp(context.Background())

  // Act
  cfg := config.AppFromContext(ctx)

  // Assert
  assert.Equal(t, cfg.Server.Host, "")
  assert.Equal(t, cfg.Server.Port, 8080)
  assert.Equal(t, cfg.Server.Addr(), ":8080")
  assert.Equal(t, cfg.Server.DisplayAddr(), "http://localhost:8080/")
  assert.Equal(t, cfg.Server.ShutdownTimeout, 10*time.Second)
  assert.Equal(t, cfg.Database.Driver, "postgres")
  assert.Equal(t, cfg.Database.URL, "postgres://localhost/gentql_dev?sslmode=disable")
}

func testAppInitialOverride(t *testing.T) {
  // Arrange
  t.Setenv("ADDRESS", "10.0.0.10")
  t.Setenv("PORT", "9999")
  t.Setenv("SERVER_SHUTDOWN_TIMEOUT", "1m")
  t.Setenv("DATABASE_DRIVER", "sqlite")
  t.Setenv("DATABASE_URL", "file:ent?mode=memory&_fk=1")
  ctx, _ := config.WithApp(context.Background())

  // Act
  cfg := config.AppFromContext(ctx)

  // Assert
  assert.Equal(t, cfg.Server.Host, "10.0.0.10")
  assert.Equal(t, cfg.Server.Port, 9999)
  assert.Equal(t, cfg.Server.Addr(), "10.0.0.10:9999")
  assert.Equal(t, cfg.Server.DisplayAddr(), "http://10.0.0.10:9999/")
  assert.Equal(t, cfg.Server.ShutdownTimeout, time.Minute)
  assert.Equal(t, cfg.Database.Driver, "sqlite")
  assert.Equal(t, cfg.Database.URL, "file:ent?mode=memory&_fk=1")
}

func testAppExisting(t *testing.T) {
  // Arrange
  unsetenv(t, "ADDRESS")
  unsetenv(t, "PORT")
  unsetenv(t, "SERVER_SHUTDOWN_TIMEOUT")
  unsetenv(t, "DATABASE_DRIVER")
  unsetenv(t, "DATABASE_URL")
  ctx, _ := config.WithApp(context.Background())
  t.Setenv("ADDRESS", "10.0.0.11")

  // Act
  cfg := config.AppFromContext(ctx)

  // Assert
  assert.Equal(t, cfg.Server.Host, "")
}
```

This should take care of that pesky global variable that we were using before and make our code testable. Also take note
that, because there are only two test cases and both are unique, I'm writing two tests **without** using a testing table.

{{< commit-ref repo="nikkomiu/gentql" sha="225491cd91cd8042c79bf9b9fbc9867fbe558ae3" />}}

### Errors

For the errors package, we currently only have one custom error type. We can easily test this error by just calling the
methods on it and ensuring the right data is returned:

```go {file="pkg/errors/exitcode_test.go"}
package errors_test

import (
  "fmt"
  "testing"

  "github.com/stretchr/testify/assert"

  "github.com/nikkomiu/gentql/pkg/errors"
)

func TestExitCode(t *testing.T) {
  tt := []struct {
    name     string
    exitCode int
    innerErr error
  }{
    {
      name:     "",
      exitCode: 51,
      innerErr: fmt.Errorf("simple error"),
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Act
      err := errors.NewExitCode(tc.innerErr, tc.exitCode)

      // Assert
      assert.Equal(t, tc.exitCode, err.ExitCode())
      assert.Equal(t, tc.innerErr, err.Unwrap())
      assert.Equal(t, tc.innerErr.Error(), err.Error())
      assert.Equal(t, tc.innerErr.Error(), err.String())
    })
  }
}
```

{{< commit-ref repo="nikkomiu/gentql" sha="5a4703fa3648306b2efb95d9d488c4499c85e800" />}}

### Sig

For the sig tests, we have two branches of logic within our
`ListenAndServe(context.Context, *http.Server, time.Duration) error` func. We can easily test that these are working
as expected with:

```go {file="pkg/sig/sig_test.go"}
package sig_test

import (
  "context"
  "net/http"
  "testing"
  "time"

  "github.com/stretchr/testify/assert"

  "github.com/nikkomiu/gentql/pkg/sig"
)

func TestListenAndServe(t *testing.T) {
  tt := []struct {
    name    string
    addr    string
    handler http.Handler

    shutdownTimeout time.Duration

    wantErr bool
  }{
    {
      name: "base",
      addr: ":9990",
    },
    {
      name: "start error",
      addr: ":no_port",

      wantErr: true,
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      ctx, cancel := context.WithTimeout(context.Background(), time.Second)
      defer cancel()

      err := sig.ListenAndServe(ctx, tc.addr, tc.handler, tc.shutdownTimeout)

      assert.Equal(t, tc.wantErr, err != nil, err)
    })
  }
}
```

{{< callout type=note >}}
You may also want to test that, in the success condition, the server is able to take requests on the port specified.
However, I didn't do this because it seems like more of an implementation detail of the `ListenAndServe()` method on the
`*http.Server` struct than it does a detail of our `ListenAndServe()`.

You may also want to test the graceful shutdown of the server. However, because this test condition can be complicated
to test fully and properly, I'm going to omit this as well.
{{</ callout >}}

{{< commit-ref repo="nikkomiu/gentql" sha="5ca3ffcba6f110f81b1ae57ee5cdcb8fe3ebe45a" />}}

## cmd

First for the `cmd` testing, let's test the `rootCmd`:

```go {file="cmd/cmd_test.go"}
package cmd

import (
  "bytes"
  "context"
  "testing"

  "github.com/stretchr/testify/assert"
)

func executeWithArgs(ctx context.Context, args []string) (stdout string, stderr string, err error) {
  var outBuf bytes.Buffer
  var errBuf bytes.Buffer

  rootCmd.SetArgs(args)
  rootCmd.SetOut(&outBuf)
  rootCmd.SetErr(&errBuf)

  err = Execute(ctx)

  return outBuf.String(), errBuf.String(), err
}

func ContextT(t *testing.T) context.Context {
  ctx, cancel := context.WithCancel(context.Background())
  t.Cleanup(cancel)
  return ctx
}

func TestRootCmd(t *testing.T) {
  // Arrange
  ctx := ContextT(t)

  // Act
  stdout, stderr, err := executeWithArgs(ctx, []string{})

  // Assert
  assert.NoError(t, err)
  assert.Contains(t, stdout, "GentQL backend application services.")
  assert.Contains(t, stdout, "Usage:")
  assert.Equal(t, stderr, "")
}
```

You may have noticed that on these `cmd` tests instead of using the `package cmd_test` we used `package cmd`. This is
because when you test your package with the `_test` suffix we are using a different "testing" package. Because of this,
we don't have access to any of the private constants, variables, funcs, or struct methods defined within the package
that we are testing. I am an advocate of testing our public API via the `_test` package. This is because we are limited
to what any consumer of our package has to work with, and we can't test things that can't be reached by the public API.

We happen to have a couple of issues within our `cmd` package right now. The first one is that we can't easily pass the
arguments, `stdout`, or `stderr` into our cmd. The second issue is that our `rootCmd`, `apiCmd`, `migrateCmd`, and
`seedCmd` are all defined as global variables within our package. This will cause issues with testing our API command
since the `*cobra.Command{}` is updating "state" variables within it when we call it. However, we call it multiple times,
and thus we need to be able to keep instances of our `*cobra.Command{}` separate. So let's update our `Execute()` to
initialize our commands:

```go {file="cmd/cmd.go",add_lines="8-17 20",rem_lines="1-6 21"}
var rootCmd = &cobra.Command{
  Use:   "spectral",
  Short: "Spectral backend application services.",

  SilenceUsage: true,
}

func newRootCmd() *cobra.Command {
  rootCmd := &cobra.Command{
    Use:   "spectral",
    Short: "Spectral backend application services.",

    SilenceUsage: true,
  }

  return rootCmd
}

func Execute(ctx context.Context) error {
  return newRootCmd().ExecuteContext(ctx)
  return rootCmd.ExecuteContext(ctx)
}
```

With our root command updated, we can update the API command:

```go {file="cmd/api.go",add_lines="7-13",rem_lines="1-5 15-18"}
var apiCmd = &cobra.Command{
  Use:   "api",
  Short: "Start the API services for spectral",
  RunE:  runAPI,
}

func newAPICmd() *cobra.Command {
  return &cobra.Command{
    Use:   "api",
    Short: "Start the API services for spectral",
    RunE:  runAPI,
  }
}

func init() {
  rootCmd.AddCommand(apiCmd)
}
```

Next, let's refactor the migrate command:

```go {file="cmd/migrate.go",add_lines="7-17",rem_lines="1-5 19-23"}
var migrateCmd = &cobra.Command{
  Use:   "migrate",
  Short: "Migrate the database between versions",
  RunE:  runMigrate,
}

func newMigrateCmd() *cobra.Command {
  migrateCmd := &cobra.Command{
    Use:   "migrate",
    Short: "Migrate the database between versions",
    RunE:  runMigrate,
  }

  migrateCmd.Flags().BoolP("dry", "d", false, "Write the schema output to stdout instead of updating the database")

  return migrateCmd
}

func init() {
  migrateCmd.Flags().BoolP("dry", "d", false, "Write the schema output to stdout instead of updating the database")

  rootCmd.AddCommand(migrateCmd)
}
```

Notice that for the flag that we added to this command (`dry`) we moved the initialization of that flag into our
`newMigrateCmd() *cobra.Command` func. This is because we need to let Cobra know ahead of time what flags to expect (for
printing the help).

The last one we need to update to use this pattern is the seed command:

```go {file="cmd/seed.go",add_lines="7-13",rem_lines="1-5 15-17"}
var seedCmd = &cobra.Command{
  Use:   "seed",
  Short: "Seed the database with initial values",
  RunE:  runSeed,
}

func newSeedCmd() *cobra.Command {
  return &cobra.Command{
    Use:   "seed",
    Short: "Seed the database with initial values",
    RunE:  runSeed,
  }
}

func init() {
  rootCmd.AddCommand(seedCmd)
}
```

Take note that we removed the `init()` calls where we add the `apiCmd` to the `rootCmd`. Because we're now building our
commands in the new `newRootCmd()` func, we need to add our sub-commands in there too:

```go {file="cmd/cmd.go",add_lines="9-13"}
func newRootCmd() *cobra.Command {
  rootCmd := &cobra.Command{
    Use:   "spectral",
    Short: "Spectral backend application services.",

    SilenceUsage: true,
  }

  rootCmd.AddCommand(
    newAPICmd(),
    newMigrateCmd(),
    newSeedCmd(),
  )

  return rootCmd
}
```

With this in place, our app should be working again. However, we still have some issues with our testing. First, if you
look at the `executeWithArgs()` func in `cmd_test.go`, you'll notice that we can't use the `SetArgs()`, `SetOut()`, nor
`SetErr()` methods on the `rootCmd` since we don't have a `rootCmd` anymore on the global scope. So, let's add an
`Option` type in a new `cmd/opt.go` file with the options we need:

```go {file="cmd/option.go"}
package cmd

import (
  "io"

  "github.com/spf13/cobra"
)

type Option interface {
  CmdOpt(*cobra.Command)
}

type WithOutputOption struct {
  stdout io.Writer
  stderr io.Writer
}

func WithOutput(stdout, stderr io.Writer) WithOutputOption {
  return WithOutputOption{stdout: stdout, stderr: stderr}
}

func (o WithOutputOption) CmdOpt(cmd *cobra.Command) {
  cmd.SetOut(o.stdout)
  cmd.SetErr(o.stderr)
}

type WithArgsOption struct {
  args []string
}

func WithArgs(args []string) WithArgsOption {
  return WithArgsOption{args: args}
}

func (o WithArgsOption) CmdOpt(cmd *cobra.Command) {
  cmd.SetArgs(o.args)
}
```

{{< callout type=note >}}
We don't need to add this `Option` type and the options. I'm using them here both to allow for the **optional**
expansion of our `Execute()` func and showing you how to create options. With this in place, we can always add
extra options since this is a simple, yet extensible, way to "modify" our `rootCmd`.
{{</ callout >}}

Great! With the `cmd/opt.go` in place to allow for options to be used with our `rootCmd`, we can now update our
`Execute()` func to use these options when they're passed:

```go {file="cmd/cmd.go"}
func Execute(ctx context.Context, opts ...Option) error {
  rootCmd := newRootCmd()

  for _, opt := range opts {
    opt.CmdOpt(rootCmd)
  }

  return rootCmd.ExecuteContext(ctx)
}
```

If you see we use a `...` operator for the options, this allows us to pass as many or few of these as we want (including
sending `0` of them). So with this change, we don't need to update our `main.go` since the defaults are already good
enough for our `main.go`.

Now, we just need to update the `executeWithArgs()` in the `cmd_test.go` to use the newly added options:

```go {file="cmd/cmd_test.go"}
func executeWithArgs(ctx context.Context, args []string) (stdout string, stderr string, err error) {
  var outBuf bytes.Buffer
  var errBuf bytes.Buffer

  err = Execute(ctx, WithOutput(&outBuf, &errBuf), WithArgs(args))

  return outBuf.String(), errBuf.String(), err
}
```

{{< callout type=note >}}
Now that we have these options added (and public) to the `cmd` package, we can now change our testing project to use the
`_test` suffix. If you remember, the main reason we weren't able to do this to start was because we didn't have access
to the `rootCmd` from outside the package. However, with these `Option`s in place, we can now access and utilize all of
this without needing our tests **within** our `cmd` package. I'm going to switch mine over, but you don't have to if you
don't want.
{{</ callout >}}

Notice how we are adding the `With` options to our `Execute()` func without **needing** to pass them. In my opinion,
this makes for a cleaner interface into overriding the default values for this without mandating these be passed into
our func.

Let's now test our API command with a new `cmd/api_test.go`:

```go {file="cmd/api_test.go"}
package cmd

import (
  "bytes"
  "context"
  "encoding/json"
  "net/http"
  "testing"
  "time"

  "github.com/stretchr/testify/assert"
)

func TestAPICmd(t *testing.T) {
  t.Setenv("PORT", "9901")

  tt := []struct {
    name     string
    dbDriver string

    expectedErr    string
    expectedStderr string
  }{
    {
      name: "base",
    },
    {
      name:     "bad database driver",
      dbDriver: "bad_driver",

      expectedErr:    "unsupported driver: \"bad_driver\"",
      expectedStderr: "Error: unsupported driver: \"bad_driver\"\n",
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      if tc.dbDriver != "" {
        t.Setenv("DATABASE_DRIVER", tc.dbDriver)
      }
      ctx, cancel := context.WithTimeout(ContextT(t), 250*time.Millisecond)
      defer cancel()

      // Act
      stdout, stderr, err := executeWithArgs(ctx, []string{"api"})

      // Assert
      if tc.expectedErr == "" {
        assert.NoError(t, err)
      } else {
        assert.EqualError(t, err, tc.expectedErr)
      }
      assert.Equal(t, "", stdout)
      assert.Equal(t, tc.expectedStderr, stderr)
    })
  }

  t.Run("routes", testAPICmdRoutes)
}

func testAPICmdRoutes(t *testing.T) {
  go func() {
    ctx := ContextT(t)
    _, _, err := executeWithArgs(ctx, []string{"api"})
    t.Logf("api command: err:%s\n", err)
  }()

  buf := bytes.NewBufferString("{\"query\": \"query{ping}\"}")
  resp, err := http.Post("http://localhost:9901/graphql", "application/json", buf)
  assert.NoError(t, err)
  assert.NotNil(t, resp)
  defer resp.Body.Close()

  var respData map[string]any
  json.NewDecoder(resp.Body).Decode(&respData)
  assert.NoError(t, err)
  assert.Equal(t, map[string]any{"data": map[string]any{"ping": "pong"}}, respData)
}
```

If you remember from before when we were setting up our testing environment, we currently use SQLite for our testing
database, but we are using PostgreSQL for our development and production database. Because of this disjointed testing,
I'm not going to test the `migrate` and `seed` commands for now. These can be tested easily by creating new databases
for testing (I typically create a unique database for each test and delete it when I'm done) but this section is quite
long and complicated right now. This is especially true if you haven't dealt with some of these testing concepts
(especially in Go) before this. In the future, I may add another guide or post on how to set up testing using PostgreSQL
as well, or instead of, SQLite.

Ok, this was a lot of refactoring and a lot of effort to test our `cmd` package. However, this is the central "core" of
our application so, in my opinion, it's best to get the testing of this area of the application right.

{{< commit-ref repo="nikkomiu/gentql" sha="4142fe40978540674ad1fa356570d0d7540f87db" />}}

## All Together

We can now run the tests for the entire application with code coverage:

```bash
go test -cover ./...
```

{{< callout type=note >}}
This will generate code coverage during testing and give the percentage results in the output. There are other output
types to get code coverage from our application, but I'm not going to cover those here.
{{</ callout >}}

If you notice from the output of the test coverage, we don't have good (if any) coverage within our generated code.
There are ways to mitigate this (by removing the generated code from coverage reports), but just looking at what **is**
covered within our code is going to be more helpful.

## Conclusion

At this point, you may want to add a `Makefile` to the project to make running and testing our application easier and
more uniform among developers working on this project. If you want, you can check the reference repository for what my
`Makefile` has in it for a baseline.

In this (and the previous) sections, hopefully you've seen how easy it is to write tests for a Go application as well as
how easy `gqlgen` makes testing our resolver methods. If this still seems very complicated, spend some time going over
what we did in this to understand the individual parts of the testing. Most of the things that will make you see this as
overly-complicated will soon make it easier to see that this is a "framework" that makes writing tests easier and leaves
less room for hard to follow tests, complicated setup and teardown, etc.

With the set changes we now have a solid foundation for writing testable code as well as writing the tests for it. This
is great because we don't have to set up large scale testing frameworks, or create complex testing plans to validate
that our application is working as expected. Plus, with the `context.Context` and our
`ContextT(t *testing.T) context.Context` we make sure that our testing doesn't leak "async" code actions (since we
cancel the context when the test ends).

If you're planning to follow the testing parts of the remainder of this guide, I'd recommend you try to implement the
test cases yourself before looking at how I wrote them.
