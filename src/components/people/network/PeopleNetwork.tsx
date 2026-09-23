// STUB — the real interactive co-author network is being built by another
// agent at this exact path. This placeholder exists only so AtlasPeopleView's
// Network mode compiles and renders something reasonable in the meantime; it
// will be replaced wholesale at merge. Contract (props) is fixed — do not
// change without updating AtlasPeopleView.tsx's usage.
export interface PeopleNetworkProps {
    focusId: string | undefined;
    onFocusChange: (id: string | undefined) => void;
}

export default function PeopleNetwork(_props: PeopleNetworkProps) {
    return <div className="h-[600px] rounded-lg border border-border" />;
}
