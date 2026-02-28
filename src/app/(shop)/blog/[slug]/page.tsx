import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Folder } from "lucide-react";
import { getPostBySlug } from "@/actions/blog";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Post no encontrado | Carpi Argentina" };
  }

  const description = post.excerpt || post.title;

  return {
    title: `${post.title} | Blog Carpi Argentina`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.published_at ?? post.created_at,
      authors: post.author?.full_name ? [post.author.full_name] : undefined,
      images: post.featured_image
        ? [
            {
              url: post.featured_image,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published") {
    notFound();
  }

  const cleanHtml = post.content ? sanitizeHtml(post.content) : "";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero / Featured Image */}
      {post.featured_image && (
        <div className="w-full h-64 md:h-96 bg-zinc-900 relative overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Volver al blog
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
          {post.category && (
            <Link
              href={`/blog?categoria=${post.category.slug}`}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Folder size={14} />
              {post.category.name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} />
            {new Date(
              post.published_at ?? post.created_at
            ).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
          {post.author?.full_name && (
            <span className="inline-flex items-center gap-1.5">
              <User size={14} />
              {post.author.full_name}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-8">
          {post.title}
        </h1>

        {/* Content — sanitized HTML */}
        <div
          className="blog-content prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      </article>
    </div>
  );
}
