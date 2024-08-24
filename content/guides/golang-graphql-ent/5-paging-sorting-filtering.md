---
date: 2024-08-12T00:00:00Z
title: Paging, Sorting, and Filtering
author: Nikko Miu
toc: true
tags:
  - golang
  - graphql
  - ent
---

Now that we have `ent` and `gqlgen` wired up, we can look at updaing our list notes resolver. In this section, we will
look at implementing paging, sorting, filtering, and where clauses to provide a more robust experience to our client
applications.

<!--more-->

This section is going to be using references from the [Relay Cursor Connection Spec](https://relay.dev/graphql/connections.htm)
which covers what the specifications _should_ look like when using this kind of pattern in GraphQL.

## Add Paging

First let's look at paging. This is going to allow us to return smaller datasets to the client applications as well as
giving the ability to use a "Cursor" to navigate to the next page of the dataset until the end.

First, let's update our `notes` query to take the parameters we need to provide this functionality to the client. We
also want to update the response object to be a new `NoteConnection` struct which will contain both our data and
information on paging:

```graphql {file="gql/schema/note.graphql"}
type NoteConnection {
  edges: [NoteEdge]
  pageInfo: PageInfo!
  totalCount: Int!
}

type NoteEdge {
  node: Note
  cursor: Cursor!
}

input NoteInput {
  title: String!
  body: String!
}

extend type Query {
  notes(after: Cursor, first: Int, before: Cursor, last: Int): NoteConnection!
}
```

With this updated, you may notice that we are using a couple of types that haven't been defined yet. Let's define those
types in the `common.graphql` schema file now:

```graphql {file="gql/schema/common.graphql"}
scalar Cursor

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: Cursor
  endCursor: Cursor
}
```

You can put these anywhere in the schema file. However, I generally group my `scalar`s together after any `directive`s
and before any `interface`s or `type`s. Also, the reason I'm deciding to put these in the common schema instead of the
note schema is these types are generic and can be used by any schema.

With the schema files updated, we can regenerate our code:

```bash
go generate ./...
```

This time you will probably get an error within the `gql/note.resolvers.go` file because there is a compilation error.
We can ignore this error since it's directly related to the change in response of our `notes` resolver.

Let's update the resolver to fix the errors:

```go {file="gql/common.resolver.go"}
// Notes is the resolver for the notes field.
func (r *queryResolver) Notes(ctx context.Context, after *entgql.Cursor[int], first *int, before *entgql.Cursor[int], last *int) (*ent.NoteConnection, error) {
  return r.ent.Note.Query().Paginate(ctx, after, first, before, last)
}
```

Because of the specific naming and structure of the magic `type`s we defined in our schema, we don't need to translate
anything from `ent` when we return. The `Paginate()` method of `Query()` will automatically return the data structures
we need to satisfy the `NoteConnection` struct defined within the schema. That's all we needed to do to get this working.

We can now test getting records back in the list using the GraphiQL interface:

```graphql
query {
  notes(first: 10) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      hasPreviousPage
      startCursor
      hasNextPage
      endCursor
    }
  }
}
```

With this we should get back:

```json
{
  "data": {
    "notes": {
      "edges": [
        {
          "node": {
            "id": 1,
            "title": "Example"
          }
        }
      ],
      "pageInfo": {
        "hasPreviousPage": false,
        "startCursor": "gaFpAQ",
        "hasNextPage": false,
        "endCursor": "gaFpAQ"
      }
    }
  }
}
```

If we have more records we can use the `after` parameter with a `cursor` to go to records beyond that point. This is a
more robust way of handling paging than the traditional `page` and `size` as it will also take into account things like
the sorting order, where clauses, and not skip records or repeat results when new items are added.

## Add Ordering

For ordering, we need to update the code generation that happens within `ent` by defining what fields we want to be used
for ordering and what name (in GraphQL) they go by. We will update our `ent/schema/note.go` file to include these
annotations for the `Title`, `CreatedAt`, and the `UpdatedAt` fields of our model:

```go {file="ent/schema/note.go"}
// Fields of the Note.
func (Note) Fields() []ent.Field {
  return []ent.Field{
    field.String("title").
      Annotations(
        entgql.OrderField("TITLE"),
      ),
    field.Text("body"),

    field.Time("createdAt").
      Default(time.Now).
      Annotations(
        entgql.OrderField("CREATED_AT"),
      ),
    field.Time("updatedAt").
      Default(time.Now).
      UpdateDefault(time.Now).
      Annotations(
        entgql.OrderField("UPDATED_AT"),
      ),
  }
}
```

Notice that we define the `OrderField()` property with `SCREAMING_SNAKE_CASE` as these are the values that we will be
using within our `enum` in the GraphQL schema. So let's update the note schema to utilize these:

```graphql {file="gql/schema/note.graphql"}
input NoteOrder {
  direction: OrderDirection!
  field: NoteOrderField
}

enum NoteOrderField {
  TITLE
  CREATED_AT
  UPDATED_AT
}

extend type Query {
  notes(
    after: Cursor
    first: Int
    before: Cursor
    last: Int
    orderBy: NoteOrder
  ): NoteConnection!
}
```

If you notice, once again, we have introduced a new type but not defined that type (`OrderDirection`). We will define
this type in the common schema as it's just a simple and generic enum:

```graphql {file="gql/schema/common.graphql"}
enum OrderDirection {
  ASC
  DESC
}
```

Now that everything is in place, we can generate our code:

```bash
go generate ./...
```

With our new `ent` options added and our GraphQL schema files updated to allow for ordering, we can update the resolver
to utilize the order field:

```go {file="gql/note.resolvers.go"}
// Notes is the resolver for the notes field.
func (r *queryResolver) Notes(ctx context.Context, after *entgql.Cursor[int], first *int, before *entgql.Cursor[int], last *int, orderBy *ent.NoteOrder) (*ent.NoteConnection, error) {
  return r.ent.Note.Query().Paginate(ctx, after, first, before, last, ent.WithNoteOrder(orderBy))
}
```

## Filtering

For filtering, we need to update the `ent` extension responsible for GraphQL generation. The extension needs to be
configured to generate `WhereInput`s:

```go {file="ent/entc.go"}
func main() {
  ex, err := entgql.NewExtension(entgql.WithWhereInputs(true))
  if err != nil {
    log.Fatalf("creating entgql extension: %s", err)
  }

  if err = entc.Generate("./schema", &gen.Config{}, entc.Extensions(ex)); err != nil {
    log.Fatalf("running ent codegen: %s", err)
  }
}
```

With that, we can now add the `WhereInput` to our schema file. The `WhereInput` defines where conditions that can be
used to filter the content using complex queries:

```graphql {file="gql/schema/note.graphql"}
input NoteWhereInput {
  not: NoteWhereInput
  and: [NoteWhereInput!]
  or: [NoteWhereInput!]

  title: String
  titleNEQ: String
  titleIn: [String!]
  titleNotIn: [String!]
  titleGT: String
  titleGTE: String
  titleLT: String
  titleLTE: String
  titleContains: String
  titleHasPrefix: String
  titleHasSuffix: String
  titleEqualFold: String
  titleContainsFold: String

  createdAt: Time
  createdAtNEQ: Time
  createdAtIn: [Time!]
  createdAtNotIn: [Time!]
  createdAtGT: Time
  createdAtGTE: Time
  createdAtLT: Time
  createdAtLTE: Time

  updatedAt: Time
  updatedAtNEQ: Time
  updatedAtIn: [Time!]
  updatedAtNotIn: [Time!]
  updatedAtGT: Time
  updatedAtGTE: Time
  updatedAtLT: Time
  updatedAtLTE: Time
}

extend type Query {
  notes(
    after: Cursor
    first: Int
    before: Cursor
    last: Int
    orderBy: NoteOrder
    where: NoteWhereInput
  ): NoteConnection!
}
```

Notice that within the `WhereInput` we have `not`, `and`, as well as `or` conditions also of the `NoteWhereInput` type.
Doing this allows us to create nested where conditions for notes. Later, we can expand this to also traverse where
conditions based on other ent models as well.

Update our resolver once again to add a where filtering clause to the `Paginate()`:

```go {file="gql/note.resolvers.go"}
// Notes is the resolver for the notes field.
func (r *queryResolver) Notes(ctx context.Context, after *entgql.Cursor[int], first *int, before *entgql.Cursor[int], last *int, orderBy *ent.NoteOrder, where *ent.NoteWhereInput) (*ent.NoteConnection, error) {
  return r.ent.Note.Query().
    Paginate(
      ctx,
      after,
      first,
      before,
      last,
      ent.WithNoteOrder(orderBy),
      ent.WithNoteFilter(where.Filter),
    )
}
```

With that you should now be able to filter data by conditions that are listed within the `NoteWhereInput` struct in our
GraphQL schema.
