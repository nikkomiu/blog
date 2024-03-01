---
title: Linear Algebra for ML
author: Nikko Miu
date: 2023-09-05T15:00:00Z
coverQuality: 40
tags:
  - ai
  - machine-learning
  - c++
  - math
  - linear-algebra
---

This will cover some basic linear algebra terms, concepts, and algorithms that are useful for ML.

<!--more-->

## General Terms

- **Scalar:** This is a single number.
- **Vector:** This is an array of ordered numbers. Each element has a distinct index.
  Notation is a bold lowercase typeface for names and an italic typeface with subscript for elements:

  ```latex
  \vec{p} = \begin{bmatrix} x*{1} \\ x*{2} \\ . \\ . \\ x_{n} \end{bmatrix}
  ```

- **Matrix:** A two-dimensional array of numbers. Each element has a distinct pair of indices.
  Notation is a bold uppercase typeface for names and italic but not bold typeface with comma-separated list of indices
  in subscript for elements:

  ```latex
  A =
    \begin{bmatrix}
      A_{1,1} & A_{1,2} \\
      A_{2,1} & A_{2,2} \\
      A_{3,1} & A_{3,2}
    \end{bmatrix}
  ```

- **Tensor:** An array of numbers arranged in a multi-dimensional regular grid. Represents generalizations of matrices.
  It's like a multi-dimensional matrix. For example, tensor $A$ with dimensions $ 2 \times 2 \times 2 $ can look like:

  ```latex
  A =
  \begin{bmatrix}
    \begin{bmatrix}
      1 & 2 \\
      3 & 4
    \end{bmatrix} \\
    \begin{bmatrix}
      5 & 6 \\
      7 & 8
    \end{bmatrix}
  \end{bmatrix}
  ```

A vector can also be considered a matrix of size $ n \times 1 $.

## Basic Operations

These are some of the most common operations for linear algebra in ML:

- **Element-wise operations:** These are operations that are applied to each element of a vector or matrix.
- **Dot product:** This is the sum of the products of the corresponding entries of the two sequences of numbers.
  For example, the dot product of vectors $ \vec{a} $ and $ \vec{b} $ is:

  ```latex
  \vec{a} \cdot \vec{b} = \sum*{i=1}^{n} a*{i} b_{i}
  ```

- **Transposing:** The transpose of a matrix flips the matrix over its diagonal.
  For example, the transpose of matrix $ A $ is:

  ```latex
  A^{T} =
  \begin{bmatrix}
    1 & 3 & 5 \\
    2 & 4 & 6
  \end{bmatrix}^{T} =
  \begin{bmatrix}
    1 & 2 \\
    3 & 4 \\
    5 & 6
  \end{bmatrix}
  ```

- **Norm:** This calculates the size of a vector.
- **Inverting:** This is the process of finding the inverse of a matrix.

## Representations in Memory

Matrices are stored in memory in two ways: row-major order and column-major order.

Data layouts have a huge impact on performance. This is because of the speed of traversing arrays relies on
modern CPU architecture that works with sequential data more efficiently than with non-sequential data.
Also, a contiguous data layout makes it possible to use SIMD vectorized instructions that work with
sequential data more efficiently. SIMD instructions allow for parallelization of operations on data.

Consider the following matrix for both row and column-major ordering sections below:

```latex
A =
\begin{bmatrix}
  a_{1,1} & a_{1,2} & a_{1,3} \\
  a_{2,1} & a_{2,2} & a_{2,3}
\end{bmatrix}
```

```latex
B =
\begin{bmatrix}
  1 & 2 & 3 \\
  4 & 5 & 6
\end{bmatrix}
```

### Row-major Order

This is the most common way to represent a matrix in memory. It stores the elements of each row in contiguous memory.
For example, the matrix $ A $ is stored in memory as:

| Value     | 0         | 1         | 2         | 3         | 4         | 5         |
| --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| $A$ Value | $a_{1,1}$ | $a_{1,2}$ | $a_{1,3}$ | $a_{2,1}$ | $a_{2,2}$ | $a_{2,3}$ |
| $B$ Value | 1         | 2         | 3         | 4         | 5         | 6         |

## Column-major Order

This is the opposite of row-major order. It stores the elements of each column in contiguous memory.
For example, the matrix $ A $ is stored in memory as:

| Value     | 0         | 1         | 2         | 3         | 4         | 5         |
| --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| $A$ Value | $a_{1,1}$ | $a_{2,1}$ | $a_{1,2}$ | $a_{2,2}$ | $a_{1,3}$ | $a_{2,3}$ |
| $B$ Value | 1         | 2         | 3         | 4         | 5         | 6         |
