import { getPostById } from "@/actions/blog";
import { notFound } from "next/navigation";
import PostEditorForm from "@/components/admin/PostEditorForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return <PostEditorForm post={post} />;
}
