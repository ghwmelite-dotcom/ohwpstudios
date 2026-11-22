import { selectedWork } from './selected-work';
export interface RepositoryProject {slug:string;title:string;category:string;description:string;image:string;url:string|null;repository:string;kind:string;challenge:string;solution:string;capabilities:string[];readme_sha:string;readme_branch:string;previously_public:boolean}
const evidence={
  "AfriLab": {
    "repository": "https://github.com/ghwmelite-dotcom/AfriLab",
    "branch": "main",
    "sha": "215c346e1fd416b49f0d2e1de138fe9de05bb1d8"
  },
  "CediSense": {
    "repository": "https://github.com/ghwmelite-dotcom/CediSense",
    "branch": "master",
    "sha": "e6b5dad18f384b19f13914ffbbdf457a92b90bf2"
  },
  "ask-ozzy": {
    "repository": "https://github.com/ghwmelite-dotcom/ask-ozzy",
    "branch": "main",
    "sha": "6b286a10231fc4632a4ca7d533905e09bb49bd08"
  },
  "funeral-press": {
    "repository": "https://github.com/ghwmelite-dotcom/funeral-press",
    "branch": "main",
    "sha": "1e958b7048ed70ff9c5e2a954ab37f6f990fcc91"
  },
  "brilla-study-platform": {
    "repository": "https://github.com/ghwmelite-dotcom/brilla-study-platform",
    "branch": "main",
    "sha": "c30bf337be9ce0011918f145648cd4134d174346"
  },
  "Inbox-Guard": {
    "repository": "https://github.com/ghwmelite-dotcom/Inbox-Guard",
    "branch": "main",
    "sha": "f61e13d5d345b1c6e63069f05d4b3b3c10e3ac2b"
  },
  "ohcs-elibrary": {
    "repository": "https://github.com/ghwmelite-dotcom/ohcs-elibrary",
    "branch": "main",
    "sha": "dd24008e9af7b4bec9a30b3ef88129c7a3578cf1"
  },
  "xG-Oracle": {
    "repository": "https://github.com/ghwmelite-dotcom/xG-Oracle",
    "branch": "main",
    "sha": "8d607e0dfdd2d1535a8b12c4a89f9ca7857a4d0d"
  }
} as const;
export const githubPortfolio:RepositoryProject[]=[
...selectedWork.map(project=>{const key=project.slug==='afrilab'?'AfriLab':project.slug==='cedisense'?'CediSense':'ask-ozzy';return {...project,url:project.url,readme_sha:evidence[key].sha,readme_branch:evidence[key].branch,previously_public:true};}),
{
  "slug": "funeralpress",
  "title": "FuneralPress",
  "category": "Digital publishing",
  "description": "A Ghana-focused platform connecting print-ready funeral design, memorial pages and family planning tools in one browser-based experience.",
  "image": "/images/work/studies/funeralpress.svg",
  "url": "https://funeralpress.org",
  "repository": "https://github.com/ghwmelite-dotcom/funeral-press",
  "kind": "Repository project",
  "challenge": "Bring a complex, deeply personal planning process into a clear digital workspace.",
  "solution": "A React application combining design studios, memorial pages, guest books, budgeting and AI-assisted tribute drafting, with Cloudflare services and Paystack integration.",
  "capabilities": [
    "React",
    "Cloudflare",
    "Digital publishing",
    "Payments"
  ],
  "readme_sha": "1e958b7048ed70ff9c5e2a954ab37f6f990fcc91",
  "readme_branch": "main",
  "previously_public": false
},
{
  "slug": "brilla",
  "title": "Brilla",
  "category": "Education technology",
  "description": "An AI-assisted study platform connecting exam practice, tutoring and collaborative learning for Ghanaian students.",
  "image": "/images/work/studies/brilla.svg",
  "url": "https://brillaprep.org",
  "repository": "https://github.com/ghwmelite-dotcom/brilla-study-platform",
  "kind": "Repository project",
  "challenge": "Support structured exam preparation with tools that fit the way students learn and practise.",
  "solution": "A React and TypeScript PWA with practice workflows, an AI revision classroom, quiz battles, and distinct parent, teacher and administrative workspaces.",
  "capabilities": [
    "React",
    "TypeScript",
    "Workers AI",
    "Learning systems"
  ],
  "readme_sha": "c30bf337be9ce0011918f145648cd4134d174346",
  "readme_branch": "main",
  "previously_public": false
},
{
  "slug": "inboxguard",
  "title": "InboxGuard",
  "category": "Productivity tools",
  "description": "A Gmail companion that brings subscription discovery, unsubscribe workflows and assisted categorisation into the browser.",
  "image": "/images/work/studies/inboxguard.svg",
  "url": null,
  "repository": "https://github.com/ghwmelite-dotcom/Inbox-Guard",
  "kind": "Repository project",
  "challenge": "Help people understand and manage a crowded inbox without another separate dashboard to maintain.",
  "solution": "A Manifest V3 Chrome extension combining Gmail integration, subscription detection, configurable cleanup and optional AI-assisted labels.",
  "capabilities": [
    "Chrome extension",
    "Gmail integration",
    "Automation",
    "Manifest V3"
  ],
  "readme_sha": "f61e13d5d345b1c6e63069f05d4b3b3c10e3ac2b",
  "readme_branch": "main",
  "previously_public": false
},
{
  "slug": "ohcs-elibrary",
  "title": "OHCS E-Library",
  "category": "Knowledge systems",
  "description": "A civil-service knowledge platform combining digital resources, research tools, learning workflows and AI-assisted discovery.",
  "image": "/images/work/studies/ohcs-elibrary.svg",
  "url": "https://e-library.ohcsghana.org",
  "repository": "https://github.com/ghwmelite-dotcom/ohcs-elibrary",
  "kind": "Repository project",
  "challenge": "Make a large body of institutional knowledge easier to find, understand and use.",
  "solution": "A React and TypeScript platform organised around a document library, research and learning modules, backed by Cloudflare infrastructure and AI-assisted knowledge retrieval.",
  "capabilities": [
    "React",
    "Knowledge retrieval",
    "Cloudflare",
    "Learning systems"
  ],
  "readme_sha": "dd24008e9af7b4bec9a30b3ef88129c7a3578cf1",
  "readme_branch": "main",
  "previously_public": false
},
{
  "slug": "xg-oracle",
  "title": "xG Oracle",
  "category": "Data & automation",
  "description": "A football modelling pipeline connecting fixture data, probability estimates, Telegram delivery and a persistent record of outcomes.",
  "image": "/images/work/studies/xg-oracle.svg",
  "url": null,
  "repository": "https://github.com/ghwmelite-dotcom/xG-Oracle",
  "kind": "Repository project",
  "challenge": "Build an auditable automation pipeline rather than a collection of disconnected predictions.",
  "solution": "A Python workflow that fits a Dixon–Coles model, selects outputs against configured thresholds, delivers them to Telegram and records settlement in SQLite. Predictions are uncertain; no performance or return is promised.",
  "capabilities": [
    "Python",
    "Statistical modelling",
    "Telegram automation",
    "SQLite"
  ],
  "readme_sha": "8d607e0dfdd2d1535a8b12c4a89f9ca7857a4d0d",
  "readme_branch": "main",
  "previously_public": false
}
];
