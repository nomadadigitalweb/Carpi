import { Metadata } from "next";
import Link from "next/link";
import { getPosts, getCategories } from "@/actions/blog";
import type { Post, Category } from "@/types/blog";

export const metadata: Metadata = {
  title: "Blog | Carpi Argentina",
  description: "Noticias, novedades y artículos de Carpi Argentina.",
  openGraph: {
    title: "Blog | Carpi Argentina",
    description: "Noticias, novedades y artículos de Carpi Argentina.",
    type: "website",
  },
};

interface Props {
  searchParams: Promise<{ categoria?: string; pagina?: string }>;
}

const POSTS_PER_PAGE = 9;

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const categorySlug = params.categoria;
  const page = Math.max(1, parseInt(params.pagina ?? "1", 10));
  const offset = (page - 1) * POSTS_PER_PAGE;

  const [{ posts, count }, categories] = await Promise.all([
    getPosts({
      status: "published",
      categorySlug: categorySlug || undefined,
      limit: POSTS_PER_PAGE,
      offset,
    }),
    getCategories(),
  ]);

  const totalPages = Math.ceil(count / POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Hero */}
      <section className="bg-zinc-900 text-white pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Carpi Argentina</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold uppercase tracking-tighter">Blog</h1>
          <p className="mt-4 text-zinc-300 text-lg max-w-2xl leading-relaxed">
            Noticias, novedades y artículos sobre nuestros productos y
            materiales.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-14">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/blog"
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors border ${
              !categorySlug
                ? "bg-black text-white border-black"
                : "text-gray-500 border-gray-200 hover:border-black"
            }`}
          >
            Todos
          </Link>
          {categories.map((cat: Category) => (
            <Link
              key={cat.id}
              href={`/blog?categoria=${cat.slug}`}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors border ${
                categorySlug === cat.slug
                  ? "bg-black text-white border-black"
                  : "text-gray-500 border-gray-200 hover:border-black"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Posts grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">
              No hay artículos publicados aún.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: Post) => (
              <article key={post.id} className="group">
                <Link href={`/blog/${post.slug}`}>
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-4">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {post.category && (
                        <span className="text-blue-600 font-medium">
                          {post.category.name}
                        </span>
                      )}
                      <span>
                        {new Date(
                          post.published_at ?? post.created_at
                        ).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-14">
            {page > 1 && (
              <Link
                href={`/blog?${new URLSearchParams({
                  ...(categorySlug ? { categoria: categorySlug } : {}),
                  pagina: String(page - 1),
                })}`}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-gray-400">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?${new URLSearchParams({
                  ...(categorySlug ? { categoria: categorySlug } : {}),
                  pagina: String(page + 1),
                })}`}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
