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
        svg: `<svg viewBox='0 0 1200 540' xmlns='http://www.w3.org/2000/svg'><g font-family='Helvetica,Arial,sans-serif'><line x1='90' y1='80' x2='1170' y2='80' stroke='#e0e5ec'/><line x1='90' y1='180' x2='1170' y2='180' stroke='#e0e5ec'/><line x1='90' y1='280' x2='1170' y2='280' stroke='#e0e5ec'/><line x1='90' y1='380' x2='1170' y2='380' stroke='#e0e5ec'/><line x1='90' y1='440' x2='1170' y2='440' stroke='#475569' stroke-width='2'/><g font-size='20' fill='#666'><text x='80' y='86' text-anchor='end'>3.0</text><text x='80' y='186' text-anchor='end'>2.5</text><text x='80' y='286' text-anchor='end'>2.0</text><text x='80' y='386' text-anchor='end'>1.5</text><text x='80' y='446' text-anchor='end'>1.0</text><text x='18' y='250' transform='rotate(-90 18 250)' text-anchor='middle' font-weight='600'>Hs (m) / MMII (norm.)</text></g><polyline points='180,400 270,360 360,310 450,260 540,220 630,260 720,310 810,360 900,320 990,260 1080,210' fill='none' stroke='#3c5a7a' stroke-width='5' stroke-linecap='round'/><polyline points='180,410 270,370 360,320 450,280 540,240 630,280 720,320 810,370 900,340 990,280 1080,230' fill='none' stroke='#c0392b' stroke-width='5' stroke-linecap='round' stroke-dasharray='10,6'/><g font-size='18' font-weight='700'><circle cx='1080' cy='210' r='10' fill='#3c5a7a' stroke='white' stroke-width='3'/><circle cx='1080' cy='230' r='10' fill='#c0392b' stroke='white' stroke-width='3'/><text x='1100' y='215' fill='#3c5a7a'>MMII</text><text x='1100' y='235' fill='#c0392b'>Hs</text></g><g font-size='18' fill='#475569'><text x='180' y='475' text-anchor='middle'>New</text><text x='450' y='475' text-anchor='middle'>1Q</text><text x='720' y='475' text-anchor='middle'>Full</text><text x='990' y='475' text-anchor='middle'>3Q</text></g></g></svg>`,
        caption: "Curves track each other across the lunar month; cross-correlation peaks at lag = 0 (r ≈ 0.81)."
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
          svg: `<svg viewBox='0 0 400 260' xmlns='http://www.w3.org/2000/svg'><g font-family='Helvetica,Arial,sans-serif' font-size='10' fill='#475569'><line x1='50' y1='20' x2='50' y2='215' stroke='#94a3b8'/><line x1='50' y1='215' x2='380' y2='215' stroke='#94a3b8'/><line x1='50' y1='130' x2='380' y2='130' stroke='#cbd5e1' stroke-dasharray='3,3'/><polyline points='80,170 120,140 160,100 200,60 240,100 280,140 320,170 360,190' fill='none' stroke='#3c5a7a' stroke-width='3'/><g fill='#3c5a7a'><circle cx='80' cy='170' r='4'/><circle cx='120' cy='140' r='4'/><circle cx='160' cy='100' r='4'/><circle cx='200' cy='60' r='5' stroke='#c0392b' stroke-width='2' fill='#fff'/><circle cx='240' cy='100' r='4'/><circle cx='280' cy='140' r='4'/><circle cx='320' cy='170' r='4'/><circle cx='360' cy='190' r='4'/></g><text x='200' y='52' font-size='11' font-weight='700' fill='#c0392b' text-anchor='middle'>r=0.81</text><text x='80' y='233' text-anchor='middle'>−4</text><text x='200' y='233' text-anchor='middle'>0</text><text x='320' y='233' text-anchor='middle'>+4</text><text x='200' y='250' text-anchor='middle' font-weight='600'>Lag (days)</text></g></svg>`,
          caption: "Peak correlation at zero lag — no leading or lagging signal."
        },
        {
          title: "Figure 2b. Hs by lunar phase",
          svg: `<svg viewBox='0 0 400 260' xmlns='http://www.w3.org/2000/svg'><g font-family='Helvetica,Arial,sans-serif' font-size='10' fill='#475569'><line x1='50' y1='20' x2='50' y2='215' stroke='#94a3b8'/><line x1='50' y1='215' x2='380' y2='215' stroke='#94a3b8'/><rect x='80' y='130' width='50' height='85' fill='#94b0ce'/><rect x='150' y='95' width='50' height='120' fill='#3c5a7a'/><rect x='220' y='75' width='50' height='140' fill='#c0392b'/><rect x='290' y='110' width='50' height='105' fill='#94b0ce'/><text x='105' y='123' font-size='11' font-weight='700' fill='#1e293b' text-anchor='middle'>1.6</text><text x='175' y='88' font-size='11' font-weight='700' fill='#1e293b' text-anchor='middle'>2.0</text><text x='245' y='68' font-size='11' font-weight='700' fill='#1e293b' text-anchor='middle'>2.3</text><text x='315' y='103' font-size='11' font-weight='700' fill='#1e293b' text-anchor='middle'>1.8</text><text x='105' y='233' text-anchor='middle'>New</text><text x='175' y='233' text-anchor='middle'>1Q</text><text x='245' y='233' text-anchor='middle'>Full</text><text x='315' y='233' text-anchor='middle'>3Q</text></g></svg>`,
          caption: "Mean Hs peaks at full moon, mirroring the MMII peak."
        },
        {
          title: "Figure 3. MMII by forest plot",
          svg: `<svg viewBox='0 0 400 260' xmlns='http://www.w3.org/2000/svg'><g font-family='Helvetica,Arial,sans-serif' font-size='10' fill='#475569'><line x1='60' y1='20' x2='60' y2='195' stroke='#94a3b8'/><line x1='60' y1='195' x2='390' y2='195' stroke='#94a3b8'/><rect x='80'  y='100' width='38' height='95'  fill='#3c5a7a'/><rect x='130' y='80'  width='38' height='115' fill='#3c5a7a'/><rect x='180' y='70'  width='38' height='125' fill='#c0392b'/><rect x='230' y='90'  width='38' height='105' fill='#3c5a7a'/><rect x='280' y='110' width='38' height='85'  fill='#3c5a7a'/><rect x='330' y='95'  width='38' height='100' fill='#3c5a7a'/><g font-size='10' fill='#1e293b' font-weight='700'><text x='99'  y='95'  text-anchor='middle'>0.6</text><text x='149' y='75'  text-anchor='middle'>0.7</text><text x='199' y='65'  text-anchor='middle'>0.8</text><text x='249' y='85'  text-anchor='middle'>0.7</text><text x='299' y='105' text-anchor='middle'>0.5</text><text x='349' y='90'  text-anchor='middle'>0.6</text></g><g><text x='99'  y='210' text-anchor='middle'>P1</text><text x='149' y='210' text-anchor='middle'>P2</text><text x='199' y='210' text-anchor='middle'>P3</text><text x='249' y='210' text-anchor='middle'>P4</text><text x='299' y='210' text-anchor='middle'>P5</text><text x='349' y='210' text-anchor='middle'>P6</text></g></g></svg>`,
          caption: "Plot 3, closest to a hilltop with sea-breeze exposure, drives the correlation."
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
