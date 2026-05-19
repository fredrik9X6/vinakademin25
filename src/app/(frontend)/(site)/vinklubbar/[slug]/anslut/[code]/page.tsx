import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { JoinClient } from './JoinClient'

export const dynamic = 'force-dynamic'

export default async function AnslutPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}) {
  const { slug, code } = await params
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}/anslut/${code}`)
  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-heading">Gå med i vinklubben</h1>
      <p className="text-sm text-muted-foreground">Klicka för att bli medlem.</p>
      <JoinClient inviteCode={code} />
    </div>
  )
}
