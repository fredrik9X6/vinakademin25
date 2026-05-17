import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { TemplateForm } from '@/components/tasting-template/TemplateForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ny provningsmall — Vinakademin',
}

export default async function NewTemplatePage() {
  const user = await getUser()
  if (!user) {
    redirect('/logga-in?from=/provningsmallar/ny')
  }
  if (user.role !== 'admin') notFound()
  return <TemplateForm />
}
