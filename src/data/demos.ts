import { type Demo } from "../types";

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
        slug: "annotation",
        title: "Image Annotation",
        blurb: "Visual image annotation.",
        tags: ["image-processing", "filters"],
        externalUrl: "https://annotation.vitavision.dev"
    },
    {
        slug: "calibration",
        title: "Camera Calibration",
        blurb: "Interactive camera calibration tool.",
        tags: ["calibration", "opencv", "geometry"],
        Component: CameraCalibDemo
    }
];
