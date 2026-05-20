import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { CreateWineClubForm } from './CreateWineClubForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Skapa vinklubb — Vinakademin' }

export default async function SkapaVinklubbPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/vinklubbar/skapa')
  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12 space-y-8">
      <header className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Vinklubbar
        </span>
        <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-3xl">
          Skapa vinklubb
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Bjud in dina vänner och kör blindkampar tillsammans. Du kan bjuda in fler när som helst.
        </p>
      </header>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <CreateWineClubForm />
      </div>
    </div>
  )
}
