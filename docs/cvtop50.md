Here is a practical top-50 seed corpus for a Computer Vision Atlas. It is not “50 most cited papers”; it is a curated set where each paper can produce useful algorithm, model, or concept nodes.

# Geometry, calibration, pose, reconstruction

+1. Fischler, Bolles. Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography. CACM, 1981.
    Node: ransac.
+2. Longuet-Higgins. A Computer Algorithm for Reconstructing a Scene from Two Projections. Nature, 1981.
    Node: eight-point-algorithm, essential-matrix.
+3. Hartley. In Defense of the Eight-Point Algorithm. TPAMI, 1997.
    Node: hartley-normalization.
+4. Zhang. A Flexible New Technique for Camera Calibration. TPAMI, 2000.
    Node: zhang-planar-calibration.
5. Triggs, McLauchlan, Hartley, Fitzgibbon. Bundle Adjustment — A Modern Synthesis. Vision Algorithms, 2000.
    Node: bundle-adjustment.
+6. Lepetit, Moreno-Noguer, Fua. EPnP: An Accurate O(n) Solution to the PnP Problem. IJCV, 2009.
    Node: epnp.
+7. Tsai, Lenz. A New Technique for Fully Autonomous and Efficient 3D Robotics Hand/Eye Calibration. IEEE TRA, 1989.
    Node: tsai-lenz-hand-eye.
+8. Daniilidis. Hand-Eye Calibration Using Dual Quaternions. IJRR, 1999.
    Node: dual-quaternion-hand-eye.
+9. Sturm, Maybank. On Plane-Based Camera Calibration: A General Algorithm, Singularities, Applications. CVPR, 1999.
    Node: plane-based-calibration.
+10. Scaramuzza, Martinelli, Siegwart. A Toolbox for Easily Calibrating Omnidirectional Cameras. IROS, 2006.
    Node: omnidirectional-camera-calibration.

⸻

# Local features, descriptors, matching

+11. Harris, Stephens. A Combined Corner and Edge Detector. AVC, 1988.
    Node: harris-corner-detector.
+12. Shi, Tomasi. Good Features to Track. CVPR, 1994.
    Node: shi-tomasi-corner-detector.
+13. Lowe. Distinctive Image Features from Scale-Invariant Keypoints. IJCV, 2004.
    Node: sift.
+14. Bay, Tuytelaars, Van Gool. SURF: Speeded Up Robust Features. ECCV, 2006.
    Node: surf.
+15. Rosten, Drummond. Machine Learning for High-Speed Corner Detection. ECCV, 2006.
    Node: fast-corner-detector.
+16. Calonder et al. BRIEF: Binary Robust Independent Elementary Features. ECCV, 2010.
    Node: brief.
+17. Rublee et al. ORB: An Efficient Alternative to SIFT or SURF. ICCV, 2011.
    Node: orb.
+18. DeTone, Malisiewicz, Rabinovich. SuperPoint: Self-Supervised Interest Point Detection and Description. CVPRW, 2018.
    Node: superpoint.
+19. Sarlin et al. SuperGlue: Learning Feature Matching with Graph Neural Networks. CVPR, 2020.
    Node: superglue.
+20. Sun et al. LoFTR: Detector-Free Local Feature Matching with Transformers. CVPR, 2021.
    Node: loftr. It is useful as the modern “detector-free matching” branch: coarse dense matching plus transformer self/cross-attention instead of detect-describe-match.  ￼

⸻

# Segmentation, grouping, dense prediction

+21. Canny. A Computational Approach to Edge Detection. TPAMI, 1986.
    Node: canny-edge-detector.
22. Marr, Hildreth. Theory of Edge Detection. Proceedings of the Royal Society B, 1980.
    Node: log-edge-detection, scale-space.
+23. Felzenszwalb, Huttenlocher. Efficient Graph-Based Image Segmentation. IJCV, 2004.
    Node: graph-based-segmentation.
+24. Boykov, Jolly. Interactive Graph Cuts for Optimal Boundary and Region Segmentation of Objects in N-D Images. ICCV, 2001.
    Node: graph-cut-segmentation.
25. Rother, Kolmogorov, Blake. GrabCut: Interactive Foreground Extraction Using Iterated Graph Cuts. SIGGRAPH, 2004.
    Node: grabcut.
26. Long, Shelhamer, Darrell. Fully Convolutional Networks for Semantic Segmentation. CVPR, 2015.
    Node: fcn.
27. Ronneberger, Fischer, Brox. U-Net: Convolutional Networks for Biomedical Image Segmentation. MICCAI, 2015.
    Node: unet.
28. Chen et al. DeepLab: Semantic Image Segmentation with Deep Convolutional Nets, Atrous Convolution, and Fully Connected CRFs. TPAMI, 2018 / arXiv 2016.
    Node: deeplab.
29. He, Gkioxari, Dollár, Girshick. Mask R-CNN. ICCV, 2017.
    Node: mask-rcnn.
30. Kirillov et al. Segment Anything. ICCV, 2023.
    Node: segment-anything. This should probably be a model page plus concept nodes for promptable-segmentation and foundation-segmentation-model; the paper introduces the SA task, SAM model, and SA-1B dataset.  ￼

⸻

# Object detection and recognition models

31. Viola, Jones. Rapid Object Detection Using a Boosted Cascade of Simple Features. CVPR, 2001.
    Node: viola-jones-detector.
32. Dalal, Triggs. Histograms of Oriented Gradients for Human Detection. CVPR, 2005.
    Node: hog.
33. Felzenszwalb et al. Object Detection with Discriminatively Trained Part-Based Models. TPAMI, 2010.
    Node: deformable-part-model.
34. Krizhevsky, Sutskever, Hinton. ImageNet Classification with Deep Convolutional Neural Networks. NeurIPS, 2012.
    Node: alexnet.
35. Simonyan, Zisserman. Very Deep Convolutional Networks for Large-Scale Image Recognition. ICLR, 2015.
    Node: vgg.
36. Szegedy et al. Going Deeper with Convolutions. CVPR, 2015.
    Node: inception.
37. He, Zhang, Ren, Sun. Deep Residual Learning for Image Recognition. CVPR, 2016.
    Node: resnet.
38. Ren, He, Girshick, Sun. Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks. NeurIPS, 2015.
    Node: faster-rcnn.
39. Redmon et al. You Only Look Once: Unified, Real-Time Object Detection. CVPR, 2016.
    Node: yolo.
40. Lin et al. Focal Loss for Dense Object Detection. ICCV, 2017.
    Node: retinanet, focal-loss.

⸻

# Motion, tracking, optical flow

41. Lucas, Kanade. An Iterative Image Registration Technique with an Application to Stereo Vision. IJCAI, 1981.
    Node: lucas-kanade.
42. Horn, Schunck. Determining Optical Flow. Artificial Intelligence, 1981.
    Node: horn-schunck.
43. Tomasi, Kanade. Detection and Tracking of Point Features. CMU Technical Report, 1991.
    Node: kanade-lucas-tomasi-tracker.
44. Black, Anandan. The Robust Estimation of Multiple Motions: Parametric and Piecewise-Smooth Flow Fields. CVIU, 1996.
    Node: robust-optical-flow.
45. Brox et al. High Accuracy Optical Flow Estimation Based on a Theory for Warping. ECCV, 2004.
    Node: brox-optical-flow.

⸻

# Modern representation learning, transformers, 3D, foundation vision

46. Dosovitskiy et al. An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale. ICLR, 2021.
    Node: vision-transformer.
47. Carion et al. End-to-End Object Detection with Transformers. ECCV, 2020.
    Node: detr.
48. Radford et al. Learning Transferable Visual Models From Natural Language Supervision. ICML, 2021.
    Node: clip.
49. Mildenhall et al. NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis. ECCV, 2020.
    Node: nerf.
50. Kerbl et al. 3D Gaussian Splatting for Real-Time Radiance Field Rendering. SIGGRAPH, 2023.
    Node: 3d-gaussian-splatting. It is a strong modern 3D/reconstruction/rendering node because it replaces expensive neural volume rendering with optimized anisotropic 3D Gaussians and visibility-aware splatting for real-time rendering.  ￼

⸻

# Immediate additions I would keep in reserve

These are not in the 50 only because the list is capped:

* Oquab et al. DINOv2: Learning Robust Visual Features without Supervision. 2023. Strong node for modern self-supervised foundation features.  ￼
* Liu et al. Swin Transformer. ICCV, 2021.
* Tan, Le. EfficientNet. ICML, 2019.
* Teed, Deng. RAFT: Recurrent All-Pairs Field Transforms for Optical Flow. ECCV, 2020.
* Zhou, Park, Koltun. Open3D. arXiv, 2018.
* Newcombe et al. KinectFusion. ISMAR, 2011.
* Mur-Artal, Montiel, Tardós. ORB-SLAM. TRO, 2015.
* Olson. AprilTag: A Robust and Flexible Visual Fiducial System. ICRA, 2011.
* Garrido-Jurado et al. Automatic Generation and Detection of Highly Reliable Fiducial Markers Under Occlusion. Pattern Recognition, 2014.
* Duda, Frese. Accurate Detection and Localization of Checkerboard Corners for Calibration. BMVC, 2018.

For your Atlas, I would start with these 50, but I would probably replace a few generic recognition papers with calibration-target / fiducial / local-feature papers because that matches your site’s strongest identity.