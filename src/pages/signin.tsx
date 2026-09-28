import React from "react";
import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa";
import clsx from "clsx";
import DefaultLayout from "../layout/default";
import Badge from "../components/Badge";
import PopIn from "../components/motions/popin";
import Expand from "../components/motions/expand";
import Loader from "../components/loader";
import { authOptions, getServerAuthSession } from "../server/auth";

interface ProviderInfo {
  id: string;
  name: string;
}

interface SignInProps {
  providers: ProviderInfo[];
}

const providerIcons: Record<string, React.ReactNode> = {
  google: <FaGoogle />,
  github: <FaGithub />,
  discord: <FaDiscord />,
};

// https://next-auth.js.org/configuration/pages#error-codes
const errorMessages: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already linked to another sign in method. Please use the provider you originally signed up with.",
  AccessDenied: "Access was denied. Please try again.",
  SessionRequired: "Please sign in to access this page.",
  default: "Something went wrong while signing you in. Please try again.",
};

const SignIn: NextPage<SignInProps> = ({ providers }) => {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  const callbackUrl =
    typeof router.query.callbackUrl === "string"
      ? router.query.callbackUrl
      : "/";
  const error =
    typeof router.query.error === "string"
      ? errorMessages[router.query.error] ?? errorMessages.default
      : null;

  const handleSignIn = (providerId: string) => {
    setPending(providerId);
    signIn(providerId, { callbackUrl }).catch(() => setPending(null));
  };

  return (
    <DefaultLayout>
      <main className="flex min-h-screen w-full items-center justify-center p-4">
        <div className="z-10 flex w-full max-w-md flex-col items-center gap-8 font-mono">
          <div className="relative flex flex-col items-center">
            <div className="flex flex-row items-start shadow-2xl">
              <span className="text-4xl font-bold text-[#C0C0C0] xs:text-5xl sm:text-6xl">
                Agent
              </span>
              <span className="text-4xl font-bold text-white xs:text-5xl sm:text-6xl">
                GPT
              </span>
              <PopIn delay={0.5} className="ml-2">
                <Badge>Beta 🚀</Badge>
              </PopIn>
            </div>
            <p className="mt-1 text-center text-[0.7em] font-bold text-white">
              Assemble, configure, and deploy autonomous AI Agents in your
              browser.
            </p>
          </div>

          <Expand className="w-full">
            <div className="flex w-full flex-col gap-6 rounded-2xl border-2 border-white/20 bg-zinc-900 p-6 text-white shadow-3xl sm:p-8">
              <div className="text-center">
                <h1 className="text-xl font-bold">Welcome back</h1>
                <p className="mt-1 text-sm text-white/60">
                  Sign in to save and manage your agents.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border-2 border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={pending != null}
                    onClick={() => handleSignIn(provider.id)}
                    className={clsx(
                      "flex w-full items-center justify-center gap-3 rounded-lg border-2 border-white/20 px-5 py-3 font-bold transition-all",
                      pending != null
                        ? "cursor-not-allowed bg-zinc-800 text-white/40"
                        : "bg-[#3a3a3a] text-white/80 hover:border-[#1E88E5]/70 hover:bg-[#1E88E5]/70 hover:text-white hover:shadow-2xl"
                    )}
                  >
                    {pending === provider.id ? (
                      <Loader />
                    ) : (
                      <>
                        {providerIcons[provider.id]}
                        <span>Continue with {provider.name}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>

              <hr className="border-white/10" />

              <Link
                href="/"
                className="text-center text-sm text-white/50 transition-colors hover:text-white"
              >
                ← Continue without signing in
              </Link>
            </div>
          </Expand>
        </div>
      </main>
    </DefaultLayout>
  );
};

export const getServerSideProps: GetServerSideProps<SignInProps> = async (
  ctx
) => {
  const session = await getServerAuthSession(ctx);
  if (session?.user) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const providers = authOptions.providers.map(({ id, name }) => ({ id, name }));
  return { props: { providers } };
};

export default SignIn;
