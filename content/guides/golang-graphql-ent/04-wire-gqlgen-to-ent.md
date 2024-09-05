---
title: Wire gqlgen to ent
author: Nikko Miu
toc: true
weight: 4
tags:
  - golang
  - ent
  - gqlgen
  - graphql
  - gqlgen autobind
---

At this point we should have the scaffolding for the CLI parts of our app, the GraphQL server, as well as the database
layer using ent. With all of this in place we can start to wire the `gqlgen` parts into the `ent` parts of our app to
simplify the development experience.

<!--more-->

## Loading ent from Context

In the last section, we passed a `context.Context` which contains the `*ent.Client` into the `NewServer()` method for
our GraphQL server. Now we need to "extract" the `*ent.Client` from the `context.Context` and store it in our resolver.

To make this change, update the `gql/resolver.go` to look like:

```go {file="gql/resolver.go"}
package gql

import (
  "context"

  "github.com/99designs/gqlgen/graphql/handler"
  "github.com/nikkomiu/gentql/ent"
)

//go:generate go run github.com/99designs/gqlgen generate

type Resolver struct {
  ent *ent.Client
}

func NewResolver(entClient *ent.Client) Config {
  return Config{
    Resolvers: &Resolver{
      ent: entClient,
    },
  }
}

func NewServer(ctx context.Context) *handler.Server {
  resolver := NewResolver(ent.FromContext(ctx))
  return handler.NewDefaultServer(NewExecutableSchema(resolver))
}
```

I've split up some of the code into multiple lines but otherwise we are updating the `NewResolver()` method to take
the `*ent.Client` in as a parameter and set it on the `Resolver{}` to the new property.

With that in place loading the `*ent.Client` is easy by just calling the `FromContext(context.Context)`
method within the ent package that was generated.

{{< callout type=note >}}
You may be wondering why we have a `NewResolver()` and a `NewServer()` method where both are exported. You may also be
wondering why we pass the `context.Context` into the `NewServer()` but not `NewResolver()`. In both of these cases, we
are doing this to prepare for testing.

When we write tests for the GraphQL Resolvers, we will need to use the `NewResolver()` method so we can call the
resolver methods. It's also easier for testing if we pass the `*ent.Client` instead of the `context.Context` since it's
less boilerplate in testing.
{{</ callout >}}

## Add the Note GraphQL Schema

Now that we have ent wired into our GraphQL resolver, we can create our Note schema for GraphQL. To do so, let's create
the `gql/schema/note.graphql` with the following:

```graphql {file="gql/schema/note.graphql"}
type Note {
  id: Int!
  nodeId: ID!

  title: String!
  bodyMarkdown: String!
  bodyHtml: String!

  createdAt: Time!
  updatedAt: Time!
}

input NoteInput {
  title: String!
  body: String!
}

extend type Query {
  notes: [Note!]!
}

extend type Mutation {
  createNote(input: NoteInput!): Note!
  updateNote(id: Int!, input: NoteInput!): Note!
  deleteNote(id: Int!): Boolean!
}
```

In this schema file, we are creating two models. The first one `type Note` is the type that contains our Note for
GraphQL responses. The `input NoteInput` model is used for requests to create or update a Note in the application.

We have also added four methods:

- List Notes Query - `notes: [Note!]!`
- Create - `createNote(input: NoteInput!): Note!`
- Update - `updateNote(nodeId: ID!, input: NoteInput!): Note!`
- Delete - `deleteNote(nodeId: ID!): Boolean!`

With this, we will be generating our CRUD endpoints to create, read, update, and delete our Notes. However, you may
notice that we currently don't have a way to get a single Note instance and we can only list them. This will be
addressed in a little bit when we add the `node(nodeId: ID!): Node` Query method.

Since we are using `Time` for the `createdAt` and `updatedAt` fields, we need to also add the `Time` type. Since this is
a common type I'm going to put it at the top of `gql/schema/common.graphql`:

```graphql {file="gql/schema/common.graphql"}
scalar Time

# ...
```

Now that we have updated the GraphQL schema files, we can regenerate the methods for GraphQL:

```bash
go generate ./...
```

As long as it works, you should now have a new `gql/note.resolvers.go` file with a bunch of methods that we need to fill
out. First up, we're going to look at this method:

```go {file="gql/note.resolvers.go"}
func (r *queryResolver) Notes(ctx context.Context) ([]*model.Note, error) {
  panic(fmt.Errorf("not implemented: Notes - notes"))
}
```

The `Notes(context.Context) ([]*model.Note, error)` method allows us to list Notes. If you notice the return type for
this currently is under the `gql/model` package and isn't referencing our `ent` Note model. It would be nice if we could
tell `gqlgen` to automatically use the `ent` models instead of creating new ones when possible. That's what we're going
to fix next.

## Autobind Ent Models

To allow binding `ent` models to `gqlgen`, we need to add the following to the `gqlgen.yml` file at the root of the
project:

```yaml {file="gqlgen.yml"}
autobind:
  - github.com/nikkomiu/gentql/ent
```

This change will tell `gqlgen` to to use all models within `ent` instead of generating a new model where possible.

Regenerate your code:

```bash
go generate ./...
```

If all goes well, you should now see that the `Notes(context.Context) ([]*ent.Note, error)` method now wants an `ent`
model in the return instead of a `gqlgen` model now. With that, we can update this to resolve all by changing the
implementation to:

```go {file="gql/note.resolvers.go"}
func (r *queryResolver) Notes(ctx context.Context) ([]*ent.Note, error) {
  return r.ent.Note.Query().All(ctx)
}
```

## Create Note Resolver

So far we haven't been able to see our app working end-to-end with GraphQL and ent. Let's change that now by
implementing the the `CreateNote()` resolver:

```go {file="gql/note.resolvers.go"}
func (r *mutationResolver) CreateNote(ctx context.Context, input model.NoteInput) (*ent.Note, error) {
  return r.ent.Note.Create().
    SetTitle(input.Title).
    SetBody(input.Body).
    Save(ctx)
}
```

Luckily for us, `ent` has a lot of nice features built into it that match up with `gqlgen` really well. So we can just
set the fields we want on our new Note, save it, and return it directly.

Let's test out what we have at this point by creating a new Note. In our GraphQL browser window, run the following:

```graphql
mutation {
  createNote(
    input: { title: "Example", body: "Some [link](https://google.com)!" }
  ) {
    id
    title
  }
}
```

You should get back a response like:

```json
{
  "data": {
    "createNote": {
      "id": 1,
      "title": "Example"
    }
  }
}
```

## Property Resolvers

If you notice in the `Note` type of the GraphQL schema file (`gql/schema/note.graphql`), we have two fields for the
`body` field that is stored in ent but neither of them match the ent field. This helps us to split the application model
from the database model and allows us to hide database fields from the API as well as adding additional fields that can
be resolved from the database model. Both of these we will see using the `body` field example.

Right now the two body fields are set to panic. Let's test this out by running the following query against our GraphQL
endpoint:

```graphql
query {
  notes {
    id
    title
    bodyHtml
    bodyMarkdown
  }
}
```

You should get back a response like:

```json
{
  "errors": [
    {
      "message": "internal system error",
      "path": ["notes", 0, "bodyHtml"]
    },
    {
      "message": "internal system error",
      "path": ["notes", 0, "bodyMarkdown"]
    }
  ],
  "data": null
}
```

Let's fix those fields now by implementing the resolvers for two body fields.

## Body Property Resolvers

Since we didn't expose the `body` field to the GraphQL schema it won't be included in responses. On top of that we have
three fields that do not resolve within the `ent` model for Note. Because of this, those fields have been changed to
resolver methods. Let's update the markdown resolver to just return the body (since that's how we'll store the body):

```go {file="gql/note.resolvers.go"}
// BodyMarkdown is the resolver for the bodyMarkdown field.
func (r *noteResolver) BodyMarkdown(ctx context.Context, obj *ent.Note) (string, error) {
  return obj.Body, nil
}
```

Now for the HTML one, we want to have a Markdown parser (in this case [Goldmark](https://github.com/yuin/goldmark))
convert the Markdown into HTML:

```go {file="gql/note.resolvers.go"}
// BodyHTML is the resolver for the bodyHtml field.
func (r *noteResolver) BodyHTML(ctx context.Context, obj *ent.Note) (string, error) {
  var buf bytes.Buffer
  if err := goldmark.Convert([]byte(obj.Body), &buf); err != nil {
    return "", err
  }
  return buf.String(), nil
}
```

Make sure you run `go mod tidy` and/or `go get github.com/yuin/goldmark` to ensure it's downloaded and added to the
`go.mod` and `go.sum`.

Now restart your API and let's see what we get back when we try to resolve those fields now:

```graphql
query {
  notes {
    id
    title
    bodyHtml
    bodyMarkdown
  }
}
```

We should now get back the expected body data for our record this time:

```json
{
  "data": {
    "notes": [
      {
        "id": 1,
        "title": "Example",
        "bodyHtml": "<p>Some <a href=\"https://google.com\">link</a>!</p>\n",
        "bodyMarkdown": "Some [link](https://google.com)!"
      }
    ]
  }
}
```

If you stop and think about it, this is a feature of GraphQL (and `gqlgen`) that is very powerful. We have this method
that will convert our Markdown into HTML _only if_ we ask for the HTML from the server in our GraphQL request.

## Resolve the Node ID

We have one more field for our GraphQL model that exists that doesn't exist on the ent model (the `nodeId` property).
This property is going to take a bit more effort to get implemented since this field is the `ID` field for the Note.
Within GraphQL the `ID` field should be globally unique. To get this done, we are going to add the NodeID resolver:

```go {file="gql/note.resolvers.go"}
// NodeID is the resolver for the nodeId field.
func (r *noteResolver) NodeID(ctx context.Context, obj *ent.Note) (string, error) {
  return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%d", note.Table, obj.ID))), nil
}
```

What we are doing is taking the table name (notes) splitting with a `:` and the ID field of the Note then base64
encoding the value (so it doesn't have conflicts from special characters). For security reasons, you can use something
other than the table name. However, for this case we'll just leave it as the table name. You will see when we add the
Noder method that you can set the first part to anything you want as long as you resolve it in the noder.

{{< callout type=note >}}
You can also create an extension to `ent` that will automatically generate a NodeID property on the model that handles
this functionality for you. At some point, I plan to create this and make it available as an open source repo on GitHub.
{{</ callout >}}

## Add the Node Resolver

Now we can add a `node(nodeId: ID!): Node` endpoint to our GraphQL API. This allows us to look up any entity of any type
given an `ID`. In GraphQL the `ID` field is supposed to be _globally unique_ so we can find any resource using this
method. It may seem weird at first, but bear with us because this is a feature of GraphQL that is pretty cool.

Let's start with adding the GraphQL query resolver for it in `gql/schema/common.graphql`. When you're done the common
schema should look like:

```graphql {file="gql/schema/common.graphql"}
scalar Time

interface Node {
  nodeId: ID!
}

type Query {
  hello(name: String!): String!
  node(nodeId: ID!): Node
}
```

Next, we need to add the model for Node to resolve to the `ent` model instead of generating a new `gql` model. Add
`Node` to the `models` section of `gqlgen.yml`:

```yaml {file="gqlgen.yml"}
models:
  # ...

  Node:
    model:
      - github.com/nikkomiu/gentql/ent.Noder
```

We now need to tell `Note` in GraphQL that it implements the `Node` interface. Update the `gql/schema/note.graphql` to
have the `Note` type implement this:

```graphql {file="gql/schema/note.graphql"}
type Note implements Node {
  # ...
```

As always when we change the GraphQL schema files and/or the `gqlgen.yml`, let's regenerate:

```bash
go generate ./...
```

You should now see the new `Node(context.Context) (ent.Noder, error)` method in the `gql/common.resolvers.go`. Let's
implement this method:

```go {file="gql/common.resolvers.go"}
// Node is the resolver for the node field.
func (r *queryResolver) Node(ctx context.Context, nodeID string) (ent.Noder, error) {
  rawNodeID, err := base64.RawURLEncoding.DecodeString(nodeID)
  if err != nil {
    return nil, fmt.Errorf("failed to parse node id: base64 decode error")
  }

  splitNodeID := strings.Split(string(rawNodeID), ":")
  if len(splitNodeID) != 2 {
    return nil, fmt.Errorf("failed to parse node id: wrong number of parts")
  }

  switch splitNodeID[0] {
  // add other cases here (custom table names, non-ent types, etc.)

  case note.Table:
    id, err := strconv.Atoi(splitNodeID[1])
    if err != nil {
      return nil, err
    }
    return r.ent.Noder(ctx, id, ent.WithFixedNodeType(splitNodeID[0]))

  default:
    return nil, fmt.Errorf("failed parse node id type")
  }
}
```

Finally, let's test out our new `node` method on GraphQL (make sure to set your `nodeId` to one that exists in your app):

```graphql
query {
  node(nodeId: "bm90ZXM6MQ") {
    nodeId
    ... on Note {
      title
    }
  }
}
```

## Add Remaining CRUD Resolvers

We now have the ability to create a note, get a note by Node ID using the `node()` resolver, and list all Notes.
Let's finish up by adding the update and delete methods to round out our CRUD operations. Open the
`gql/note.resolvers.go` and implement the `UpdateNote(context.Context, int, model.NoteInput)` and
`DeleteNote(context.Context, int)` methods like this:

```go {file="gql/note.resolvers.go"}
// UpdateNote is the resolver for the updateNote field.
func (r *mutationResolver) UpdateNote(ctx context.Context, id int, input model.NoteInput) (*ent.Note, error) {
  return r.ent.Note.UpdateOneID(id).
    SetTitle(input.Title).
    SetBody(input.Body).
    Save(ctx)
}

// DeleteNote is the resolver for the deleteNote field.
func (r *mutationResolver) DeleteNote(ctx context.Context, id int) (bool, error) {
  err := r.ent.Note.DeleteOneID(id).Exec(ctx)
  if err != nil {
    if ent.IsNotFound(err) {
      return false, nil
    }

    return false, err
  }

  return true, nil
}
```

The `UpdateNote(context.Context, int, model.NoteInput)` method is pretty straightforward and very similar to the
`CreateNote(context.Context, model.NoteInput)` method except that we are updating instead of creating.

The `DeleteNote(context.Context, int)` looks a bit more complex but it is still pretty simple. We try to delete it and
if it doesn't exist we return false with no error, if there's an error we return false with the error, otherwise we
return true and no error. This way we can determine if the delete is ok and it was actually performed.

## Conclusion

We have covered a lot of ground in this section. Starting with adding the ent Client to our Resolver to adding Note
models, resolvers, the node interface and resolver, and finishing off with the full CRUD operations for Notes. If you've
made it this far, great job! This isn't easy to do but with all of this set up hopefully you can see how this becomes
much easier when we add additional models, resolvers, properties, etc.

Next up, we're going to add sorting, filtering, and even the ability to search with clauses.
