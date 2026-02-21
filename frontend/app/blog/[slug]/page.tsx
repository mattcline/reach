'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const YOUTUBE_LINKS = {
  'lexical-yjs-demo': 'https://www.youtube.com/embed/T9jKc8rUUL4?si=nFRbUmkGVS18QG-8',
  'sdd': 'https://www.youtube.com/embed/Rq_LrPPlqvI?si=-wZMFMS9dndgdtKo',
  'stripe': 'https://www.youtube.com/embed/xf61jNS5Ha0?si=jkLbqA1xr7PhHOLf'
}

export default function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch(`/blogs/${slug}/${slug}.md`)
      .then((res) => res.text())
      .then((text) => setContent(text));
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center md:my-15 gap-8 md:gap-15 max-w-full p-2">
      {(slug in YOUTUBE_LINKS) && (
        <div className="relative w-full max-w-[540px] mx-auto aspect-[16/9]">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={YOUTUBE_LINKS[slug as keyof typeof YOUTUBE_LINKS]}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
      <article className="prose lg:prose-xl prose-neutral dark:prose-invert max-w-full md:w-2/3">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
};