export const proseClasses = [
    // Base prose with article-specific overrides
    "prose prose-neutral dark:prose-invert max-w-[68ch]",
    "font-serif text-lg leading-[1.75]",

    // Article body text color (higher contrast than muted-foreground)
    "text-[hsl(var(--article-body))]",

    // Headings: stay in sans-serif, use article heading color
    "prose-headings:font-sans prose-headings:font-semibold prose-headings:tracking-tight",
    "prose-headings:text-[hsl(var(--article-heading))]",
    "prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4",
    "prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-3.5",
    "prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2.5",
    "prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2",

    // Paragraphs
    "prose-p:text-[hsl(var(--article-body))] prose-p:leading-[1.75] prose-p:mb-6",

    // Links: distinct steel blue with subtle underline
    "prose-a:text-[hsl(var(--article-link))]",
    "prose-a:underline prose-a:underline-offset-[3px] prose-a:decoration-1",
    "prose-a:decoration-[hsl(var(--article-link)/0.45)]",
    "hover:prose-a:decoration-[hsl(var(--article-link))]",
    "prose-a:transition-colors",

    // Lists
    "prose-li:text-[hsl(var(--article-body))] prose-li:leading-[1.75] prose-li:mb-2",
    "prose-ul:my-5 prose-ol:my-5",
    "prose-ul:pl-6 prose-ol:pl-6",

    // Blockquotes
    "prose-blockquote:border-l-[3px] prose-blockquote:border-accent",
    "prose-blockquote:text-[hsl(var(--article-body))] prose-blockquote:pl-6",
    "prose-blockquote:font-serif prose-blockquote:italic",

    // Inline code
    "prose-code:font-mono prose-code:text-[0.875em]",
    "prose-code:px-[0.4em] prose-code:py-[0.15em]",
    "prose-code:rounded prose-code:border",
    "prose-code:bg-[hsl(210_40%_93%)] prose-code:text-[hsl(215_60%_30%)]",
    "prose-code:border-[hsl(215_25%_82%)]",
    "dark:prose-code:bg-[hsl(217_33%_22%)] dark:prose-code:text-[hsl(175_55%_68%)]",
    "dark:prose-code:border-[hsl(215_25%_28%)]",

    // Code blocks (pre) — styled mainly via article.css for Shiki
    "prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-0 prose-pre:rounded-none",

    // Images
    "prose-img:rounded-md prose-img:border prose-img:border-border",

    // Tables
    "prose-table:text-[0.9375rem]",
    "prose-th:font-sans prose-th:font-semibold prose-th:text-xs prose-th:uppercase",
    "prose-th:tracking-wider prose-th:text-muted-foreground",
    "prose-th:border-b-2 prose-th:border-border prose-th:px-4 prose-th:py-2.5",
    "prose-td:px-4 prose-td:py-2.5 prose-td:border-b prose-td:border-border",
    "prose-td:text-[hsl(var(--article-body))]",

    // Strong and emphasis
    "prose-strong:text-[hsl(var(--article-heading))]",
    "prose-em:text-[hsl(var(--article-body))]",
].join(" ");
