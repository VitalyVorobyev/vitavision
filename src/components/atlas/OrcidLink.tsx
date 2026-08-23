interface OrcidLinkProps {
    /** Bare ORCID iD, e.g. "0000-0003-1951-8013". */
    orcid: string;
    /** Icon edge length in px. */
    size?: number;
    className?: string;
}

/** ORCID iD mark linking to the author's orcid.org record. */
export default function OrcidLink({ orcid, size = 13, className = "" }: OrcidLinkProps) {
    return (
        <a
            href={`https://orcid.org/${orcid}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`ORCID ${orcid}`}
            aria-label={`ORCID record ${orcid}`}
            className={`inline-flex shrink-0 self-center text-[#A6CE39] hover:opacity-75 transition-opacity ${className}`}
        >
            <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="12" fill="currentColor" />
                <text
                    x="12"
                    y="16.5"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="Arial, Helvetica, sans-serif"
                    fill="#ffffff"
                >
                    iD
                </text>
            </svg>
        </a>
    );
}
