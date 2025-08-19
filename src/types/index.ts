/********************
 * Data Types
 ********************/

export type Demo = {
    slug: string;
    title: string;
    blurb: string;
    tags: string[];
    Component?: React.ComponentType;
    externalUrl?: string;
};

export type Post = {
    id: string;
    title: string;
    date: string; // ISO
    tags: string[];
    summary: string;
    content: string;
};
