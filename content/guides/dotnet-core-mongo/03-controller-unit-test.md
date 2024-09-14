---
title: Controller Unit Testing
author: Nikko Miu
toc: true
weight: 3
tags:
  - dotnet
  - dotnet testing
  - unit testing
  - xunit
  - moq
---

We have our CRUD operations working for the Property API. Let's add unit tests to cover the code that we have in place
and maybe even discover some unintended side-effects of what we currently have. To accomplish this, I'm going to use the
xUnit package to do testing. However, if you have a different testing framework for .NET that you prefer feel free to
use that one instead.

<!--more-->

I'm going to be using the
[.NET Core Testing Best Practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
as a guideline for how I write tests. One part of this includes a naming convention of test method names:

```c#
public void MethodToTest_Condition_Expectation()
```

Where `MethodToTest` is the method within our `src` project that we are testing. `Condition` is the condition under
which we are testing this method. Finally `Expectation` is the expected result from calling this. `Expectation`
doesn't always directly refer to a return from the method, it could be something like `IsValid`, or `ShouldThrow`, etc.

## Create Unit Test Project

```bash
dotnet new xunit -o ./tests/Monget.Tests.Unit
```

Add `Monget.Tests.Unit` to the Solution:

```bash
dotnet sln add ./tests/Monget.Tests.Unit/Monget.Tests.Unit.csproj
```

Add references to `src` projects that will be tested:

```bash
dotnet add ./tests/Monget.Tests.Unit/Monget.Tests.Unit.csproj reference ./src/Monget.API/Monget.API.csproj
dotnet add ./tests/Monget.Tests.Unit/Monget.Tests.Unit.csproj reference ./src/Monget.Domain/Monget.Domain.csproj
```

## Create MappingProfile Test

```c# {file="tests/Monget.Tests.Unit/API/MappingProfileTests.cs"}
namespace Monget.Tests.Unit.API;

using AutoMapper;

using Monget.API;

public class MappingProfileTests
{
    [Fact]
    public void MappingProfile_Configuration_IsValid()
    {
        var mapper = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());

        mapper.AssertConfigurationIsValid();
    }
}
```

We can run our test now to see if there are any mapping issues:

```bash
dotnet test ./tests/Monget.Tests.Unit/Monget.Tests.Unit.csproj
```

```output
  Determining projects to restore...
  All projects are up-to-date for restore.
  Monget.Domain -> /workspaces/Monget/src/Monget.Domain/bin/Debug/net8.0/Monget.Domain.dll
  Monget.Models -> /workspaces/Monget/src/Monget.Models/bin/Debug/net8.0/Monget.Models.dll
  Monget.API -> /workspaces/Monget/src/Monget.API/bin/Debug/net8.0/Monget.API.dll
  Monget.Tests.Unit -> /workspaces/Monget/tests/Monget.Tests.Unit/bin/Debug/net8.0/Monget.Tests.Unit.dll
Test run for /workspaces/Monget/tests/Monget.Tests.Unit/bin/Debug/net8.0/Monget.Tests.Unit.dll (.NETCoreApp,Version=v8.0)
VSTest version 17.11.0 (arm64)

Starting test execution, please wait...
A total of 1 test files matched the specified pattern.
[xUnit.net 00:00:00.10]     Monget.Tests.Unit.API.MappingProfileTests.MappingProfile_Configuration_IsValid [FAIL]
  Failed Monget.Tests.Unit.API.MappingProfileTests.MappingProfile_Configuration_IsValid [30 ms]
  Error Message:
   AutoMapper.AutoMapperConfigurationException :
Unmapped members were found. Review the types and members below.
Add a custom mapping expression, ignore, add a custom resolver, or modify the source/destination type
For no matching constructor, add a no-arg ctor, add optional arguments, or map all of the constructor parameters
===============================================================
PropertyRequest -> Property (Destination member list)
Monget.Models.PropertyRequest -> Monget.Domain.Models.Property (Destination member list)

Unmapped properties:
Id
CreatedAt
UpdatedAt

  Stack Trace:
     at Monget.Tests.Unit.API.MappingProfileTests.MappingProfile_Configuration_IsValid() in /workspaces/Monget/tests/Monget.Tests.Unit/API/MappingProfileTests.cs:line 14
   at System.RuntimeMethodHandle.InvokeMethod(Object target, Void** arguments, Signature sig, Boolean isConstructor)
   at System.Reflection.MethodBaseInvoker.InvokeWithNoArgs(Object obj, BindingFlags invokeAttr)

Failed!  - Failed:     1, Passed:     1, Skipped:     0, Total:     2, Duration: 33 ms - Monget.Tests.Unit.dll (net8.0)
```

Look at that! Even though our application is working fine we have errors for the mapping from a
`Monget.Models.PropertyRequest` to our `Monget.Domain.Models.Property` database model. This is because when we convert
from the `PropertyRequest` to the `Property` we aren't actually setting the `Id`, `CreatedAt`, or `UpdatedAt` fields
since they don't exist on our API model.

Let's go update our mapping profile to explicitly set these properties when mapping between these two types:

```c# {file="src/Monget.API/MappingProfile.cs",add_lines="3-6",rem_lines="7"}
public MappingProfile()
{
    CreateMap<PropertyRequest, Property>()
        .ForMember(dst => dst.Id, opt => opt.MapFrom(src => string.Empty))
        .ForMember(dst => dst.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
        .ForMember(dst => dst.UpdatedAt, opt => opt.MapFrom(src => DateTime.Now));
    CreateMap<PropertyRequest, Property>();

    CreateMap<Property, PropertyResponse>();
}
```

## Controller Tests

Now that we see how testing is going to work, we can work on the controller tests. Before we start on those, let's add
a couple of packages that will make testing easier for us:

```bash
dotnet add ./tests/Monget.Tests.Unit/Monget.Tests.Unit.csproj package AutoFixture
dotnet add ./tests/Monget.Tests.Unit/Monget.Tests.Unit.csproj package Moq
```

If you're not familiar with these packages, you should take some time to look into what they do and why they're useful
testing utilities. Basically, `AutoFixture` is a library that will allow us to create automatic testing fixtures of our
models. This will help keep our values random and unique but can find issues with test value fatigue. The `Moq` package
allows us to mock out services for testing. This will allow us to **match** function call parameters and return a
pre-defined response based on those parameters. You'll see how this works more in the controller tests but basically, it
is helping us make these tests truly _unit_ tests.

### List Method

I'm going to break down the testing of our controller methods. First let's test the `ListAsync()` method:

```c# {file="tests/Monget.Tests.Unit/API/Controllers/PropertiesControllerTests.cs"}
namespace Monget.Tests.Unit.API.Controllers;

using AutoFixture;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Moq;

using Monget.API;
using Monget.API.Controllers;
using Monget.Domain.Interfaces;
using Monget.Domain.Models;
using Monget.Models;

public class PropertiesControllerTests
{
    private readonly Fixture _fixture;
    private readonly IMapper _mapper;
    private readonly Mock<IPropertyService> _mockPropertyService;
    private readonly PropertiesController _controller;

    public PropertiesControllerTests()
    {
        _fixture = new Fixture();

        _mapper = new MapperConfiguration(mc => mc.AddProfile<MappingProfile>()).CreateMapper();
        _mockPropertyService = new Mock<IPropertyService>();

        _controller = new PropertiesController(_mapper, _mockPropertyService.Object);
    }

    [Fact]
    public async void List_Default_ReturnsProperties()
    {
        // Arrange
        var size = 24;
        var respFixture = new List<Property>();
        _fixture.AddManyTo(respFixture, size);
        _mockPropertyService.Setup(p => p.ListPropertiesAsync(size, 0)).ReturnsAsync(respFixture);

        // Act
        var resp = await _controller.ListAsync();

        // Assert
        _mockPropertyService.VerifyAll();
        var objResult = Assert.IsType<OkObjectResult>(resp.Result);
        var propertyResult = Assert.IsType<List<PropertyResponse>>(objResult.Value);

        Assert.Equal(respFixture.Count, propertyResult.Count);
        for (int i = 0; i < respFixture.Count; i++)
        {
            Assert.Equal(propertyResult[i].Id, respFixture[i].Id);
            Assert.Equal(propertyResult[i].Name, respFixture[i].Name);
            Assert.Equal(propertyResult[i].Description, respFixture[i].Description);
            Assert.Equal(propertyResult[i].CreatedAt, respFixture[i].CreatedAt);
            Assert.Equal(propertyResult[i].UpdatedAt, respFixture[i].UpdatedAt);
        }
    }

    [Theory]
    [InlineData(10, 0)]
    [InlineData(33, 10)]
    public async void List_WithParameters_ReturnProperties(int size, int skip)
    {
        // Arrange
        var respFixture = new List<Property>();
        _fixture.AddManyTo(respFixture, size);
        _mockPropertyService.Setup(p => p.ListPropertiesAsync(size, skip)).ReturnsAsync(respFixture);

        // Act
        var resp = await _controller.ListAsync(size, skip);

        // Assert
        _mockPropertyService.VerifyAll();
        var objResult = Assert.IsType<OkObjectResult>(resp.Result);
        var propertyResult = Assert.IsType<List<PropertyResponse>>(objResult.Value);

        Assert.Equal(respFixture.Count, propertyResult.Count);
        for (int i = 0; i < respFixture.Count; i++)
        {
            Assert.Equal(propertyResult[i].Id, respFixture[i].Id);
            Assert.Equal(propertyResult[i].Name, respFixture[i].Name);
            Assert.Equal(propertyResult[i].Description, respFixture[i].Description);
            Assert.Equal(propertyResult[i].CreatedAt, respFixture[i].CreatedAt);
            Assert.Equal(propertyResult[i].UpdatedAt, respFixture[i].UpdatedAt);
        }
    }
}
```

### Create Method

With these in place we can move on to the `CreateAsync()` method:

```c# {file="tests/Monget.Tests.Unit/API/Controllers/PropertiesControllerTests.cs"}
[Fact]
public async void Create_ReturnsNewProperty()
{
    // Arrange
    var id = _fixture.Create<string>();
    var createdAt = _fixture.Create<DateTime>();
    var updatedAt = _fixture.Create<DateTime>();
    var propertyRequest = _fixture.Create<PropertyRequest>();
    _mockPropertyService
        .Setup(p => p.CreatePropertyAsync(It.IsAny<Property>()))
        .ReturnsAsync((Property p) => new Property
        {
            Id = id,
            Name = p.Name,
            Description = p.Description,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        });

    // Act
    var resp = await _controller.CreateAsync(propertyRequest);

    // Assert
    _mockPropertyService.VerifyAll();
    var objResult = Assert.IsType<OkObjectResult>(resp.Result);
    var propertyResult = Assert.IsType<PropertyResponse>(objResult.Value);
    Assert.Equal(id, propertyResult.Id);
    Assert.Equal(propertyRequest.Name, propertyResult.Name);
    Assert.Equal(propertyRequest.Description, propertyResult.Description);
    Assert.Equal(createdAt, propertyResult.CreatedAt);
    Assert.Equal(updatedAt, propertyResult.UpdatedAt);
}
```

### Get By Id Method

For the `GetByIdAsync()` method, we are going to test two conditions. The first condition is when the entity exists in
the database. The second is when the entity does not exist in the database. Right now, we don't check if the object
actually exists in the database before returning so we need to update our controller to support returning `NotFound()`
when the record coming back from the service is null.

```c# {file="tests/Monget.Tests.Unit/API/Controllers/PropertiesControllerTests.cs"}
[Fact]
public async void GetById_Existing_ReturnProperty()
{
    // Arrange
    var property = _fixture.Create<Property>();
    _mockPropertyService.Setup(p => p.GetPropertyAsync(property.Id)).ReturnsAsync(property);

    // Act
    var resp = await _controller.GetByIdAsync(property.Id);

    // Assert
    _mockPropertyService.VerifyAll();
    var objResult = Assert.IsType<OkObjectResult>(resp.Result);
    var propertyResult = Assert.IsType<PropertyResponse>(objResult.Value);
    Assert.Equal(property.Id, propertyResult.Id);
    Assert.Equal(property.Name, propertyResult.Name);
    Assert.Equal(property.Description, propertyResult.Description);
    Assert.Equal(property.CreatedAt, propertyResult.CreatedAt);
    Assert.Equal(property.UpdatedAt, propertyResult.UpdatedAt);
}

[Fact]
public async void GetById_NotExisting_ReturnNotFound()
{
    // Arrange
    var id = _fixture.Create<string>();
    _mockPropertyService.Setup(p => p.GetPropertyAsync(id)).ReturnsAsync((string p) => null!);

    // Act
    var resp = await _controller.GetByIdAsync(id);

    // Assert
    _mockPropertyService.VerifyAll();
    Assert.IsType<NotFoundResult>(resp.Result);
}
```

With this in place, let's update the controller to support the `NotFound()` result when the object doesn't exist in our
database:

```c# {file="src/Monget.API/Controllers/PropertiesController.cs",add_lines="5-8"}
[HttpGet("{id}")]
public async Task<ActionResult<PropertyResponse>> GetByIdAsync(string id)
{
    var property = await _propertyService.GetPropertyAsync(id);
    if (property == null)
    {
        return NotFound();
    }

    return Ok(_mapper.Map<PropertyResponse>(property));
}
```

### Update Method

```c# {file="tests/Monget.Tests.Unit/API/Controllers/PropertiesControllerTests.cs"}
[Fact]
public async void Update_Existing_ReturnUpdatedProperty()
{
    // Arrange
    var property = _fixture.Create<Property>();
    _mockPropertyService
        .Setup(p => p.UpdatePropertyAsync(property.Id, It.Is<Property>(p => p.Name == property.Name && p.Description == property.Description)))
        .ReturnsAsync(property);

    // Act
    var resp = await _controller.UpdateAsync(property.Id, new PropertyRequest
    {
        Name = property.Name,
        Description = property.Description,
    });

    // Assert
    _mockPropertyService.VerifyAll();
    var objResult = Assert.IsType<OkObjectResult>(resp.Result);
    var propertyResult = Assert.IsType<PropertyResponse>(objResult.Value);
    Assert.Equal(property.Id, propertyResult.Id);
    Assert.Equal(property.Name, propertyResult.Name);
    Assert.Equal(property.Description, propertyResult.Description);
    Assert.Equal(property.CreatedAt, propertyResult.CreatedAt);
    Assert.Equal(property.UpdatedAt, propertyResult.UpdatedAt);
}

[Fact]
public async void Update_NotExisting_ReturnNotFound()
{
    // Arrange
    var id = _fixture.Create<string>();
    var propertyRequest = _fixture.Create<PropertyRequest>();
    _mockPropertyService
        .Setup(p => p.UpdatePropertyAsync(id, It.Is<Property>(p => p.Name == propertyRequest.Name && p.Description == propertyRequest.Description)))
        .ReturnsAsync((string id, Property p) => null!);

    // Act
    var resp = await _controller.UpdateAsync(id, propertyRequest);

    // Assert
    _mockPropertyService.VerifyAll();
    Assert.IsType<NotFoundResult>(resp.Result);
}
```

```c# {file="src/Monget.API/Controllers/PropertiesController.cs",add_lines="7-10"}
[HttpPut("{id}")]
public async Task<ActionResult<PropertyResponse>> UpdateAsync(string id, [FromBody] PropertyRequest property)
{
    var updateProperty = _mapper.Map<Property>(property);

    var updatedProperty = await _propertyService.UpdatePropertyAsync(id, updateProperty);
    if (updatedProperty == null)
    {
        return NotFound();
    }

    return Ok(_mapper.Map<PropertyResponse>(updatedProperty));
}
```

### Delete Method

```c# {file="tests/Monget.Tests.Unit/API/Controllers/PropertiesControllerTests.cs"}
[Theory]
[InlineData(typeof(OkResult), true)]
[InlineData(typeof(NoContentResult), false)]
public async void Delete_ReturnNoContent(Type respType, bool isFound)
{
    // Arrange
    var id = _fixture.Create<string>();
    var propertyRequest = _fixture.Create<PropertyRequest>();
    _mockPropertyService.Setup(p => p.DeletePropertyAsync(id)).ReturnsAsync(isFound);

    // Act
    var resp = await _controller.DeleteAsync(id);

    // Assert
    _mockPropertyService.VerifyAll();
    Assert.IsType(respType, resp);
}
```
