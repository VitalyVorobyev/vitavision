import { Helmet } from "react-helmet-async";

const SITE_NAME = "VitaVision";
const DEFAULT_DESCRIPTION =
    "Computer vision algorithms, interactive tools, and technical deep dives.";

interface SeoHeadProps {
    title?: string;
    description?: string;
    ogImage?: string;
    ogType?: string;
    url?: string;
}

export default function SeoHead({
    title,
    description = DEFAULT_DESCRIPTION,
    ogImage,
    ogType = "website",
    url,
}: SeoHeadProps) {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const twitterCard = ogImage ? "summary_large_image" : "summary";

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />

            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE_NAME} />
            {url && <meta property="og:url" content={url} />}
            {ogImage && <meta property="og:image" content={ogImage} />}

            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            {ogImage && <meta name="twitter:image" content={ogImage} />}
        </Helmet>
    );
}
