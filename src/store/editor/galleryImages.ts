import type { GalleryImage } from './editorTypes';

export const SAMPLE_GALLERY_IMAGES: GalleryImage[] = [
    {
        id: 'sample-chessboard',
        src: '/chessboard.png',
        name: 'Chessboard',
        sampleId: 'chessboard',
        description: 'Labeled board corners or low-level ChESS keypoints on the same sample.',
        recommendedAlgorithms: ['Chessboard', 'ChESS Corners'],
    },
    {
        id: 'sample-charuco',
        src: '/charuco.png',
        name: 'ChArUco',
        sampleId: 'charuco',
        description: 'Dense ChArUco board with embedded markers.',
        recommendedAlgorithms: ['ChArUco'],
    },
    {
        id: 'sample-markerboard',
        src: '/markerboard.png',
        name: 'Marker Board',
        sampleId: 'markerboard',
        description: 'Checkerboard plus fiducial circles for marker-board detection.',
        recommendedAlgorithms: ['Marker Board'],
    },
    {
        id: 'sample-ringgrid',
        src: '/ringgrid.png',
        name: 'Ring Grid',
        sampleId: 'ringgrid',
        description: 'Hex-lattice concentric ring markers with binary code bands.',
        recommendedAlgorithms: ['Ring Grid', 'Radial Symmetry'],
    },
    {
        id: 'sample-puzzleboard',
        src: '/author_like_oblique.png',
        name: 'PuzzleBoard',
        sampleId: 'puzzleboard',
        description: 'Self-identifying checkerboard with embedded edge-bit pattern for absolute (u,v) grid.',
        recommendedAlgorithms: ['PuzzleBoard'],
    },
];
