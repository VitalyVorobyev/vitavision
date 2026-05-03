---
paper_id: rasmussen2006-gpml
title: "Gaussian Processes for Machine Learning"
authors: ["Carl Edward Rasmussen", "Christopher K. I. Williams"]
year: 2006
url: https://www.GaussianProcess.org/gpml
created: 2026-05-02
relevant_atlas_pages: []
---

# Setting

**Problem class.** Supervised learning treated as Bayesian inference over function spaces. The book covers:

1. **GP regression (GPR)** — predicting a real-valued output $y = f(\mathbf{x}) + \varepsilon$ from a continuous input $\mathbf{x} \in \mathbb{R}^D$ given a dataset $\mathcal{D} = \{(\mathbf{x}_i, y_i)\}_{i=1}^n$. Gaussian noise $\varepsilon \sim \mathcal{N}(0, \sigma_n^2)$ yields a tractable closed-form posterior.
2. **GP classification (GPC)** — predicting a class label from the same input structure. The Gaussian likelihood assumption breaks; approximate inference (Laplace approximation or Expectation Propagation) is required.

**Inputs.** Feature vectors in $\mathbb{R}^D$; the framework extends to non-vectorial inputs (strings, graphs) through structured kernels (Ch. 4). No assumption of stationarity is required, though most practical kernels are stationary.

**Outputs.** For regression: a posterior Gaussian over $f(\mathbf{x}_*)$ at any test point, characterised by a posterior mean $\bar{f}_*$ and posterior variance $\text{cov}(f_*)$. For classification: a posterior distribution over the latent function, marginalised through a sigmoid to obtain class probabilities.

**Guarantee.** Exact for GPR with Gaussian likelihood: posterior is Gaussian, marginal likelihood is available in closed form. For GPC: approximation quality depends on the choice of approximate inference algorithm; EP is generally more accurate than the Laplace approximation (Ch. 3 experiments).

# Core idea

A Gaussian process is a prior over functions: any finite collection of function values $\mathbf{f} = (f(\mathbf{x}_1), \ldots, f(\mathbf{x}_n))^\top$ is jointly Gaussian, fully specified by a mean function $m(\mathbf{x})$ and a covariance function $k(\mathbf{x}, \mathbf{x}')$. The prior encodes structural assumptions (smoothness, stationarity, periodicity) through the choice of kernel.

For GPR, conditioning on noisy observations $\mathbf{y} = \mathbf{f} + \boldsymbol{\varepsilon}$ (with $\boldsymbol{\varepsilon} \sim \mathcal{N}(\mathbf{0}, \sigma_n^2 \mathbf{I})$) yields a posterior GP. The posterior mean and covariance at a test point $\mathbf{x}_*$ are (Ch. 2, eq. 2.23–2.24):

$$\bar{f}_* = \mathbf{k}_*^\top (K + \sigma_n^2 I)^{-1} \mathbf{y}, \qquad \text{cov}(f_*) = k(\mathbf{x}_*, \mathbf{x}_*) - \mathbf{k}_*^\top (K + \sigma_n^2 I)^{-1} \mathbf{k}_*,$$

where $K$ is the $n \times n$ Gram matrix of training covariances and $\mathbf{k}_*$ is the $n$-vector of cross-covariances between training points and $\mathbf{x}_*$. Prediction is $O(n^2)$ in storage and $O(n^3)$ in computation for the Cholesky factorisation of $K + \sigma_n^2 I$.

Hyperparameters (kernel length-scale, output scale, noise variance) are selected by maximising the log marginal likelihood $\log p(\mathbf{y}|X, \boldsymbol{\theta})$, which automatically penalises model complexity (Ch. 5). This is the principled alternative to cross-validation for kernel method hyperparameter selection.

For GPC, the Gaussian likelihood is replaced by a Bernoulli or softmax likelihood; the posterior is no longer Gaussian and requires approximation. The book presents Laplace's method (second-order Taylor expansion of the log-posterior) and Expectation Propagation as the two primary approaches (Ch. 3).

# Assumptions

1. (hard for exact inference) Gaussian noise in regression. Non-Gaussian likelihoods require approximate inference and destroy the closed-form posterior.
2. (soft) A single kernel family is adequate for the entire input domain. Spatial non-stationarity (e.g. abrupt changes in smoothness across input regions) is not handled by standard stationary kernels; non-stationary kernel constructions exist but are rarely used in practice.
3. (hard) Training data fits in memory as a dense $n \times n$ matrix. Exact GPR scales as $O(n^3)$ in time and $O(n^2)$ in memory; becomes impractical above $n \approx 10^4$ without sparse approximations (Ch. 8).
4. (soft) The chosen kernel family contains the true data-generating covariance structure. Misspecified kernels yield overconfident or underconfident predictive variances; marginal likelihood maximisation cannot correct a fundamentally wrong kernel family.
5. (soft) Inputs are noise-free. GP regression is formulated for noise in outputs only; noisy inputs require additional marginalisation (§9.5) that is rarely implemented in standard packages.
6. (soft) Stationarity. The most common kernels (squared exponential, Matérn) are stationary: $k(\mathbf{x}, \mathbf{x}') = k(\mathbf{x} - \mathbf{x}')$. Appropriate for interpolation in regions with uniform data density; may oversmooth in sparse regions and undersmooth in dense ones.

# Failure regime

- **Large $n$.** Exact GP inference breaks down around $n \approx 10^4$ due to the $O(n^3)$ Cholesky factorisation cost and $O(n^2)$ storage of the Gram matrix. Sparse approximations (Ch. 8: subset of regressors, Nyström, projected process) reduce cost to $O(nm^2)$ where $m \ll n$ is the number of inducing points, but introduce approximation error that is difficult to bound tightly in practice.
- **Highly non-stationary data.** A stationary kernel imposes a fixed global length-scale. Functions with radically different smoothness in different input regions (e.g. edges vs. flat regions in an image intensity field) cannot be captured without input-warping or non-stationary kernel constructions. The GP will average smoothness across the domain.
- **High-dimensional inputs.** The number of training points required to cover $\mathbb{R}^D$ grows exponentially with $D$ (curse of dimensionality). GPs do not automatically perform feature selection; irrelevant input dimensions dilute kernel distances. Automatic Relevance Determination (ARD) kernels (§5.1, §4.2.1) assign a separate length-scale per input dimension and can downweight irrelevant dimensions via marginal likelihood, but this requires reliable hyperparameter estimation.
- **GPC approximation failure.** For the Laplace approximation: mode-finding via Newton's method may fail to converge if the posterior is multimodal or very skewed. EP is more robust but can also fail to converge; neither algorithm provides convergence guarantees in general (§3.6.3).
- **Prior–posterior conflict.** If the true function is not in the reproducing kernel Hilbert space (RKHS) of the chosen kernel, the posterior mean converges to the best in-RKHS approximation, not the true function. The predictive variance does not account for this model misspecification.
- **Numerical conditioning.** The Gram matrix $K + \sigma_n^2 I$ can be near-singular if $\sigma_n^2$ is very small and training points are close together, leading to numerical instability in the Cholesky factorisation. Standard practice: add a small jitter ($\sim 10^{-6}$) to the diagonal. Double precision is strongly advisable.

# Numerical sensitivity

- **Cholesky factorisation.** All GP computations reduce to solving $(K + \sigma_n^2 I)\alpha = \mathbf{y}$ via Cholesky (Alg. 2.1). Condition number of $K + \sigma_n^2 I$ scales as $\kappa_{\max}/(\kappa_{\min} + \sigma_n^2)$ where $\kappa$ are eigenvalues of $K$. For $\sigma_n^2 = 0$ (noise-free regression), ill-conditioning is unavoidable when training points cluster; $\sigma_n^2 > 0$ acts as a regulariser.
- **Marginal likelihood optimisation.** The log marginal likelihood (eq. 5.8) involves $\log|K_y|$ (computed as $2\sum_i \log L_{ii}$ from the Cholesky factor $L$) and $\mathbf{y}^\top K_y^{-1} \mathbf{y}$. Both are sensitive to kernel hyperparameters: length-scale too small → $K$ approaches the identity matrix; length-scale too large → $K$ becomes rank-deficient. Gradient-based optimisation (L-BFGS) requires analytical kernel gradients.
- **ARD length-scales.** With $D$ separate length-scales, the marginal likelihood surface has $D+2$ or more hyperparameters. Multi-modal landscapes are common; random restarts or MCMC over hyperparameters are advisable for $D > 5$.
- **Matérn vs. squared-exponential kernels.** The squared-exponential (RBF) kernel implies infinite differentiability of $f$, which can be too smooth for practical data. The Matérn-$\nu$ family (§4.2.1) with $\nu = 3/2$ or $\nu = 5/2$ implies $\lceil \nu \rceil$ times mean-square differentiability and is often more appropriate. The predictive variance is sensitive to this choice; use Matérn for physical processes, RBF for smooth synthetic functions.
- **Sparse approximations (Ch. 8).** The Nyström approximation and subset-of-regressors both require choosing $m$ inducing points. The approximation error in the predictive variance (not just the mean) depends critically on the inducing-point placement; naive random selection is suboptimal; greedy methods (§8.2) or variational optimisation of inducing-point locations are preferred.

# Applicability

- Use when: the training set is small to medium ($n \lesssim 10^4$), the input dimensionality is low to moderate ($D \lesssim 20$), and calibrated uncertainty quantification is required (predictive intervals, not just point estimates).
- Use when: Bayesian optimisation of an expensive black-box function. The GP posterior provides the acquisition function (expected improvement, upper confidence bound) with well-calibrated uncertainty (§9.7).
- Use when: geospatial or time-series interpolation (kriging) where the correlation structure is approximately stationary and the observation geometry is irregular.
- Use when: non-parametric regression where the functional form is unknown and the dataset fits in memory.
- Don't use when: $n \gtrsim 10^5$ and approximation error is unacceptable. Deep-kernel learning or neural-process variants are better alternatives.
- Don't use when: inputs are very high-dimensional (images as raw pixels). Convolutional feature extractors followed by a GP head (a deep kernel) are more appropriate.
- Don't use when: hard real-time inference is required. GP prediction at a new test point is $O(n)$ per point after precomputing $(K + \sigma_n^2 I)^{-1}\mathbf{y}$; this is generally fast but the $O(n^3)$ precomputation limits retraining frequency.
- Compared against:
  - **Support Vector Machines** (Ch. 6.4): SVMs and GPs with the same kernel are closely related but GPs provide probabilistic outputs and calibrated uncertainty; SVMs do not. GPs are generally preferred when uncertainty matters.
  - **Neural networks** (Ch. 6 discussion): GPs with RBF kernel = infinite-width Bayesian neural networks in the limit; GPs avoid architecture search but scale poorly with $n$ and $D$.
  - **Kriging** (geostatistics): mathematically identical to GPR; different community, different terminology, same equations.

# Connections

- Builds on:
  - Bayesian linear regression (Ch. 2.1) — GP is its infinite-dimensional limit.
  - Kernel methods / RKHS theory (Ch. 6.1) — GPR is equivalent to kernel ridge regression from a frequentist perspective; the RKHS norm plays the role of the regulariser.
  - Expectation Propagation (Minka 2001, cited in Ch. 3.6) — used for approximate inference in GPC.
  - Nyström approximation (Williams & Seeger 2001, cited in Ch. 8.3.2) — low-rank Gram matrix approximation for sparse GPR.
- Enables (downstream):
  - Bayesian optimisation (the GP surrogate model is the core component).
  - GP-LVM (Lawrence 2005, cited in §9.11) — latent variable model using a GP mapping from latent to observed space; used in computer vision for dimensionality reduction and inverse problems.
  - Sparse GP literature (Titsias 2009 variational inducing points, etc.) — builds directly on the exact GP framework presented here.
- Refutes / supersedes: none directly. The book synthesises and unifies prior work; it does not supersede any single prior method.

# Atlas update plan

No atlas page currently references this paper. The vitavision atlas focuses on calibration targets, corner detection, and image stitching — domains where GP methods are not directly employed in the registered algorithms.

A concept page for Gaussian processes would be warranted only if 3+ algorithm or model pages begin citing GP-based methods (e.g. a GP-LVM model page, a Bayesian optimisation concept, or an inverse-rendering algorithm). Neither condition currently holds. This note is preserved for provenance: if a future atlas page covers GP regression, GP-LVM, or Bayesian optimisation for calibration hyperparameter tuning, the note is ready to provide the citation substrate.

# Provenance

- Source: full book text, `docs/papers/.cache/rasmussen2006-gpml.txt`. MIT Press, 2006. ISBN 0-262-18253-X. Available freely at `www.GaussianProcess.org/gpml`.
- Authors: Carl Edward Rasmussen and Christopher K. I. Williams.
- Table of contents: verified from pp. vii–x of the text cache. Chapters 1–9 plus appendices A–C.
- Ch. 1 (Introduction, pp. 1–5): GP as a prior over functions; the function-space vs weight-space duality; tractability argument for infinite-dimensional inference via finite marginals.
- Ch. 2 (Regression, pp. 7–30): exact posterior mean/covariance (eqs. 2.23–2.24); marginal likelihood for hyperparameter selection (eq. 2.30); function-space view and weight-space view duality.
- Ch. 3 (Classification, pp. 33–75): Laplace approximation (§3.4); EP (§3.6); empirical comparison on handwritten digit classification (§3.7).
- Ch. 4 (Covariance Functions, pp. 79–102): stationary kernels (RBF, Matérn, Ornstein-Uhlenbeck); ARD; composition rules; non-stationary and non-vectorial kernels.
- Ch. 5 (Model Selection, pp. 105–128): marginal likelihood optimisation (§5.4.1, eq. 5.8); Bayesian and cross-validation approaches compared.
- Ch. 8 (Approximations, pp. 171–187): Nyström (§8.3.2); subset of regressors (§8.3.1); projected process (§8.3.4); comparison table of sparse methods (§8.3.7).
- Ch. 9 (Further Issues, pp. 189–196): Bayesian optimisation (§9.7); latent variable models (§9.11 — GP-LVM); prediction with uncertain inputs (§9.5).
- Preface (pp. xiii–xvi): historical context — GP models traced to Wiener process and kriging; the connection to SVMs and large neural networks; intended audience (graduate students in CS/statistics/applied mathematics).
