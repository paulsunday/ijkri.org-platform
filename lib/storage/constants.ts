/**
 * ============================================================================
 * Journal Platform Storage Constants
 * ============================================================================
 */

export const MB = 1024 * 1024;

/**
 * Maximum upload sizes
 */
export const MAX_FILE_SIZE = {
    MANUSCRIPT: 20 * MB,
    RESPONSE_LETTER: 10 * MB,
    REVIEW_ATTACHMENT: 20 * MB,
    COPYEDITED: 50 * MB,
    TYPESET: 100 * MB,
    PROOF: 100 * MB,
    FINAL_ARTICLE: 100 * MB,
    SUPPLEMENTARY: 200 * MB,
} as const;

/**
 * Storage folders
 */
export const STORAGE_FOLDERS = {
    SUBMISSIONS: "submissions",
    REVISIONS: "revisions",
    REVIEWS: "reviews",
    COPYEDITING: "copyediting",
    TYPESETTING: "typesetting",
    PROOFREADING: "proofreading",
    PUBLICATIONS: "publications",
    SUPPLEMENTARY: "supplementary",
} as const;

/**
 * Allowed extensions
 */
export const ALLOWED_EXTENSIONS = {
    MANUSCRIPT: [
        "pdf",
        "doc",
        "docx",
    ],

    RESPONSE_LETTER: [
        "pdf",
        "doc",
        "docx",
    ],

    REVIEW_ATTACHMENT: [
        "pdf",
        "doc",
        "docx",
        "xlsx",
        "csv",
    ],

    SUPPLEMENTARY: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "csv",
        "zip",
        "rar",
        "7z",
        "png",
        "jpg",
        "jpeg",
        "tif",
        "tiff",
        "svg",
    ],

    PRODUCTION: [
        "pdf",
        "doc",
        "docx",
        "html",
        "xml",
        "epub",
        "indd",
        "idml",
    ],
} as const;

/**
 * Allowed MIME types
 */
export const ALLOWED_MIME_TYPES = [
    "application/pdf",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "text/csv",

    "application/zip",

    "application/x-zip-compressed",

    "application/x-rar-compressed",

    "application/x-7z-compressed",

    "image/png",

    "image/jpeg",

    "image/tiff",

    "image/svg+xml",

    "text/html",

    "application/xhtml+xml",

    "application/xml",

    "text/xml",

    "application/epub+zip",
] as const;

/**
 * Dangerous executable extensions
 */
export const BLOCKED_EXTENSIONS = [
    "exe",
    "dll",
    "bat",
    "cmd",
    "com",
    "msi",
    "ps1",
    "sh",
    "php",
    "js",
    "mjs",
    "cjs",
    "jar",
    "scr",
    "vbs",
    "reg",
    "apk",
    "ipa",
] as const;

/**
 * Publicly accessible file categories
 */
export const PUBLIC_FILE_TYPES = [
    "FINAL_ARTICLE",
    "PDF_GALLEY",
    "HTML_GALLEY",
    "XML_GALLEY",
] as const;

/**
 * Private file categories
 */
export const PRIVATE_FILE_TYPES = [
    "MANUSCRIPT",
    "REVISION",
    "REVIEW_ATTACHMENT",
    "COPYEDITED",
    "TYPESET",
    "PROOF",
    "SUPPLEMENTARY",
    "RESPONSE_LETTER",
] as const;