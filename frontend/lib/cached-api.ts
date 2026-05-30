import { getTopExperiences } from "@/lib/api";
import { withRedisCache } from "@/lib/redis";

export { getCities } from "@/lib/api";

export async function getTopExperiencesCached(limit = 24, page = 1, currency = "USD") {
  const key = `experiences::${limit}::${page}::${currency}`;
  return withRedisCache(key, () => getTopExperiences(limit, page, currency));
}
