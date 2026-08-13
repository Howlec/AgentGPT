import { type NextPage } from "next";
import Head from "next/head";
import BrandCirclesAnimation from "../components/BrandCirclesAnimation";

/**
 * Preview page for the brand circles animation.
 * The animation uses multiply blending, so it sits on a white background.
 */
const BrandAnimationPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Brand Circles Animation</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-[min(90vmin,40rem)] w-[min(90vmin,40rem)]">
          <BrandCirclesAnimation className="h-full w-full" />
        </div>
      </main>
    </>
  );
};

export default BrandAnimationPage;
