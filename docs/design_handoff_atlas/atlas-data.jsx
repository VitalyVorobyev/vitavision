/* eslint-disable */
// Synthetic dataset modelled on the real vitavision atlas content.
// Entries are real (slug + title + summary trimmed from the codebase),
// year + relations are author-supplied so the design can show lineage UX.

const ATLAS_DOMAINS = [
    { id: "features",         label: "Features" },
    { id: "geometry",         label: "Geometry" },
    { id: "calibration",      label: "Calibration" },
    { id: "targets",          label: "Targets" },
    { id: "stitching",        label: "Stitching" },
    { id: "detection",        label: "Detection" },
    { id: "segmentation",     label: "Segmentation" },
];

// Problem axis — orthogonal to Domain and to Type. Reflects "what task does
// this method help solve?" — the way practitioners actually open the Atlas.
// One entry can list multiple problems; the sidebar treats it as a union.
const ATLAS_PROBLEMS = [
    { id: "feature-matching",   label: "Feature matching"    },
    { id: "optical-flow",       label: "Optical flow"        },
    { id: "robust-estimation",  label: "Robust estimation"   },
    { id: "two-view-geometry",  label: "Two-view geometry"   },
    { id: "camera-calibration", label: "Camera calibration"  },
    { id: "hand-eye",           label: "Hand–eye calibration"},
    { id: "target-detection",   label: "Target detection"    },
    { id: "image-stitching",    label: "Image stitching"     },
    { id: "object-detection",   label: "Object detection"    },
    { id: "segmentation",       label: "Segmentation"        },
];

const KIND_LABEL = { algorithm: "Algorithm", model: "Model", concept: "Concept" };
const KIND_LETTER = { algorithm: "A", model: "M", concept: "C" };

// Lineage chains — what makes Atlas an atlas, not a catalog.
// First slug is the historical root; arrows show extended_by / generalized_by direction.
const ATLAS_LINEAGES = [
    {
        id: "ransac",
        title: "Robust estimation",
        domain: "geometry",
        chain: ["ransac", "mlesac", "prosac", "lo-ransac", "usac", "magsac"],
    },
    {
        id: "optical-flow",
        title: "Optical flow",
        domain: "features",
        chain: ["horn-schunck", "lucas-kanade", "black-anandan"],
    },
    {
        id: "corners",
        title: "Corner detectors",
        domain: "features",
        chain: ["harris", "shi-tomasi", "fast", "chess-corners"],
    },
    {
        id: "descriptors",
        title: "Feature descriptors",
        domain: "features",
        chain: ["sift", "surf", "brief", "orb"],
    },
    {
        id: "learned-matching",
        title: "Learned matching",
        domain: "features",
        chain: ["superpoint", "superglue", "lightglue", "loftr", "xfeat"],
    },
    {
        id: "calibration-classical",
        title: "Camera calibration",
        domain: "calibration",
        chain: ["tsai", "sturm", "zhang", "scaramuzza"],
    },
    {
        id: "handeye",
        title: "Hand–eye calibration",
        domain: "calibration",
        chain: ["tsai-lenz", "daniilidis"],
    },
    {
        id: "two-view",
        title: "Two-view geometry",
        domain: "geometry",
        chain: ["longuet-higgins", "hartley-norm-8pt", "epnp"],
    },
    {
        id: "stitching",
        title: "Multi-homography stitching",
        domain: "stitching",
        chain: ["gao", "lin-sva", "apap"],
    },
    {
        id: "classification-cnn",
        title: "Classification CNNs",
        domain: "detection",
        chain: ["alexnet", "vgg", "googlenet", "resnet"],
    },
    {
        id: "detection-cnn",
        title: "Detection (deep)",
        domain: "detection",
        chain: ["rcnn", "faster-rcnn", "yolo-v1", "mask-rcnn"],
    },
    {
        id: "segmentation-cnn",
        title: "Semantic segmentation",
        domain: "segmentation",
        chain: ["fcn", "unet", "deeplab"],
    },
    {
        id: "classical-segmentation",
        title: "Graph segmentation",
        domain: "segmentation",
        chain: ["graph-cut", "felzenszwalb-seg", "grabcut"],
    },
    {
        id: "checkerboard-learned",
        title: "Learned checkerboard detection",
        domain: "targets",
        chain: ["chess-corners", "ccdn", "ccs", "mate"],
    },
];

// Compact entry model. `to[]` are extended_by targets, `vs[]` are compared_with.
// Difficulty: beg / int / adv.
const ATLAS_ENTRIES = [
    // ── Features ────────────────────────────────────────────────────────
    { slug: "harris",                 t: "algorithm", d: "features",     y: 1988, diff: "int", title: "Harris Corner Detector",                       sum: "Score pixels by the structure-tensor determinant minus a k-trace penalty; first principled rotation-invariant corner response.",   to: ["shi-tomasi","fast"],         vs: ["shi-tomasi"] },
    { slug: "shi-tomasi",             t: "algorithm", d: "features",     y: 1994, diff: "int", title: "Shi–Tomasi Corner Detector",                  sum: "Score each pixel by the smaller eigenvalue of the gradient structure tensor M; the corner-quality criterion used in KLT tracking.", to: [],                            vs: ["harris"] },
    { slug: "fast",                   t: "algorithm", d: "features",     y: 2006, diff: "beg", title: "FAST Corner Detector",                         sum: "Bresenham-circle pixel-intensity test that classifies a candidate as a corner in tens of comparisons; trained decision tree for speed.", to: [],                            vs: ["harris"] },
    { slug: "sift",                   t: "algorithm", d: "features",     y: 2004, diff: "adv", title: "SIFT: Scale-Invariant Feature Transform",     sum: "Keypoints as scale-space extrema of a Difference-of-Gaussian pyramid, refined by 3D quadratic, with a 128-D gradient-histogram descriptor.", to: ["surf"],                      vs: ["surf","orb"] },
    { slug: "surf",                   t: "algorithm", d: "features",     y: 2006, diff: "adv", title: "SURF: Speeded Up Robust Features",            sum: "Hessian-determinant detector on an integral image with box-filter approximations; 64-D Haar-wavelet descriptor.",                  to: [],                            vs: ["sift"] },
    { slug: "brief",                  t: "algorithm", d: "features",     y: 2010, diff: "int", title: "BRIEF: Binary Robust Independent Features",    sum: "128/256/512-bit binary descriptor from a fixed pattern of pixel-pair intensity tests on a smoothed patch.",                       to: ["orb"],                       vs: ["sift"] },
    { slug: "orb",                    t: "algorithm", d: "features",     y: 2011, diff: "int", title: "ORB: Oriented FAST and Rotated BRIEF",        sum: "FAST-9 keypoints on a √2 pyramid, ranked by Harris score and described with a rotation-steered, learned BRIEF.",                  to: [],                            vs: ["sift","surf"] },
    { slug: "hog",                    t: "algorithm", d: "features",     y: 2005, diff: "int", title: "HOG: Histograms of Oriented Gradients",        sum: "Window descriptor from 8×8 cells of 9 unsigned-orientation gradient histograms, contrast-normalised over overlapping blocks.",     to: ["dpm"],                       vs: [] },
    { slug: "lucas-kanade",           t: "algorithm", d: "features",     y: 1981, diff: "int", title: "Lucas–Kanade Image Registration",             sum: "Iterative Newton–Raphson method that estimates the parametric warp between two images by linearising the residual.",              to: ["black-anandan"],             vs: ["horn-schunck"] },
    { slug: "horn-schunck",           t: "algorithm", d: "features",     y: 1981, diff: "int", title: "Horn–Schunck Optical Flow",                   sum: "Dense optical flow recovered by minimising a variational energy that combines the brightness-constancy constraint with a global smoothness term.", to: ["black-anandan"], vs: ["lucas-kanade"] },
    { slug: "black-anandan",          t: "algorithm", d: "features",     y: 1996, diff: "adv", title: "Black–Anandan Robust Optical Flow",           sum: "Optical flow that replaces the quadratic data and smoothness penalties of variational flow with redescending M-estimators.",     to: [],                            vs: [] },

    // ── Learned matching ────────────────────────────────────────────────
    { slug: "superpoint",             t: "model",     d: "features",     y: 2018, diff: "adv", title: "SuperPoint",                                  sum: "Self-supervised joint keypoint detector and descriptor: one encoder, two heads.",                                                 to: ["superglue"],                 vs: ["sift","orb"] },
    { slug: "superglue",              t: "model",     d: "features",     y: 2019, diff: "adv", title: "SuperGlue",                                   sum: "Graph-neural-network feature matcher with Sinkhorn assignment over learned attention.",                                            to: ["lightglue","loftr"],         vs: [] },
    { slug: "lightglue",              t: "model",     d: "features",     y: 2023, diff: "adv", title: "LightGlue",                                   sum: "Adaptive transformer matcher: depth and width depend on scene difficulty.",                                                        to: [],                            vs: ["superglue"] },
    { slug: "loftr",                  t: "model",     d: "features",     y: 2021, diff: "adv", title: "LoFTR",                                       sum: "Detector-free dense matcher that produces matches directly from transformer features.",                                            to: [],                            vs: ["superglue"] },
    { slug: "xfeat",                  t: "model",     d: "features",     y: 2024, diff: "int", title: "XFeat",                                       sum: "Featherweight learned local features for CPU inference — lift-and-shift replacement for FAST+BRIEF.",                                to: [],                            vs: ["orb"] },

    // ── Geometry ────────────────────────────────────────────────────────
    { slug: "ransac",                 t: "algorithm", d: "geometry",     y: 1981, diff: "int", title: "Fischler–Bolles RANSAC",                      sum: "Random Sample Consensus: fit a parametric model by sampling minimal subsets and keeping the hypothesis with the largest inlier set.", to: ["mlesac","prosac","lo-ransac","usac","magsac"], vs: [] },
    { slug: "mlesac",                 t: "algorithm", d: "geometry",     y: 2000, diff: "adv", title: "MLESAC",                                      sum: "Maximum-likelihood RANSAC: score hypotheses by a mixture likelihood over inliers/outliers rather than inlier count.",               to: [],                            vs: ["ransac"] },
    { slug: "prosac",                 t: "algorithm", d: "geometry",     y: 2005, diff: "adv", title: "PROSAC",                                      sum: "RANSAC sampling that draws hypotheses from progressively larger, quality-sorted subsets — orders of magnitude faster when matches are scored.", to: [], vs: ["ransac"] },
    { slug: "lo-ransac",              t: "algorithm", d: "geometry",     y: 2003, diff: "adv", title: "LO-RANSAC",                                   sum: "Locally optimised RANSAC: every promising hypothesis triggers an inner non-minimal least-squares refinement.",                      to: [],                            vs: [] },
    { slug: "usac",                   t: "algorithm", d: "geometry",     y: 2013, diff: "adv", title: "USAC: Universal RANSAC Framework",            sum: "Engineering decomposition of practical RANSAC into pluggable stages: PROSAC, SPRT, LO-RANSAC, DEGENSAC.",                          to: [],                            vs: ["magsac"] },
    { slug: "magsac",                 t: "algorithm", d: "geometry",     y: 2019, diff: "adv", title: "MAGSAC: Marginalising Sample Consensus",      sum: "RANSAC without an inlier-outlier threshold: marginalise the noise scale and accumulate sigma-consensus weights.",                  to: [],                            vs: ["usac","ransac"] },
    { slug: "longuet-higgins",        t: "algorithm", d: "geometry",     y: 1981, diff: "adv", title: "Longuet-Higgins Linear Eight-Point",          sum: "1981 closed-form linear method for the essential matrix from eight calibrated point correspondences.",                              to: ["hartley-norm-8pt"],          vs: [] },
    { slug: "hartley-norm-8pt",       t: "algorithm", d: "geometry",     y: 1997, diff: "adv", title: "Normalised Eight-Point Algorithm",            sum: "Hartley's two-line fix: isotropic data normalisation makes the linear eight-point solver numerically competitive with non-linear methods.", to: [], vs: [] },
    { slug: "epnp",                   t: "algorithm", d: "geometry",     y: 2009, diff: "adv", title: "EPnP: O(n) Perspective-n-Point",              sum: "Non-iterative O(n) solver for calibrated PnP: express n reference points as weighted sums of four virtual control points.",        to: [],                            vs: [] },
    { slug: "homography",             t: "concept",   d: "geometry",     y: null, diff: "int", title: "Homography",                                  sum: "The 3×3 projective transform relating two views of a plane — or any two views of a scene seen by a rotating camera.",              to: [],                            vs: [] },
    { slug: "epipolar-geometry",      t: "concept",   d: "geometry",     y: null, diff: "int", title: "Epipolar Geometry",                           sum: "The constraint that a 3-D point and the two camera centres lie on a plane that cuts each image in a line.",                        to: [],                            vs: [] },

    // ── Calibration ─────────────────────────────────────────────────────
    { slug: "tsai",                   t: "algorithm", d: "calibration",  y: 1987, diff: "adv", title: "Tsai's Versatile Camera Calibration",         sum: "Two-stage 1987 calibration: radial alignment constraint recovers extrinsics linearly, then a short nonlinear solve refines focal length and one distortion coefficient.", to: ["zhang"], vs: [] },
    { slug: "sturm",                  t: "algorithm", d: "calibration",  y: 1999, diff: "adv", title: "Sturm–Maybank Plane-Based Calibration",      sum: "Recover intrinsics from views of planar targets via two IAC-on-homography constraints; concurrent CVPR 1999 derivation of Zhang's method.", to: [], vs: ["zhang"] },
    { slug: "zhang",                  t: "algorithm", d: "calibration",  y: 2000, diff: "int", title: "Zhang's Planar Camera Calibration",           sum: "Recover camera intrinsics, radial distortion, and per-view extrinsics from at least three images of a planar pattern at different orientations.", to: [],                vs: ["sturm","tsai"] },
    { slug: "scaramuzza",             t: "algorithm", d: "calibration",  y: 2006, diff: "adv", title: "Scaramuzza Omnidirectional Calibration",     sum: "Calibrate any central catadioptric or fisheye camera from a few planar checkerboard views by fitting a Taylor-polynomial imaging function.", to: [],                vs: [] },
    { slug: "tsai-lenz",              t: "algorithm", d: "calibration",  y: 1989, diff: "adv", title: "Tsai–Lenz Hand-Eye Calibration",             sum: "Recover the constant rigid transform from gripper to camera by solving AX = XB in two stages — modified Rodrigues, then translation.", to: ["daniilidis"],            vs: ["daniilidis"] },
    { slug: "daniilidis",             t: "algorithm", d: "calibration",  y: 1999, diff: "adv", title: "Daniilidis Dual-Quaternion Hand-Eye",         sum: "Simultaneous rotation–translation solve for AX = XB using dual-quaternion algebra; avoids the rotation/translation decoupling of Tsai–Lenz.", to: [],                vs: ["tsai-lenz"] },
    { slug: "ccs",                    t: "model",     d: "calibration",  y: 2021, diff: "adv", title: "CCS",                                         sum: "Three-stage learning-based camera calibration: CNN distortion correction, UNet corner heatmaps, image-level RANSAC, then Zhang-style intrinsics.", to: [], vs: [] },
    { slug: "camera-distortion",      t: "concept",   d: "calibration",  y: null, diff: "int", title: "Camera Distortion Models",                    sum: "Brown–Conrady, division, and field-of-view models — how a real lens deviates from the pinhole and how to invert that.",             to: [],                            vs: [] },

    // ── Targets ─────────────────────────────────────────────────────────
    { slug: "chess-corners",          t: "algorithm", d: "targets",      y: 2008, diff: "int", title: "ChESS Corners",                               sum: "Eight-sample circular sum-of-differences chessboard-corner response designed for X-junction detection under blur.",                to: [],                            vs: [] },
    { slug: "ocpad",                  t: "algorithm", d: "targets",      y: 2018, diff: "adv", title: "OCPAD: Occluded Checkerboard Detection",     sum: "Detect partially occluded checkerboards by graph-based corner clustering with topological hypothesis verification.",              to: [],                            vs: [] },
    { slug: "ccdn",                   t: "model",     d: "targets",      y: 2018, diff: "adv", title: "CCDN",                                        sum: "Fully convolutional network that regresses a per-pixel checkerboard-corner response map.",                                          to: ["ccs","mate"],                vs: ["chess-corners"] },
    { slug: "mate",                   t: "model",     d: "targets",      y: 2023, diff: "adv", title: "MATE",                                        sum: "Transformer-based checkerboard corner detector; learned alternative to classical X-junction operators.",                            to: [],                            vs: ["chess-corners"] },

    // ── Stitching ───────────────────────────────────────────────────────
    { slug: "gao",                    t: "algorithm", d: "stitching",    y: 2011, diff: "adv", title: "Gao Dual-Homography Stitching",              sum: "Two-plane stitching: model the scene as a foreground and background plane and blend their homographies smoothly.",                 to: ["apap"],                      vs: ["lin-sva"] },
    { slug: "lin-sva",                t: "algorithm", d: "stitching",    y: 2011, diff: "adv", title: "Lin Smoothly Varying Affine Stitching",      sum: "Local affine deviation field smoothed over the image plane — a precursor to per-cell projective parameterisations.",                to: ["apap"],                      vs: ["gao"] },
    { slug: "apap",                   t: "algorithm", d: "stitching",    y: 2013, diff: "adv", title: "As-Projective-As-Possible Image Stitching",  sum: "Per-cell moving DLT homographies stitched with smoothness regularisation; the continuous-grid generalisation of dual-homography.", to: [],                            vs: [] },

    // ── Detection ───────────────────────────────────────────────────────
    { slug: "viola-jones",            t: "algorithm", d: "detection",    y: 2001, diff: "int", title: "Viola–Jones Object Detector",                sum: "Real-time frontal-face detection: AdaBoost-selected integral-image rectangle features in a 38-stage attentional cascade.",         to: ["dpm"],                       vs: [] },
    { slug: "dpm",                    t: "algorithm", d: "detection",    y: 2010, diff: "adv", title: "Deformable Part Models",                     sum: "Score star-structured HOG part filters at a root + parts pyramid; sliding-window detection with latent SVM.",                       to: ["rcnn"],                      vs: [] },
    { slug: "alexnet",                t: "model",     d: "detection",    y: 2012, diff: "int", title: "AlexNet",                                   sum: "Eight-layer CNN that won ILSVRC 2012 by a large margin; ReLU + dropout + two-GPU training, the deep-learning ignition.",          to: ["vgg","googlenet"],           vs: [] },
    { slug: "vgg",                    t: "model",     d: "detection",    y: 2014, diff: "int", title: "VGG",                                       sum: "Plain stack of 3×3 conv layers, very deep for its day; clean baseline for transfer learning.",                                       to: ["resnet"],                    vs: ["alexnet"] },
    { slug: "googlenet",              t: "model",     d: "detection",    y: 2014, diff: "adv", title: "GoogLeNet",                                  sum: "Inception module: parallel 1×1, 3×3, 5×5 convolutions concatenated channel-wise. Parameter-efficient peer of VGG.",                 to: ["resnet"],                    vs: ["vgg"] },
    { slug: "resnet",                 t: "model",     d: "detection",    y: 2015, diff: "int", title: "ResNet",                                    sum: "Residual connections that let you train arbitrarily deep networks. Still the backbone of choice in 2024.",                          to: [],                            vs: [] },
    { slug: "rcnn",                   t: "model",     d: "detection",    y: 2014, diff: "adv", title: "R-CNN",                                     sum: "Region proposals + CNN features + SVM classifier — the bridge from DPM to learned detection.",                                       to: ["faster-rcnn"],               vs: ["dpm"] },
    { slug: "faster-rcnn",            t: "model",     d: "detection",    y: 2015, diff: "adv", title: "Faster R-CNN",                              sum: "Region Proposal Network shares features with the detector head; the canonical two-stage detector.",                                  to: ["mask-rcnn"],                 vs: ["yolo-v1"] },
    { slug: "mask-rcnn",              t: "model",     d: "detection",    y: 2017, diff: "adv", title: "Mask R-CNN",                                sum: "Faster R-CNN with an instance-mask head; clean factorisation of detection and segmentation.",                                        to: [],                            vs: [] },
    { slug: "yolo-v1",                t: "model",     d: "detection",    y: 2015, diff: "int", title: "YOLOv1",                                    sum: "Single-shot detection: regress class probabilities and bounding boxes from one forward pass over a coarse grid.",                    to: [],                            vs: ["faster-rcnn"] },

    // ── Segmentation ────────────────────────────────────────────────────
    { slug: "graph-cut",              t: "algorithm", d: "segmentation", y: 2001, diff: "adv", title: "Graph-Cut Interactive Segmentation",         sum: "Global minimum of a binary region+boundary MRF energy as an s-t min-cut on a pixel graph; user seeds bias the data term.",          to: ["grabcut"],                   vs: [] },
    { slug: "grabcut",                t: "algorithm", d: "segmentation", y: 2004, diff: "int", title: "GrabCut Iterative Segmentation",             sum: "Foreground extraction from a single bounding box by alternating Gaussian-mixture colour models and graph-cut binary labelling.",   to: [],                            vs: ["graph-cut"] },
    { slug: "felzenszwalb-seg",       t: "algorithm", d: "segmentation", y: 2004, diff: "int", title: "Felzenszwalb–Huttenlocher Segmentation",     sum: "Partition an image into perceptually coherent regions by a Kruskal-style greedy merge over a pixel graph with an adaptive predicate.", to: [], vs: [] },
    { slug: "fcn",                    t: "model",     d: "segmentation", y: 2014, diff: "int", title: "FCN: Fully Convolutional Networks",          sum: "Drop the dense classifier head, upsample feature maps with deconvolutions; the canonical convolutional approach to dense prediction.", to: ["unet","deeplab"],            vs: [] },
    { slug: "unet",                   t: "model",     d: "segmentation", y: 2015, diff: "int", title: "U-Net",                                     sum: "Encoder–decoder with skip connections at every resolution; the default segmentation architecture for the next decade.",              to: [],                            vs: ["fcn"] },
    { slug: "deeplab",                t: "model",     d: "segmentation", y: 2014, diff: "adv", title: "DeepLab",                                   sum: "Atrous convolutions + atrous spatial pyramid pooling for dense prediction without losing spatial resolution.",                         to: [],                            vs: ["fcn"] },
];

// ── Extra meta: short summary (tagline) + primary source ────────────────────
// Schema currently has `summary` (long, technical) and `sources.primary` (URL).
// The graph view wants a tighter on-card pair: a 1-line tagline + a compact
// citation. We populate a representative slice here; the rest fall back to
// truncated `summary` and "—".
const EXTRA_META = {
    "sift":         { tagline: "Local features that survive scale, rotation, and viewpoint change.",        src: "Lowe · IJCV 2004" },
    "surf":         { tagline: "Faster SIFT — integral image + box-filter Hessian.",                        src: "Bay et al. · ECCV 2006" },
    "harris":       { tagline: "First principled rotation-invariant corner detector.",                       src: "Harris & Stephens · AVC 1988" },
    "shi-tomasi":   { tagline: "Corner score for KLT tracking — uses the smaller eigenvalue.",               src: "Shi & Tomasi · CVPR 1994" },
    "fast":         { tagline: "Bresenham-circle pixel test — corners in tens of comparisons.",              src: "Rosten & Drummond · ECCV 2006" },
    "brief":        { tagline: "Binary descriptor from a fixed pattern of pixel-pair tests.",                src: "Calonder et al. · ECCV 2010" },
    "orb":          { tagline: "Oriented FAST + steered BRIEF — fast, free, rotation-aware.",                src: "Rublee et al. · ICCV 2011" },
    "hog":          { tagline: "Gradient histograms over cells — the descriptor for sliding-window detection.", src: "Dalal & Triggs · CVPR 2005" },

    "lucas-kanade": { tagline: "Newton–Raphson refinement of a parametric image warp.",                      src: "Lucas & Kanade · IJCAI 1981" },
    "horn-schunck": { tagline: "Dense optical flow as variational energy minimisation.",                     src: "Horn & Schunck · AI Journal 1981" },
    "black-anandan":{ tagline: "Robust M-estimator flow that tolerates motion discontinuities.",             src: "Black & Anandan · CVIU 1996" },

    "ransac":       { tagline: "Random Sample Consensus — fit a model under heavy outliers.",                src: "Fischler & Bolles · CACM 1981" },
    "mlesac":       { tagline: "RANSAC scored by mixture likelihood, not raw inlier count.",                 src: "Torr & Zisserman · CVIU 2000" },
    "prosac":       { tagline: "Quality-sorted RANSAC sampling — orders of magnitude faster.",               src: "Chum & Matas · CVPR 2005" },
    "lo-ransac":    { tagline: "Locally optimised RANSAC — refine every promising hypothesis.",              src: "Chum, Matas & Kittler · DAGM 2003" },
    "usac":         { tagline: "RANSAC, decomposed: PROSAC + SPRT + LO + DEGENSAC.",                         src: "Raguram et al. · PAMI 2013" },
    "magsac":       { tagline: "RANSAC without an inlier threshold — marginalise the noise scale.",          src: "Barath et al. · CVPR 2019" },

    "longuet-higgins":  { tagline: "Closed-form essential-matrix from eight calibrated points.",             src: "Longuet-Higgins · Nature 1981" },
    "hartley-norm-8pt": { tagline: "Two-line normalisation that fixes the eight-point's conditioning.",      src: "Hartley · PAMI 1997" },
    "epnp":         { tagline: "O(n) calibrated PnP via four virtual control points.",                       src: "Lepetit, Moreno-Noguer & Fua · IJCV 2009" },

    "tsai":         { tagline: "Two-stage calibration with a precision 3D target.",                          src: "Tsai · J. Robotics 1987" },
    "zhang":        { tagline: "Calibration from ≥3 views of a planar pattern. The default.",                src: "Zhang · PAMI 2000" },
    "scaramuzza":   { tagline: "Fisheye/catadioptric calibration via Taylor-polynomial imaging.",            src: "Scaramuzza, Martinelli & Siegwart · IROS 2006" },
    "tsai-lenz":    { tagline: "Hand–eye AX=XB solved in two stages: rotation then translation.",            src: "Tsai & Lenz · T-RA 1989" },
    "daniilidis":   { tagline: "Hand–eye solved jointly in dual quaternions.",                               src: "Daniilidis · IJRR 1999" },

    "viola-jones":  { tagline: "Real-time face detection via cascaded integral-image features.",             src: "Viola & Jones · CVPR 2001" },
    "alexnet":      { tagline: "The CNN that won ImageNet 2012 — deep learning's ignition.",                 src: "Krizhevsky, Sutskever & Hinton · NeurIPS 2012" },
    "vgg":          { tagline: "Plain stack of 3×3 convs — the transfer-learning baseline.",                 src: "Simonyan & Zisserman · ICLR 2015" },
    "googlenet":    { tagline: "Inception modules: parallel multi-scale convolutions.",                      src: "Szegedy et al. · CVPR 2015" },
    "resnet":       { tagline: "Residual connections — train arbitrarily deep networks.",                    src: "He et al. · CVPR 2016" },
    "rcnn":         { tagline: "Region proposals + CNN features — bridge from DPM to learned detection.",    src: "Girshick et al. · CVPR 2014" },
    "faster-rcnn":  { tagline: "Two-stage detection with a learned Region Proposal Network.",                src: "Ren et al. · NeurIPS 2015" },
    "mask-rcnn":    { tagline: "Faster R-CNN + instance-mask head — detection and segmentation factorised.", src: "He et al. · ICCV 2017" },
    "yolo-v1":      { tagline: "Single-shot detection — boxes and classes in one forward pass.",             src: "Redmon et al. · CVPR 2016" },

    "fcn":          { tagline: "Drop the dense head, upsample features — segmentation as conv.",             src: "Long, Shelhamer & Darrell · CVPR 2015" },
    "unet":         { tagline: "Encoder–decoder with skip connections — the segmentation default.",          src: "Ronneberger, Fischer & Brox · MICCAI 2015" },
    "deeplab":      { tagline: "Atrous convs + ASPP — dense prediction without resolution loss.",            src: "Chen et al. · ICLR 2015" },
    "graph-cut":    { tagline: "Min-cut on a pixel graph — globally optimal binary segmentation.",           src: "Boykov & Jolly · ICCV 2001" },
    "grabcut":      { tagline: "Iterative graph-cut from a single bounding-box prompt.",                     src: "Rother, Kolmogorov & Blake · SIGGRAPH 2004" },
    "felzenszwalb-seg":{ tagline: "Greedy graph segmentation with an adaptive merge predicate.",             src: "Felzenszwalb & Huttenlocher · IJCV 2004" },

    "superpoint":   { tagline: "Self-supervised joint keypoint detector + descriptor.",                      src: "DeTone, Malisiewicz & Rabinovich · CVPR-W 2018" },
    "superglue":    { tagline: "GNN feature matcher with learned attention and Sinkhorn assignment.",        src: "Sarlin et al. · CVPR 2020" },
    "lightglue":    { tagline: "Adaptive transformer matcher — depth scales with scene difficulty.",         src: "Lindenberger, Sarlin & Pollefeys · ICCV 2023" },
    "loftr":        { tagline: "Detector-free dense matching with transformer features.",                    src: "Sun et al. · CVPR 2021" },
    "xfeat":        { tagline: "Featherweight learned local features for CPU inference.",                    src: "Potje et al. · CVPR 2024" },

    "ccs":          { tagline: "Three-stage learning-based camera calibration: distortion → corners → fit.", src: "Zhang et al. · CVPR-W 2021" },
    "chess-corners":{ tagline: "Circular sum-of-differences chessboard corner response.",                    src: "Bennett & Lasenby · IPCV 2014" },
    "ccdn":         { tagline: "Fully convolutional checkerboard corner response map.",                      src: "Chen et al. · ICRA 2018" },
    "mate":         { tagline: "Transformer-based learned alternative to X-junction operators.",             src: "Schöps et al. · 3DV 2023" },

    "gao":          { tagline: "Two-plane stitching — blend foreground and background homographies.",        src: "Gao, Kim & Brown · CVPR 2011" },
    "lin-sva":      { tagline: "Affine deviation field smoothed across the image plane.",                    src: "Lin et al. · CVPR 2011" },
    "apap":         { tagline: "Per-cell moving DLT homographies — projective stitching for parallax scenes.", src: "Zaragoza et al. · CVPR 2013" },

    "homography":   { tagline: "The 3×3 projective transform between two views of a plane.",                 src: "Hartley & Zisserman · MVG (2003)" },
    "epipolar-geometry":{ tagline: "Two-view geometry: plane through both centres meets each image in a line.", src: "Hartley & Zisserman · MVG (2003)" },
    "camera-distortion":{ tagline: "How real lenses deviate from the pinhole, and how to invert that.",      src: "Brown · Photogrammetric Eng. 1971" },
    "dpm":          { tagline: "Star-structured HOG part filters — late-classical detection.",               src: "Felzenszwalb et al. · PAMI 2010" },
};

const TAGLINE_OF = (slug) => EXTRA_META[slug]?.tagline ?? null;
const SOURCE_OF  = (slug) => EXTRA_META[slug]?.src     ?? null;

const ATLAS_BY_SLUG = Object.fromEntries(ATLAS_ENTRIES.map((e) => [e.slug, e]));

// ── Extra relations for the graph view ──────────────────────────────────────
// `to`/`vs` on each entry cover extended_by + compared_with. The graph
// explorer also needs prerequisites (pre), feeds_into (fi) and
// learned_alternative_of (lb). Stored separately so the inline ATLAS_ENTRIES
// list stays readable.
const EXTRA_RELATIONS = {
    "sift":        { pre: ["scale-space", "image-gradient"],          fi: ["apap", "gao"],         lb: ["superpoint", "xfeat"] },
    "surf":        { pre: ["scale-space"],                            fi: ["apap"],                lb: ["superpoint"] },
    "harris":      { pre: ["image-gradient"],                         fi: ["orb"],                 lb: [] },
    "shi-tomasi":  { pre: ["image-gradient"],                         fi: ["lucas-kanade"],        lb: [] },
    "fast":        { pre: [],                                         fi: ["orb", "brief"],        lb: [] },
    "brief":       { pre: [],                                         fi: ["orb"],                 lb: ["superpoint", "xfeat"] },
    "orb":         { pre: ["fast", "brief", "harris"],                fi: [],                      lb: ["superpoint"] },
    "lucas-kanade":{ pre: ["image-gradient"],                         fi: [],                      lb: [] },
    "horn-schunck":{ pre: ["image-gradient"],                         fi: [],                      lb: [] },

    "ransac":      { pre: [],                                         fi: ["homography", "epnp"],  lb: [] },
    "magsac":      { pre: ["ransac"],                                 fi: ["homography"],          lb: [] },
    "usac":        { pre: ["ransac", "prosac", "lo-ransac"],          fi: ["homography"],          lb: [] },
    "homography":  { pre: [],                                         fi: ["apap", "gao", "zhang"],lb: [] },
    "epipolar-geometry": { pre: [],                                   fi: ["longuet-higgins", "hartley-norm-8pt"], lb: [] },

    "zhang":       { pre: ["homography", "camera-distortion"],        fi: [],                      lb: ["ccs"] },
    "tsai":        { pre: ["camera-distortion"],                      fi: [],                      lb: [] },
    "chess-corners":{ pre: ["harris"],                                fi: ["zhang"],               lb: ["ccdn", "ccs", "mate"] },

    "viola-jones": { pre: ["hog"],                                    fi: [],                      lb: ["rcnn"] },
    "dpm":         { pre: ["hog"],                                    fi: ["rcnn"],                lb: [] },
    "rcnn":        { pre: ["alexnet"],                                fi: ["faster-rcnn"],         lb: [] },
    "faster-rcnn": { pre: ["vgg", "resnet"],                          fi: ["mask-rcnn"],           lb: [] },
    "mask-rcnn":   { pre: ["faster-rcnn"],                            fi: [],                      lb: [] },

    "fcn":         { pre: ["vgg"],                                    fi: ["unet", "deeplab"],     lb: [] },
    "unet":        { pre: ["fcn"],                                    fi: [],                      lb: [] },
    "alexnet":     { pre: [],                                         fi: ["rcnn", "fcn"],         lb: [] },
    "resnet":      { pre: ["vgg"],                                    fi: ["faster-rcnn"],         lb: [] },

    "superpoint":  { pre: [],                                         fi: ["superglue", "lightglue"], lb: [] },
    "superglue":   { pre: ["superpoint"],                             fi: [],                      lb: [] },
};

// ── Problem mapping ─────────────────────────────────────────────────────────
// Default: derived from domain. Specific entries can override below.
const _DOMAIN_TO_PROBLEMS = {
    "features":     ["feature-matching"],
    "geometry":     ["two-view-geometry"],
    "calibration":  ["camera-calibration"],
    "targets":      ["target-detection"],
    "stitching":    ["image-stitching"],
    "detection":    ["object-detection"],
    "segmentation": ["segmentation"],
};
const _PROBLEM_OVERRIDES = {
    "lucas-kanade":  ["optical-flow", "feature-matching"],
    "horn-schunck":  ["optical-flow"],
    "black-anandan": ["optical-flow"],
    "ransac":        ["robust-estimation", "two-view-geometry"],
    "mlesac":        ["robust-estimation"],
    "prosac":        ["robust-estimation"],
    "lo-ransac":     ["robust-estimation"],
    "usac":          ["robust-estimation"],
    "magsac":        ["robust-estimation"],
    "tsai-lenz":     ["hand-eye"],
    "daniilidis":    ["hand-eye"],
};

const PROBLEMS_OF = (slug) => {
    const e = ATLAS_BY_SLUG[slug];
    if (!e) return [];
    return _PROBLEM_OVERRIDES[slug] || _DOMAIN_TO_PROBLEMS[e.d] || [];
};

// ── Neighbor query for the graph explorer ───────────────────────────────────
// Returns the focused node's typed neighbors, deduplicated, with relation
// labels. Order within each category preserves authoring order.
function getNeighbors(slug) {
    const focus = ATLAS_BY_SLUG[slug];
    if (!focus) return null;

    const extra = EXTRA_RELATIONS[slug] || {};
    const extended_by   = focus.to || [];
    const compared_with = focus.vs || [];
    const prerequisites = extra.pre || [];
    const feeds_into    = extra.fi  || [];
    const learned_by    = extra.lb  || [];

    // Reverse lookup: who has this node in their `to`?
    const extended_from = [];
    for (const e of ATLAS_ENTRIES) {
        if (e.slug !== slug && (e.to || []).includes(slug)) extended_from.push(e.slug);
    }

    return { focus, extended_by, extended_from, compared_with, prerequisites, feeds_into, learned_by };
}

const DOMAIN_OF = (slug) => ATLAS_BY_SLUG[slug]?.d ?? null;
const TITLE_OF  = (slug) => ATLAS_BY_SLUG[slug]?.title ?? slug;
const SHORT_OF  = (slug) => {
    const t = TITLE_OF(slug);
    // first acronym-y token or first 2 words
    const colon = t.indexOf(":");
    if (colon !== -1) return t.slice(0, colon);
    const dash = t.indexOf("–"); // en-dash
    if (dash !== -1) return t.slice(0, dash).trim();
    return t.split(" ").slice(0, 2).join(" ");
};

Object.assign(window, {
    ATLAS_DOMAINS,
    ATLAS_PROBLEMS,
    ATLAS_LINEAGES,
    ATLAS_ENTRIES,
    ATLAS_BY_SLUG,
    EXTRA_RELATIONS,
    EXTRA_META,
    KIND_LABEL,
    KIND_LETTER,
    DOMAIN_OF,
    TITLE_OF,
    SHORT_OF,
    TAGLINE_OF,
    SOURCE_OF,
    PROBLEMS_OF,
    getNeighbors,
});
