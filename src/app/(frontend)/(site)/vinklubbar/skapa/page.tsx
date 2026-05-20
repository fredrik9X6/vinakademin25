import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { CreateWineClubForm } from './CreateWineClubForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Skapa vinklubb — Vinakademin' }

export default async function SkapaVinklubbPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/vinklubbar/skapa')
  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Skapa vinklubb</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bjud in dina vänner och kör blindkampar tillsammans. Du kan bjuda in fler när som helst.
        </p>
      </header>
      <CreateWineClubForm />
    </div>
  )
}
