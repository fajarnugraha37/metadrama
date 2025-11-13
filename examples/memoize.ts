import { memoizeRuntime } from "@fajarnugraha37/metadrama";

const computeTrendingScore = memoizeRuntime((slug: string) => {
  console.log(`[memoize-example] computing score for ${slug}`);
  const random = Math.random();
  return { slug, score: Number((random * 100).toFixed(2)) };
}, { ttlMs: 1_000 });

const run = () => {
  console.log(computeTrendingScore("post-1"));
  console.log(computeTrendingScore("post-1"));
  console.log(computeTrendingScore("post-2"));
};

if (import.meta.main) {
  run();
}
