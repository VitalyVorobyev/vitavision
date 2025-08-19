import { type Demo } from "../types";

import ImageAnnotationDemo from "../components/demos/ImageAnnotationDemo";
import CameraCalibDemo from "../components/demos/CameraCalibDemo";

export const DEMOS: Demo[] = [
    {
        slug: "pong",
        title: "Pong Game",
        blurb: "Interactive pong game with computer vision controls.",
        tags: ["game", "interactive", "cv"],
        externalUrl: "https://pong.vitavision.dev"
    },
    {
        slug: "edges",
        title: "Image Annotation",
        blurb: "Interactive image annotation with various features.",
        tags: ["image-processing", "filters"],
        Component: ImageAnnotationDemo
    },
    {
        slug: "calibration",
        title: "Camera Calibration",
        blurb: "Interactive camera calibration tool.",
        tags: ["calibration", "opencv", "geometry"],
        Component: CameraCalibDemo
    }
];
