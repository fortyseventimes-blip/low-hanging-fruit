import { useState } from "react";
import { OnboardingFlow } from "./components/OnboardingFlow";
import type { User } from "./api/client";

function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      {user ? (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-slate-100">You're in, {user.name}.</p>
          <p className="text-sm text-slate-400">
            Your skill map is being built — that screen lands in the next milestone.
          </p>
        </div>
      ) : (
        <OnboardingFlow onComplete={setUser} />
      )}
    </main>
  );
}

export default App;
