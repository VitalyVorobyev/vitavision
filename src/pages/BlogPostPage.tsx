import { useParams } from "react-router-dom";

import NotFound from "./NotFoundPage";
import Separator from "../components/ui/Separator";

import { POSTS } from "../data/posts";

const BlogPostPage: React.FC = () => {
    const { id } = useParams();
    const post = POSTS.find(p => p.id === id);

    if (!post) return <NotFound />;

    return (
        <article className="prose">
            <h1>
                {post.title}
            </h1>
            <p className="meta">
                {new Date(post.date).toLocaleDateString()} — {post.tags.map(t => `#${t}`).join(" ")}
            </p>
            <Separator />
            <p>
                {post.content}
            </p>
        </article>
  );
};

export default BlogPostPage;
