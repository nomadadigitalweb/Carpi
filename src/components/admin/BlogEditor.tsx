"use client";

import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import { tinyMCEImageUploadHandler } from "@/lib/blog-storage";

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
  height?: number;
}

export default function BlogEditor({
  value,
  onChange,
  height = 500,
}: BlogEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null);

  return (
    <Editor
      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
      onInit={(_evt, editor) => {
        editorRef.current = editor;
      }}
      value={value}
      onEditorChange={(newValue) => onChange(newValue)}
      init={{
        height,
        menubar: "file edit view insert format tools table",
        plugins: [
          "advlist",
          "autolink",
          "lists",
          "link",
          "image",
          "charmap",
          "preview",
          "anchor",
          "searchreplace",
          "visualblocks",
          "code",
          "fullscreen",
          "insertdatetime",
          "media",
          "table",
          "help",
          "wordcount",
          "emoticons",
          "codesample",
        ],
        toolbar:
          "undo redo | blocks fontfamily fontsize | " +
          "bold italic underline strikethrough | forecolor backcolor | " +
          "alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | " +
          "link image media table | " +
          "codesample emoticons charmap | " +
          "removeformat fullscreen preview code | help",
        content_style: `
          body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.7;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            padding: 1rem;
          }
          img { max-width: 100%; height: auto; border-radius: 8px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; }
          th { background: #f5f5f5; }
          pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
          blockquote { border-left: 4px solid #e5e5e5; margin: 1rem 0; padding: 0.5rem 1rem; color: #666; }
          a { color: #2563eb; }
        `,
        images_upload_handler: tinyMCEImageUploadHandler,
        automatic_uploads: true,
        file_picker_types: "image",
        image_advtab: true,
        image_caption: true,
        media_live_embeds: true,
        link_default_target: "_blank",
        branding: false,
        promotion: false,
        language: "es",
        skin: "oxide",
        placeholder: "Escribe el contenido del post aquí...",
      }}
    />
  );
}
