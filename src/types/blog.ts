export type PostStatus = 'draft' | 'published';

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image: string | null;
  category_id: string | null;
  status: PostStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category | null;
  author?: { full_name: string | null; email: string | null } | null;
}

export interface PostFormData {
  title: string;
  content: string;
  excerpt: string;
  featured_image: string | null;
  category_id: string | null;
  status: PostStatus;
}
