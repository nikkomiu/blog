---
date: 2024-08-14T00:00:00Z
title: Setting Up Ent
author: Nikko Miu
draft: true
tags:
  - golang
  - ent
---

<!--more-->

## Create our First Entity

```bash
go run -mod=mod entgo.io/ent/cmd/ent new Note
```

Update the fields for the newly created `Note` schema in the `ent/schema/note.go` file:

```go
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

## Generate Code

```bash
go generate ./...
```

## Hide and Exclude Generated Filex

Update the `files.exclude` in `.vscode/settings.json` to exclude the Ent generated files:

```json
  // ...
  "gql/{generated,model/*_gen}.go": true,
  "ent/{enttest/,hook/,migrate/,predicate/,runtime/,client.go,ent.go,mutation.go,runtime.go,tx.go,*_create.go,*_delete.go,*_query.go,*_update.go}": true,
  "ent/{note}/": true
  // ...
```

Update the `.gitignore` to include ent files except for the ones needed for code generation:

```gitignore
ent/*
!ent/generate.go
!ent/schema/
```

{{< commit-ref repo="nikkomiu/spectral" sha="9888cc0521ff321806c4acccd8a0752ee9916d1a" />}}

## Initialize Client

## Database Migrations
