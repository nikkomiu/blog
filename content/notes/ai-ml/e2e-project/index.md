---
title: End-to-End Machine Learning Project
author: Nikko Miu
date: 2023-09-04T15:00:00Z
tags:
  - ai
  - machine-learning
---

This basic ML project will follow the [Project Checklist]({{< relref "notes/ai-ml/project-checklist" >}})
to create a simple ML application.
The project is to create a model that will predict the median housing price in a given district in California.
It is the first (most basic) project that will be completed from start to finish going through all of the steps of the checklist.

<!--more-->

## Big Picture

We're going to build a model of housing prices in California using the California census data.
This data has metrics such as the population, median income, median housing price, etc. for each block group in California.
A block group is the smallest geographical unit for which the US Census Bureau publishes sample data
(typically has a population of 600 to 3,000 people).
We will call them "districts" for short.

## Frame the Problem

Knowing the objective will help us choose the right algorithm, performance measure, and so on.
Our model's output (a prediction of a district's median housing price) will be fed to another ML system,
along with many other signals.

Currently, the district's housing prices are estimated manually by experts:
a team gathers up-to-date information about a district,
and when they cannot get the median housing price, they estimate it using complex rules.
This is costly and time-consuming, and their estimates are not great;
their typical error rate is about 15%.

With this information in mind, we can determine the following:

- This is a supervised learning task since we are given labeled training examples
  (each instance comes with the expected output, i.e., the district's median housing price).
- This is a regression task since we are asked to predict a value.
- This is a univariate regression problem since we are only trying to predict a single value for each district.
  If we were trying to predict multiple values per district, it would be a multivariate regression problem.
- This is a batch learning problem since we don't need to adjust to rapidly changing data,
  and the data is small enough to fit in memory.
  If the data was huge, we would need to use online learning instead.

## Select a Performance Measure

A typical performance measure for regression problems is the Root Mean Square Error (RMSE).

$$
\text{RMSE}(\mathbf{X}, h) = \sqrt{\frac{1}{m} \sum_{i=1}^{m} \left(h(\mathbf{x}^{(i)}) - y^{(i)}\right)^2}
$$

It measures the standard deviation of the errors the system makes in its predictions.

Both the RMSE and the Mean Absolute Error (MAE) are ways to measure the distance between two vectors:
the vector of predictions and the vector of target values.

$$
\text{MAE}(\mathbf{X}, h) = \frac{1}{m} \sum_{i=1}^{m} \left| h(\mathbf{x}^{(i)}) - y^{(i)} \right|
$$

Various distance measures are possible, but the RMSE is more sensitive to outliers than the MAE.
Other distance measures, or _norms_, are possible:

- Computing the root of the sum of squares of the differences (RMSE) corresponds to the Euclidean norm:
  it is the notion of distance you are familiar with.
  It is also called the $\ell_2$ norm, noted $\|\cdot\|_2$.
- Computing the sum of absolutes (MAE) corresponds to the $\ell_1$ norm, which is also called the Manhattan norm
  since it measures the distance between two points in a city if you can only travel along orthogonal city blocks.
- More generally, the $\ell_k$ norm of a vector $\mathbf{v}$ containing $n$ elements is defined as
  $\|\mathbf{v}\|_k = \left(|v_0|^k + |v_1|^k + \cdots + |v_n|^k\right)^{1/k}$.

  The $\ell_0$ gives the number of nonzero elements in the vector,
  and $\ell_\infty$ gives the maximum absolute value in the vector.

The higher the norm index, the more it focuses on large values and neglects small ones.
This is why the RMSE is more sensitive to outliers than the MAE.
But when outliers are exponentially rare (like in a bell-shaped curve), the RMSE performs very well and is generally preferred.

## Check the Assumptions

It's good practice to list and verify the assumptions that were made so far.
This can help to catch serious issues early on.
For example, if the downstream system that uses the output of our system assumes that the output is going to convert the
prices into categories (e.g., "cheap," "medium," or "expensive") and then use those categories instead of the actual prices,
then the problem should have been framed as a classification task, not a regression task.

## Get the Data

It's time to get the data and explore it.
We will download the data from [here](https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.tgz).
We will create a `fetch_housing_data()` function to download the data and extract it into a `housing` directory in the workspace.

```python
from pathlib import Path
import pandas as pd
import tarfile
import urllib.request

def fetch_housing_data():
    tarball_path = Path("datasets/housing.tgz")
    if not tarball_path.is_file():
        Path("datasets").mkdir(parents=True, exist_ok=True)
        url = "https://github.com/ageron/data/raw/main/housing.tgz"
        urllib.request.urlretrieve(url, tarball_path)
        with tarfile.open(tarball_path) as housing_tarball:
            housing_tarball.extractall(path="datasets")
    return pd.read_csv(Path("datasets/housing/housing.csv"))

housing = fetch_housing_data()
```

## Looking at the Data

Let's take a quick look at the top five rows using the `head()` method.

```python
housing.head()
```

|      | longitude | latitude | housing_median_age | total_rooms | total_bedrooms | population | households | median_income | median_house_value | ocean_proximity |
| ---- | --------- | -------- | ------------------ | ----------- | -------------- | ---------- | ---------- | ------------- | ------------------ | --------------- |
| 0    | -122.23   | 37.88    | 41.0               | 880.0       | 129.0          | 322.0      | 126.0      | 8.3252        | 452600.0           | NEAR BAY        |
| 1    | -122.22   | 37.86    | 21.0               | 7099.0      | 1106.0         | 2401.0     | 1138.0     | 8.3014        | 358500.0           | NEAR BAY        |
| 2    | -122.24   | 37.85    | 52.0               | 1467.0      | 190.0          | 496.0      | 177.0      | 7.2574        | 352100.0           | NEAR BAY        |
| 3    | -122.25   | 37.85    | 52.0               | 1274.0      | 235.0          | 558.0      | 219.0      | 5.6431        | 341300.0           | NEAR BAY        |
| 4    | -122.25   | 37.85    | 52.0               | 1627.0      | 280.0          | 565.0      | 259.0      | 3.8462        | 342200.0           | NEAR BAY        |

Next we will use the `info()` method to get a quick description of the data,
in particular the total number of rows, and each attribute's type and number of non-null values.

```python
housing.info()
```

```text
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 20640 entries, 0 to 20639
Data columns (total 10 columns):
 #   Column              Non-Null Count  Dtype
---  ------              --------------  -----
  0   longitude           20640 non-null  float64
  1   latitude            20640 non-null  float64
  2   housing_median_age  20640 non-null  float64
  3   total_rooms         20640 non-null  float64
  4   total_bedrooms      20433 non-null  float64
  5   population          20640 non-null  float64
  6   households          20640 non-null  float64
  7   median_income       20640 non-null  float64
  8   median_house_value  20640 non-null  float64
  9   ocean_proximity     20640 non-null  object
dtypes: float64(9), object(1)
memory usage: 1.6+ MB
```
