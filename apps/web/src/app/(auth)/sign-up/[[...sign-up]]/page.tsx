import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Network } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors duration-200">
      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2.5 mb-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform">
            <Network className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CollabArch
          </span>
        </Link>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          Create an account to start collaborating with verified identities and multi-tenant workspaces.
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <div className="w-full max-w-md flex justify-center shadow-2xl rounded-2xl overflow-hidden">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
        />
      </div>

      {/* Footer Return Link */}
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
        >
          ← Return to Public Studio Canvas
        </Link>
      </div>
    </div>
  );
}
