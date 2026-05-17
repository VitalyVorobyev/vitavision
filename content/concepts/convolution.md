---
title: "Convolution"
date: 2026-05-16
summary: "The linear, shift-invariant operation that produces each output pixel as a kernel-weighted sum of input pixels in a local neighbourhood."
tags: ["classical"]
author: "Vitaly Vorobyev"
domain: image-formation
difficulty: beginner
prerequisites: []
sources:
  primary: canny1986-edge
  references:
    - krizhevsky2012-alexnet
    - simonyan2014-vgg
---

# Definition

Convolution is the linear, shift-invariant operation that produces each output pixel as a weighted sum of the input image values in a local neighbourhood, the weights given by a kernel.

:::definition[Discrete 2-D convolution]
Given a discrete image $I : \mathbb{Z}^2 \to \mathbb{R}$ and a kernel $h : \mathbb{Z}^2 \to \mathbb{R}$ of finite support, the convolution of $I$ with $h$ is

$$(I * h)(x, y) = \sum_{u} \sum_{v} I(x - u,\, y - v)\; h(u, v).$$

Input: an image $I$ and a kernel $h$. Output: a filtered image of the same domain, each pixel a linear combination of input pixels weighted by $h$. Every linear, shift-invariant filter is exactly characterised by its kernel via this operation.
:::

The index reversal $I(x-u, y-v)$ — rather than $I(x+u, y+v)$ — is the defining difference between convolution and cross-correlation. For a symmetric kernel the two operations coincide; for an asymmetric kernel they do not, and conflating them is a common source of implementation error.

# Mathematical Description

## Linearity and shift-invariance

A filter is linear if it commutes with scalar multiplication and addition, and shift-invariant if translating the input translates the output by the same amount. Every filter satisfying both properties is representable as convolution with some kernel $h$ — there are no other linear shift-invariant filters. The kernel is therefore a complete characterisation of any such operation.

## Separability

A 2-D kernel is separable if it factors into a product of two 1-D kernels, $h(u, v) = h_1(u)\,h_2(v)$. The 2-D convolution then decomposes into two successive 1-D passes, reducing the per-pixel cost from $O(k^2)$ multiplications to $O(2k)$ for a $k \times k$ kernel. The Gaussian

$$G_\sigma(x, y) = \exp\!\left(-\frac{x^2 + y^2}{2\sigma^2}\right)$$

is separable, $G_\sigma(x, y) = G_\sigma^{(1)}(x)\,G_\sigma^{(1)}(y)$. The Canny edge detector exploits this: its 2-D Gaussian convolution decomposes into two 1-D passes.

## Gaussian and derivative-of-Gaussian kernels

Convolving an image with $G_\sigma$ produces a smoothed image $I * G_\sigma$ that attenuates high-frequency noise while preserving low-frequency structure; the scale $\sigma$ controls the smoothing extent. Because convolution commutes with differentiation, the smoothed gradient satisfies $I * \partial_x G_\sigma = \partial_x(I * G_\sigma)$ — differentiating a smoothed image equals convolving with the derivative of a Gaussian. Canny's variational analysis establishes the first derivative of a Gaussian,

$$G'(x) = -\frac{x}{\sigma^2}\exp\!\left(-\frac{x^2}{2\sigma^2}\right),$$

as the optimal 1-D step-edge filter under simultaneous signal-to-noise, localisation, and single-response criteria. The discrete derivative kernels used in practice are treated in the [image-gradient](/atlas/image-gradient) concept.

## Boundary handling

Convolution is undefined within $\lfloor k/2 \rfloor$ pixels of the image border for a width-$k$ kernel. Zero padding sets exterior pixels to zero, introducing a dark-border artefact; replicate padding repeats border pixels, biasing gradient estimates near edges; reflect padding mirrors the image at the boundary, preserving local gradient structure and being the usual choice for derivative kernels.

## Convolution theorem and FFT evaluation

By the convolution theorem, spatial-domain convolution equals pointwise multiplication in the frequency domain, $\mathcal{F}\{I * h\} = \mathcal{F}\{I\} \cdot \mathcal{F}\{h\}$. Direct spatial convolution costs $O(N k^2)$ for an $N$-pixel image and a $k \times k$ kernel; FFT-based convolution costs $O(N \log N)$ regardless of kernel size, making it preferable for large kernels such as wide Gaussians.

## Learned convolution in CNNs

In a convolutional neural network the kernel is not fixed analytically but learned from data by gradient descent. Each layer applies a bank of kernels of size $k \times k \times C_{\text{in}}$ to a $C_{\text{in}}$-channel input, producing $C_{\text{out}}$ output maps. Weight sharing — the same kernel at every spatial position — cuts the parameter count to $O(k^2 C_{\text{in}} C_{\text{out}})$ and enforces translation equivariance. AlexNet uses $11 \times 11$ first-layer kernels with stride 4, then $5 \times 5$ and $3 \times 3$; VGG replaced large first-layer kernels with stacks of $3 \times 3$ convolutions — two stacked $3 \times 3$ layers cover a $5 \times 5$ receptive field, three cover $7 \times 7$, at parameter cost $27C^2$ versus $49C^2$ for one $7 \times 7$ layer. The stacked $3 \times 3$ block became the standard convolutional primitive.

# Numerical Concerns

**Kernel normalisation.** A kernel whose coefficients do not sum to 1 scales the output's mean brightness; smoothing kernels should sum to 1, derivative kernels to 0 (antisymmetric). A non-zero-sum derivative kernel introduces a DC offset in the gradient map.

**Gaussian truncation.** The Gaussian has infinite support and is truncated in practice; the standard rule retains $\pm 3\sigma$, giving a width of $2\lfloor 3\sigma \rfloor + 1$. Truncating at $\pm 2\sigma$ produces visible ringing; the truncated kernel must be renormalised.

**Accumulator precision.** A $k \times k$ kernel over an 8-bit image accumulates up to $k^2 \times 255$; unnormalised 8-bit accumulation overflows for kernels larger than $3 \times 3$. Floating-point accumulators avoid overflow but require casting input pixels to float.

**Separable-pass intermediate precision.** When a separable convolution is split into a horizontal then a vertical pass, the intermediate result must be stored in sufficient precision — 16-bit integer intermediates introduce quantisation error that the second pass amplifies; 32-bit float intermediates are the safe choice.

**Boundary bias.** Padding introduces artificial signal near the border — zero padding depresses gradient magnitudes, replicate padding inflates corner gradients. Algorithms detecting features near the image boundary should either exclude a border strip of width $\lfloor k/2 \rfloor$ or use reflect padding throughout.

**Cross-correlation convention.** Most deep-learning frameworks implement cross-correlation and call it convolution; this equals convolution with the flipped kernel. For symmetric kernels the distinction is immaterial, but applying cross-correlation where convolution is intended flips the sign of an asymmetric kernel such as a derivative-of-Gaussian — a silent directional error.

# Where it appears

Convolution is the shared computational primitive of every spatial filtering operation in the atlas.

- [canny-edge-detector](/atlas/canny-edge-detector) — smoothing by $G_\sigma$ and gradient computation by $\partial_x G_\sigma$, $\partial_y G_\sigma$ are both convolutions; the first derivative of a Gaussian is established by variational analysis as the optimal step-edge kernel.
- [image-gradient](/atlas/image-gradient) — every discrete derivative kernel (forward difference, central difference, Sobel, Scharr) is a convolution kernel; the derivative-of-Gaussian identity follows from convolution's commutativity with differentiation.
- [scale-space](/atlas/scale-space) — the Gaussian scale-space $L(x,y;\sigma) = I * G_\sigma$ is a family of convolutions with Gaussians of increasing width; SIFT and SURF approximate the Laplacian by differences of Gaussian convolutions.
- [convolutional-neural-network](/atlas/convolutional-neural-network) — the learned kernel is the central abstraction; AlexNet established the multi-layer learned-convolution pipeline and VGG showed that stacked $3 \times 3$ kernels dominate larger single kernels.

# References

1. J. Canny. *A Computational Approach to Edge Detection.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 8(6):679–698, 1986.
2. A. Krizhevsky, I. Sutskever, G. E. Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS, 2012.
3. K. Simonyan, A. Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR, 2015.
4. R. C. Gonzalez, R. E. Woods. *Digital Image Processing*, 4th ed. Pearson, 2018.
5. R. Szeliski. *Computer Vision: Algorithms and Applications*, 2nd ed. Springer, 2022.
