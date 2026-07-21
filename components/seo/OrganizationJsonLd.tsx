const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

export default function OrganizationJsonLd() {
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${siteUrl}/#publisher`,
                name: "Innovare Academic Publishing",
                url: siteUrl,
                logo: {
                    "@type": "ImageObject",
                    "@id": `${siteUrl}/#publisher-logo`,
                    url: `${siteUrl}/logo.png`,
                    contentUrl: `${siteUrl}/logo.png`,
                    caption: "Innovare Academic Publishing",
                },
                publishingPrinciples: `${siteUrl}/publication-ethics`,
            },
            {
                "@type": "Periodical",
                "@id": `${siteUrl}/#journal`,
                name:
                    "International Journal of Knowledge, Research and Innovation",
                alternateName: "IJKRI",
                url: siteUrl,
                description:
                    "A multidisciplinary, peer-reviewed and open-access journal publishing rigorous research, practical insights and innovative scholarly contributions.",
                image: {
                    "@id": `${siteUrl}/#publisher-logo`,
                },
                publisher: {
                    "@id": `${siteUrl}/#publisher`,
                },
                inLanguage: "en",
                isAccessibleForFree: true,
                mainEntityOfPage: {
                    "@type": "WebPage",
                    "@id": siteUrl,
                },
            },
            {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                url: siteUrl,
                name:
                    "International Journal of Knowledge, Research and Innovation",
                alternateName: "IJKRI",
                description:
                    "Official publishing platform of the International Journal of Knowledge, Research and Innovation.",
                publisher: {
                    "@id": `${siteUrl}/#publisher`,
                },
                inLanguage: "en",
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData).replace(
                    /</g,
                    "\\u003c",
                ),
            }}
        />
    );
}