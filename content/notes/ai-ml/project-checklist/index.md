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
1. [Prepare the Data](#prepare-the-data)
1. [Short-list Promising Models](#short-list-promising-models)
1. [Fine-Tune the System](#fine-tune-the-system)
1. [Present your Solution](#present-your-solution)
1. [Launch your Solution](#launch-your-solution)

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

Prepare the data to better expose the underlying data patterns to Machine Learning algorithms.

> **Notes:**
>
> - Work on copies of the data (keep the original dataset intact).
> - Write functions for all data transformations you apply, for five reasons:
>     1. So you can easily prepare the data the next time you get a fresh dataset.
>     1. So you can apply these transformations in future projects.
>     1. To clean and prepare the test set.
>     1. To clean and prepare new data instances once your solution is live.
>     1. To make it easy to treat your preparation choices as hyperparameters.

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

## Short-list Promising Models

Explore many different models and short-list the best ones.

> **Notes:**
>
> - If the data is very large, you may want to sample smaller training sets in order to train
>   many different models in a reasonable time (be aware that this penalizes complex models such as
>   large neural nets or Random Forests).
> - Once again, try to automate these steps as much as possible.

1. Train many quick-and-dirty models from different categories (e.g., linear, naive Bayes,
   SVM, Random Forests, neural net, etc.) using standard parameters.
1. Measure and compare their performance.
    - For each model, use N-fold cross-validation and compute the mean and standard deviation of
      the performance measure on the N folds.
1. Analyze the most significant variables for each algorithm.
1. Analyze the types of errors the models make.
    - What data would a human have used to avoid these errors?
1. Have a quick round of feature selection and engineering.
1. Have one or two more quick iterations of the five previous steps.
1. Short-list the top three to five most promising models, preferring models that make different
   types of errors.

## Fine-Tune the System

Fine-tune your models and combine them into a great solution.

> **Notes:**
>
> - You will want to use as much data as possible for this step, especially as you move toward the
>   end of fine-tuning.
> - As always automate what you can.

1. Fine-tune the hyperparameters using cross-validation:
    - Treat your data transformation choices as hyperparameters, especially when you are not sure
      about them (e.g., should I replace missing values with zero or the median value? Or just drop
      the rows?).
    - Unless there are very few hyperparameter values to explore, prefer random search over grid
      search. If training is very long, you may prefer a Bayesian optimization approach (e.g.,
      using a Gaussian process priors, as described by [Jasper Snoek et al.](https://arxiv.org/abs/1206.2944)).
1. Try Ensemble methods. Combining your best models will often perform better than running them
   individually.
1. Once you are confident about your final model, measure its performance on the test set to
   estimate the generalization error.

> **Warning:** Don't tweak your model after measuring the generalization error: you would just start
> overfitting the test set.

## Present your Solution

1. Document what you have done.
1. Explain why your solution achieves the business objective.
1. Ensure your key findings are communicated through beautiful visualizations or easy-to-remember
   statements (e.g., "the median income is the number-one predictor of housing prices").

## Launch your Solution

Launch, monitor, and maintain your system.

1. Get your solution ready for production (plug into production data inputs, write unit tests,
   etc.).
1. Write monitoring code to check your system's live performance at regular intervals and trigger
   alerts when it drops.
    - Beware of slow degradation too: models tend to "rot" as data evolves.
    - Measuring performance may require a human pipeline (e.g., via a crowdsourcing service).
    - Also monitor your inputs' quality (e.g., a malfunctioning sensor sending random values, or
      another team's output becoming stale). This is particularly important for online learning
      systems.
1. Retrain your models on a regular basis on fresh data (automate as much as possible).
