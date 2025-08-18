import { type Demo } from "../types";

import EdgeDetectDemo from "../components/demos/EdgeDetectDemo";
import CameraCalibDemo from "../components/demos/CameraCalibDemo";
import StereoDepthDemo from "../components/demos/StereoDepthDemo";

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
    }
];
