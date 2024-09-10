---
title: Getting Started
author: Nikko Miu
toc: true
weight: 1
tags:
  - dotnet
  - mongodb
---

To kick things off, we're going to create our project structure using the `dotnet` CLI. I will be adding a Dev Container
to keep a consistent development experience when building the app. However, you don't need to follow that if you already
have a .NET development setup you like.

<!--more-->

## Dev Container

I don't keep the .NET CLI installed on my machine (mainly because I develop in Dev Containers). So to start with I'm
going to create my Dev Container and get into that environment so I have a common .NET configuration for developing the
app within.

**TODO:** Add `devcontainer.json`, `docker-compose.yml`, `Dockerfile`

**TODO:** Add `.vscode/settings.json`, `.vscode/extensions.json`

## Create Source Projects

To list the templates available:

```bash
dotnet new list
```

First thing we need to create is the Solution file:

```bash
dotnet new sln
```

This file contains all of our project references that we have for our application. For .NET-based projects, typically
there will be multiple projects. Each of these projects will contain a specific subdomain of our application. This can
be utilized to create multiple "entrypoints" to our application while only needing to maintain one instance of the
common dependencies (like an API, Console app, Web UI, gRPC Server, etc.).

Create the API project and add it to our Solution:

```bash
dotnet new webapi -o ./src/Monget.API
dotnet sln Monget.sln add ./src/Monget.API/Monget.API.csproj
```

Create the Models project which will house the API models:

```bash
dotnet new classlib -o ./src/Monget.Models
dotnet sln Monget.sln add ./src/Monget.Models/Monget.Models.csproj
```

Finally, create the Domain project which will keep our database interactions and business logic:

```bash
dotnet new classlib -o ./src/Monget.Domain
dotnet sln Monget.sln add ./src/Monget.Domain/Monget.Domain.csproj
```

Now we need to add the references between the projects that we have created. First, let's reference the `Monget.Models`
project from the `Monget.API` project. This will allow us to use the `Monget.Models` inside of our `Monget.API`:

```bash
dotnet add ./src/Monget.API/Monget.API.csproj reference ./src/Monget.Models/Monget.Models.csproj
```

Then we just need to do the same thing with the `Monget.Domain` project so we can use it from our `Monget.API` project:

```bash
dotnet add ./src/Monget.API/Monget.API.csproj reference ./src/Monget.Domain/Monget.Domain.csproj
```

## Create Our First Controller

We can create our controller from scratch. However, there is also a template in the `dotnet` CLI to generate a new
controller for us:

```bash
dotnet new apicontroller -o ./src/Monget.API/Controllers/ -n PropertiesController
```

Let's update the newly added controller to have our CRUD operations just return some simple strings for now. This will
let us build up the controller as we go:

```cs {file="src/Monget.API/Controllers/PropertiesController.cs"}
namespace Monget.API.Controllers;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
public class PropertiesController : ControllerBase
{
    [HttpGet]
    public ActionResult List(int size = 24, int skip = 0)
    {
        return Ok("list");
    }

    [HttpPost]
    public ActionResult Create()
    {
        return Ok("create");
    }

    [HttpGet("{id}")]
    public ActionResult GetById(string id)
    {
        return Ok($"get by id: {id}");
    }

    [HttpPut("{id}")]
    public ActionResult Update(string id)
    {
        return Ok($"update by id: {id}");
    }

    [HttpDelete("{id}")]
    public ActionResult Delete(string id)
    {
        return Ok($"delete by id: {id}");
    }
}
```

## Update Startup

Now, let's update the `Program.cs` to add support for controllers, remove the default weather route, as well as move
`UseHttpsRedirection()` under an `IsProduction()` check. With all of these changes your `Program.cs` should look like:

```cs {file="src/Monget.API/Program.cs"}
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.MapControllers();
app.Run();
```

## Testing our API

Now that we have a controller created, we can start our app and test to make sure our API is set up correctly:

```bash
dotnet run --project ./src/Monget.API/Monget.API.csproj
```

Running our app this way is ok. However, the `dotnet` CLI supports live reloading of the application that we can use.
To do this we just need to use the `watch` command instead of `run`:

```bash
dotnet watch --project ./src/Monget.API/Monget.API.csproj
```

With either of these commands we can go to the Swagger endpoint of our API. An ASP.NET application is a _bit_ different
than other frameworks in that, by default, it randomly picks a port when creating the application for the first time.
This port is stored (and can be changed to something more memorable) in the `Properties/launchSettings.json` file of the
API project.

You can also check the output of running the API for what the URL is for accessing the application by looking for the
following lines in the output of starting the API project:

```output
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5212
```

In my case the application is running at [http://localhost:5212](http://localhost:5212). With this, we can access the
Swagger endpoint by navigating to the [http://localhost:5212/swagger/index.html](http://localhost:5212/swagger/index.html)
page. The Swagger spec is automatically generated based on our application runtime. This means that when we add, update,
or remove endpoints to our API or change models for the request/response the Swagger spec will be regenerated and we can
easily test with the Swagger page of our app.

## Add Service

You should now have your controller in place and able to add the service layer to our application. The service layer for
our application is going to contain the "business logic" of the application. Setting up our application this way allows
us to have separation of concerns between the HTTP parts of our application and the business parts of our application.
With this structure we can have multiple frontend application types with the single "Domain" that contains our business
logic.

Let's create our `PropertyService` in our `Domain` project with just a simple placeholder return value for now (later
we are going to replace this with meaningful data to return):

```cs {file="src/Monget.Domain/Services/PropertyService.cs"}
namespace Monget.Domain.Services;

using Monget.Domain.Interfaces;

public class PropertyService : IPropertyService
{
    public string ListProperties(int size, int skip)
    {
        return "service properties list";
    }
}
```

This service is going to be combined with an interface that defines the "contracts" of our service. The interface will
allow us to decouple the implementation details of the service from the "black box" (interface) of our service. Setting
up our application in this way allows us to change the underlying service without impacting the consumers of our service
by defining the methods that need to be implmented for a given service.

With this in mind, let's create our `IPropertyService` in the `Interfaces` of the `Domain` project:

```cs {file="src/Monget.Domain/Interfaces/IPropertyService.cs"}
namespace Monget.Domain.Interfaces;

public interface IPropertyService
{
    string ListProperties(int size, int skip);
}
```

{{< callout type=info >}}
Interface names (and their corresponding file names) in C#, by convention, start with a capital `I` to delinate that it
is an interface and not a class.
{{</ callout >}}

Now that we have created the interface we can tell our service that it implements this new interface:

```cs {file="src/Monget.Domain/Services/PropertyService.cs",add_lines=4,rem_lines=3}
namespace Monget.Domain.Services;

public class PropertyService
public class PropertyService : IPropertyService
```

{{< callout type=note >}}
This may seem like overkill right now since we only have a single consumer of the `IPropertyService` interface. However,
when we get to unit testing our application this should make more sense since we are going to be able to create a
testing class that implements the `IPropertyService` interface to ease the testing of our controller.
{{</ callout >}}

## Dependency Injection

We now have our service and interface created. With these we need to add them to the dependency injection of the API so
the `IPropertyService` will be mapped to an instance of the `PropertyService`. We are going to use a singleton for this
since we aren't going to store any request-specific data within the service instance. However, if we were going to store
request, user, or other context data within our service we would need to use a different method to add it (like the
`AddTransient()` method).

So with this, let's update our `Program.cs` to inject our service:

```cs {file="src/Monget.API/Program.cs",add_lines="1-2 6-7"}
using Monget.Domain.Interfaces;
using Monget.Domain.Services;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddSingleton<IPropertyService, PropertyService>();

builder.Services.AddControllers();
```

Now that our service has been added to DI for our API, we can use it in our controller. We are going to bring in the
interface of the service because, as talked about before, we want to be able to inject a testing version of our service
into our controller.

Add a constructor to the controller and let's call our `ListProperties()` method within our `List()` controller action:

```cs {file="src/Monget.API/Controllers/PropertiesController.cs",add_lines="7 9-12 17-19",rem_lines="20"}
namespace Monget.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PropertiesController : ControllerBase
{
    private readonly IPropertyService _propertyService;

    public PropertiesController(IPropertyService propertyService)
    {
        _propertyService = propertyService;
    }

    [HttpGet]
    public ActionResult List(int size = 24, int skip = 0)
    {
        var properties = _propertyService.ListProperties(size, skip);

        return Ok(properties);
        return Ok("list");
    }
```

{{< callout type=warning title="Hot-Reload Warning" >}}
If you are running your application using `watch`, you will most likely need to restart your application when you update
the `Program.cs`. This is because .NET doesn't restart the application on file changes it actually hot-reloads the
necessary parts of the running application to seamlessly continue running. A side-effect (at the time of writing this)
is that not all changes can be hot-reloaded and will instead require the application to be fully restarted.

Just keep in mind that if you have updated something and expect that it's working while using `watch` try restarting the
application to make sure it isn't a hot-reload issue before spending a lot of time trying to figure out why something
that seems like it should work isn't working.
{{</ callout >}}

## Conclusion

In this section, we have accomplished a lot. If everything is working as expected you should now have:

- A working Dev Container
- API project
- Domain project
- Our first Controller
- Dependency-injected Service

In the next section, we are going to add support for MongoDB into our service and wire it up to our CRUD API.
