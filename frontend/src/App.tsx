import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { OnboardingFlow } from "./components/OnboardingFlow";
import type { User } from "./api/client";

function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      {user ? <Dashboard userId={user.id} /> : <OnboardingFlow onComplete={setUser} />}
    </main>
  );
}

export default App;
