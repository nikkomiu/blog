---
title: Add Resolver Tests
author: Nikko Miu
toc: true
weight: 8
tags:
  - golang
  - golang testing
  - gqlgen
  - gqlgen testing
---

We have gotten our application in a good place to start adding tests for what we currently have in place. For this, we
are going to be adding tests for the Note resolver, as well as our `pkg`s. After this stage, I'll be adding new tests,
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

Here, we are creating our method with a prefix of `Test`, so Go will run this as a test method. When testing, we also
need to pass a `*testing.T` struct into our func. The `*testing.T` is used to run subtests, setup testing environment,
fail tests, etc. For now, we will just manually do our assertions but later, we will refactor this to use an assertion
library to reduce the amount of repetitive code.

Within our test method, we set our expected value (`pong`), initialize our resolver with a `nil` `*ent.Client`
since for this test we don't rely on ent to resolve this, then create a context that will be canceled when we're done
with this test (as a `context.Context` is the first parameter of all of our resolvers). Then, we call the resolver that
we're trying to test. Finally, we assert that the values are matching what we're expecting. Since this resolver func is
so simple, we only have one test case and don't have any error conditions to check.

With our test in place, we can run the tests for **only** the `gql` subdirectory with:

```bash
go test ./gql/...
```

{{< commit-ref repo="nikkomiu/gentql" sha="1e8459eee7109ec5870a28df7864286adb59cfad" />}}

## Note Fields

The next set of tests that we can easily cover are the Note resolvers. These are the properties that exist on the Note
struct that don't directly map to a database field (`NodeID`, `BodyMarkdown` and `BodyHTML`). Since these also don't
rely on ent to resolve, we still won't need to set the `*ent.Client` when we create our resolver and even though there
is an error condition in our code for the `BodyHTML` resolver, I don't have an easy way to test it since all text
should be valid Markdown.

```go {file="gql/note_test.go"}
package gql_test

import (
  "context"
  "testing"

  "github.com/nikkomiu/gentql/ent"
  "github.com/nikkomiu/gentql/gql"
)

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

{{< commit-ref repo="nikkomiu/gentql" sha="5d536df06b239459625b6037a6235149a0b05c69" />}}

## Node

With these basic tests in place, we can now look at testing more complex code paths. The first resolver using `ent` that
we will test is the `node` resolver. This is going to be easy to set up and test. However, this test func will grow to
be quite large depending on the number of unique entity types that your application will contain. This is because, in
general, we should be testing all the variants of this that we expect to come across. Because this method is used to
resolve **any** ent model, it's going to have a lot of subtests within it. To manage multiple subtests, we are going
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
  }
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

To fix this error, we need to install our C compiler toolchain by modifying the following in the Dockerfile for the Dev
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

{{< commit-ref repo="nikkomiu/gentql" sha="6051135440b533431709d8e3d5626126646a1b94" />}}

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
be called for us. This way we don't have to worry about forgetting to cancel the context in our tests, and it will
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

{{< commit-ref repo="nikkomiu/gentql" sha="b4495aeb657f0a941f86d010142e6a64d1c6f7dc" />}}

### EntT

Let's create one last helper method. This one we haven't yet seen duplicated in our code, but _most_ of our resolvers
are going to need it:

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

{{< commit-ref repo="nikkomiu/gentql" sha="36209e72cf273fe896bc0b40d1f7b80b0b09f8a5" />}}

### assert Package

At this point, I'm going to bring in a library for test assertions, so we don't have to keep writing our own assertions
manually. The package that I'm going to use for assertions is
[github.com/stretchr/testify/assert](https://github.com/stretchr/testify?tab=readme-ov-file#assert-package).

Starting with the common tests, let's add and use this package:

```go {file="gql/common_test.go",add_lines="11-12 28 34 40 103 110-114",rem_lines="13-19 29-31 35-37 41-43 104-108 115-117"}
func TestPing(t *testing.T) {
  // Arrange
  expected := "pong"
  resolver := gql.NewResolver(nil)
  ctx := ContextT(t)

  // Act
  res, err := resolver.Resolvers.Query().Ping(ctx)

  // Assert
  assert.NoError(t, err)
  assert.Equal(t, expected, res)
  if err != nil {
    t.Errorf("expected error to be nil but got: %s", err)
  }

  if res != expected {
    t.Errorf("expected %s but got %s", expected, res)
  }
}

func TestNode(t *testing.T) {
  ctx := ContextT(t)
  entClient := EntT(t)
  resolver := gql.NewResolver(entClient)

  note, err := entClient.Note.Create().SetTitle("Test Note 1").SetBody("Test Note Body 1").Save(ctx)
  assert.NoError(t, err)
  if err != nil {
    t.Errorf("expected note to be created, but got err: %s", err)
  }

  noteNodeID, err := resolver.Resolvers.Note().NodeID(ctx, note)
  assert.NoError(t, err)
  if err != nil {
    t.Errorf("expected note to resolve node id, but got err: %s", err)
  }

  notFoundNoteNodeID, err := resolver.Resolvers.Note().NodeID(ctx, &ent.Note{ID: 0})
  assert.NoError(t, err)
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
      ctx := ContextT(t)

      node, err := resolver.Resolvers.Query().Node(ctx, tc.nodeID)

      assert.Equal(t, tc.expectedErr, err != nil, "expected error to be %v but got: %s", tc.expectedErr, err)
      if tc.expectedErr && err == nil {
        t.Errorf("expected err but got none")
      } else if !tc.expectedErr && err != nil {
        t.Errorf("expected no error but got: %s", err)
      }

      if tc.expectedNode {
        assert.NotNil(t, node, "expected node to be not nil")
      } else {
        assert.Nil(t, node, "expected node to be nil")
      }
      if tc.expectedNode && node == nil {
        t.Errorf("expected node but got nil")
      }
    })
  }
}
```

We can also update our Note tests to use this `assert` package:

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

{{< callout type=note >}}
When we are testing the `BodyHTML`, we aren't able to easily test the error condition. This is because I don't see a way
of testing the error condition of `goldmark.Convert()`. If you would like to reduce the complexity, you could rewrite
the `BodyHTML` resolver to just return the error and `buf.String()` instead of checking for the error:

```go {file="gql/note.go",add_lines="4-5",rem_lines="6-9"}
// BodyHTML is the resolver for the bodyHtml field.
func (r *noteResolver) BodyHTML(ctx context.Context, obj *ent.Note) (string, error) {
  var buf bytes.Buffer
  err := goldmark.Convert([]byte(obj.Body), &buf)
  return buf.String(), err
  if err := goldmark.Convert([]byte(obj.Body), &buf); err != nil {
    return "", err
  }
  return buf.String(), nil
}
```

Making this change would eliminate the branch within the resolver and make coverage stay higher. However, since we don't
actually have the ability to test this, I prefer leaving the condition as unchecked because it shows that there **is**
potential for a bug within this area due to some unknown condition that would cause `goldmark.Convert()` to fail.

{{</ callout >}}

{{< commit-ref repo="nikkomiu/gentql" sha="18525d258039f8f7b23154e60cf3e41994bc74de" />}}

### Other Testing Packages

There are a lot of testing tools out there for Go and some "suite" testing frameworks. I tend to stay away from these as
some "features" that they have can make it more effort to test Go applications.

For example, you can use regular expressions to run one test, some tests, etc. like:

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

## Note List

We have already covered the Note "get" call with the `Node` test. So for Note query resolvers the only other one we need
to test is the `Notes()` resolver (or "list"). I'm creating a handful of Notes before the test starts to "seed" our test
database. At some point, it would be better to refactor the Note creation for testing into a fixture. However, for now
at least I'm not going to make those changes.

Here we're testing some conditions of the `Notes()` resolver. However, we're still missing some specifics around the
validation of the response objects (we don't check the individual records or their actual order as they appear). We're
also missing the "next" and "previous" page testing. For now, I'm not going to add explicit tests for this as we are
using generated code to handle all the internal logic of the where clauses, ordering, and pretty much all other details
of the `Notes()` resolver.

```go {file="gql/note_test.go"}
func TestNoteList(t *testing.T) {
  ctx := ContextT(t)
  entClient := EntT(t)
  resolver := gql.NewResolver(entClient)

  totalCount := 10
  for i := 0; i < totalCount; i++ {
    _, err := entClient.Note.Create().
      SetTitle(fmt.Sprintf("Test Note %d", i)).
      SetBody("Test Note Body").
      Save(ctx)
    assert.NoError(t, err)
  }

  three := 3

  tt := []struct {
    name string

    after   *entgql.Cursor[int]
    first   *int
    before  *entgql.Cursor[int]
    last    *int
    orderBy *ent.NoteOrder
    where   *ent.NoteWhereInput

    expectedErr bool
    expectedLen int
  }{
    {
      name: "default",

      expectedLen: totalCount,
    },
    {
      name: "first 3",

      first: &three,

      expectedLen: 3,
    },
    {
      name: "last 3",

      last: &three,

      expectedLen: 3,
    },
    {
      name: "order by title asc",

      orderBy: &ent.NoteOrder{Field: ent.NoteOrderFieldTitle, Direction: entgql.OrderDirectionAsc},

      expectedLen: totalCount,
    },
    {
      name: "order by created at desc",

      orderBy: &ent.NoteOrder{Field: ent.NoteOrderFieldCreatedAt, Direction: entgql.OrderDirectionDesc},

      expectedLen: totalCount,
    },
    {
      name: "order by updated at asc",

      orderBy: &ent.NoteOrder{Field: ent.NoteOrderFieldUpdatedAt, Direction: entgql.OrderDirectionAsc},

      expectedLen: totalCount,
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      ctx := ContextT(t)

      // Act
      notes, err := resolver.Resolvers.Query().Notes(ctx, tc.after, tc.first, tc.before, tc.last, tc.orderBy, tc.where)

      // Assert
      assert.NoError(t, err)
      assert.Len(t, notes.Edges, tc.expectedLen)
      assert.Equal(t, totalCount, notes.TotalCount)
    })
  }
}
```

{{< commit-ref repo="nikkomiu/gentql" sha="b592d139177202ca176d89598060df1a4ce29b35" />}}

## Note Mutation

```go {file="gql/note_test.go"}
func TestNoteCreate(t *testing.T) {
  entClient := EntT(t)
  resolver := gql.NewResolver(entClient)

  tt := []struct {
    name string

    input model.NoteInput

    expectedErr  bool
    expectedNote *ent.Note
  }{
    {
      name: "default",

      input: model.NoteInput{
        Title: "Test Note",
        Body:  "Test Note Body",
      },

      expectedNote: &ent.Note{
        Title: "Test Note",
        Body:  "Test Note Body",
      },
    },
    {
      name: "empty title",

      input: model.NoteInput{
        Body: "Test Note Body",
      },

      expectedErr: true,
    },
    {
      name: "title too short",

      input: model.NoteInput{
        Title: "T",
        Body:  "Test Note Body",
      },

      expectedErr: true,
    },
    {
      name: "empty body",

      input: model.NoteInput{
        Title: "Test Note",
      },

      expectedNote: &ent.Note{
        Title: "Test Note",
        Body:  "",
      },
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      ctx := ContextT(t)
      preCreateTime := time.Now()

      // Act
      note, err := resolver.Resolvers.Mutation().CreateNote(ctx, tc.input)

      // Assert
      assert.Equal(t, tc.expectedErr, err != nil, "expected error to be %v, got %v", tc.expectedErr, err)
      if tc.expectedNote != nil {
        assert.NotEmpty(t, note.ID)
        assert.Equal(t, tc.expectedNote.Title, note.Title)
        assert.Equal(t, tc.expectedNote.Body, note.Body)
        assert.True(t, note.CreatedAt.After(preCreateTime))
        assert.True(t, note.UpdatedAt.After(preCreateTime))
      }
    })
  }
}

func TestNoteUpdate(t *testing.T) {
  entClient := EntT(t)
  resolver := gql.NewResolver(entClient)
  note := entClient.Note.Create().SetTitle("Test Note").SetBody("Test Note Body").SaveX(ContextT(t))

  tt := []struct {
    name string

    id    int
    input model.NoteInput

    expectedErr  bool
    expectedNote *ent.Note
  }{
    {
      name: "default",

      id: note.ID,
      input: model.NoteInput{
        Title: "Test Note",
        Body:  "Test Note Body",
      },

      expectedNote: &ent.Note{
        Title: "Test Note",
        Body:  "Test Note Body",
      },
    },
    {
      name: "empty title",

      id: note.ID,
      input: model.NoteInput{
        Body: "Test Note Body",
      },

      expectedErr: true,
    },
    {
      name: "title too short",

      id: note.ID,
      input: model.NoteInput{
        Title: "T",
        Body:  "Test Note Body",
      },

      expectedErr: true,
    },
    {
      name: "empty body",

      id: note.ID,
      input: model.NoteInput{
        Title: "Test Note",
      },

      expectedNote: &ent.Note{
        Title: "Test Note",
        Body:  "",
      },
    },
    {
      name: "no change",

      id: note.ID,
      input: model.NoteInput{
        Title: note.Title,
        Body:  note.Body,
      },

      expectedNote: note,
    },
    {
      name: "not found",

      id: 999,
      input: model.NoteInput{
        Title: "Test Note",
        Body:  "Test Note Body",
      },

      expectedErr: true,
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      ctx := ContextT(t)
      preCreateTime := time.Now()

      // Act
      note, err := resolver.Resolvers.Mutation().UpdateNote(ctx, tc.id, tc.input)

      // Assert
      assert.Equal(t, tc.expectedErr, err != nil, "expected error to be %v, got %v", tc.expectedErr, err)
      if tc.expectedNote != nil {
        assert.NotEmpty(t, note.ID)
        assert.Equal(t, tc.expectedNote.Title, note.Title)
        assert.Equal(t, tc.expectedNote.Body, note.Body)
        assert.True(t, note.CreatedAt.Before(preCreateTime))
        assert.True(t, note.UpdatedAt.After(preCreateTime))
      }
    })
  }
}

func TestNoteDelete(t *testing.T) {
  entClient := EntT(t)
  resolver := gql.NewResolver(entClient)
  note := entClient.Note.Create().SetTitle("Test Note").SetBody("Test Note Body").SaveX(ContextT(t))

  tt := []struct {
    name string

    id int

    expectedErr bool
    expectedRes bool
  }{
    {
      name: "default",

      id: note.ID,

      expectedRes: true,
    },
    {
      name: "not found",

      id: 999,

      expectedRes: false,
    },
  }

  for _, tc := range tt {
    t.Run(tc.name, func(t *testing.T) {
      // Arrange
      ctx := ContextT(t)

      // Act
      res, err := resolver.Resolvers.Mutation().DeleteNote(ctx, tc.id)

      // Assert
      assert.Equal(t, tc.expectedErr, err != nil, "expected error to be %v, got %v", tc.expectedErr, err)
      assert.Equal(t, tc.expectedRes, res)
    })
  }
}
```

We added a few extra conditions to testing here that we don't currently have implementation logic to support. So, if you
try to run the tests now, our create and update should fail.

Let's fix this by adding our validation logic to the `Note` schema on ent:

```go {file="ent/schema/note.go",add_lines="5"}
// Fields of the Note.
func (Note) Fields() []ent.Field {
  return []ent.Field{
    field.String("title").
      MinLen(3).
      Annotations(
        entgql.OrderField("TITLE"),
      ),
    // ...
```

{{< commit-ref repo="nikkomiu/gentql" sha="40e3e59faf70fc123da3cf4fc794a2be3c662dbc" />}}

## Conclusion

Now that we have all of our resolver tests completed, if you run tests with code coverage you will notice that we still
don't cover very much of the `gql` package. This is because the vast majority of the code that exists for the `gql`
package of our app is generated code. The way that we are currently (unit) testing, we aren't covering the generated
code for our `gql` package. However, we can always add integration tests that ensure that all the layers of our app are
working properly. In this type of testing, we will cover the generated code for our application.

We have written all the test cases that we should need to include for our `gqlgen` resolvers. In the next section we
are going to add the remaining tests (for the `pkg` and `cmd` parts of our application). Once you complete the next
section you should have a good testing foundation for your Go application.
