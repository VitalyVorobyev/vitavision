import { Callout, Button } from 'vitcv';

export const Tones = () => (
    <div className="flex flex-col gap-2" style={{ width: 380 }}>
        <Callout tone="info">The preview is a vector render; exports are not resampled.</Callout>
        <Callout tone="warning">Marker size is below 4 px at this print scale.</Callout>
        <Callout tone="error">The board does not fit the printable area of an A4 sheet.</Callout>
        <Callout tone="success">42 corners found, RMS 0.184 px.</Callout>
    </div>
);

export const WithTitle = () => (
    <div style={{ width: 380 }}>
        <Callout tone="warning" title="Low view diversity">
            All 14 views are within 10 degrees of fronto-parallel; the focal length will be poorly constrained.
        </Callout>
    </div>
);

export const WithActions = () => (
    <div style={{ width: 380 }}>
        <Callout
            tone="error"
            title="Detector failed"
            actions={
                <>
                    <Button variant="secondary" size="sm">Try another algorithm</Button>
                    <Button variant="ghost" size="sm">Dismiss</Button>
                </>
            }
        >
            The WASM module could not decode the board layout. Check the dictionary matches the printed target.
        </Callout>
    </div>
);
