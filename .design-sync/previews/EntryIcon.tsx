import { EntryIcon } from 'vitcv';

const COVER_DATA_URI =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
        '<rect width="64" height="64" fill="#1e293b"/>' +
        '<circle cx="20" cy="22" r="4" fill="#f8fafc"/>' +
        '<circle cx="44" cy="18" r="4" fill="#f8fafc"/>' +
        '<circle cx="32" cy="44" r="4" fill="#f8fafc"/>' +
        '<line x1="20" y1="22" x2="44" y2="18" stroke="#f8fafc" stroke-width="1.5"/>' +
        '<line x1="20" y1="22" x2="32" y2="44" stroke="#f8fafc" stroke-width="1.5"/>' +
        '<line x1="44" y1="18" x2="32" y2="44" stroke="#f8fafc" stroke-width="1.5"/>' +
        '</svg>',
    );

export const Algorithm = () => (
    <EntryIcon slug="harris-corner-detector" kind="algorithm" />
);

export const Model = () => <EntryIcon slug="superpoint" kind="model" />;

export const Concept = () => <EntryIcon slug="reprojection-error" kind="concept" />;

export const WithCoverImage = () => (
    <EntryIcon slug="zhang-planar-calibration" kind="algorithm" coverImage={COVER_DATA_URI} />
);

export const RowOfEntries = () => (
    <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
            <EntryIcon slug="orb" kind="algorithm" size={28} />
            <span className="text-[13px] text-foreground">ORB — Oriented FAST and Rotated BRIEF</span>
        </div>
        <div className="flex items-center gap-2.5">
            <EntryIcon slug="lightglue" kind="model" size={28} />
            <span className="text-[13px] text-foreground">LightGlue</span>
        </div>
        <div className="flex items-center gap-2.5">
            <EntryIcon slug="epipolar-geometry" kind="concept" size={28} />
            <span className="text-[13px] text-foreground">Epipolar Geometry</span>
        </div>
    </div>
);
