import { ChatbotButton } from "@/components/ChatbotButton";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          CND Auto Service
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Need service? Click the wrench icon to get started.
        </p>
      </main>
      <ChatbotButton />
    </div>
  );
}
