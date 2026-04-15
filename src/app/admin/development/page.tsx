import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, BookOpen } from 'lucide-react'

export const metadata = {
  title: 'Developer documentation | Design Business Hub',
}

export default async function DevelopmentDocsPage() {
  const mdPath = path.join(process.cwd(), 'docs', 'DEVELOPER_SYSTEM.md')
  let content: string
  try {
    content = await fs.readFile(mdPath, 'utf8')
  } catch {
    content =
      '# Missing documentation\n\nCould not read `docs/DEVELOPER_SYSTEM.md`. Ensure the file exists at the project root.'
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer documentation</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Source file: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">docs/DEVELOPER_SYSTEM.md</code>
            </p>
          </div>
        </div>
        <Link
          href="/admin/system"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'border-gray-200 w-fit shrink-0 gap-2 inline-flex items-center'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          System health
        </Link>
      </div>
      <article
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto"
        aria-label="Developer documentation content"
      >
        {content}
      </article>
    </div>
  )
}
