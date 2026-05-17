---
paper_id: abbas2019-bev
title: "A Geometric Approach to Obtain a Bird's Eye View From an Image"
authors: ["S. A. Abbas", "A. Zisserman"]
year: 2019
url: https://arxiv.org/abs/1905.02231
created: 2026-05-17
relevant_atlas_pages: [homography, pinhole-camera-model, convolutional-neural-network, pose-estimation, superpoint, ccs-camera-calibration]
---

# Setting

**Problem class.** Perspective-distortion removal for the ground plane in monocular images. Given a single perspective image of an outdoor scene containing a dominant flat ground plane, compute a homography that warps the image to a geometrically correct bird's-eye (overhead, orthographic) view.

**Inputs.** A single perspective RGB image of arbitrary resolution. Implicit preconditions: (1) the scene contains a dominant flat ground plane; (2) the camera satisfies a simplified pinhole model (square pixels, principal point at image centre, no lens distortion); (3) no ground-truth calibration data is required at inference time — the geometry is inferred from the image itself.

**Outputs.** A $3 \times 3$ homography matrix $H$ that maps pixels from the original image to an overhead view. Ground-plane geometry in the rectified image is metrically correct up to an overall scale factor; Euclidean measurements can be extracted if one reference distance is known.

# Core idea

The BEV rectification reduces to finding two geometric entities in the image: the **vertical vanishing point** $v_z$ (where vertical parallel lines in the scene converge) and the **horizon line** $h$ (the ground-plane vanishing line). These four degrees of freedom (two per entity encoded as two scalars each using a stereographic-inspired finite representation) fully determine the rectifying homography.

Given $v_z$ and $h$, the method computes the internal calibration matrix $K$ in closed form using the image of the absolute conic $\omega = (KK^T)^{-1}$ via the relation $h = \omega v_z$ (eq. 4). It then composes $H$ as a chain of four projective transformations:

$$H = R_\text{align}\, T_\text{scene}\, K R_\text{tilt} K^{-1} R_\text{roll}$$

(eq. 6), where $R_\text{roll}$ removes camera roll, $R_\text{tilt}$ removes camera tilt, $T_\text{scene}$ performs the image translation to cover the full overhead footprint, and $R_\text{align}$ (optional) aligns the principal horizontal direction with a coordinate axis. No DLT, SVD, or RANSAC homography solve is performed; the construction is purely closed-form from the CNN predictions.

A CNN is trained to regress the four scalars encoding $v_z$ and $h$ using a **regression-by-classification** head: each scalar is discretized into $b = 500$ bins and predicted via a multi-way softmax, with the final value computed as a weighted average of the top $c = 11$ bins.

# Assumptions

1. **Single dominant flat ground plane** (hard). The entire BEV parameterisation assumes a planar world surface. Non-planar ground (slopes, stairs) produces geometric distortion in the BEV output.
2. **Pinhole camera, square pixels, centred principal point** (hard for focal-length recovery). The simplification $K = \text{diag}(f, f, 1)$ augmented with image-centre offset (eq. 3) is the basis for recovering $f$ from $h$ and $v_z$. Non-zero skew and decentred principal point break the closed-form focal-length recovery.
3. **No lens distortion** (soft / hard depending on magnitude). Not modelled. Barrel or pincushion distortion will degrade geometric accuracy, especially at image boundaries.
4. **Camera tilt in range $(0°, 40°]$** (soft). The CARLA-VP training distribution uses this range. Cameras facing close to horizontal or nearly straight down are underrepresented.
5. **Visible ground plane** (soft). The CNN relies on scene cues; heavily occluded ground planes reduce estimation reliability.
6. **Horizon line lies within or near the image** (addressed by synthetic training). Prior methods using HLW [Workman et al. 2016] trained on real data almost exclusively containing horizon lines inside the image frame; the authors circumvent this by using synthetic data with a controlled distribution.

# Failure regime

- **Out-of-distribution tilt**: cameras with tilt $> 40°$ or near-horizontal may produce poor vanishing-point estimates because the CARLA-VP training distribution is bounded to $(0°, 40°]$ (§5.1).
- **Extreme or wide field of view**: focal length estimated from the horizon–vanishing-point relation becomes numerically unstable at large FoV. The tan relation in eq. (1) has a large derivative near $\pi/2$, so a small FoV error causes a disproportionately large focal-length error (§6.3).
- **No ground plane / non-planar scene**: the BEV assumption itself breaks. Objects above the ground plane (vehicles, people) will be distorted or non-metric even in a correct rectification.
- **Sky-dominated images**: DeepHorizon (Workman et al.) uses sky–ground segmentation cues; the authors' method also relies partly on such cues, though the failure pattern is less severe (§6.4.1).
- **Horizon line far outside the image**: prior methods [Lezama et al., Workman et al.] fail in this regime because their training data lacks such examples; the paper's synthetic approach handles it better (§1, §6.4.1).
- **Single-frame focal-length estimate unreliable**: focal-length estimation from a single frame is inherently noisy; averaging over ~400 frames is needed for convergence (Fig. 7 in the paper).

# Numerical sensitivity

- **Focal length via FoV** (eq. 1): $\tan(\gamma/2) = (w/2)/f$. For $\gamma$ near $\pi/2$ (wide-angle), the function $f(\gamma)$ changes rapidly — a 2° error in FoV near 115° produces larger absolute $f$ error than the same 2° error near 45° (§6.3). The authors prefer predicting $v_z$ directly over predicting FoV for this reason.
- **Focal length via absolute conic** (eq. 4): $h = \omega v_z$, $\omega = (KK^T)^{-1}$. This is a linear constraint in $\omega$ entries; well-conditioned when $v_z$ is distinct from $h$ (standard case), ill-conditioned when $v_z$ approaches the horizon (camera nearly horizontal, tilt $\to 0$).
- **Regression-by-classification** (§6.2): with $b = 500$ bins per scalar, the discretization granularity is the domain range divided by 500. Weighted averaging over $c = 11$ top bins smooths the output, reducing effective quantization error at the cost of slight systematic bias.
- **Scale of BEV output**: scene geometry is metric only up to an overall scale factor. Absolute distance measurements require one known reference distance.

# Applicability

- **Use when**: monocular overhead-view generation is needed without pre-calibrated cameras; the scene contains a dominant flat ground plane; real-time performance is needed (40 ms/frame on GTX 1050 Ti, ~25 FPS); ground-plane metric measurements are needed up to scale (crowd counting, vehicle tracking pre-processing, surveillance).
- **Don't use when**: the scene lacks a dominant ground plane; high metric precision in 3D is needed (use full camera calibration + stereo or depth sensors instead); the camera has significant radial distortion (a distortion-correction step should precede this method); the camera looks nearly horizontally at the scene (tilt ≈ 0, which makes the horizon and vertical vanishing point poorly conditioned).
- **Compared against**: DeepHorizon [Workman et al. 2016] (CNN horizon line, requires post-processing for best results; fails when horizon is outside image); Lezama et al. 2014 (geometry-based, no training, relies on line detection); Bruls et al. 2018 (GAN-based IPM, requires near-zero pitch/roll); Zhai et al. 2016 (vanishing-point detection with post-processing).

# Connections

- **Builds on**:
  - `he2016-resnet` (ResNet variants tested as CNN trunk, §6.3, Table 3)
  - Hartley & Zisserman, *Multiple View Geometry in Computer Vision*, 2003 (reference [17]) — the $x' = KRK^{-1}x$ image-rotation relation (eq. 2), the absolute conic $\omega$ (eq. 4), and the vanishing-point projection formulas (eq. 7) are all drawn directly from this textbook
  - Szegedy et al. *Inception-v4* 2017 (reference [33]) — best-performing trunk in ablation
  - CARLA simulator (Dosovitskiy et al. 2017, reference [13]) — synthetic dataset generation
  - Kingma & Ba *Adam* optimizer (reference [21])
  - Workman et al. *HLW dataset* 2016 (reference [36]) — benchmark for horizon detection
  - Snyder *Flattening the Earth* 1997 (reference [32]) — stereographic projection idea for the at-infinity representation
- **Enables**: downstream ground-plane metric tasks — crowd counting [Liu et al. 2018, refs 24–25], vehicle tracking [O'Malley et al. 2011, ref 28], object detection [refs 19, 29]
- **Refutes / supersedes**: DeepHorizon [Workman et al. 2016] on HLW AUC (74.52% vs 71.16% with post-processing); Lezama et al. 2014 on VIRAT AUC (significant margin, Fig. 6)

# Atlas update plan

## NEW: geometric-bev
Type: algorithm
Primary source: this paper (abbas2019-bev)
Relations: none (decided during ingestion — pose-estimation / superpoint / ccs-camera-calibration are related work, surfaced as Remarks, not typed relations)
Suggested frontmatter:
  domain: geometry
  tags: [camera-model, pose-estimation]
  tasks: [perspective-rectification]  # ? no exact match in existing vocabulary; proposed
  difficulty: intermediate
  prerequisites: [homography, pinhole-camera-model, convolutional-neural-network]
  failureModes: []

### Goal
- Rectify a monocular image to a geometrically correct bird's-eye view by computing a $3 \times 3$ homography from two geometric entities predicted by a CNN: the vertical vanishing point and the horizon line.
- Enable ground-plane metric measurements (up to a scale) from a single uncalibrated image in real time.
- Provide a minimal, interpretable parameterisation (4 scalars for uncalibrated cameras, 2 for calibrated) rather than directly regressing the 8 DoF of a general homography.

### Algorithm
- **Minimal parameterisation** (§3, §1): the BEV homography is fully determined by the vertical vanishing point $v_z$ (2 scalars after the stereographic-sphere encoding) and the horizon line $h$ (2 scalars after encoding). If focal length $f$ is known, only the horizon line is needed (2 scalars).
- **Calibration matrix recovery** (§3, eq. 4): $f$ is obtained from $h = \omega v_z$ where $\omega = (KK^T)^{-1}$ is the image of the absolute conic and $K = \begin{pmatrix} f & 0 & w/2 \\ 0 & f & h/2 \\ 0 & 0 & 1 \end{pmatrix}$ (eq. 3). This requires the simplified pinhole model (square pixels, centred principal point).
- **Camera roll** (§3): $\theta_z = \tan^{-1}(-a/b)$ from the horizon line $ax + by + c = 0$; gives $R_\text{roll}$.
- **Camera tilt** (§3): $\theta_x = \frac{\pi}{2} - \tan^{-1}\!\left(\frac{v_z}{f}\right)$ where $v_z$ is the perpendicular distance from the vertical vanishing point to the principal point; gives $R_\text{tilt}$.
- **Intermediate rotational homography** (§3, eq. 5): $H_\text{rot} = K R_\text{tilt} K^{-1} R_\text{roll}$.
- **Scene translation** (§3, step C): $H_\text{rot}$ is applied to the four image corners to determine the destination canvas extents; a translation matrix $T_\text{scene}$ maps them to the canvas.
- **Final homography** (§3, eq. 6): $H = R_\text{align}\, T_\text{scene}\, K R_\text{tilt} K^{-1} R_\text{roll}$. $R_\text{align}$ is optional — aligns the image axes to a principal horizontal vanishing direction.
- **Ground-truth generation for CARLA-VP** (§5.2, eq. 7): vanishing points are computed analytically from the simulator's $K$ and $R$: $v_z = Kr_3$, $v_x = Kr_1$, $v_y = Kr_2$, $h = v_x \times v_y$, where $r_i$ are columns of the rotation matrix.
- **At-infinity safe representation** (§4.1): a point $P$ at or near infinity is mapped to a finite point $Q$ on a 2D disc of radius $r$ via a stereographic-sphere construction (project $P$ onto a sphere of radius $r$ centred at $(0,0,r)$, then orthogonally project the sphere intersection back to the plane). A line $l$ is mapped via the normal to the plane defined by $l$ and the sphere centre. The four scalars representing $v_z$ and $h$ all lie in $[-r, r]$.

### Implementation
- **CNN trunk** (§6.2, §6.3, Table 3): Inception-v4 [Szegedy et al. 2017] gives best performance (FoV err 4.130°, tilt err 1.509°, roll err 0.853°); ResNet-50 and ResNet-101 are close; VGG-M and Inception-V1 are substantially worse.
- **Regression head** (§6.2): 4-scalar output. Each scalar is discretized into $b = 500$ bins and predicted via a multi-way softmax. At inference, the weighted average of the top $c = 11$ bins by probability gives the regressed value.
- **Training** (§6.2): TensorFlow 1.8, Python 3.6; initialised from ImageNet-pretrained weights; all layers fine-tuned; Adam optimizer with initial learning rate $10^{-2}$, reduced by 10× to $10^{-4}$ on validation loss increase.
- **CARLA-VP dataset** (§5.1, Table 1): 12 000 training / 1 000 validation / 1 000 test images synthesised from the CARLA simulator. Camera height uniform in $[\text{person height}, 20\text{ m}]$; tilt uniform in $(0°, 40°]$; roll normal $\mu = 0°$, $\sigma = 5°$, truncated to $[-30°, 30°]$; FoV uniform in $[15°, 115°]$.
- **Inference speed** (§6.4.1): ~40 ms/frame on GTX 1050 Ti ≈ 25 FPS; suitable for real-time video processing.
- **Multi-frame focal length averaging** (§6.4.1, Fig. 7): focal-length estimate stabilises after ~400 frames when applied to fixed-camera videos; useful for surveillance deployment.

### Remarks
- The at-infinity representation is not image-observable: the regression targets $Q$ do not correspond to any directly detectable feature in the image. The authors acknowledge this and suggest designing a geometrically grounded projection in future work (§7).
- **Related work — pose estimation**: the roll/tilt/focal-length recovery is related to the single-image pose-estimation literature; unlike pose-estimation methods that regress rotation quaternions, this paper parameterises the camera solely through its projective observables in the image (vanishing point and horizon line). See the `pose-estimation` Atlas page for the broader context.
- **Related work — SuperPoint and learned feature detectors**: key-point and line detectors (e.g., SuperPoint) can be used as an alternative front-end to extract lines for classic voting-based vanishing-point estimation (Lezama et al., Hough-based methods). The present method avoids line detection entirely, instead using a holistic CNN. See the `superpoint` Atlas page.
- **Related work — CCS camera calibration**: methods such as `ccs-camera-calibration` calibrate the full intrinsic+extrinsic model from calibration targets. This paper bypasses target-based calibration by inferring $f$ geometrically from scene structure, at the cost of requiring a visible ground plane and a trained CNN. See the `ccs-camera-calibration` Atlas page for the complementary precision-first perspective.
- Compared against four published baselines on two datasets (VIRAT Video, HLW); outperforms the prior state-of-the-art DeepHorizon on HLW by ~3.4 pp AUC (74.52% vs 71.16%).

### References
- Abbas & Zisserman 2019, arxiv 1905.02231 (this paper)
- Hartley & Zisserman, *Multiple View Geometry in Computer Vision*, Cambridge, 2003 [17]
- Workman, Zhai & Jacobs, "Horizon Lines in the Wild", arXiv 1604.02129 [36]
- Szegedy et al., "Inception-v4", AAAI 2017 [33]
- He et al., "Deep Residual Learning for Image Recognition", CVPR 2016 [18] (our index: `he2016-resnet`)
- He et al., "Mask R-CNN", ICCV 2017 [19] (our index: `he2017-maskrcnn`)
- Dosovitskiy et al., "CARLA: An Open Urban Driving Simulator", CoRL 2017 [13]
- Lezama et al., "Finding Vanishing Points via Point Alignments in Image Primal and Dual Domains", CVPR 2014 [22]
- Zhai, Workman & Jacobs, "Detecting Vanishing Points Using Global Image Context in a Non-Manhattan World", CVPR 2016 [37]

# Provenance

- **Abstract**: 4 contributions, 74.52% AUC claim → Paper abstract, p. 1.
- **Eq. 1** $\tan(\gamma/2) = (w/2)/f$ (FoV–focal-length relation) → §2 "Estimating the focal length of the camera", Equation (1).
- **Eq. 2** $x' = KRK^{-1}x$ (image-rotation under camera rotation) → §3 "Preliminaries", Equation (2); attributed to Hartley & Zisserman [17].
- **Eq. 3** (calibration matrix $K$ with $f$, $w/2$, $h/2$) → §3, Equation (3).
- **Eq. 4** $h = \omega v_z$, $\omega = (KK^T)^{-1}$ (focal length from absolute conic) → §3, Equation (4); attributed to Hartley & Zisserman [17].
- **Step A** (roll removal): $\theta_z = \tan^{-1}(-a/b)$ from line $ax+by+c=0$ → §3 "Step A: removing camera roll".
- **Step B** (tilt removal): $\theta_x = \pi/2 - \tan^{-1}(v_z/f)$ → §3 "Step B: removing camera tilt", and Figure 2 notation.
- **Eq. 5** $H_\text{rot} = KR_\text{tilt}K^{-1}R_\text{roll}$ → §3, Equation (5).
- **Eq. 6** $H = R_\text{align} T_\text{scene} KR_\text{tilt}K^{-1}R_\text{roll}$ → §3 "Compose all above transformation matrices together", Equation (6).
- **Eq. 7** $v_z = Kr_3$, $v_x = Kr_1$, $v_y = Kr_2$, $h = v_x \times v_y$ → §5.2 "Ground Truth Generation", Equation (7).
- **Stereographic sphere representation** (point at infinity mapped to finite disc of radius $r$) → §4.1, Figure 4. The four scalars lie in $[-r, r]$.
- **Regression-by-classification, $b = 500$ bins, $c = 11$ bins** → §6.2 "Implementation details".
- **Training setup**: TensorFlow 1.8, Adam, lr $10^{-2} \to 10^{-4}$ → §6.2.
- **CARLA-VP dataset sizes** (12 000 / 1 000 / 1 000): Table 1. Camera parameters: height up to 20 m, tilt $(0°,40°]$, roll $\mathcal{N}(0°, 5°)$ truncated to $[-30°, 30°]$, FoV $[15°, 115°]$ → §5.1.
- **Architecture ablation** (Inception-v4 best): Table 3. VGG-M / VGG-16 / ResNet-50 / ResNet-101 / Inception-V1 / Inception-V4 compared on CARLA-VP.
- **Parameterisation ablation** (4-scalar better than FoV + horizon): Table 2 → §6.3.
- **Inference speed**: ~40 ms/frame on GTX 1050 Ti → §6.4.1 "Real time performance on Videos".
- **Multi-frame averaging**: estimate stabilises around 400 frames → §6.4.1, Figure 7.
- **HLW AUC results** (74.52% ours, 71.16% Workman with post-processing): Table 4 → §6.4.2.
- **VIRAT results**: qualitative outperformance of DeepHorizon and Lezama → Figure 6, §6.4.1.
- **FoV sensitivity at large angles**: $f \propto 1/\tan(\gamma/2)$ becomes steep near $\pi/2$ → §6.3 "Field of view vs vertical vanishing point".
