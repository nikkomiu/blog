---
title: "Linear Algebra for ML :: Eigen"
author: Nikko Miu
date: 2023-09-05T15:00:00Z
coverQuality: 40
tags:
  - ai
  - machine-learning
  - c++
  - linear-algebra
  - eigen
---

Eigen is a general-purpose C++ library for linear algebra. In Eigen, all matrices and vectors are objects of the
`Matrix` template class. Vectors are a specialization of the matrix type with either one row or one column.
Tensor objects do not exist in the official APIs. However, they do exist as part of submodules.

Eigen comes with predefined types for vector and matrix objects. Some examples:

- `Eigen::Matrix3f` is a 3x3 matrix of floats.
- `Eigen::RowVector2f` is a 1x2 row vector of floats.

We can also define a matrix with known dimensions and floating-point data using:

```cpp
typedef Eigen::Matrix<float, 3, 3> MyMatrix33f;
```

A vector of floating-point numbers can be defined as:

```cpp
typedef Eigen::Matrix<float, 3, 1> MyVector3f;
```

Matrix sizes can be defined at runtime as well. To define a matrix with a dynamic number of rows and columns:

```cpp
typedef Eigen::Matrix<float, Eigen::Dynamic, Eigen::Dynamic> MyMatrix;
```

Initialization of a matrix from the types we've defined looks like:

```cpp
MyMatrix33f m1;
MyVector3f v1;
MyMatrix m2(5, 10); // 5 is # of rows, 10 is # of columns
```

Filling data into a matrix can be done using built-in initialization functions:

```cpp
m1 = MyMatrix33f::Zero(); // fills with zeros
m1 = MyMatrix33f::Identity(); // fills with identity matrix
m1 = MyMatrix33f::Random(); // fills with random values
```

We can also use the _comma-initializer_ syntax to fill a matrix:

```cpp
m1 << 1, 2, 3,
      4, 5, 6,
      7, 8, 9;
```

Which will fill the matrix as:

```latex
m1 =
\begin{bmatrix}
  1 & 2 & 3 \\
  4 & 5 & 6 \\
  7 & 8 & 9
\end{bmatrix}
```

Elements can be directly accessed using the `()` operator:

```cpp
m1(0, 0) = 1;
m1(0, 1) = 2;
```

The `Map` type can wrap an existing C++ array or vector into an Eigen matrix.
This kind of mapping object will use the memory and values from the underlying object and not allocate any
additional memory nor copy the values.
For example:

```cpp
float data[] = {1, 2, 3, 4};
Eigen::Map<Eigen::RowVectorxi> v(data, 4);

std::vector<float> dataVec = {1, 2, 3, 4, 5, 6, 7, 8, 9};
Eigen::Map<MyMatrix33f> a(dataVec.data());
```

Initialized matrix objects can be used in mathematical expressions.
Matrix and vector arithmetic operations are defined through overloads of standard C++ arithmetic operators.
For example:

```cpp
using namespace Eigen;

auto a = Matrix2d::Random();
auto b = Matrix2d::Random();

auto c = a + b;
auto d = a.array() * b.array(); // element-wise multiplication
auto e = a.array() / b.array(); // element-wise division

a += b;

auto f = a * b; // matrix multiplication
auto g = b.array() * 4; // scalar multiplication
```

Eigen arithmetic operations are evaluated lazily. This means that the result of an operation is not computed
until it is needed. It does so by returning an _expression object_ that represents the operations.
The whole expression is evaluated when it is assigned to a variable or when it is passed to a function
(i.e. through `operator=`).

> **Note:** Eigen's use of _expression objects_ can lead to unexpected behavior if the `auto` keyword is
> used to declare variables.

Partial matrix operations can be done in Eigen as well. Eigen provides a `block` method which takes four arguments:

- `i,j` - The row and column indices of the top-left corner of the block.
- `p,q` - The number of rows and columns of the block.

For example:

```cpp
Eigen::Matrixxf m(4, 4);
Eigen::Matrix2f b = m.block(1, 1, 2, 2); // 2x2 block starting at (1, 1)
m.block(1, 1, 2, 2) *= 4; // changes the values in the original matrix
```

This is equivalent to:

```latex
M =
\begin{bmatrix}
  m_{0,0} & m_{0,1} & m_{0,2} & m_{0,3} \\
  m_{1,0} & m_{1,1} & m_{1,2} & m_{1,3} \\
  m_{2,0} & m_{2,1} & m_{2,2} & m_{2,3} \\
  m_{3,0} & m_{3,1} & m_{3,2} & m_{3,3}
\end{bmatrix}
```

```latex
B =
\begin{bmatrix}
  m_{1,1} & m_{1,2} \\
  m_{2,1} & m_{2,2}
\end{bmatrix}
```

```latex
B = B * 4 =
\begin{bmatrix}
  m_{1,1} * 4 & m_{1,2} * 4 \\
  m_{2,1} * 4 & m_{2,2} * 4
\end{bmatrix}
```

There are also methods for accessing rows and columns by index (which is a specific type of block operation):

```cpp
m.row(1).array() += 3;
m.col(2).array() *= 4;
```

Eigen also supports **broadcasting** which is the process of applying an operation to all elements of a matrix.

```cpp
Eigen::Matrixxf mat(2, 4);
Eigen::Vectorxf v(2); // column vector
mat.colwise() += v; // adds v to each column of mat
```

This operation is equivalent to:

```latex
\begin{bmatrix}
  1 & 2 & 3 \\
  4 & 5 & 6
\end{bmatrix} .colwise() +
\begin{bmatrix}
  0 \\
  1
\end{bmatrix} =
\begin{bmatrix}
  1 & 2 & 3 \\
  \textbf{5} & \textbf{6} & \textbf{7}
\end{bmatrix}
```
