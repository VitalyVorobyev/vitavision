---
paper_id: tan2019-mnasnet
title: "MnasNet: Platform-Aware Neural Architecture Search for Mobile"
authors: ["M. Tan", "B. Chen", "R. Pang", "V. Vasudevan", "M. Sandler", "A. Howard", "Q. V. Le"]
year: 2019
url: https://arxiv.org/pdf/1807.11626
created: 2026-05-29
relevant_atlas_pages: [mobilenetv3, mobilenetv2, convolutional-neural-network]
---

# Setting

Automated design of efficient mobile-CPU CNN classifiers via neural architecture search (NAS). Input: a target mobile latency $T$ (in ms) and an ImageNet training set. Output: a CNN architecture (block topology, operator types, kernel sizes, filter counts, layer counts per block) optimised to maximise top-1 ImageNet accuracy subject to the latency constraint, measured on real mobile hardware. The system also transfers to COCO object detection by plugging the found backbone into SSDLite.

Preconditions: access to real mobile devices for latency measurement during search; feasibility of running ~8K lightweight proxy-task evaluations (5-epoch ImageNet) within a hardware budget. Guarantees are empirical, not theoretical: the search finds a Pareto-near-optimal solution for the given device, training recipe, and latency target, but optimality is not certified.

# Core idea

MnasNet frames mobile CNN design as a multi-objective optimisation over a factorized hierarchical search space, with direct real-device latency embedded in the reward.

**Multi-objective reward.** Given accuracy $\mathrm{ACC}(m)$ and measured inference latency $\mathrm{LAT}(m)$ on target hardware, with latency target $T$, the hard-constraint form (Eq. 1) is

$$\max_m \mathrm{ACC}(m) \quad \text{subject to} \quad \mathrm{LAT}(m) \le T.$$

The paper replaces this with a weighted-product reward that approximates Pareto-optimal solutions in a single search (Eq. 2):

$$\max_m \; \mathrm{ACC}(m) \times \left[\frac{\mathrm{LAT}(m)}{T}\right]^{w}, \quad w = \begin{cases} \alpha, & \mathrm{LAT}(m) \le T \\ \beta, & \text{otherwise} \end{cases} \tag{Eq. 2, 3}$$

The constants $\alpha = \beta = -0.07$ are chosen so that doubling latency trades for roughly 5% relative accuracy gain (derived empirically in Sec. 3): solving $a(1+5\%) \cdot (2l/T)^{\beta} \approx a \cdot (l/T)^{\beta}$ gives $\beta \approx -0.07$.

**Factorized hierarchical search space.** A CNN is partitioned into $B = 7$ predefined blocks with fixed input resolutions and filter-size schedules (Figure 4). Within each block $i$, the search selects independently: ConvOp $\in$ \{conv, dconv, MBConv\}, KernelSize $\in$ \{3, 5\}, SERatio $\in$ \{0, 0.25\}, SkipOp $\in$ \{pool, identity, none\}, output filter size $F_i$, and layer count $N_i$. All layers within a block share the same architecture. Total search space $\approx S^B = 432^5 \approx 10^{13}$, compared with $10^{39}$ for a flat per-layer approach (Sec. 4.1).

**Direct real-device latency.** Latency is measured by running each sampled model on the single-thread big CPU core of a Pixel 1 phone (batch size 1). This is motivated by the observation that FLOPs are an unreliable proxy: MobileNetV1 (575 M MAdds, 113 ms) and NASNet (564 M MAdds, 183 ms) have nearly identical FLOPs but very different latency (Table 1, Sec. 1).

**RNN controller with RL.** An RNN controller maps each CNN to a token sequence; it is trained with Proximal Policy Optimization (PPO, [30]) to maximise $J = \mathbb{E}_{P(a_{1:T};\theta)}[R(m)]$ (Eq. 5). Approximately 8K models are sampled during search; 15 top-performers are transferred to full ImageNet training; 1 is transferred to COCO. Each full search takes 4.5 days on 64 TPUv2 devices (Sec. 5).

# Assumptions

1. **(Hard) Real-device latency budget during search.** The method requires running every sampled architecture on a real mobile phone. Without access to the physical device or a verified simulator, the reward signal is unavailable.
2. **(Soft) Proxy-task transferability.** Architecture ranking on 5-epoch proxy ImageNet correlates with final full-training ranking. The paper validates this empirically but notes small-task proxies (CIFAR-10) do not transfer when latency scaling is involved (Sec. 5).
3. **(Soft) MobileNetV2-style block primitives dominate.** The search space is parameterised relative to MobileNetV2 filter sizes ($\times 0.75$, $\times 1.0$, $\times 1.25$) and layer counts ($\pm 1$). Architectures far outside this regime are not reachable.
4. **(Soft) Single-device target.** The found architecture is optimised for Pixel 1 (ARM big core). Latency ordering may not transfer to other hardware (GPU, DSP, newer ARM cores) without re-search.
5. **(Soft) Reward hyperparameters $\alpha = \beta = -0.07$.** These constants assume a particular accuracy-latency trade-off preference. Different application requirements would need re-calibration.

# Failure regime

- **Wrong hardware target**: an architecture tuned for Pixel 1 may not be Pareto-optimal on GPU or DSP backends; the search must be re-run per hardware class.
- **Proxy-task mismatch at scale**: for COCO detection the authors search on ImageNet then transfer (only 1 model transferred, Sec. 5); a mismatch in feature distribution could degrade detection performance even when classification accuracy is high.
- **Fixed block skeleton**: the 7-block partition with fixed stride positions is a hard prior. If the optimal architecture for a new domain requires a different macro-skeleton, the search cannot find it.
- **SE availability assumption**: Table 2 shows that removing SE from the search space degrades MnasNet-A1 from 75.2% to 74.5% (MnasNet-B1 at 77 ms). Deploying on hardware that does not support efficient SE (e.g. hardware without efficient global pooling) negates this gain.
- **Search cost**: 8K model evaluations on real devices is expensive; cannot be reproduced without substantial TPU and mobile-device infrastructure.

# Numerical sensitivity

- **Reward exponent $\alpha = \beta = -0.07$**: small changes matter. The paper discusses (α = 0, β = -1) as a hard-constraint variant (Figure 3 top). The two regimes produce qualitatively different Pareto curves and latency histograms (Figure 6): the hard-constraint version clusters models below T, the soft-constraint version spreads them more broadly.
- **Target latency T**: set to 75 ms in the main experiment (matching MobileNetV2 latency). The reward is scale-sensitive to T: a ratio $\mathrm{LAT}(m)/T$ appears inside the exponent, so absolute latency matters, not just ordering.
- **Filter-size discretisation**: filter sizes are searched as multiples of MobileNetV2 reference ($\times 0.75$, $\times 1.0$, $\times 1.25$). Rounding errors in MAdds accumulate but are small relative to the overall variance in the proxy-task reward.
- **Batch norm momentum = 0.99, weight decay = 1e-5** for full ImageNet training (Sec. 5); these are standard values but were tuned for this architecture family.

# Applicability

- Use when: deploying an image classifier on a specific mobile CPU with a hard latency budget, and willing to invest search compute (64 TPUv2 days); need a Pareto-optimal architecture rather than a manually-designed one.
- Don't use when: the target hardware is not accessible for latency measurement; the task domain differs substantially from ImageNet (consider task-specific search or fine-tuning); compute budget for search is unavailable.
- Compared against: MobileNetV2 (1.4x) [29] - MnasNet-A1 is 1.8x faster at 0.5% higher accuracy; NASNet-A [36] - MnasNet-A1 is 2.3x faster at 1.2% higher accuracy; AmoebaNet-A [26] - MnasNet-A1 at 78 ms vs 190 ms, similar accuracy; DARTS [21] - MnasNet-A1 at 78 ms vs 595 M MAdds.

# Connections

- Builds on: [sandler2018-mobilenetv2] (MBConv block as primary op; filter-size search parameterised relative to MobileNetV2), [zoph2018-nasnet] (same RNN controller architecture; extends to real-device latency reward)
- Enables: [howard2019-mobilenetv3] (MobileNetV3 adopts MnasNet-style platform-aware NAS plus SE-augmented search space as the basis of its two-stage search)
- Refutes / supersedes: FLOPs-based NAS reward (NASNet, DARTS); the paper empirically shows FLOPs is a poor latency proxy (Table 1, Sec. 1)

# Atlas update plan

## NEW: mnasnet
Type: model
Domain: features    (tasks: [image-classification]; arch_family: cnn)
Primary source: this paper (tan2019-mnasnet)
Prerequisites: convolutional-neural-network

Relations (feeds_into authored ON THIS antecedent page - A->B, chronology A<=B holds):
- { type: feeds_into, target: mobilenetv3, confidence: high, caution: "MobileNetV3 uses MnasNet-style platform-aware NAS and the SE-augmented search space as the basis of its block-level search." }

**Motivation.** Hand-crafting mobile CNNs requires painful manual accuracy-latency trade-offs across a combinatorially large design space. Previous NAS methods either ignore real-device latency entirely or approximate it via FLOPs, which the authors show is unreliable (MobileNetV1 vs NASNet example, Sec. 1). MnasNet directly incorporates measured mobile latency into the NAS objective.

**Architecture.**
- *Multi-objective latency-aware reward* (Sec. 3, Eq. 2-3): $\max_m \mathrm{ACC}(m) \times [\mathrm{LAT}(m)/T]^w$ with $w = \alpha$ if $\mathrm{LAT}(m) \le T$ else $\beta$; paper selects $\alpha = \beta = -0.07$ calibrated so doubling latency trades ~5% relative accuracy.
- *Factorized hierarchical search space* (Sec. 4.1, Figure 4): network partitioned into 7 predefined blocks; each block independently searches ConvOp, KernelSize (3x3/5x5), SERatio (0/0.25), SkipOp, FilterSize, and LayerCount. Total space ~$10^{13}$, drastically smaller than flat per-layer space (~$10^{39}$).
- *MBConv + optional SE*: primary building block is mobile inverted bottleneck conv from MobileNetV2 [29], optionally augmented with Squeeze-and-Excitation [13]. MnasNet-A1 (with SE) achieves 75.2% vs 74.5% for MnasNet-B1 (without SE, Table 2).
- *Direct real-device latency*: every sampled model measured on big CPU core of Pixel 1, batch size 1. FLOPs rejected as proxy.
- *RL/RNN controller*: RNN maps architecture to token sequence; trained with PPO. ~8K models sampled per search, 4.5 days on 64 TPUv2 devices. Top 15 transferred to full ImageNet training (Sec. 5).

**Implementations.**
- Official TensorFlow/TPU: https://github.com/tensorflow/tpu/tree/master/models/official/mnasnet (referenced in Abstract)

**Assessment.**
- *Novelty*: first NAS method to embed direct (not FLOPs-approximated) mobile latency into the search reward and to use a factorized hierarchical space enabling layer diversity.
- *Strengths*: MnasNet-A1 achieves 75.2% top-1 / 92.5% top-5, 78 ms on Pixel 1, 3.9M params, 312M MAdds (Table 1). 1.8x faster than MobileNetV2 (1.4x) at 0.5% higher accuracy; 2.3x faster than NASNet-A at 1.2% higher accuracy. On COCO, MnasNet-A1 + SSDLite achieves 23.0 mAP at 203 ms with 4.9M params and 0.8B MAdds, comparable to SSD300 (23.2 mAP) at 42x fewer MAdds (Table 3).
- *Limitations*: search cost is high (64 TPUv2-days); architecture is device-specific and must be re-searched for different hardware; macro-skeleton (7-block partition) is hand-specified.

**References.** Tan et al., "MnasNet: Platform-Aware Neural Architecture Search for Mobile," CVPR 2019. arXiv:1807.11626.

Note for author: a feeds_into edge mobilenetv2 -> mnasnet is authored on the MobileNetV2 page (recorded in the sandler2018-mobilenetv2 note). Do NOT duplicate it here.

## UPDATE: mobilenetv3
Section: sources.references + # References
- The mobilenetv3 page names MnasNet in prose but does not yet formally cite it. Add tan2019-mnasnet to sources.references and as a numbered # References entry, since MobileNetV3's two-stage search uses MnasNet-style platform-aware NAS.

# Provenance

1. **Abstract / Sec. 1**: "MnasNet achieves 75.2% top-1 accuracy with 78ms latency on a Pixel phone, which is 1.8x faster than MobileNetV2 [29] with 0.5% higher accuracy and 2.3x faster than NASNet [36] with 1.2% higher accuracy." (lines 52-57 of cache)
2. **Table 1** (lines 285-287): MnasNet-A1: auto, 3.9M params, 312M MAdds, 75.2% top-1, 92.5% top-5, 78 ms on Pixel 1.
3. **Eq. 1** (lines 170-173): hard-constraint formulation: maximize ACC(m) subject to LAT(m) <= T.
4. **Eq. 2** (lines 187-190): weighted-product reward: maximize over m of ACC(m) * [LAT(m)/T]^w.
5. **Eq. 3** (lines 193-196): w = alpha if LAT(m) <= T, else beta.
6. **Sec. 3** (lines 130-146): derivation of alpha = beta = -0.07 from empirical observation that doubling latency brings ~5% relative accuracy gain; "Solving this gives beta ≈ -0.07. Therefore, we use alpha = beta = -0.07 in our experiments unless explicitly stated."
7. **Figure 3 caption** (lines 153-161): Eq. 2 with (alpha=0, beta=-1) = hard constraint; (alpha=beta=-0.07) = soft constraint.
8. **Sec. 4.1 / Figure 4** (lines 179-239): factorized hierarchical search space; B=7 blocks; per-block search options listed; search space size S^B vs S^(B*N), typical case S=432, B=5, N=3 gives ~10^13 vs ~10^39.
9. **Sec. 4.1** (lines 249-268): per-block sub-space: ConvOp, KernelSize (3x3/5x5), SERatio (0/0.25), SkipOp, Fi, Ni; filter sizes discretized as {0.75, 1.0, 1.25} of MobileNetV2.
10. **Eq. 5** (line 259): RL objective J = E_{P(a_{1:T};theta)}[R(m)].
11. **Sec. 4.2** (lines 265-305): RNN controller; PPO [30]; sample-eval-update loop; latency measured on big CPU core of Pixel 1.
12. **Sec. 5** (lines 296-304): ~8K models sampled, 15 transferred to full ImageNet, 1 to COCO; 4.5 days on 64 TPUv2.
13. **Table 2** (lines 365-375): MnasNet-A1 (with SE): 78 ms, 75.2%; MnasNet-B1 (without SE): 77 ms, 74.5%.
14. **Table 3** (lines 397-407): MnasNet-A1 + SSDLite: 4.9M params, 0.8B MAdds, 23.0 mAP, 203 ms; SSD300: 36.1M params, 35.2B MAdds, 23.2 mAP.
15. **Sec. 1 / Table 1** (lines 85-88): MobileNetV1 vs NASNet FLOPs proxy failure: 575M vs 564M MAdds, but 113ms vs 183ms latency.
16. **Table 6** (lines 515-520): layer diversity ablation: MnasNet-A1 75.2%/78ms vs single-op variants (MBConv3 k3x3: 71.8%/63ms; MBConv6 k5x5: 75.6%/146ms).
17. **Sec. 5 training details** (lines 304-313): RMSProp decay 0.9, momentum 0.9; BN momentum 0.99; weight decay 1e-5; dropout 0.2; batch size 4K; image size 224x224.
