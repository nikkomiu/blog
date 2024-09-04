---
title: Add Resolver Tests
author: Nikko Miu
toc: true
draft: true
weight: 8
tags:
  - golang
  - golang testing
  - gqlgen
  - gqlgen testing
---

We have gotten our application in a good place to start adding tests for what we currently have in place. For this, we
are going to be adding tests for the Note resolver, as well as our `pkg`s. After this stage, I'll be adding new tests
but I will keep them in collapsible sections after adding our business logic.

<!--more-->

## Ping

For testing, we're going to start with the simplest resolver and work our way up in complexity. With that in mind, let's
create the test func for the `ping` resolver:

```go {file="gql/common_test.go"}
package gql_test

import (
  "context"
  "testing"

  "github.com/nikkomiu/gentql/gql"
)

func TestPing(t *testing.T) {
  // Arrange
  expected := "pong"
  resolver := gql.NewResolver(nil)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  res, err := resolver.Resolvers.Query().Ping(ctx)

  // Assert
  if err != nil {
    t.Errorf("expected error to be nil but got: %s", err)
  }

  if res != expected {
    t.Errorf("expected %s but got %s", expected, res)
  }
}
```

Here, we are creating our method with a prefix of `Test` so Go will run this as a test method. When testing, we also
need to pass a `*testing.T` struct into our func. The `*testing.T` is used to run sub-tests, setup testing environment,
fail tests, etc. For now, we will just manually do our asssertions but later, we will refactor this to use an assertion
library to reduce the amount of repetetive code.

Within our test method, we set our expected value (`pong`), initialize our resolver with a `nil` `*ent.Client`
since for this test we don't rely on ent to resolve this, then create a context that will be canceled when we're done
with this test (as a `context.Context` is the first parameter of all of our resoulvers). Then, we call the resolver that
we're trying to test. Finally, we assert that the values are matching what we're expecting. Since this resolver func is
so simple, we only have one test case and don't have any error conditions to check.

{{< callout type=note >}}
I'm using the shorter name of just `common_test.go` here instead of `common.resolvers_test.go` since I find (and
typically remove) the `.resolvers.` name in the file to be awkward (it also doesn't follow Go file naming conventions).
If you want to change the resolver file names to their shorter name, you can update the `gqlgen.yml` file to use the
shorter file name:

```yaml {file=gqlgen.yml}
resolver:
  filename_template: "{name}.go"
```

Then before you regenerate your code, rename the resolver files to match the new names (remove `.resolvers`).
{{</ callout >}}

With our test in place, we can run the tests for **only** the `gql` subdirectory with:

```bash
go test ./gql/...
```

## Note Fields

The next set of tests that we can easily cover are the Note resolvers. These are the properties that exist on the Note
struct that don't directly map to a database field (`NodeID`, `BodyMarkdown` and `BodyHTML`). Since these also don't
rely on ent to resolve, we still won't need to set the `*ent.Client` when we create our resolver and even though there
is an error condtition in our code for the `BodyHTML` resolver, I don't have an easy way to test it since all text
should be valid Markdown.

```go {file="gql/note_test.go"}
func TestNoteNodeID(t *testing.T) {
  // Arrange
  expectedNodeID := "bm90ZXM6MTIz"
  resolver := gql.NewResolver(nil)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  nodeID, err := resolver.Resolvers.Note().NodeID(ctx, &ent.Note{
    ID: 123,
  })

  // Assert
  if err != nil {
    t.Errorf("expected err to be nil, but got: %s", err)
  }

  if nodeID != expectedNodeID {
    t.Errorf("expected NodeID to be '%s', but got '%s'", nodeID, expectedNodeID)
  }
}

func TestNoteBodyMarkdown(t *testing.T) {
  // Arrange
  obj := &ent.Note{Body: "raw markdown content [blog](https://blog.miu.guru)"}
  resolver := gql.NewResolver(nil)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  str, err := resolver.Resolvers.Note().BodyMarkdown(ctx, obj)

  // Assert
  if err != nil {
    t.Errorf("expected no error, but got: %s", err)
  }

  if str != obj.Body {
    t.Errorf("expected markdown to be: %s, but got: %s", obj.Body, str)
  }
}

func TestNoteBodyHTML(t *testing.T) {
  // Arrange
  obj := &ent.Note{Body: "raw markdown content [blog](https://blog.miu.guru)"}
  expected := "<p>raw markdown content <a href=\"https://blog.miu.guru\">blog</a></p>\n"
  resolver := gql.NewResolver(nil)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  str, err := resolver.Resolvers.Note().BodyHTML(ctx, obj)

  // Assert
  if err != nil {
    t.Errorf("expected no error, but got: %s", err)
  }

  if str != expected {
    t.Errorf("expected markdown to be: %s, but got: %s", expected, str)
  }
}
```

## Node

With these basic tests in place, we can now look at testing more complex code paths. The first resolver using `ent` that
we will test is the `node` resolver. This is going to be easy to set up and test. However, this test func will grow to
be quite large depending on the number of unique entity types that your application will contain. This is because, in
general, we should be testing all of the variants of this that we expect to come across. Because this method is used to
resolve **any** ent model, it's going to have a lot of sub-tests within it. To manage multiple sub-tests, we are going
to use a concept in testing called Testing Tables.

Let's update our `common_test.go` to add the `TestNode(*testing.T)` func:

```go {file="gql/common_test.go"}
package gql_test

import (
  "context"
  "testing"

  _ "github.com/mattn/go-sqlite3"

  "github.com/nikkomiu/gentql/gql"
)

func TestNode(t *testing.T) {
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()
  entClient := enttest.Open(t, "sqlite3", "file:ent?mode=memory&_fk=1")
  defer entClient.Close()
  resolver := gql.NewResolver(entClient)

  note, err := entClient.Note.Create().SetTitle("Test Note 1").SetBody("Test Note Body 1").Save(ctx)
  if err != nil {
    t.Errorf("expected note to be created, but got err: %s", err)
  }

  noteNodeID, err := resolver.Resolvers.Note().NodeID(ctx, note)
  if err != nil {
    t.Errorf("expected note to resolve node id, but got err: %s", err)
  }

  notFoundNoteNodeID, err := resolver.Resolvers.Note().NodeID(ctx, &ent.Note{ID: 0})
  if err != nil {
    t.Errorf("expected note to resolve node id, but got err: %s", err)
  }

  tt := []struct {
    name   string
    nodeID string

    expectedNode bool
    expectedErr  bool
  }{
    {
      name:   "note",
      nodeID: noteNodeID,

      expectedNode: true,
    },

    {
      name:   "not found",
      nodeID: notFoundNoteNodeID,

      expectedErr: true,
    },
    {
      name:   "invalid base64",
      nodeID: "bad string",

      expectedErr: true,
    },
    {
      name:   "not enough parts",
      nodeID: base64.RawURLEncoding.EncodeToString([]byte("notes")),

      expectedErr: true,
    },
    {
      name:   "too many parts",
      nodeID: base64.RawURLEncoding.EncodeToString([]byte("notes:1:3")),

      expectedErr: true,
    },
    {
      name:   "bad id value",
      nodeID: base64.RawURLEncoding.EncodeToString([]byte("notes:numless")),

      expectedErr: true,
    },
    {
      name:   "bad table name",
      nodeID: base64.RawURLEncoding.EncodeToString([]byte("not_my_table:11")),

      expectedErr: true,
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      ctx, cancel := context.WithCancel(context.Background())
      defer cancel()

      node, err := resolver.Resolvers.Query().Node(ctx, tc.nodeID)

      if tc.expectedErr && err == nil {
        t.Errorf("expected err but got none")
      } else if !tc.expectedErr && err != nil {
        t.Errorf("expected no error but got: %s", err)
      }

      if tc.expectedNode && node == nil {
        t.Errorf("expected node but got nil")
      }
    })
  }
}

// ...
```

Now that we've included `sqlite3` as a dependency, we need to download packages again:

```bash
go mod tidy
```

Now if you run the tests you will probably see in the results:

```output
enttest.go:81: sqlite: check foreign_keys pragma: reading schema information Binary was compiled with 'CGO_ENABLED=0', go-sqlite3 requires cgo to work. This is a stub
```

This is because the `sqlite3` database driver for Go is built on the C implementation of SQLite. Because of this, when
testing we need to compile our application with CGO. To fix this (for the "run test" options within VS Code), we need
to add the environment variable in our `.vscode/settings.json`:

```json {file=".vscode/settings.json"}
{
  "go.testEnvVars": {
      "CGO_ENABLED": "1"
  },
  // ...
}
```

{{< callout type=warning >}}
For ARM64 machines (macOS running on Apple Silicone), you **may** need to include the following additional environment
variable if you get errors when compiling the `go-sqlite3` package (as
[this issue](https://github.com/mattn/go-sqlite3/issues/1040) points out):

```json {file=".vscode/settings.json",add_lines=4}
{
  "go.testEnvVars": {
    // ...
    "CGO_CFLAGS": "-D_LARGEFILE64_SOURCE"
  }
}
```

{{</ callout >}}

For running the tests on the command line we simply need to set the environment variable either before or during testing:

```bash
CGO_ENABLED=1 go test ./gql/...
```

Because we are now trying to run our tests with CGO we need to have a C compiler installed on our system. If you're
using the Dev Container setup you won't have this by default. So running the tests with one of the above methods right
now will yield an error like:

```output
cgo: C compiler "gcc" not found: exec: "gcc": executable file not found in $PATH
```

To fix this error, we need to install our C compiler toolchian by modifying the following in the Dockerfile for the Dev
Container:

```dockerfile {file=".devcontainer/Dockerfile",add_lines=6}
# Install dev dependencies
RUN apk add --update \
    bash zsh zsh-vcs git sudo make openssh-client \
    age htop inotify-tools \
    nodejs npm \
    gcc musl-dev \
    docker-cli docker-cli-buildx postgresql-client curl
```

Now you can either manually install this package in your terminal with `apk add --no-cache gcc musl-dev` or you can
rebuild your Dev Container by running **"Dev Containers: Rebuild Container"** from the Command Pallet (`F2` or
`Ctrl`/`Cmd` + `Shift` + `P`).

If you are not using Dev Containers, you can refer to the [go-sqlite3 README](https://github.com/mattn/go-sqlite3?tab=readme-ov-file#linux)
for installation instructions for your target platform.

{{< callout type=note >}}
This testing with the database can be done using `postgres` instead of using SQLite. However, for simplicity (mainly
because SQLite can create in-memory databases that can be created and torn down on a per-test basis) I've chosen not to
use the `pq` driver here.

The best way to use a PostgreSQL driver for this would be to maintain the creation of the testing databases on
initialization of the `*ent.Client`. In the future I may write something up on how to switch this from SQLite to
PostgreSQL as a "drop-in" replacement (or through a compiler flag).
{{</ callout >}}

## Testing Helpers

Now that we've written a few tests for our resolvers, you may have begun to notice that we are duplicating some blocks
of code a lot like the creation of our testing context and our `t.Errorf()` calls wrapped up in `if` statements.

### ContextT

To start, we can simplify and reduce unnecessary code duplication by adding a helper method for creating our context:

```go {file="gql/common_test.go"}
func ContextT(t *testing.T) context.Context {
  ctx, cancel := context.WithCancel(context.Background())
  t.Cleanup(cancel)
  return ctx
}
```

All we are doing here is moving the creation of our context with a cancel func into a method we can call from our tests.
We are passing the `*testing.T` into this func so that when our test is done the `cancel` for our `context.Context` will
be called for us. This way we don't have to worry about forgetting to cancel the context in our tests and it will
simplify our test funcs.

With this in place, we can update our tests to utilize our new `ContextT(*testing.T) context.Context` func. First,
let's update the common tests:

```go {file="gql/common_test.go",add_lines="4 19 30",rem_lines="5-6 20-21 31-32"}
func TestPing(t *testing.T) {
  expected := "pong"
  resolver := gql.NewResolver(nil)
  ctx := ContextT(t)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  res, err := resolver.Resolvers.Query().Ping(ctx)
  if err != nil {
    t.Errorf("expected error to be nil but got: %s", err)
  }

  if res != expected {
    t.Errorf("expected %s but got %s", expected, res)
  }
}

func TestNode(t *testing.T) {
  ctx := ContextT(t)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()
  entClient := enttest.Open(t, "sqlite3", "file:ent?mode=memory&_fk=1")
  defer entClient.Close()
  resolver := gql.NewResolver(entClient)

  // ...

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      ctx := ContextT(t)
      ctx, cancel := context.WithCancel(context.Background())
      defer cancel()

      // ...
```

With our common tests updated, we can apply the same logic to our note tests:

```go {file="gql/note_test.go",add_lines="5 28 50",rem_lines="6-7 29-30 51-52"}
func TestNoteNodeID(t *testing.T) {
  // Arrange
  expectedNodeID := "bm90ZXM6MTIz"
  resolver := gql.NewResolver(nil)
  ctx := ContextT(t)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  nodeID, err := resolver.Resolvers.Note().NodeID(ctx, &ent.Note{
    ID: 123,
  })

  // Assert
  if err != nil {
    t.Errorf("expected err to be nil, but got: %s", err)
  }

  if nodeID != expectedNodeID {
    t.Errorf("expected NodeID to be '%s', but got '%s'", nodeID, expectedNodeID)
  }
}

func TestNoteBodyMarkdown(t *testing.T) {
  // Arrange
  obj := &ent.Note{Body: "raw markdown content [blog](https://blog.miu.guru)"}
  resolver := gql.NewResolver(nil)
  ctx := ContextT(t)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  str, err := resolver.Resolvers.Note().BodyMarkdown(ctx, obj)

  // Assert
  if err != nil {
    t.Errorf("expected no error, but got: %s", err)
  }

  if str != obj.Body {
    t.Errorf("expected markdown to be: %s, but got: %s", obj.Body, str)
  }
}

func TestNoteBodyHTML(t *testing.T) {
  // Arrange
  obj := &ent.Note{Body: "raw markdown content [blog](https://blog.miu.guru)"}
  expected := "<p>raw markdown content <a href=\"https://blog.miu.guru\">blog</a></p>\n"
  resolver := gql.NewResolver(nil)
  ctx := ContextT(t)
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  // Act
  str, err := resolver.Resolvers.Note().BodyHTML(ctx, obj)

  // Assert
  if err != nil {
    t.Errorf("expected no error, but got: %s", err)
  }

  if str != expected {
    t.Errorf("expected markdown to be: %s, but got: %s", expected, str)
  }
}
```

### EntT

Let's create one last helper method. This one we haven't yet seen duplicated in our code but _most_ of our resolvers are
going to need it:

```go {file="gql/common_test.go"}
func EntT(t *testing.T) *ent.Client {
  entClient := enttest.Open(t, "sqlite3", "file:ent?mode=memory&_fk=1")
  t.Cleanup(func() { entClient.Close() })
  return entClient
}
```

Similar to how we implemented the `ContextT(*testing.T) context.Context` we are going to move our database `Open` call
into its own func that we can call from our tests. Again with this we will register a `Cleanup` func to close our
database connection (and delete the database since we are using an in-memory SQLite database).

Just update the `TestNode` func to use our new `EntT(*tesitng.T) *ent.Client`:

```go {file="gql/common_test.go",add_lines=3,rem_lines="4-5"}
func TestNode(t *testing.T) {
  ctx := ContextT(t)
  entClient := EntT(t)
  entClient := enttest.Open(t, "sqlite3", "file:ent?mode=memory&_fk=1")
  defer entClient.Close()

  // ...
```

### assert Package

At this point, I'm going to bring in a library for test assertions so we don't have to keep writing our own assertions
manually. The assert package that I'm going to use is
[github.com/stretchr/testify/assert](https://github.com/stretchr/testify?tab=readme-ov-file#assert-package).

Starting with the common tests, let's add and use this package:

```go {file="gql/common_test.go"}

```

We can also update our Note tests to use this assert package:

```go {file="gql/note_test.go",add_lines="4-5 18-19 32-33",rem_lines="6-12 20-26 34-40"}
func TestNoteNodeID(t *testing.T) {
  // ...

  assert.NoError(t, err)
  assert.Equal(t, expectedNodeID, nodeID)
  if err != nil {
    t.Errorf("expected err to be nil, but got: %s", err)
  }

  if nodeID != expectedNodeID {
    t.Errorf("expected NodeID to be '%s', but got '%s'", nodeID, expectedNodeID)
  }
}

func TestNoteBodyMarkdown(t *testing.T) {
  // ...

  assert.NoError(t, err)
  assert.Equal(t, obj.Body, str)
  if err != nil {
    t.Errorf("expected no error, but got: %s", err)
  }

  if str != obj.Body {
    t.Errorf("expected markdown to be: %s, but got: %s", obj.Body, str)
  }
}

func TestNoteBodyHTML(t *testing.T) {
  // ...

  assert.NoError(t, err)
  assert.Equal(t, expected, str)
  if err != nil {
    t.Errorf("expected no error, but got: %s", err)
  }

  if str != expected {
    t.Errorf("expected markdown to be: %s, but got: %s", expected, str)
  }
}
```

### Other Packages

There are a lot of testing tools out there for Go and some "suite" testing frameworks. I tend to stay away from these as
some of the "features" that they have make it more effort to test Go applications.

For example, you can use regular expressions to run one test, some of the tests, etc. like:

```bash
CGO_ENABLED=1 go test -v ./gql/... -run "^TestNote.*$"
```

This will run all of our `Note` tests but skip the other (non-Note) tests in the `gql` package:

```output
?       github.com/nikkomiu/gentql/gql/model  [no test files]
=== RUN   TestNoteNodeID
--- PASS: TestNoteNodeID (0.00s)
=== RUN   TestNoteBodyMarkdown
--- PASS: TestNoteBodyMarkdown (0.00s)
=== RUN   TestNoteBodyHTML
--- PASS: TestNoteBodyHTML (0.00s)
PASS
ok      github.com/nikkomiu/gentql/gql
```

However, with testing frameworks it may be more difficult to accomplish this, may require you to modify your test code,
or may not even be an option.

With these helpers (and our new `assert` package) in place, we can move on to testing the Query resolvers for our Note
entity.

## Note Fixture

Create Note Fixture

- Update the `TestNode` and `TestNote*` to utilize this func

## Note Query

## Note Mutation

## Conclusion

TODO: NOTICE CODE COVERAGE HERE AND MAKE NOTE OF WHY IT IS LOW

We have written all of the test cases that we should need to include for our `gqlgen` resolvers. In the next section we
are going to add the remaining tests (for the `pkg` and `cmd` parts of our application). Once you complete the next
section you should have a good testing foundation for your Go application.
