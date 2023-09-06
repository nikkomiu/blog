---
title: ML Project Checklist
author: Nikko Miu
date: 2023-09-05T15:00:00Z
categories:
  - ai
  - machine-learning
---

This is a checklist template to guide you through the ML project process. This will cover eight main steps.
This is based on the checklist from the book [Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow](https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632)
by Aurélien Géron.

<!--more-->

There are eight main steps:

1. [Frame the Problem](#frame-the-problem)
1. [Get the Data](#get-the-data)
1. [Explore the Data](#explore-the-data)
1. Prepare the data to better expose the underlying data patterns to Machine Learning algorithms.
1. Explore many different models and short-list the best ones.
1. Fine-tune your models and combine them into a great solution.
1. Present your solution.
1. Launch, monitor, and maintain your system.

## Frame the Problem

Frame the problem and look at the big picture.

For this stage you should focus on answering the following questions:

1. Define the objective in business terms.
1. How will your solution be used?
1. What are the current solutions/workarounds (if any)?
1. How should you frame this problem (supervised/unsupervised, online/offline, etc.)?
1. How should performance be measured?
1. Is the performance measure aligned with the business objective?
1. What would be the minimum performance needed to reach the business objective?
1. What are comparable problems? Can you reuse experience or tools?
1. Is human expertise available?
1. How would you solve the problem manually?
1. List the assumptions you (or others) have made so far.
1. Verify assumptions if possible.

## Get the Data

> Note: automate as much as possible so you can easily get fresh data.

1. List the data you need and how much you need.
1. Find and document where you can get that data.
1. Check how much space it will take.
1. Check legal obligations, and get authorization if necessary.
1. Get access authorizations.
1. Create a workspace (with enough storage space).
1. Get the data.
1. Convert the data to a format you can easily manipulate (without changing the data itself).
1. Ensure sensitive information is deleted or protected (e.g., anonymized).
1. Check the size and type of data (time series, sample, geographical, etc.).
1. Sample a test set, put it aside, and never look at it (no data snooping!).

## Explore the Data

Explore the data to gain insights and to get a better understanding of the problem.

> Note: try to get insights from a field expert for these steps.

1. Create a copy of the data for exploration (sampling it down to a manageable size if necessary).
1. Create a Jupyter notebook to keep a record of your data exploration.
1. Study each attribute and its characteristics:
    - Name
    - Type (categorical, int/float, bounded/unbounded, text, structured, etc.)
    - % of missing values
    - Noisiness and type of noise (stochastic, outliers, rounding errors, etc.)
    - Determine if it is useful for the task?
    - Type of distribution (Gaussian, uniform, logarithmic, etc.)
1. For supervised learning tasks, identify the target attribute(s).
1. Visualize the data.
1. Study the correlations between attributes.
1. Study how you would solve the problem manually.
1. Identify the promising transformations you may want to apply.
1. Identify extra data that would be useful (go back to [Get the Data](#get-the-data)).
1. Document what you have learned.

## Prepare the Data

> Note: Work on copies of the data (keep the original dataset intact).

> Note: Write functions for all data transformations you apply, for five reasons:
>
> 1. So you can easily prepare the data the next time you get a fresh dataset.
> 1. So you can apply these transformations in future projects.
> 1. To clean and prepare the test set.
> 1. To clean and prepare new data instances once your solution is live.
> 1. To make it easy to treat your preparation choices as hyperparameters.

1. Data cleaning:
    - Fix or remove outliers (optional).
    - Fill in missing values (e.g., with zero, mean, median...) or drop their rows (or columns).
1. Feature selection (optional):
    - Drop the attributes that provide no useful information for the task.
1. Feature engineering, where appropriates:
    - Discretize continuous features.
    - Decompose features (e.g., categorical, date/time, etc.).
    - Add promising transformations of features (e.g., $\log x$, $\sqrt x$, $x^2$, etc.).
    - Aggregate features into promising new features.
1. Feature scaling: standardize or normalize features.
