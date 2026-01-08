
import { Playground } from "@/components/playground"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background md:p-8">
      <div className="transform scale-90 md:scale-100 transition-all">
        <Playground
          onSubmit={async (input, config) => {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
              start(controller) {
                const text = "This is a mocked stream response from the standalone playground page.";
                const chunks = text.split("");
                let i = 0;
                const interval = setInterval(() => {
                  if (i >= chunks.length) {
                    clearInterval(interval);
                    controller.close();
                    return;
                  }
                  controller.enqueue(encoder.encode(chunks[i]));
                  i++;
                }, 20);
              }
            });
            return stream;
          }}
          onSave={(snapshot) => console.log('Saved snapshot:', snapshot)}
        />
      </div>
    </main>
  )
}
