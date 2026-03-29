Here is the compact expert checklist I would extract from the ChESS paper as **design-relevant statements and findings**—the stuff that really matters if you want a strong implementation or a serious review, not just a surface summary. All of this comes from the paper you attached. 

## 1) Why ChESS is designed the way it is

* **A chessboard detector should be feature-specific, not generic.** The paper’s core premise is that generic corner detectors leave performance on the table because they do not exploit the special structure of chessboard vertices. This matters under poor lighting, poor contrast, distortion, and automation constraints. 
* **The detector should output a continuous strength, not just a binary yes/no.** This lets later stages apply spatial and geometric reasoning instead of forcing an early hard decision. That is a major design choice, and it distinguishes ChESS from thresholded transition-count detectors like PTAM-style schemes.
* **Uniformity across orientation is a first-class design goal.** The detector is explicitly built so the same corner should receive similar response regardless of rotation. This is one of the most important non-obvious design criteria in the paper.

## 2) Sampling geometry: the subtle but critical part

* **Do not assume grid axes are aligned to the image.** That would simplify the detector, but it breaks down in real use because chessboards can rotate and bend in the image due to optics or projection on non-planar surfaces. 
* **Do not rely on a global orientation estimate.** A “detect global grid direction then align the detector” idea sounds attractive, but the paper argues it is unreliable under lens distortion and non-planar surfaces where the grid bends locally. The detector must therefore work at all local orientations. 
* **A 4-sample cross is insufficient in practice.** In theory, four samples could identify the black/white quadrant structure, but in real images this fails when samples fall on blurred square boundaries. 
* **An 8-sample pattern is the lower practical bound.** Adding the interleaved cross fixes the “sampling right on the edge” failure mode. This is a key insight: the minimum useful sampling pattern is driven by blur and pixel integration, not ideal geometry. 
* **Equal angular spacing matters.** If you want rotational isotropy, sample directions must be equally spaced around the center. 
* **Equal radius matters too.** If some samples lie closer to the center than others, they are more likely to hit blurred transition zones and weaken the response unevenly by orientation. This is one reason the samples are placed on a circle. 
* **There is a real radius tradeoff.** Too small a ring samples the blurry central area and weakens the signal. Too large a ring risks sampling neighboring squares and confusing the response. That tradeoff is central to the design. 
* **For VGA-like imagery, radius 5 px with 16 samples is the recommended sweet spot.** The paper says this gives good response, keeps computational cost low, and preserves a reasonable minimum square size. 
* **The 16-point ring is not arbitrary.** With radius 5 px, its sample angles closely approximate the ideal 22.5° spacing for a 16-segment circle, which supports near-isotropic behavior. 
* **A radius 10 ring may help on strongly blurred images.** So the ring size is not universal; it depends on optics and blur level. 
* **Inner rings are mostly not worth it.** This is easy to miss. The paper explicitly argues that smaller concentric rings mainly sample the blurry center and add cost with little gain, so ChESS intentionally departs from multi-layer designs like Sun et al. 

## 3) Real image formation assumptions that drive the detector

* **Blur is not a nuisance detail; it shapes the detector.** The paper repeatedly reasons from the fact that pixels near square edges tend to have intermediate intensity because of optical blur and pixel quantization. 
* **Pixel quantization matters alongside optical blur.** Even with good focus, a sensor pixel integrates over area, and checker edges are rarely aligned with sensor boundaries. That makes edge-adjacent samples ambiguous. 
* **The detector is designed for realistic, not idealized, corners.** Much of ChESS’s structure comes from handling intermediate edge intensities and not assuming perfectly binary patterns.

## 4) The response design: why it is three-term, not one-term

* **The basic corner evidence is the “sum response.”** Opposite samples should match, and the pair 90° away should differ strongly from them. This is the primary corner signal. 
* **Using only the sum response causes edge false positives.** This is a big practical point: a strong one-sided edge can partially mimic a corner. 
* **The “diff response” is specifically there to suppress edges.** Opposite points differ strongly on edges, so subtracting this term removes a major false-positive family and improves signal-to-noise ratio. 
* **There is still another dangerous false positive: stripes.** A corner and a stripe can produce the same ring samples. This is one of the easiest things for a non-expert to miss. 
* **Stripe rejection requires looking at the center, not just the ring.** The stripe/corner ambiguity is resolved by comparing the center-region mean with the ring mean. This is why the detector includes the mean-response penalty.
* **The final response is deliberately composite:**
  **R = sum response − diff response − 16 × mean response.**
  That factor 16 is not cosmetic; it is chosen so the undesirable stripe case is driven to zero response.
* **The detector is not intensity-normalized by local division on purpose.** They explicitly reject per-pixel division by the neighborhood mean because it amplifies noise too much in dark regions. This is a design decision worth highlighting in a review. 

## 5) DFT interpretation: more than a cute analogy

* **The paper’s DFT interpretation is useful for understanding what ChESS is really measuring.** A chessboard corner on the 16-sample ring corresponds to a strong second Fourier coefficient; an edge corresponds to a strong first coefficient.
* **So ChESS is effectively a hand-crafted spectral matcher.** The sum response behaves like a two-cycle cosine match for corners; the diff response behaves like a one-cycle cosine match for edges.
* **This gives a strong conceptual explanation for isotropy.** Rotation changes phase, not the existence of the periodic structure.

## 6) What ChESS is and is not invariant to

* **It is designed for rotationally uniform response, not true projective invariance.** The paper is explicit: it does not claim perspective invariance. Highly distorted intersections still get a response, but a weaker one than near face-on intersections.
* **This means strong perspective skew can reduce score even when the point is semantically correct.** For your review, that is an important limitation to state clearly. 
* **Despite that, the detector is intended to cope with non-planar surfaces and distorted projected grids better than methods that depend on global lines or clean binarization.**

## 7) Post-processing is part of the practical design, not an afterthought

* **Positive-response thresholding is the first cleanup step.** Responses ≤ 0 can be discarded because the design aims to make true chessboard intersections positive.
* **Non-maximum suppression is assumed.** ChESS is a response image generator; practical feature extraction requires NMS.
* **Connectivity is useful.** True corner responses tend to occupy a small cluster, so isolated positive pixels are suspicious.
* **Neighborhood comparison compensates partly for the lack of contrast normalization.** This is subtle and important: they use relative local saliency at a larger spatial scale instead of explicit photometric normalization.
* **Subpixel localization by center of mass is justified because the response is approximately symmetric around the feature center.** They specifically mention a 5×5 patch around the maximum as a fast refinement.
* **More sophisticated refinement can still be added later.** ChESS is presented as the detection stage, not as the final word on subpixel estimation. 

## 8) Orientation labeling is a real added value

* **ChESS can assign one of eight orientation bins to each detected corner.** This comes from the phase of the sum response around the ring.
* **The bin spacing is 22.5°.** Because chessboard vertices have order-2 rotational symmetry, eight bins are enough and meaningful. 
* **This is useful for graph decoding and neighborhood reasoning.** The paper notes, for example, that connected chessboard vertices should have approximately anti-phase labels. 
* **Orientation labeling should be done after candidate selection for efficiency.** Another practical design point. 

## 9) Performance findings that should influence implementation choices

* **ChESS beats Harris in isotropy.** Harris accuracy varies with rotation; ChESS is much more even over angle. That is one of the strongest empirical findings in the paper.
* **ChESS beats Harris in noise robustness in the presented experiments.** This holds in simulation and in real-data reconstruction tests.
* **Pre-blurring significantly helps under noise.** A 5×5 Gaussian blur before ChESS roughly doubles tolerated noise variance before serious degradation in simulation, and improves real-data reconstruction in noisy conditions.
* **Pre-blur is less decisive on clean data.** It can still help, but the case is strongest for noisy, poorly lit imagery. 
* **The runtime cost of pre-blur is modest.** About +15% in scalar C and about +10% in SIMD according to the paper.
* **ChESS is computationally very competitive.** Reported timings show it faster than Harris and PTAM in their implementations, and SIMD pushes it past 700 VGA fps.
* **The algorithm is especially amenable to SIMD/vectorization.** This is not a minor implementation note; it is one of the reasons the design is attractive in practice.

## 10) Comparisons that reveal what not to do

* **Thresholded transition-count methods trade away low-contrast sensitivity.** PTAM-style detectors need sufficiently large black-white transitions to fire, while ChESS can still return a weaker but useful response for low-contrast corners. 
* **Hard local thresholding and binarization are fragile.** The paper positions ChESS against methods that depend on adaptive thresholding and morphology, which can fail under poor intensity conditions and cost more computationally.
* **Methods relying on global lines or Hough constraints are ill-suited for heavily distorted or non-planar patterns.**
* **Center-of-gravity of squares is not a valid substitute for corner localization under perspective.** This comes up in the related-work criticism and is easy to forget when reviewing older methods. 

## 11) Limits and caveats you should definitely mention in a review

* **ChESS is not a full chessboard decoder.** It is a vertex detector with optional orientation labels; full board extraction still needs geometric grouping.
* **Its ring size is application-dependent.** Radius 5 is empirical for common VGA imagery, not a universal optimum. 
* **Its response drops for highly distorted intersections.** That does not mean failure, but score calibration matters if distortion is extreme. 
* **It relies on blur enough that the center-vs-ring mean cue makes sense.** The stripe rejection argument assumes the center of a true corner tends toward intermediate intensity due to blur. In very sharp synthetic imagery, behavior may differ unless you model image formation realistically. 
* **It is built around grayscale intensity structure.** The paper does not discuss color handling or learned descriptors; it is a deliberately simple, classical detector. 

## 12) The short “don’t miss these” list

If I had to reduce this to the most easily missed but important points:

1. **The detector is engineered around blur and pixel integration, not ideal binary corners.** 
2. **The ring geometry is the heart of the method: equal angle, equal radius, carefully chosen radius.** 
3. **Sum response alone is not enough; diff response and center-mean penalty are essential.**
4. **The stripe-vs-corner ambiguity is a real structural issue, not noise.** 
5. **ChESS prioritizes isotropy over exact perspective invariance.**
6. **Pre-blur is often worth it in noisy data and does not cost much.**
7. **Orientation labeling is useful and underappreciated.** 
8. **The DFT view explains the design elegantly and helps generalize it.**
