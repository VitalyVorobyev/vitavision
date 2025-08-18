import { type Demo } from "../../types";

export const DEMOS: Demo[] = [
    {
        slug: "edges",
        title: "Edge Detection",
        blurb: "Sobel/Canny preview with interactive thresholds and overlay.",
        tags: ["image-processing", "filters", "wasm"],
        Component: EdgeDetectDemo
    },
    {
        slug: "calibration",
        title: "Camera Calibration",
        blurb: "Undistortion, reprojection error plots, grid debug.",
        tags: ["calibration", "opencv", "geometry"],
        Component: CameraCalibDemo
    },
    {
        slug: "stereo",
        title: "Stereo Depth",
        blurb: "Block-matching & point cloud preview.",
        tags: ["3d", "stereo", "depth"],
        Component: StereoDepthDemo
    },
];
