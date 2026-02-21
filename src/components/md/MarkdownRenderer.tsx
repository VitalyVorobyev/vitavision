import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css'; // Important for math rendering

interface MarkdownRendererProps {
    content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="prose prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md border border-border mt-4 mb-4"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-primary font-mono" {...props}>
                                {children}
                            </code>
                        );
                    },
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 tracking-tight" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-8 mb-4 tracking-tight" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-6 mb-3 tracking-tight" {...props} />,
                    p: ({ node, ...props }) => <p className="leading-7 [&:not(:first-child)]:mt-6 text-muted-foreground" {...props} />,
                    a: ({ node, ...props }) => <a className="text-primary underline hover:text-primary/80" {...props} />,
                    ul: ({ node, ...props }) => <ul className="my-6 ml-6 list-disc space-y-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="my-6 ml-6 list-decimal space-y-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-muted-foreground" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="mt-6 border-l-2 border-primary pl-6 italic text-muted-foreground" {...props} />
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
