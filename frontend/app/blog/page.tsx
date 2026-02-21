'use client';

import {
  useRouter
} from 'next/navigation';

import { Button } from 'components/ui/button';

interface Blog {
  title: string;
  slug: string;
}

const BLOGS: Blog[] = [
  {
    title: 'Build a Collaborative & Persistent Text Editor with Lexical, Yjs, and Postgres',
    slug: 'lexical-yjs-demo'
  },
  {
    title: 'Challenges of Spec-Driven Development in 2025',
    slug: 'sdd'
  },
  {
    title: 'California Residential Purchase Agreement template',
    slug: 'ca-rpa'
  },
  {
    title: 'How to implement a payments system for a platform of agents',
    slug: 'stripe'
  }
]

export default function BlogsPage() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col gap-8 items-start mx-5 md:mx-20 my-10">
      <h4 className="text-neutral-400">2025</h4>
      {BLOGS.map((blog: Blog) => (
        <Button
          variant="link"
          key={blog.slug}
          className="p-0 text-left"
          onClick={async () => {
            router.push(`/blog/${blog.slug}`);
          }}
        >
          <h3 className="text-wrap">{ blog.title }</h3>
        </Button>
      ))}
    </div>
  )
}