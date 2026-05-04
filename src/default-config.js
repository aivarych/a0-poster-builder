/**
 * Demo config that loads on first run.
 * Users replace this content via the editor; the structure documents
 * the full shape of a poster config (header / sections / footer).
 *
 * The content here is deliberately absurd — a fictional study on
 * Patagonian squirrel mating cycles correlating with Indian Ocean
 * wave heights — so that no one mistakes the demo for real research.
 */

export const DEFAULT_CONFIG = {
  theme: 'navy_red',
  header: {
    title: "Lunar-Synchronous Mating Cycles of the Patagonian Tree Squirrel and Mean Wave Height in the Equatorial Indian Ocean",
    authors: [
      { name: "I. M. Fictitious, DSc", role: "Lead investigator, marine cryptozoology", affiliation: "1" },
      { name: "P. N. Phantasm, PhD", role: "Rodent ethology, field operations", affiliation: "2" },
      { name: "Q. R. Sundial, MSc", role: "Statistical hand-waving", affiliation: "1" }
    ],
    affiliations: [
      "1 Institute for Implausible Correlations, Ushuaia, Argentina",
      "2 Department of Speculative Mammalogy, University of Nowhere"
    ],
    subtitle: "Three austral summers of paired tail-flicking surveys and offshore buoy data.",
    logos: [
      { alt: "Institute for Implausible Correlations", src: "logo1.png" },
      { alt: "Society for Speculative Mammalogy",      src: "logo2.png" }
    ]
  },
  sections: [
    {
      type: "intro_row",
      columns: [
        {
          width: "wide",
          title: "Background & Hand-Waving",
          paragraphs: [
            "The <strong>Patagonian tree squirrel</strong> (<em>Sciurus patagoniensis fictus</em>) exhibits a tail-flicking display whose monthly intensity has puzzled the seven people studying it.",
            "Oceanographers have documented <strong>unexplained micro-oscillations</strong> in equatorial Indian Ocean wave height. We propose these phenomena are <strong>causally linked through the lunar cycle</strong> — possibly tides, possibly vibes."
          ]
        },
        {
          width: "narrow",
          title: "Research Question",
          paragraphs: [
            "Does the <strong>monthly mating intensity index (MMII)</strong> predict mean significant wave height (Hs) at buoy 4°S 80°E across three austral summers?"
          ]
        }
      ]
    },
    {
      type: "case_grid",
      title: "Field Setup & Data Collection",
      items: [
        { width: "half", title: "Squirrel Surveys", body: "<strong>n = 47</strong> tagged adults across 6 plots near Bariloche; tail-flicks logged via IR camera traps." },
        { width: "half", title: "Ocean Buoys",     body: "Hs pulled from <strong>3 NOAA-mirrored buoys</strong> (4°S 80°E, 0° 73°E, 6°S 88°E), aggregated to monthly means." },
        { width: "full", title: "Synchronisation",  body: "Lunar phase aligned to UTC; squirrel data smoothed with a <strong>7-day rolling kernel</strong>." }
      ]
    },
    {
      type: "chart_with_aside",
      chart: {
        title: "Figure 1. MMII vs Hs across 36 lunar months",
        caption: "Curves track each other across the lunar month; cross-correlation peaks at lag = 0 (r ≈ 0.81).",
        mode: "builder",
        type: "line_by_group",
        rows: [
          { x:  0, y: 1.6, group: 'MMII' },
          { x:  7, y: 2.0, group: 'MMII' },
          { x: 14, y: 2.4, group: 'MMII' },
          { x: 21, y: 2.0, group: 'MMII' },
          { x: 28, y: 1.6, group: 'MMII' },
          { x:  0, y: 1.5, group: 'Hs'   },
          { x:  7, y: 1.9, group: 'Hs'   },
          { x: 14, y: 2.3, group: 'Hs'   },
          { x: 21, y: 1.9, group: 'Hs'   },
          { x: 28, y: 1.5, group: 'Hs'   },
        ],
        specOverride: null,
        svg: null,
      },
      aside: {
        title: "Field Notes",
        icon: "!",
        sections: [
          { title: "Counting protocol",      items: ["Tail-flicks per 5-min window", "Raccoons excluded post-hoc"] },
          { title: "Lunar alignment",        items: ["UTC adjustment to timestamps", "Civil twilight excluded"] },
          { title: "What we do not claim",   items: ["A causal mechanism", "A forecasting product"] }
        ],
        outcome: "✓ 36 lunar months sampled; 0 squirrels harmed"
      }
    },
    {
      type: "charts_row",
      title: "Auxiliary Analyses",
      charts: [
        {
          title: "Figure 2a. Cross-correlation MMII × Hs",
          caption: "Peak correlation at zero lag — no leading or lagging signal.",
          mode: "builder",
          type: "scatter_regression",
          rows: [
            { x: -4, y: 0.20 }, { x: -3, y: 0.32 }, { x: -2, y: 0.51 },
            { x: -1, y: 0.68 }, { x:  0, y: 0.81 }, { x:  1, y: 0.66 },
            { x:  2, y: 0.49 }, { x:  3, y: 0.30 }, { x:  4, y: 0.18 },
          ],
          specOverride: null,
          svg: null,
        },
        {
          title: "Figure 2b. Hs by lunar phase",
          caption: "Mean Hs peaks at full moon, mirroring the MMII peak.",
          mode: "builder",
          type: "bar_error",
          rows: [
            { category: 'New',  mean: 1.6, sd: 0.3 },
            { category: '1Q',   mean: 2.0, sd: 0.4 },
            { category: 'Full', mean: 2.3, sd: 0.3 },
            { category: '3Q',   mean: 1.8, sd: 0.4 },
          ],
          specOverride: null,
          svg: null,
        },
        {
          title: "Figure 3. Pooled effect across plots",
          caption: "Plot 3, closest to a hilltop with sea-breeze exposure, drives the correlation.",
          mode: "builder",
          type: "forest_plot",
          rows: [
            { study: 'Plot 1', effect: 0.55, ci_low: 0.30, ci_high: 0.78 },
            { study: 'Plot 2', effect: 0.62, ci_low: 0.40, ci_high: 0.83 },
            { study: 'Plot 3', effect: 0.78, ci_low: 0.58, ci_high: 0.92 },
            { study: 'Plot 4', effect: 0.49, ci_low: 0.25, ci_high: 0.72 },
            { study: 'Pooled', effect: 0.61, ci_low: 0.48, ci_high: 0.74 },
          ],
          specOverride: null,
          svg: null,
        }
      ]
    },
    {
      type: "findings_block",
      findings: {
        title: "Headline Claims",
        items: [
          { title: "Lunar Coupling.",     body: "MMII and Hs co-vary across 36 lunar months (r ≈ 0.81 at lag 0)." },
          { title: "Phase-Locked Peaks.", body: "Both signals peak at full moon and trough at new moon." },
          { title: "Plot Heterogeneity.", body: "Hilltop plots dominate the correlation; flatland plots add noise." }
        ]
      },
      limitations: {
        title: "⚠ Limitations",
        items: [
          "Tail-flicks are a behavioural proxy of unknown validity.",
          "Three buoys do not an ocean make.",
          "No mechanistic model — just suggestive curves.",
          "Correlation, not causation; the moon is a confounder."
        ]
      },
      takehome: {
        title: "◆ Take-home",
        items: [
          "Squirrels and waves rise and fall together with the moon.",
          "We have no idea why, and we are delighted.",
          "Replication attempts discouraged."
        ]
      }
    }
  ],
  footer: {
    disclosures: {
      title: "Disclosures & References",
      text: "The authors declare no conflicts of interest and no funding.",
      references: [
        "Fictitious IM, Phantasm PN. Tail-flicking as a proxy. <em>J. Implausible Ethol.</em> 2024;1(1):1-9.",
        "Sundial QR, et al. Correlation as a lifestyle. <em>Annals of Wishful Statistics.</em> 2023;47:201-218.",
        "Anonymous. The moon: a co-conspirator. <em>Cryptogeophys. Lett.</em> 2022;12(4):44-49."
      ]
    },
    ethics: {
      title: "Ethics",
      text: "No squirrels were consulted. No oceans were harmed."
    },
    contact: {
      title: "Contact & QR Code",
      label: "Corresponding author",
      email: "i.fictitious@example.org",
      note: "For collaboration, contact the institute's general inbox.",
      qr_svg: ""
    }
  }
};
