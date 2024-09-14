---
title: Add Items API
author: Nikko Miu
toc: true
draft: true
weight: 3
tags:
  - dotnet
  - mongodb
---

Before we start, let's create a `DbContext` class that will contain our various collections and maintin our database
connection. This will help reduce the amout of duplicate code in our services as well as centralizing the creation of a
`MongoClient`.

```cs {file="src/Monget.Domain/DbContext.cs"}
namespace Monget.Domain;

using Monget.Domain.Models;
using MongoDB.Driver;

public class DbContext
{
    private readonly MongoClient _client;
    private readonly IMongoDatabase _database;

    public IMongoCollection<Property> Property { get => _database.GetCollection<Property>("properties"); }

    public DbContext(DatabaseSettings settings)
    {
        _client = new MongoClient(settings.URL);
        _database = _client.GetDatabase(settings.DatabaseName);
    }
}
```

Update our `Program.cs` to create a singleton of our `DbContext`:

```cs {file="src/Monget.API/Program.cs"}
builder.Services.AddSingleton<DbContext>();
```

Update the `PropertyService.cs` to use our new `DbContext` object:

```cs {file="src/Monget.Domain/Services/PropertyService.cs"}
namespace Monget.Domain.Services;

using Monget.Domain.Interfaces;
using Monget.Domain.Models;
using MongoDB.Driver;

public class PropertyService : IPropertyService
{
    private readonly DbContext _db;

    public PropertyService(DbContext dbContext)
    {
        _db = dbContext;
    }

    public Task<List<Property>> ListPropertiesAsync(int size, int skip)
    {
        return _db.Property
            .Find(t => true)
            .Skip(skip)
            .Limit(size)
            .ToListAsync();
    }

    public async Task<Property> CreatePropertyAsync(Property property)
    {
        var newProperty = new Property {
            Name = property.Name,
            Description = property.Description,
        };

        await _db.Property.InsertOneAsync(newProperty);

        return newProperty;
    }

    public Task<Property> GetPropertyAsync(string id)
    {
        return _db.Property.Find(p => p.Id == id).SingleOrDefaultAsync();
    }

    public async Task<Property> UpdatePropertyAsync(string id, Property property)
    {
        var updateDef = Builders<Property>.Update
            .Set(p => p.Name, property.Name)
            .Set(p => p.Description, property.Description)
            .Set(p => p.UpdatedAt, DateTime.Now);
        var opts = new FindOneAndUpdateOptions<Property>
        {
            ReturnDocument = ReturnDocument.After,
        };

        var result = await _db.Property.FindOneAndUpdateAsync<Property>(p => p.Id == id, updateDef, opts);

        return result;
    }

    public async Task<bool> DeletePropertyAsync(string id)
    {
        var result = await _db.Property.DeleteOneAsync(p => p.Id == id);

        return result.DeletedCount == 1;
    }
}
```
