---
title: MongoDB Setup
author: Nikko Miu
toc: true
weight: 2
tags:
  - dotnet
  - mongodb
---

Now that we have our project set up, we can start integrating MongoDB into our domain layer and wire up our API
controller to use it. We will also cover some built-in functionality of .NET that will make our lives a bit easier with
configuration of the database.

<!--more-->

At a high level, this is what our Entity Relationship Diagram is going to look like:

```mermaid
erDiagram
  Property {
    string name
    string description
  }

  Property ||--|{ Item : items

  Item {
    string name
    string description
    double value
    string serialNumber
    string notes
  }

  Item ||--|{ Component : components

  Component {
    string name
    string description
    string serialNumber
    string notes
  }
```

We will have a property with 0-N items within it. We will store some information about the property as well as each item
that we are storing within the property.

## Adding MongoDB Package

To get started with adding MongoDB, we need to add the `MongoDB.Driver` package to the `Domain` project:

```bash
dotnet add ./src/Monget.Domain/Monget.Domain.csproj package MongoDB.Driver
```

## Create Database Configuration

We need to create a class that will house the configuration for our database. This configuration will be loaded in from
the `appsettings.json`, `appsettings.{Environment}.json`, as well as environment variables. Because this configuration
is part of the database, which is a part of the `Domain`, I'm going to be putting it in the `Domain` project:

```cs {file="src/Monget.Domain/Models/DatabaseSettings.cs"}
namespace Monget.Domain.Models;

using MongoDB.Bson.Serialization.Conventions;

public class DatabaseSettings
{
    public string URL { get; set; } = "mongodb://localhost:27017";
    public string DatabaseName { get; set; } = "monget";

    public static readonly string SectionName = "Database";

    public DatabaseSettings()
    {
        ConventionRegistry.Register("camelCase", new ConventionPack
        {
            new CamelCaseElementNameConvention()
        }, t => true);
    }
}
```

Here we have defined `URL` with a default value of `mongodb://localhost:27017`. This will allow us to load
the database configuration even if it isn't set somewhere else. I tend to follow the paradigm that it's best to set
reasonable default values for configuration so if someone has a "default" environment set up they should be able to just
run the app without setting a bunch of configuration to do so. I'm doing the same thing with the `DatabaseName` field
which will be the name of the database within our MongoDB host that we'd like to connect to.

I'm also going to set a `static readonly` field for what the section name should be in the `appsettings` as well as what
the prefix should be for the environment variables.

The last thing I'm doing in this file is setting up the `camelCase` naming convention for MongoDB so our fields are in
the recommended naming format for collections and fields on our database.

## Load Configuration in API

Now that the class is created for our configuration, we can tell the API to load this configuration from its sources in
the `Program.cs` of the `API` project:

```cs {file="src/Monget.API/Program.cs"}
// Add MongoDB Settings
builder.Services.Configure<DatabaseSettings>(builder.Configuration.GetSection(DatabaseSettings.SectionName));
builder.Services.AddSingleton(s => s.GetRequiredService<IOptions<DatabaseSettings>>().Value);
```

Generally I put this above the other `builder.Services` as this (loading configuration) is typically a prerequisite to
loading the other service dependencies. In reality it doesn't really matter, but I like having these in a "logical"
order.

This second statement may seem a bit odd, but all we're doing is unwrapping the `IOptions<DatabaseSettings>` so we can
take in the dependency as `DatabaseSettings` after the configuration has been loaded. If we didn't do this we would need
to add the `Optional` package to the `Domain` project since it's not a default package.

{{< callout type=note >}}
If you are using the Dev Container, there is already a MongoDB container that gets started alongside the development
environment. However, we need to update the `docker-compose.yml` to set the environment variable for the `app` container
to contact our actual MongoDB instance.

```yaml {file=".devcontainer/docker-compose.yml"}
services:
  app:
    build:
      context: "."
      dockerfile: Dockerfile
    volumes:
      - ../:/workspaces/Monget:cached
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      DATABASE__URL: mongodb://root:example@mongo:27017
    command: sleep infinity
    networks:
      - backend

  # ...
```

Once you have updated this, you'll need to rebuild the Dev Container. You can use `Ctrl` (`Command` on macOS) +
`Shift` + `P` and run the `Dev Containers: Rebuild Container` command.

{{</ callout >}}

For more information on how configuration is loaded by .NET look at the
[Configuration in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-8.0)
documentation.

## Create Domain Model

```cs {file="src/Monget.Domain/Models/Property.cs"}
namespace Monget.Domain.Models;

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Property
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Name { get; set; } = "";
    public string Description { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
```

## Update Service to use Database

With our DI capable of loading the configuration from various sources, let's update the `PropertyService` to take in our
configuration and set some class level variables that we can use to access our collection.

```cs {file="src/Monget.Domain/Services/PropertyService.cs"}
namespace Monget.Domain.Services;

using Monget.Domain.Interfaces;
using Monget.Domain.Models;
using MongoDB.Driver;

public class PropertyService : IPropertyService
{
    private readonly IMongoCollection<Property> _collection;

    public PropertyService(DatabaseSettings databaseSettings)
    {
        var client = new MongoClient(databaseSettings.URL);
        var database = client.GetDatabase(databaseSettings.DatabaseName);
        _collection = database.GetCollection<Property>("properties");
    }

    public Task<List<Property>> ListPropertiesAsync(int size, int skip)
    {
        return _collection
            .Find(t => true)
            .Skip(skip)
            .Limit(size)
            .ToListAsync();
    }
}
```

Since we are changing the method name (to `ListPropertiesAsync`), and the return type of `ListProperties` we need to
update the interface to match our new contract:

```cs {file="src/Monget.Domain/Interfaces/IPropertyService.cs"}
namespace Monget.Domain.Interfaces;

using Monget.Domain.Models;

public interface IPropertyService
{
    Task<List<Property>> ListPropertiesAsync(int size, int skip);
}
```

{{< callout type=note >}}
As a convention, methods in .NET that are `async` (or return a `Task`) have the suffix `Async` in their name. This is to
denote that the method will need to (in some way) be `await`ed by the caller. This also means that the caller will most
likely need to be async all the way up the call chain.
{{</ callout >}}

## Return Database Model from API

For right now, we are just going to convert our API method to be `async` returning a `Task<ActionResult>` with the
response set to the database model. After we complete the `CreateAsync` we will return our API model instead of directly
returning the database model.

```cs {file="src/Monget.API/Controllers/PropertiesController.cs"}
[HttpGet]
public async Task<ActionResult> ListAsync(int size = 24, int skip = 0)
{
    var properties = await _propertyService.ListPropertiesAsync(size, skip);

    return Ok(properties);
}
```

If you open Swagger and run the request for the List method, you should just get back `[]` in the response. This is
because we haven't added any records to our database yet.

## Create Property Request

Let's update `Create` to be `CreateAsync` and create a new property in our database now. To do this we have to modify
a few different places (`IPropertyService`, `PropertyService`, and `PropertiesController`). Let's start with the service
interface:

```cs {file="src/Monget.Domain/Interfaces/IPropertyService.cs"}
namespace Monget.Domain.Interfaces;

using Monget.Domain.Models;

public interface IPropertyService
{
    Task<List<Property>> ListPropertiesAsync(int size, int skip);
    Task<Property> CreatePropertyAsync(Property property);
}
```

Now that we have our interface updated, we can implement the interface on our service:

```cs {file="src/Monget.Domain/Services/PropertyService.cs"}
public async Task<Property> CreatePropertyAsync(Property property)
{
    var newProperty = new Property {
        Name = property.Name,
        Description = property.Description,
    };

    await _collection.InsertOneAsync(newProperty);

    return newProperty;
}
```

Here I'm creating a new instance of the `Property` model in order to limit which fields the end user is allowed to set
on the `Property` model. You don't need to do this if you trust the user input. However, as a general rule you shouldn't
trust user input from the API. Then I'm going to insert it into the database using `async`/`await`. Finally, we will
return the `newProperty` back to the caller (the `Id`, `CreatedAt`, and `UpdatedAt` fields will all be set on this
instance).

{{< callout type=note >}}
If you would like you can use `Ctrl` (`Command` on macOS) + `.` on the `IPropertyService` that is underlined in red on
the service before adding the implementation to have VS Code (or Visual Studio) add the empty implementation method for
us. This can make it a bit quicker when adding new methods on the service.
{{</ callout >}}

Finally, we just need to update our `Create` method on the controller to be `async` (also renaming the method to be
`CreateAsync`), get the `Property` from the body of the request using the `[FromBody]` attribute. This attribute will
parse our request body from JSON into the model for us and even provide us with the ability to automatically validate
the request from the user (more on this later).

```cs {file="src/Monget.API/Controllers/PropertiesController.cs"}
[HttpPost]
public async Task<ActionResult> CreateAsync([FromBody] Property property)
{
    var newProperty = await _propertyService.CreatePropertyAsync(property);

    return Ok(newProperty);
}
```

With all of this in place, let's refresh (or reopen) the Swagger UI page and create a testing Property. Since we weren't
able to properly test the List method before, after creating a Property also check that it shows up in the List route.

{{< callout type=note >}}
If you're running the Dev Container, you can also access the **Mongo Express** interface to view the database contents
within your browser. To use it, navigate to [http://localhost:8081/](http://localhost:8081/) where you should see the
`monget` database and the `properties` collection within it. You should be able to open the collection and see any of
the records that you have created so far. This interface is great for validating that your collection names, and model
properties are mapped into MongoDB as you would expect. It will also help troubleshoot issues with fields that are
computed or not user-exposed.
{{</ callout >}}

## Create API Models

Now we can create our API models. The first model we can create is the `PropertyRequest` model:

```cs {file="src/Monget.Models/PropertyRequest.cs"}
namespace Monget.Models;

using System.ComponentModel.DataAnnotations;

public class PropertyRequest
{
    [Required]
    [MinLength(3)]
    public string Name { get; set; } = "";

    public string Description { get; set; } = "";
}
```

In this case we are setting default values for both the `Name` and the `Description` fields to be empty strings (so they
aren't `null` by default). We are also adding a validation to the `Name` field to be required by using the `[Required]`
attribute as well as the `[MinLength(3)]` attribute to require that the `Name` field needs to be at least 3 characters
long. These validations will automatically be checked and if there are any validation failures they'll be returned to
the client of our API **before** it even hits our controller endpoint. This ensures that our API is getting **valid**
data _before_ we proceed to the controller actions for each of them.

We also need to create the `PropertyResponse` model. This model will be the model for returning a single instance of a
`Property` from our API back to the clients.

```cs {file="src/Monget.Models/PropertyResponse.cs"}
namespace Monget.Models;

public class PropertyResponse
{
    public string? Id { get; set; }

    public string? Name { get; set; }
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

{{< callout type=note >}}
In the response model I'm not setting default values for any of the fields. You may also notice that I have a `?` after
the string fields. This is to allow for `null` to be put on them (even though it's highly unlikely that the fields will
ever be `null`). The biggest reason for this is to prevent the .NET compiler from warning us about the properties being
non-null but missing the initialization of the field to something other than `null`.
{{</ callout >}}

## Mapping Models

For mapping between API models and Domain models (and back again), I'm going to use the `AutoMapper` package. This will
help us to switch between these models easily without having a bunch of boilerplate code within our application that we
need to add a bunch of not-very-exciting tests to. To do this, let's add the package to our API project:

```bash
dotnet add ./src/Monget.API/Monget.API.csproj package AutoMapper.Extensions.Microsoft.DependencyInjection
```

This will add the `AutoMapper` package as well as the necessary extensions for DI within ASP.NET. Then, we need to add
our mapper class:

```cs {file="src/Monget.API/MappingProfile.cs"}
namespace Monget.API;

using AutoMapper;
using Monget.Domain.Models;
using Monget.Models;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<PropertyRequest, Property>();
        CreateMap<Property, PropertyResponse>();
    }
}
```

Next, we can add `AutoMapper` to the DI within our `Program.cs` to manage model mappings for us. I generally place this
after the `Configure()` calls and before any service instances:

```cs {file="src/Monget.API/Program.cs"}
// Add AutoMapper
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
```

With AutoMapper added to our application's DI, we can add it to our controller. For this, we are going to add an
`IMapper` parameter to the constructor of our controller. This will allow us to map between types using the
`Map<TDestination>()` method:

```cs {file="src/Monget.API/Controllers/PropertiesController.cs",add_lines="3 6 8 13 18 23 26-28 31",rem_lines="14 19 24 29 32"}
public class PropertiesController : ControllerBase
{
    private readonly IMapper _mapper;
    private readonly IPropertyService _propertyService;

    public PropertiesController(IMapper mapper, IPropertyService propertyService)
    {
        _mapper = mapper;
        _propertyService = propertyService;
    }

    [HttpGet]
    public async Task<ActionResult<PropertyResponse>> ListAsync(int size = 24, int skip = 0)
    public async Task<ActionResult> ListAsync(int size = 24, int skip = 0)
    {
        var properties = await _propertyService.ListPropertiesAsync(size, skip);

        return Ok(_mapper.Map<List<PropertyResponse>>(properties));
        return Ok(properties);
    }

    [HttpPost]
    public async Task<ActionResult<PropertyResponse>> CreateAsync([FromBody] PropertyRequest property)
    public async Task<ActionResult> CreateAsync([FromBody] Property property)
    {
        var createProperty = _mapper.Map<Property>(property);

        var newProperty = await _propertyService.CreatePropertyAsync(createProperty);
        var newProperty = await _propertyService.CreatePropertyAsync(property);

        return Ok(_mapper.Map<PropertyResponse>(newProperty));
        return Ok(newProperty);
    }
```

Here, we are changing the response to explicitly set the response model to `PropertyResponse`, we are changing the
`CreateAsync()` parameter to be `PropertyRequest`, and mapping the requests and responses between their respective types.
This will make our Swagger spec look a bit more complete and hopefully you can start to see the reason for splitting our
logic between the controller and service layers.

{{< callout type=note >}}
You may be wondering why we are even bothering to add the API Models at all. There are three main reasons for this. The
first is to allow for returning additional (usually computed) properties to our API response that don't need to be on
our underlying database model. The second is the opposite, we can hide fields that should not be returned to the user
but should be stored in the database. Examples of this would be fields that only admins are allowed to see or fields
that are used in the lifecycle of the domain object but don't have any meaning to an end user of the model. The final
common reason is when we want to limit the amount of data sent across the wire for a given API response model. In this
situation, we're omitting fields from the API response to keep network overhead of the response minimal.
{{</ callout >}}

If you would rather not include the CPU overhead of `AutoMapper` and/or would rather manually manage the mapping process
for your models, I'd recommend creating a new namespace (and folder) within the `API` project called something like
`Mappers` where you add static `Map()` functions that take one model and return the corresponding mapped model. If you
do it this way, just remember that you need to make sure that the parameters of the `Map()` function are unique as .NET
(as most languages with method overloading) can't determine which method to use **just** based on the return type of the
function. Because of this, it may be best to set these `Map<>()` functions up using generics with explicit overrides.

## List Parameter Validations

We can also set up validations on the parameters that are passed into our `List` action. In this case, we are going to
add a `[Range(1, 100)]` attribute to the `size` parameter that will limit the number of results per page to be between 1
and 100. Also, we'll set a `[Range(0, int.MaxValue)]` attribute on the `skip` parameter to limit the skip between 0 and
the highest value that will fit into an `int`. This is to make sure someone doesn't pass a negative value as well as
making sure that someone doesn't accidently pass a value that will overflow the `int`.

```cs {file="src/Monget.API/Controllers/PropertiesController.cs",add_lines=2,rem_lines=1}
public async Task<ActionResult<PropertyResponse>> ListAsync(int size = 24, int skip = 0)
public async Task<ActionResult<PropertyResponse>> ListAsync([Range(1, 100)] int size = 24, [Range(0, int.MaxValue)] int skip = 0)
```

## Add Remaining CRUD

Starting with the service this time, let's create the methods needed to complete our CRUD operations:

```cs {file="src/Monget.Domain/Services/PropertyService.cs"}
public Task<Property> GetPropertyAsync(string id)
{
    return _collection.Find(p => p.Id == id).SingleOrDefaultAsync();
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

    var result = await _collection.FindOneAndUpdateAsync<Property>(p => p.Id == id, updateDef, opts);

    return result;
}

public async Task<bool> DeletePropertyAsync(string id)
{
    var result = await _collection.DeleteOneAsync(p => p.Id == id);

    return result.DeletedCount == 1;
}
```

```cs {file="src/Monget.Domain/Interfaces/IPropertyService.cs"}
Task<Property> GetPropertyAsync(string id);
Task<Property> UpdatePropertyAsync(string id, Property property);
Task<bool> DeletePropertyAsync(string id);
```

```cs {file="src/Monget.API/Controllers/PropertiesController.cs"}
[HttpGet("{id}")]
public async Task<ActionResult<PropertyResponse>> GetByIdAsync(string id)
{
    var property = await _propertyService.GetPropertyAsync(id);

    return Ok(_mapper.Map<PropertyResponse>(property));
}

[HttpPut("{id}")]
public async Task<ActionResult> UpdateAsync(string id, [FromBody] PropertyRequest property)
{
    var updateProperty = _mapper.Map<Property>(property);

    var updatedProperty = await _propertyService.UpdatePropertyAsync(id, updateProperty);

    return Ok(_mapper.Map<PropertyResponse>(updatedProperty));
}

[HttpDelete("{id}")]
public async Task<ActionResult> DeleteAsync(string id)
{
    var ok = await _propertyService.DeletePropertyAsync(id);

    return ok ? Ok() : NoContent();
}
```

## Conclusion

> TODO: rewrite

In this section, we have:

- Set up our MongoDB interaction layer.
- Updated our service to interact with MongoDB.
- Updated our `List()` and `Create()` API controller methods to use MongoDB.
- Added API models.
- Mapped between the API models and the Domain model.
- Added request validations to `List` and `Create`.

There is quite a bit packed into this section. In the next section we will expand on this by completing the CRUD
operations for our Properties API controller. As we continue we will keep reusing the same concepts that were covered in
this section. If you feel like something in this section is fuzzy you may want to stick around here and try to
understand what is going on before continuing.
