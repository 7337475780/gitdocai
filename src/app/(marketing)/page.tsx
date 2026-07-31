import * as React from "react";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProductPreview } from "@/components/marketing/product-preview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CoreFeatures } from "@/components/marketing/core-features";
import { GithubPublishing } from "@/components/marketing/github-publishing";
import { TemplatesSection } from "@/components/marketing/templates";
import { FinalCta } from "@/components/marketing/final-cta";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProductPreview />
      <HowItWorks />
      <CoreFeatures />
      <GithubPublishing />
      <TemplatesSection />
      <FinalCta />
    </>
  );
}
