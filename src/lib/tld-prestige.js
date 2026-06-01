/**
 * TLD prestige scores (0–10) for domain appraisal.
 * Based on market demand, registration cost, and perceived value.
 * 10 = highest (.com), 1 = lowest (obscure ccTLDs).
 */
const TLD_PRESTIGE = {
    // Tier 1 — premium generics
    com: 10, net: 7, org: 7,
    // Tier 2 — popular new gTLDs / short ccTLDs
    io: 6, ai: 8, co: 6, dev: 5, app: 5,
    // Tier 3 — decent generics
    xyz: 3, me: 4, info: 3, biz: 2, us: 4,
    uk: 4, de: 4, fr: 3, eu: 3,
    // Tier 4 — niche / lower demand
    tv: 4, ly: 4, cc: 2, online: 2, site: 2,
    store: 2, tech: 3, shop: 3,
};
const DEFAULT_PRESTIGE = 2;
/** Get the prestige score for a TLD (0–10) */
export function getTldPrestige(tld) {
    return TLD_PRESTIGE[tld.toLowerCase()] ?? DEFAULT_PRESTIGE;
}
/** Get all known TLDs with their prestige scores */
export function getAllTldPrestige() {
    return TLD_PRESTIGE;
}
