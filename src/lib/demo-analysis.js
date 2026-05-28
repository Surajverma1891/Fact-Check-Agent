export const DEMO_ANALYSIS = {
  id: "demo-analysis",
  createdAt: "2026-05-27T11:00:00.000Z",
  documentName: "Demo_Trap_Document.pdf",
  documentTitle: "Demo Trap Document",
  documentSummary:
    "A sample report containing a mix of accurate, outdated, and false public claims to demonstrate the fact-check workflow.",
  documentSizeBytes: 534219,
  summary: {
    totalClaims: 6,
    verified: 3,
    inaccurate: 1,
    false: 2,
    overallRisk: "medium",
  },
  highlights: [
    {
      claim_id: "C1",
      claim_text: "India's population is 1.2 billion in 2026.",
      corrected_fact: "India's population is roughly 1.45 to 1.46 billion, not 1.2 billion.",
    },
    {
      claim_id: "C2",
      claim_text: "ChatGPT launched in 2021.",
      corrected_fact: "ChatGPT was launched by OpenAI on November 30, 2022.",
    },
    {
      claim_id: "C3",
      claim_text: "Python was first released in 2000.",
      corrected_fact: "Python's first public release was in 1991.",
    },
  ],
  claims: [
    {
      id: "C1",
      claim_text: "India's population is 1.2 billion in 2026.",
      claim_type: "statistic",
      page_reference: "p. 2",
      evidence_snippet: "India's population is projected at 1.2 billion in 2026.",
      verdict: "False",
      confidence: 95,
      explanation:
        "Current World Bank and UN population data place India far above 1.2 billion. The figure is materially too low.",
      corrected_fact: "India's population is roughly 1.45 to 1.46 billion, not 1.2 billion.",
      reasoning_label: "contradicted_or_unsupported",
      sources: [
        {
          title: "Population, total - India",
          url: "https://data.worldbank.org/indicator/SP.POP.TOTL?locations=IN",
          publisher: "World Bank",
          domain: "data.worldbank.org",
        },
        {
          title: "World Population Prospects",
          url: "https://population.un.org/wpp/",
          publisher: "United Nations",
          domain: "population.un.org",
        },
      ],
    },
    {
      id: "C2",
      claim_text: "ChatGPT launched in 2021.",
      claim_type: "date",
      page_reference: "p. 2",
      evidence_snippet: "ChatGPT launched in 2021 and changed search overnight.",
      verdict: "False",
      confidence: 91,
      explanation:
        "OpenAI publicly launched ChatGPT in late 2022, so the 2021 date is incorrect.",
      corrected_fact: "ChatGPT was launched by OpenAI on November 30, 2022.",
      reasoning_label: "contradicted_or_unsupported",
      sources: [
        {
          title: "Introducing ChatGPT",
          url: "https://openai.com/index/chatgpt/",
          publisher: "OpenAI",
          domain: "openai.com",
        },
      ],
    },
    {
      id: "C3",
      claim_text: "Python was first released in 2000.",
      claim_type: "technical",
      page_reference: "p. 3",
      evidence_snippet: "Python was first released in 2000, making it younger than Java.",
      verdict: "Inaccurate",
      confidence: 85,
      explanation:
        "Python existed before 2000. Major versions shipped later, but the first public release dates back to 1991.",
      corrected_fact: "Python's first public release was in 1991.",
      reasoning_label: "outdated_or_partial",
      sources: [
        {
          title: "Python History",
          url: "https://www.python.org/doc/essays/blurb/",
          publisher: "Python Software Foundation",
          domain: "python.org",
        },
      ],
    },
    {
      id: "C4",
      claim_text: "The Eiffel Tower opened to the public in 1889.",
      claim_type: "date",
      page_reference: "p. 4",
      evidence_snippet: "The Eiffel Tower opened to the public in 1889.",
      verdict: "Verified",
      confidence: 94,
      explanation:
        "The Eiffel Tower's official history confirms it opened during the 1889 Exposition Universelle.",
      corrected_fact: "The Eiffel Tower opened to the public in 1889.",
      reasoning_label: "matches_current_sources",
      sources: [
        {
          title: "History of the Eiffel Tower",
          url: "https://www.toureiffel.paris/en/the-monument/history",
          publisher: "La Tour Eiffel",
          domain: "toureiffel.paris",
        },
      ],
    },
    {
      id: "C5",
      claim_text: "The world population reached 8 billion in 2022.",
      claim_type: "statistic",
      page_reference: "p. 4",
      evidence_snippet: "The world population crossed 8 billion in 2022.",
      verdict: "Verified",
      confidence: 96,
      explanation:
        "United Nations population materials confirm the world population crossed 8 billion in November 2022.",
      corrected_fact: "The world population reached 8 billion in November 2022.",
      reasoning_label: "matches_current_sources",
      sources: [
        {
          title: "8 Billion Population",
          url: "https://www.un.org/en/dayof8billion",
          publisher: "United Nations",
          domain: "un.org",
        },
      ],
    },
    {
      id: "C6",
      claim_text: "OpenAI was founded in 2015.",
      claim_type: "date",
      page_reference: "p. 5",
      evidence_snippet: "OpenAI was founded in 2015.",
      verdict: "Verified",
      confidence: 98,
      explanation:
        "OpenAI's official company information lists 2015 as its founding year.",
      corrected_fact: "OpenAI was founded in 2015.",
      reasoning_label: "matches_current_sources",
      sources: [
        {
          title: "About OpenAI",
          url: "https://openai.com/about/",
          publisher: "OpenAI",
          domain: "openai.com",
        },
      ],
    },
  ],
  models: {
    extraction: "demo",
    verification: "demo",
  },
  privacy: {
    filesStoredPermanently: false,
    note: "This is a demo report bundled with the UI.",
  },
};
