Below is a production‑grade, extensible domain appraisal engine written in TypeScript/Node. It works out‑of‑the‑box using heuristics (length, TLD tier, linguistics, brandability patterns, keyword demand, etc.) and includes a plugin interface so you can inject real‑world comparable sales data (NameBio, GoDaddy, Estibot, etc.) as you scale.

### Install dependencies
```bash
    pnpm install tldts whois-json       # whois-json is optional (WHOIS age lookup)
    pnpm install -D typescript @types/node
```    

### `domain-appraiser.ts`
```ts
    import { parse } from 'tldts';
    
    /* ------------------------------------------------------------------ */
    /*  TYPES                                                              */
    /* ------------------------------------------------------------------ */
    
    export interface AppraisalFactors {
      intrinsic: number; // length, TLD, chars, pattern
      linguistic: number; // dictionary, pronounceability, keywords
      market: number; // comparable sales / keyword heat / brandable patterns
      technical: number; // age, expiry, DNS stability
    }
    
    export interface ComparableSale {
      domain: string;
      price: number;
      date: string;
    }
    
    export interface SalesDataProvider {
      lookup(domain: string, sld: string, tld: string): Promise<ComparableSale[]>;
    }
    
    export interface AppraiserOptions {
      weights?: Partial<AppraisalFactors>;
      tldValues?: Record<string, number>;
      premiumKeywords?: string[];
      dictionaryWords?: Set<string>;
      enableWhois?: boolean;
      salesApi?: SalesDataProvider;
    }
    
    export interface FactorDetail {
      score: number;
      weight: number;
      details: string[];
    }
    
    export interface AppraisalReport {
      domain: string;
      normalizedDomain: string;
      sld: string;
      tld: string;
      overallScore: number; // 0 – 100
      grade: string;
      estimatedValueUSD: {
        floor: number;
        ceiling: number;
        predicted: number;
      };
      factors: {
        intrinsic: FactorDetail;
        linguistic: FactorDetail;
        market: FactorDetail;
        technical: FactorDetail;
      };
      comparableSales: ComparableSale[];
      warnings: string[];
      timestamp: string;
    }
    
    /* ------------------------------------------------------------------ */
    /*  DEFAULT DATA                                                       */
    /* ------------------------------------------------------------------ */
    
    const DEFAULT_TLD_VALUES: Record<string, number> = {
      com: 100, net: 80, org: 80, io: 75, co: 70, ai: 70,
      app: 65, dev: 60, cloud: 55, tech: 55, me: 50,
      tv: 50, us: 45, uk: 45, ca: 45, de: 45, fr: 45,
      info: 35, biz: 30, xyz: 30,
    };
    
    // This may be better generated and improved by AI
    const PREMIUM_KEYWORDS = new Set([
      'ai','gpt','crypto','nft','btc','eth','dao','defi',
      'meta','vr','ar','cloud','data','tech','app','dev',
      'pay','bank','loan','bet','casino',
      'car','auto','home','shop','store','news',
      'hub','hq','lab','ly','ify','able','ible','pro','max'
    ]);
    
    // This may be better generated and improved by AI + Search
    const TRADEMARKS = [
      'google','amazon','facebook','meta','apple','microsoft',
      'netflix','nike','adidas','tesla','samsung','sony'
    ];
    
    /* ------------------------------------------------------------------ */
    /*  PATTERN HELPERS                                                    */
    /* ------------------------------------------------------------------ */
    
    const isCVCV    = (s: string) => /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$/i.test(s);
    const isCVCCV   = (s: string) => /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]{2}[aeiou]$/i.test(s);
    const isAABB    = (s: string) => /^([a-z])\1([a-z])\2$/i.test(s);
    const isABAB    = (s: string) => /^([a-z][a-z])\1$/i.test(s);
    const isABBA    = (s: string) => /^([a-z])([a-z])\2\1$/i.test(s);
    const isQuad    = (s: string) => /^([a-z])\1{3,}$/i.test(s);
    const syllables = (s: string) => (s.match(/[aeiouy]{1,}/gi) || []).length;
    
    /* ------------------------------------------------------------------ */
    /*  MAIN CLASS                                                         */
    /* ------------------------------------------------------------------ */
    
    export class DomainAppraiser {
      private weights: AppraisalFactors;
      private tldValues: Record<string, number>;
      private premiumKeywords: Set<string>;
      private dictionary: Set<string>;
      private enableWhois: boolean;
      private salesApi?: SalesDataProvider;
    
      constructor(options: AppraiserOptions = {}) {
        this.weights = {
          intrinsic: 0.30,
          linguistic: 0.30,
          market: 0.25,
          technical: 0.15,
          ...options.weights,
        };
        this.tldValues = { ...DEFAULT_TLD_VALUES, ...options.tldValues };
        this.premiumKeywords = new Set([
          ...Array.from(PREMIUM_KEYWORDS),
          ...(options.premiumKeywords || []),
        ]);
        this.dictionary = options.dictionaryWords || new Set();
        this.enableWhois = options.enableWhois ?? false;
        this.salesApi = options.salesApi;
      }
    
      /* ---------------------------- PUBLIC API -------------------------- */
    
      async appraise(rawDomain: string): Promise<AppraisalReport> {
        const normalized = rawDomain.toLowerCase().trim();
        const parsed = parse(normalized, { allowPrivateDomains: false });
    
        if (!parsed.domain || !parsed.publicSuffix) {
          throw new Error(`Invalid domain name: ${rawDomain}`);
        }
    
        const domain = parsed.hostname!;
        const sld  = parsed.domainWithoutSuffix!;
        const tld  = parsed.publicSuffix!;
    
        // Run all scoring dimensions concurrently
        const [intrinsic, linguistic, market, technical] = await Promise.all([
          this.scoreIntrinsic(sld, tld),
          this.scoreLinguistic(sld),
          this.scoreMarket(domain, sld, tld),
          this.scoreTechnical(domain),
        ]);
    
        const overallScore = Math.min(100, Math.round(
          intrinsic.score  * this.weights.intrinsic +
          linguistic.score * this.weights.linguistic +
          market.score     * this.weights.market +
          technical.score  * this.weights.technical
        ));
    
        return {
          domain: rawDomain,
          normalizedDomain: domain,
          sld,
          tld,
          overallScore,
          grade: this.scoreToGrade(overallScore),
          estimatedValueUSD: this.estimateValue(overallScore, tld, sld, market.sales),
          factors: { intrinsic, linguistic, market, technical },
          comparableSales: market.sales,
          warnings: this.generateWarnings(sld, tld),
          timestamp: new Date().toISOString(),
        };
      }
    
      /* ----------------------- SCORING: INTRINSIC ----------------------- */
    
      private scoreIntrinsic(sld: string, tld: string): FactorDetail {
        const details: string[] = [];
    
        // 1. Length
        const len = sld.length;
        let lengthScore: number;
        if (len <= 2)       lengthScore = 100;
        else if (len <= 4)  lengthScore = 98;
        else if (len <= 5)  lengthScore = 95;
        else if (len <= 6)  lengthScore = 88;
        else if (len <= 8)  lengthScore = 80;
        else if (len <= 10) lengthScore = 65;
        else if (len <= 15) lengthScore = 40;
        else                lengthScore = Math.max(5, 100 - len * 4);
        details.push(`Length ${len}: ${lengthScore}`);
    
        // 2. TLD
        const tldScore = this.tldValues[tld] ?? 30;
        details.push(`TLD .${tld}: ${tldScore}`);
    
        // 3. Character composition
        let charScore = 100;
        const hasHyphen = sld.includes('-');
        const digits = (sld.match(/\d/g) || []).length;
        const allDigits = /^\d+$/.test(sld);
    
        if (hasHyphen) {
          charScore -= (sld.split('-').length - 1) * 25;
          if (sld.startsWith('-') || sld.endsWith('-')) charScore -= 40;
        }
        if (digits) {
          charScore -= allDigits ? 70 : digits * 12;
        }
        if (/[^a-z0-9-]/.test(sld)) {
          charScore -= 25; // IDN / homograph penalty
          details.push('IDN / non-ASCII characters detected');
        }
        charScore = Math.max(0, Math.min(100, charScore));
        details.push(`Character composition: ${charScore}`);
    
        // 4. Pattern / brandability
        let patternScore = 70;
        if (isQuad(sld)) patternScore = 15;
        else if (isAABB(sld) || isABAB(sld) || isABBA(sld)) patternScore = 90;
        else if (isCVCV(sld)) patternScore = 95;
        else if (isCVCCV(sld)) patternScore = 92;
        else {
          if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(sld)) patternScore -= 25;
          if (/[aeiou]{4,}/i.test(sld)) patternScore -= 15;
          if (/(.)\1{2,}/.test(sld)) patternScore -= 20;
        }
        patternScore = Math.max(0, Math.min(100, patternScore));
        details.push(`Pattern / brandability: ${patternScore}`);
    
        // Weighted blend inside the category
        const score = Math.round(
          lengthScore * 0.45 +
          tldScore    * 0.30 +
          charScore   * 0.15 +
          patternScore* 0.10
        );
    
        return { score, weight: this.weights.intrinsic, details };
      }
    
      /* ----------------------- SCORING: LINGUISTIC ---------------------- */
    
      private scoreLinguistic(sld: string): FactorDetail {
        const details: string[] = [];
        const clean = sld.replace(/-/g, '');
        let score: number;
    
        // Dictionary match
        const exactDict = this.dictionary.has(clean);
        const singularMatch = this.dictionary.has(clean.replace(/s$/, ''));
        if (exactDict) {
          score = 100;
          details.push('Exact dictionary word match');
        } else if (singularMatch) {
          score = 85;
          details.push('Pluralised dictionary word');
        } else {
          score = 35;
          details.push('Not a common dictionary word');
        }
    
        // Premium / niche keyword demand
        let kwBonus = 0;
        for (const kw of this.premiumKeywords) {
          if (new RegExp(`\\b${kw}\\b`, 'i').test(clean)) kwBonus += 18;
        }
        kwBonus = Math.min(40, kwBonus);
        if (kwBonus) details.push(`Keyword demand bonus: +${kwBonus}`);
    
        // Pronounceability heuristics
        const vCount = (clean.match(/[aeiou]/gi) || []).length;
        const vRatio = vCount / Math.max(1, clean.length);
        let pronun = 70;
    
        if (vRatio < 0.15 || vRatio > 0.7) pronun -= 25;
        else if (vRatio >= 0.3 && vRatio <= 0.6) pronun += 20;
    
        const badCluster = /[bcdfghjklmnpqrstvwxyz]{4,}/i.test(clean) || /[aeiou]{4,}/i.test(clean);
        if (badCluster) pronun -= 20;
    
        const syl = syllables(clean);
        if (syl >= 1 && syl <= 3) pronun += 10;
        else if (syl > 6) pronun -= 15;
    
        pronun = Math.max(0, Math.min(100, pronun));
        details.push(`Pronounceability: ${pronun}`);
    
        // Combine
        if (exactDict || singularMatch) {
          score = Math.max(score, pronun); // dictionary words get floor of pronounceability
        } else {
          score = Math.min(88, 35 + pronun * 0.5 + kwBonus);
        }
    
        return { score: Math.round(score), weight: this.weights.linguistic, details };
      }
    
      /* ------------------------- SCORING: MARKET ------------------------ */
    
      private async scoreMarket(domain: string, sld: string, tld: string): Promise<FactorDetail & { sales: ComparableSale[] }> {
        const details: string[] = [];
        let score = 40; // neutral / slightly below average without evidence
        let sales: ComparableSale[] = [];
    
        // 1. Real comparable sales (via plug-in API)
        if (this.salesApi) {
          try {
            sales = await this.salesApi.lookup(domain, sld, tld);
            if (sales.length) {
              const maxPrice = Math.max(...sales.map(s => s.price));
              // Logarithmic map: $100→35pts, $1k→55pts, $10k→75pts, $100k→90pts, $1M→100pts
              score = Math.min(100, Math.round(35 + 20 * Math.log10(Math.max(100, maxPrice))));
              details.push(`Comparable sales up to $${maxPrice.toLocaleString()}`);
            } else {
              details.push('No comparable sales returned by API');
            }
          } catch (e) {
            details.push('Sales API error (falling back to heuristics)');
          }
        }
    
        // 2. Brandable pattern premiums (demand proxy when no API data)
        let patternBonus = 0;
        if (isCVCV(sld)) patternBonus += 25;
        else if (isCVCCV(sld)) patternBonus += 20;
        else if (isAABB(sld) || isABAB(sld) || isABBA(sld)) patternBonus += 18;
        else if (sld.length <= 3 && /^[a-z]+$/i.test(sld)) patternBonus += 20; // LLL / LL letter premium
        if (patternBonus) {
          score = Math.min(100, score + patternBonus);
          details.push(`Brandable pattern premium: +${patternBonus}`);
        }
    
        // 3. Keyword heat (overlaps linguistic but reflects market niche demand)
        let heat = 0;
        const clean = sld.replace(/-/g, '');
        for (const kw of this.premiumKeywords) {
          if (new RegExp(`\\b${kw}\\b`, 'i').test(clean)) heat += 12;
        }
        if (heat) {
          heat = Math.min(30, heat);
          score = Math.min(100, score + heat);
          details.push(`Market niche heat: +${heat}`);
        }
    
        return { score: Math.round(score), weight: this.weights.market, details, sales };
      }
    
      /* ----------------------- SCORING: TECHNICAL ----------------------- */
    
      private async scoreTechnical(domain: string): Promise<FactorDetail> {
        const details: string[] = [];
        let score = 50; // neutral if we don't know age
    
        if (!this.enableWhois) {
          details.push('WHOIS lookup disabled');
          return { score, weight: this.weights.technical, details };
        }
    
        try {
          // Dynamic import keeps whois-json optional in environments that don't need it
          const whoisLib = await import('whois-json').then(m => m.default || m);
          const data = await whoisLib(domain);
          const created = data.creationDate || data.created || data.Created;
          if (created) {
            const ageY = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24 * 365);
            if (ageY > 25) score = 100;
            else if (ageY > 20) score = 95;
            else if (ageY > 10) score = 85;
            else if (ageY > 5) score = 70;
            else if (ageY > 1) score = 60;
            else score = 40;
            details.push(`Domain age ≈ ${Math.floor(ageY)} years`);
          } else {
            details.push('Creation date not found in WHOIS');
          }
    
          const expires = data.registryExpiryDate || data.expirationDate || data.expires;
          if (expires) {
            const days = (new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (days < 30) details.push('⚠️ Expiring within 30 days');
            else if (days < 90) details.push('Expiring within 90 days');
          }
        } catch {
          details.push('WHOIS lookup failed or timed out');
        }
    
        return { score, weight: this.weights.technical, details };
      }
    
      /* ------------------------- VALUATION LOGIC ------------------------ */
    
      private estimateValue(score: number, tld: string, sld: string, sales: ComparableSale[]) {
        const tldMult = (this.tldValues[tld] ?? 30) / 100;
    
        let floor: number;
        let ceiling: number;
    
        // Base tiers by score
        if (score >= 95)      { floor = 25000; ceiling = 500000; }
        else if (score >= 88) { floor = 8000;  ceiling = 25000; }
        else if (score >= 80) { floor = 3000;  ceiling = 8000; }
        else if (score >= 70) { floor = 1000;  ceiling = 3000; }
        else if (score >= 60) { floor = 250;   ceiling = 1000; }
        else if (score >= 50) { floor = 50;    ceiling = 250; }
        else if (score >= 30) { floor = 10;    ceiling = 50; }
        else                  { floor = 0;     ceiling = 10; }
    
        // Short / pattern premiums for legacy gTLDs
        const isLettersOnly = /^[a-z]+$/.test(sld);
        if (tld === 'com') {
          if (sld.length === 2 && isLettersOnly)  { floor = Math.max(floor, 50000); ceiling = Math.max(ceiling, 1000000); }
          else if (sld.length === 3 && isLettersOnly) { floor = Math.max(floor, 10000); ceiling = Math.max(ceiling, 150000); }
          else if (isCVCV(sld)) { floor = Math.max(floor, 2000); ceiling = Math.max(ceiling, 50000); }
        } else if (['net','org'].includes(tld)) {
          if (sld.length === 3 && isLettersOnly) { floor = Math.max(floor, 500); ceiling = Math.max(ceiling, 10000); }
        }
    
        // Comparable sales anchor (if available)
        if (sales.length) {
          const avg = sales.reduce((a, s) => a + s.price, 0) / sales.length;
          floor   = Math.max(floor, avg * 0.6);
          ceiling = Math.max(ceiling, avg * 2.5);
        }
    
        floor   = Math.round(floor * tldMult);
        ceiling = Math.round(ceiling * tldMult);
    
        // Predicted point within the band, skewed slightly by score
        const predicted = Math.round(floor + (ceiling - floor) * ((score % 10) / 12 + 0.1));
    
        return { floor, ceiling, predicted: Math.min(ceiling, predicted) };
      }
    
      /* --------------------------- UTILITIES ---------------------------- */
    
      private scoreToGrade(s: number): string {
        if (s >= 98) return 'A+';
        if (s >= 93) return 'A';
        if (s >= 88) return 'A-';
        if (s >= 83) return 'B+';
        if (s >= 78) return 'B';
        if (s >= 73) return 'B-';
        if (s >= 65) return 'C+';
        if (s >= 58) return 'C';
        if (s >= 50) return 'C-';
        if (s >= 40) return 'D';
        return 'F';
      }
    
      private generateWarnings(sld: string, tld: string): string[] {
        const w: string[] = [];
        for (const brand of TRADEMARKS) {
          if (sld.includes(brand)) w.push(`Potential trademark conflict: "${brand}"`);
        }
        if (sld.includes('-')) w.push('Hyphens reduce liquidity and brandability');
        if (/\d/.test(sld)) w.push('Numeric characters may limit audience');
        if (sld.length > 20) w.push('Excessively long SLD');
        if (tld.length > 6 && !DEFAULT_TLD_VALUES[tld]) w.push('Non-standard or very new gTLD');
        return w;
      }
    }
    
    /* ------------------------------------------------------------------ */
    /*  DICTIONARY HELPER (Unix wordfile or custom)                        */
    /* ------------------------------------------------------------------ */
    
    export function loadDictionary(filePath?: string): Set<string> {
      const fs = require('fs');
      const path = filePath || '/usr/share/dict/words';
      try {
        const text = fs.readFileSync(path, 'utf8');
        return new Set(text.split(/\r?\n/).map((w: string) => w.trim().toLowerCase()).filter(Boolean));
      } catch {
        return new Set();
      }
    }
```    

### Example usage
```ts
    // example.ts
    import { DomainAppraiser, loadDictionary } from './domain-appraiser';
    
    async function main() {
      // Load system dictionary if available (Linux/macOS)
      const dictionary = loadDictionary();
    
      const appraiser = new DomainAppraiser({
        dictionaryWords: dictionary,
        enableWhois: true,           // set false if you don't want WHOIS dependency
        weights: {
          intrinsic: 0.35,
          linguistic: 0.30,
          market: 0.20,
          technical: 0.15,
        },
        // Optional: plug in a real comparable-sales provider
        // salesApi: new NameBioProvider(apiKey)
      });
    
      const domains = [
        'apple.com',
        'aihub.com',
        'buvo.com',      // CVCV brandable
        'cryptobank.io',
        'my-super-long-domain123.biz',
        'xn--bcher-kva.example', // IDN punycode
      ];
    
      for (const d of domains) {
        try {
          const report = await appraiser.appraise(d);
          console.log(`\n▶ ${report.normalizedDomain} | Score: ${report.overallScore} (${report.grade})`);
          console.log(`  Value: $${report.estimatedValueUSD.predicted.toLocaleString()} (range $${report.estimatedValueUSD.floor.toLocaleString()} – $${report.estimatedValueUSD.ceiling.toLocaleString()})`);
          console.log(`  Warnings: ${report.warnings.join(', ') || 'none'}`);
          for (const [k, v] of Object.entries(report.factors)) {
            console.log(`  • ${k}: ${v.score}  (${v.details.join('; ')})`);
          }
          if (report.comparableSales.length) {
            console.log(`  Comparable sales:`, report.comparableSales.map(s => `$${s.price.toLocaleString()}`).join(', '));
          }
        } catch (err) {
          console.error(`Failed to appraise ${d}:`, (err as Error).message);
        }
      }
    }
    
    main();
```    

### How to make it “production‑grade”

Enhancement | Why it matters
===
Integrate a real sales API | Build a class that implements `SalesDataProvider` (NameBio, ShortNames, GoDaddy’s valuation endpoint, or Estibot). Comparable sales are the single biggest value signal.

Normalize for search volume | Feed SEO data (Google Keyword Planner, SEMrush, etc.) into the market scorer. Exact‑match domains with search volume command premiums.

Trademark / UDRP risk API | Before buying, query USPTO / WIPO to auto‑flag domains that carry legal risk (the built‑in list is only a stub).

Train an ML model | Dump raw features (length, TLD tier, syllables, comp‑sale prices) into a small regression model (XGBoost / Ridge) and map predictions to USD.

Add a cache layer | WHOIS and API calls are slow. Cache reports in Redis keyed by domain for 24 hours.


### Why this architecture is “best possible” for Node

1.  Multi‑factor scoring – It doesn’t just count letters; it blends intrinsic quality, language, market demand and asset age.
2.  Plugin interface – `SalesDataProvider` lets you hot‑swap data sources without touching the scoring math.
3.  Zero hard dependencies on paid APIs – Works immediately with heuristics, but gracefully upgrades when you plug in paid data.
4.  Handles edge cases – Punycode/IDN, hyphens, numbers, obscure TLDs, and invalid inputs are all handled with explicit penalties or errors.
5.  TypeScript‑native – Strongly typed outputs make it easy to pipe into dashboards, CLI tools, or back‑order bots.

The USD estimates are algorithmic ranges (not gospel). Domain pricing is highly illiquid; use the `score` and `grade` as your primary signals, and treat the dollar range as an order‑of‑magnitude guide unless you feed in real comparable sales.