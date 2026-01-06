
import { Playground } from "@/components/playground"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background md:p-8">
      <div className="transform scale-90 md:scale-100 transition-all">
        <Playground />
      </div>
    </main>
  )
}
