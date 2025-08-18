import { type Post } from "../types";

export const POSTS: Post[] = [
    {
        id: "cv-architecture-intro",
        title: "Designing a Modular CV/3D Toolkit for Demos & Production",
        date: "2025-08-15",
        tags: ["architecture", "cv", "3d", "react"],
        summary: "A pragmatic approach to structuring computer vision services with a React front-end and IPC for demos.", content: "This starter shows how to separate concerns between UI, demo harness, and algorithm backends. Replace this with MDX or Contentlayer later."
    },
    {
        id: "ellipse-detection-notes",
        title: "Notes on Fast, Robust Ellipse Detection",
        date: "2025-07-30",
        tags: ["vision", "algorithms"],
        summary: "Benchmarking classical approaches (Fornaciari, Qi Jia) and when to sprinkle ML.",
        content: "Draft your insights here. Code snippets, figures, and references can live in MDX."
    },
];
