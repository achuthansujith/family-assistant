import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">HomeBase</h1>
          <p className="text-gray-500 mt-1 text-sm">Create your account</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
