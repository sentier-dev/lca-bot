import { ArchiveView } from '@/components/archive/archive-view'

export const dynamic = 'force-dynamic'

export default function ArchivePage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <ArchiveView />
    </div>
  )
}
