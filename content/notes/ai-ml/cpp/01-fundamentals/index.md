---
title: Fundamentals of ML
author: Nikko Miu
date: 2023-09-05T15:00:00Z
coverQuality: 30
tags:
  - ai
  - machine-learning
  - c++
---

This will cover some basic ML concepts around learning and learning algorithm parameters.

<!--more-->

## Learning Techniques

The two main learning techniques for ML models are **Supervised** and **Unsupervised** learning.

### Supervised Learning

Supervised ML algorithms usually take a limited set of labeled data and build models that can make
reasonable predictions for new data.

- **Classification Models** predict some finite and distinct types of categories.
  These could be identifiers such as labeling an email as spam or not. Typical algorithms include:

  - **Support Vector Machine (SVM)**
  - Decision Tree Approaches
  - **k-nearest neighbors (KNN)**
  - Logistic regression
  - Naive Bayes
  - Neural networks

- **Regression Models** predict continuous responses such as changes in temperature or values of currency exchange rates.
Regression model creation usually makes sense if the output of the given labeled data is _real numbers_.

  Typical algorithms include:

  - Linear and multivariate regressions
  - Polynomial regression models
  - Stepwise regressions
  - Decision tree and neural networks _can be used too_

### Unsupervised Learning

Unsupervised ML algorithms do not use labeled datasets.
They create models that use intrinsic relations in data to find hidden patterns that they can use for making predictions.

The most well-known unsupervised learning technique is **clustering**.
Clustering involves dividing a given set of data into a limited number of groups according to some intrinsic properties
of the data items. Clustering is applied in market research, exploratory analysis, DNA analysis, image segmentation,
and object detection.

Typical algorithms for clustering include:

- k-means
- k-medoids
- Gaussian mixture models
- Hierarchical clustering
- Hidden Markov models

## Model Parameters

ML models can be interpreted as functions that take different types of parameters.
Developers can configure the behavior of ML models for solving problems by adjusting the model parameters.

Training a ML model can usually be treated as a process of searching for the best combination of these parameters.
ML model parameters can be split into two types Internal and External.

### Internal Parameters

These parameters are internal to the model and the values can be estimated through training (input) data.

Parameters have the following characteristics:

- Necessary for making predictions.
- Define the quality of the model on the given problem.
- Can learn them from training data.
- Usually, they are part of the model.

If the model contains a fixed number of internal parameters it is called **parametric**. Otherwise, it is **non-parametric**.

Examples of internal parameters:

- Weights of **artificial neural networks (ANNs)
- Support vector values for SVM models
- Polynomial coefficients for linear regression or logistic regression

### External Parameters

These parameters cannot estimate the values from training data. These are typically called **hyperparameters**.

Hyperparameters have the following characteristics:

- They are used to configure algorithms that estimate model parameters.
- The practitioner usually specifies them.
- Their estimation is often based on heuristics.
- They are specific to a concrete modeling problem.

It is difficult to know the best values for a model's hyperparameters.
Usually, additional analysis is required to tune required hyperparameters so the model
or training algorithm behaves in the best way.
Generally, practitioners use rules of thumb, copying values from similar projects,
or special techniques such as grid search for hyperparameter estimation.

Examples of hyperparameters are:

- C and sigma parameters used in the SVM algorithm for a classification quality configuration
- Learning rate parameter used in neural network training to configure algorithm convergance
- K-value that is used in the KNN algorithm to configure number of neighbors

### Parameter Estimation

Model parameter estimation usually uses an optimization algorithm.
The speed and quality of the resulting model can significantly depend on the optimization algorithm chosen.
A function that evaluates how well a model predicts on the data is called a **loss function**.
If predictions are very different from the target outputs,
the loss function will return a value that can be interpreted as a "bad one" (usually a large number).
In this way, a loss function penalizes an optimization algorithm when it moves in the wrong direction.
The general idea is to minimize the value of the loss function to reduce penalties.

Different factors determine how to choose a loss function. Here are examples of some factors:

- Specifics of a given problem (i.e. if it is a regression or classification model)
- Ease of calculating derivatives
- Percentage of outliers in the dataset

In ML, the term **optimizer** is used to define an algorithm that connects a loss function
and a technique for updating model parameters in response to the values of the loss function.
Optimizers tune ML models to predict target values for new data in the most accurate way by fitting model parameters.

There are many optimizers:

- Gradient Descent
- Adagraad
- RMSProp
- Adam
- etc.
