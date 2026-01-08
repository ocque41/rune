
import { Playground } from "@/components/playground"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background md:p-8">
      <div className="transform scale-90 md:scale-100 transition-all">
        <Playground
          onSubmit={async (input) => {
            // In a real app, this would call an API
            console.log('Submitting:', input);
          }}
          onSave={() => console.log('Saved configuration')}
        />
      </div>
    </main>
  )
}
