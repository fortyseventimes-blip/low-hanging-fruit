import { useState } from "react";
import { OnboardingStepper } from "./OnboardingStepper";
import { createUser, type User } from "../api/client";

const CAREER_STAGES = [
  { value: "plateaued_senior", label: "Senior, feeling stuck on a plateau" },
  { value: "long_term_search", label: "In a prolonged job search" },
  { value: "active_it", label: "Active in IT/product, exploring options" },
] as const;

interface FormState {
  name: string;
  roleCurrent: string;
  experienceYears: string;
  geo: string;
  industry: string;
  careerStage: (typeof CAREER_STAGES)[number]["value"] | "";
  resumeText: string;
  consented: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  roleCurrent: "",
  experienceYears: "",
  geo: "",
  industry: "",
  careerStage: "",
  resumeText: "",
  consented: false,
};

const STEP_COUNT = 4;

function inputClass() {
  return "w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none";
}

interface OnboardingFlowProps {
  onComplete: (user: User) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canAdvance = [
    form.name.trim() !== "" && form.roleCurrent.trim() !== "" && form.experienceYears.trim() !== "",
    form.geo.trim() !== "" && form.industry.trim() !== "",
    form.careerStage !== "",
    form.resumeText.trim() !== "",
  ][step];

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const user = await createUser({
        name: form.name.trim(),
        roleCurrent: form.roleCurrent.trim(),
        experienceYears: Number(form.experienceYears),
        geo: form.geo.trim(),
        industry: form.industry.trim(),
        careerStage: form.careerStage,
        resumeText: form.resumeText.trim(),
        consentedScopes: form.consented ? ["resume_analysis"] : [],
      });
      onComplete(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <OnboardingStepper stepCount={STEP_COUNT} currentStep={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-slate-100">About you</h1>
          <input
            className={inputClass()}
            placeholder="Your name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <input
            className={inputClass()}
            placeholder="Current role (e.g. Product Manager)"
            value={form.roleCurrent}
            onChange={(e) => set("roleCurrent", e.target.value)}
          />
          <input
            className={inputClass()}
            type="number"
            min={0}
            placeholder="Years of experience"
            value={form.experienceYears}
            onChange={(e) => set("experienceYears", e.target.value)}
          />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-slate-100">Where are you</h1>
          <input
            className={inputClass()}
            placeholder="Country"
            value={form.geo}
            onChange={(e) => set("geo", e.target.value)}
          />
          <input
            className={inputClass()}
            placeholder="Industry"
            value={form.industry}
            onChange={(e) => set("industry", e.target.value)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-slate-100">How's it going</h1>
          <div className="flex flex-col gap-3">
            {CAREER_STAGES.map((stage) => (
              <button
                key={stage.value}
                type="button"
                onClick={() => set("careerStage", stage.value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  form.careerStage === stage.value
                    ? "border-violet-500 bg-violet-500/10 text-slate-100"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-slate-100">Tell us about yourself</h1>
          <textarea
            className={`${inputClass()} min-h-40 resize-none`}
            placeholder="Paste your resume or describe your experience in your own words"
            value={form.resumeText}
            onChange={(e) => set("resumeText", e.target.value)}
          />
          <label className="flex items-start gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.consented}
              onChange={(e) => set("consented", e.target.checked)}
            />
            I consent to this text being analyzed to help build my skill profile.
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-lg px-4 py-2.5 text-slate-400 hover:text-slate-200"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {step < STEP_COUNT - 1 ? (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition-opacity disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={!canAdvance || submitting}
            onClick={handleSubmit}
            className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition-opacity disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Done"}
          </button>
        )}
      </div>
    </div>
  );
}
