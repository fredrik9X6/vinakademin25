import Link from 'next/link'

export default function WineNotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl md:text-3xl font-medium mb-3">Vinet kunde inte hittas</h1>
      <p className="text-muted-foreground mb-6">
        Det ser ut som att detta vin inte finns i vår vinlista.
      </p>
      <Link href="/vinlistan" className="text-primary hover:underline">
        Gå tillbaka till Vinlistan
      </Link>
    </div>
  )
}
