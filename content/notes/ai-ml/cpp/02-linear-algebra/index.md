---
title: Linear Algebra for ML
author: Nikko Miu
date: 2023-09-05T15:00:00Z
categories:
  - ai
  - machine-learning
  - c++
---

This will cover some basic linear algebra terms, concepts, and algorithms that are useful for ML.

<!--more-->

## General Terms

- **Scalar:** This is a single number.
- **Vector:** This is an array of ordered numbers. Each element has a distinct index.
  Notation is a bold lowercase typeface for names and an italic typeface with subscript for elements:
  $$ \vec{p} = \begin{bmatrix} x_{1} \\\\ x_{2} \\\\ . \\\\ . \\\\ x_{n} \end{bmatrix} $$

- **Matrix:** A two-dimensional array of numbers. Each element has a distinct pair of indices.
  Notation is a bold uppercase typeface for names and italic but not bold typeface with comma-separated list of indices
  in subscript for elements:
  $$ A = \begin{bmatrix}
    A_{1,1} & A_{1,2} \\\\
    A_{2,1} & A_{2,2} \\\\
    A_{3,1} & A_{3,2} \end{bmatrix}
  $$

- **Tensor:** An array of numbers arranged in a multi-dimensional regular grid. Represents generalizations of matrices.
  It's like a multi-dimensional matrix. For example, tensor $A$ with dimensions $ 2 \times 2 \times 2 $ can look like:
  $$ A =
  \begin{bmatrix}
    \begin{bmatrix} 1 & 2\\\\ 3 & 4 \end{bmatrix} \\\\
    \begin{bmatrix} 5 & 6\\\\ 7 & 8 \end{bmatrix}
  \end{bmatrix}
  $$

A vector can also be considered a matrix of size $ n \times 1 $.
