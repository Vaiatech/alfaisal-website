// The English edition. Same shape as content.ts; every Arabic line has its counterpart here.
// Translated for the client's review — names follow common English transliteration.
export { navHref, pagePath, formatNumber } from './content';
export type { Page, NavItem } from './content';
import type { NavItem } from './content';

export const lang = 'en' as const;
export const base = '/en';

export const site = {
  name: 'Al-Faisal Law Firm & Legal Consultancy',
  shortName: 'Al-Faisal',
  tagline: ['Lawyers', 'Counsel', 'Arbitrators'],
  url: 'https://www.alfaisllaw.com',
  domain: 'www.alfaisllaw.com',
  description:
    'Al-Faisal Law Firm & Legal Consultancy in Makkah: an integrated legal practice in liquidation and bankruptcy, estates and endowments, corporate and investment, real estate assets, disputes, and arbitration and mediation.',
  consultUrl: 'https://uhearu.com',
  platform: { line: 'Tell us what happened, in your own words', sub: 'Al-Faisal Consultation Platform' },
  commercialRegistry: '4031239047',
};

export const contact = {
  phones: [
    { display: '054 545 5449', tel: '+966545455449', label: 'Mobile' },
    { display: '059 144 0066', tel: '+966591440066', label: 'Mobile' },
    { display: '012 565 5506', tel: '+966125655506', label: 'Office' },
  ],
  whatsapp: '966545455449',
  email: 'faislos@hotmail.com',
  address: {
    country: 'Saudi Arabia',
    city: 'Makkah',
    line: 'Al-Awali – Al-Awali Center',
  },
  // the firm's own pin (client notes, 15 Oct): شركة الفيصل للمحاماة — 21.362076, 39.8903367
  mapsUrl: 'https://maps.app.goo.gl/DM6aZqhUeASc7RKa7',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=21.362076,39.8903367',
  mapsEmbed: 'https://maps.google.com/maps?q=21.362076,39.8903367&hl=en&z=17&output=embed',
};

export const nav: NavItem[] = [
  { label: 'Home', href: '#top' },
  { label: 'Expertise', href: '#expertise' },
  { label: 'Methodology', href: '#method' },
  { label: 'Our team', href: '#team' },
  { label: 'Contact', href: '/contact/', page: 'contact' },
];

export const hero = {
  eyebrow: site.name,
  title: ['Expertise that understands the courts.', 'Insight that grasps the case.'],
  body: [
    'We combine judicial experience with in-depth legal analysis to build legal positions grounded in the facts, the law and its evidence. We weigh rights, obligations and legal consequences to offer a perspective that protects your interests and supports your decisions.',
  ],
  cta: 'Contact us',
};

export const stats = {
  label: 'Our record',
  lead: { prefix: 'More than', value: 6750, unit: 'clients' },
  subtitle: ['Experience that accumulates…', 'trust built with every file'],
  items: [
    { value: 400, label: 'Real estate assets' },
    { value: 25, label: 'Major estates' },
    { value: 17, label: 'Commercial liquidations' },
    { value: 40, label: 'Marketing plans' },
    { value: 640, label: 'Commercial cases' },
    { value: 1230, label: 'Criminal cases' },
    { value: 1730, label: 'Other cases' },
    { value: 6300, label: 'Legal consultations' },
    { value: 260, label: 'Contracts drafted' },
  ],
};

export const story = {
  label: 'Our methodology',
  // the last word is struck through, as «قضية» is in Arabic
  title: 'Not every file is a case',
  body: [
    'Some files begin as a case, but are in truth a system of interwoven details.',
    'An estate, assets, obligations, disputes, contracts, negotiations or decisions that call for integrated management.',
    'This is where expertise counts.',
  ],
  words: ['Estate', 'Assets', 'Obligations', 'Disputes', 'Contracts', 'Negotiations', 'Decisions'],
  closing: ['We read the details,', 'connect the paths, and build the solution.'],
};

export const expertise = {
  label: 'Expertise',
  title: 'From precision in the details to soundness in the solution',
  items: [
    { title: 'Liquidation & Bankruptcy', body: 'Legal management of liquidation, bankruptcy and financial restructuring files.' },
    { title: 'Estates & Endowments', body: 'Administration and settlement of estates, inherited assets and endowments.' },
    { title: 'Corporate & Investment', body: 'Incorporation, governance, investment, mergers and acquisitions, and compliance.' },
    { title: 'Real Estate Assets', body: 'Legal handling of assets, preparing them and following their sale through.' },
    { title: 'Disputes', body: 'Commercial, administrative, criminal, labour, real estate and personal status.' },
    { title: 'Arbitration & Mediation', body: 'Domestic and international arbitration, mediation, negotiation and settlement.' },
  ],
};

export const method = {
  label: 'Our methodology',
  title: ['From the first document…', 'to the final step'],
  steps: ['Understand', 'Plan', 'Resolve', 'Execute', 'Document'],
  body: 'From studying the file and identifying the risks, to building the right course of action, following the procedures through and documenting them.',
  statement: ['Because large files are not managed by individual effort…', 'but by a system.'],
  cta: 'Meet Al-Faisal',
};

export const values = {
  label: 'Our values',
  title: 'What sets our way of working apart?',
  items: [
    { title: 'Transparency', body: 'Trust is the foundation of how we work.' },
    { title: 'Confidentiality', body: 'We protect the privacy of our clients and their files.' },
    { title: 'Professionalism', body: 'We hold ourselves to the highest professional standards.' },
    { title: 'Innovation', body: 'We craft preventive, proactive legal solutions.' },
    { title: 'Excellence', body: 'We always strive to exceed expectations.' },
    { title: 'Institutional rigour', body: 'Clear responsibilities, procedures and governance.' },
  ],
};

export const closing = {
  label: 'Contact',
  lead: 'Every file adds to our experience… and every client adds to our responsibility.',
  record: {
    value: 6750,
    unit: 'clients',
    text: 'Accumulated experience across legal, judicial, commercial and real estate files of every kind.',
  },
  title: 'Let’s talk about your file',
  body: ['Do you have a file that needs specialised legal expertise?', 'Start by contacting the Al-Faisal team.'],
};

export const team = {
  label: 'Our team',
  pageTitle: 'The Al-Faisal Team',
  description:
    'The team of Al-Faisal Law Firm & Legal Consultancy: more than twenty lawyers and counsel under one leadership, in specialised legal departments each led by a specialist lawyer.',
  hero: {
    eyebrow: 'The Al-Faisal Team',
    title: ['Many areas of expertise…', 'under one leadership'],
    body: [
      'The Al-Faisal team brings together more than twenty lawyers and counsel, combining Sharia and legal specialisations with field and academic experience.',
      'The team works to an institutional method focused on quality of service, precision of procedure and prompt follow-up.',
    ],
    count: { value: 20, unit: 'lawyers & counsel' },
  },
  leadership: {
    label: 'Leadership',
    title: 'Management',
    members: [
      {
        label: 'Attorney',
        name: 'Dr. Abdulhadi bin Qulail Al-Khudaidi',
        role: 'Chief Executive Officer, Al-Faisal Law Firm',
        creds: 'Lawyer, arbitrator and legal counsel',
        photo: 'khudaidi',
        featured: false,
        bio: 'A former senior-ranking officer with more than 25 years of experience in investigations, legal consultancy and crisis management. He holds a PhD in Sharia and Law and is an accomplished expert in governance frameworks, risk management and international arbitration.',
      },
      {
        label: 'Attorney',
        name: 'Dr. Faisal bin Saad Al-Osaimi',
        role: 'General Manager, Al-Faisal Law Firm',
        creds: 'Lawyer, arbitrator and legal counsel',
        photo: 'osaimi',
        featured: true,
        bio: 'Eleven years of judicial experience in the commercial, criminal and administrative courts and more than ten years in training and academic teaching. He took part in drafting legislation at the Bureau of Experts at the Council of Ministers, holds a PhD in Sharia and Law, and is an expert in financial settlements, liquidation and legislative advisory.',
      },
      {
        label: 'Attorney',
        name: 'Abdulrahman bin Muraisi Al-Harthi',
        role: 'Director of Legal Services, Al-Faisal Law Firm',
        creds: 'Lawyer, arbitrator and legal counsel',
        photo: 'harthi',
        featured: false,
        bio: 'Ten years of judicial experience. He holds a Master’s in Sharia and Regulations and a Higher Diploma in Law from the Institute of Public Administration, and is an accomplished expert in building compliance systems, managing operations and leading legal teams.',
      },
    ],
  },
  groups: {
    label: 'Our legal departments',
    title: 'Every specialism, its own team',
    body: 'We work through specialised legal departments, each led by a specialist lawyer and bringing together lawyers and counsel in the same field.',
    hint: 'Hover over a department or its director’s portrait to see its scope of work.',
    items: [
      {
        name: 'Commercial Disputes, Liquidation & Bankruptcy',
        leadTitle: 'Department Director',
        leader: 'Waleed bin Mualli Al-Mutairi, Attorney',
        photo: 'waleed',
        scope: [
          'Commercial Court: commercial contracts, supply, distribution and agencies, franchising',
          'Partner disputes, dissolution of companies, shares and stakes',
          'Commercial papers, cheques and promissory notes',
          'Banking disputes, finance, guarantees and mortgages',
          'Commercial insurance and claims disputes',
          'Bankruptcy, liquidation and financial restructuring',
          'Intellectual property: trademarks, trade names and unfair competition',
          'Commercial arbitration',
          'Enforcement and objections to enforcement',
        ],
      },
      {
        name: 'Tenders, Government Contracts & Labour',
        leadTitle: 'Department Director',
        leader: 'Sahl bin Ameen Al-Garf, Attorney',
        photo: 'sahl',
        scope: [
          'Board of Grievances: contractor claims, change orders, extensions and penalties, withdrawal of works',
          'Competition and government procurement: qualification, exclusion, objections to awards',
          'Annulment of administrative decisions and compensation',
          'Real estate disputes: ownership, partition, endowments, title transfer',
          'Off-plan sales and developer disputes',
          'Construction contracts (FIDIC and government forms) and technical claims',
          'Commercial and residential leases and tenancy disputes',
          'Labour disputes, social insurance and labour penalties',
        ],
      },
      {
        name: 'Corporate, Compliance, Governance & Investment',
        leadTitle: 'Department Director',
        leader: 'Lama bint Abid Al-Zayyadi, Attorney',
        photo: null,
        scope: [
          'Company formation, ownership structures and foreign investment',
          'Articles of association, partner and shareholder agreements',
          'Governance: bylaws, boards of directors, committees, conflicts of interest',
          'Mergers and acquisitions and due diligence',
          'Regulatory compliance: data protection, anti-money laundering, competition',
          'Zakat and tax: objections, tax and customs committees',
          'Capital Market Authority disputes and the Committee for the Resolution of Securities Disputes',
          'Technology agreements, licensing and privacy',
        ],
      },
      {
        name: 'Criminal, Family, Estates & Private Wealth',
        leadTitle: 'Department Director',
        leader: 'Ahmed bin Ali Al-Zahrani, Attorney',
        photo: 'ahmed',
        scope: [
          'Estates, inheritance, partition of assets and wills',
          'Guardianship, custodianship and absentees',
          'Criminal cases: private rights, cybercrime, defamation, financial fraud',
          'Personal status: divorce, khulʿ, maintenance, custody, visitation, proof of marriage',
          'Forgery, breach of trust and embezzlement',
          'Blood money (diya), compensation (arsh) and accident cases',
          'Public rights and representation before the Public Prosecution',
          'Criminal objections, appeals and petitions for reconsideration',
        ],
      },
    ],
  },
};

export const contactPage = {
  label: 'Contact',
  pageTitle: 'Contact us',
  description:
    'Contact Al-Faisal Law Firm & Legal Consultancy in Makkah: phone, WhatsApp, email and address, or book your consultation directly.',
  title: 'Let’s talk about your file',
  lead: ['Do you have a file that needs specialised legal expertise?', 'Start by contacting the Al-Faisal team.'],
  channelsLabel: 'Ways to reach us',
  form: {
    label: 'Write to us',
    title: 'Tell us about your file',
    body: 'Fill in the details below and your message goes straight to the Al-Faisal team on WhatsApp.',
    topics: [
      'Liquidation & Bankruptcy',
      'Estates & Endowments',
      'Corporate & Investment',
      'Real Estate Assets',
      'Disputes',
      'Arbitration & Mediation',
      'General consultation',
    ],
    send: 'Send via WhatsApp',
    mail: 'or send it by email',
    privacy: 'Your details are not stored on this site; your message is sent directly from your device.',
  },
  visit: {
    label: 'Our location',
    title: 'Visit us in Makkah',
    directions: 'Directions',
    open: 'Open in Maps',
  },
  consult: {
    label: 'Consultation',
    title: 'Al-Faisal Consultation Platform',
    body: 'We will understand the facts, analyse your legal position and show you the best course of action.',
    modes: ['Voice', 'Text'],
    note: 'Paid consultation',
  },
};

export const ui = {
  skip: 'Skip to content',
  home: 'Home',
  mainNav: 'Main menu',
  menu: 'Menu',
  soon: 'Soon',
  toDay: 'Light theme',
  toNight: 'Dark theme',
  consultLine: 'Tell us what happened',
  consultSub: 'Al-Faisal Consultation Platform',
  other: { code: 'ar', label: 'العربية', short: 'ع' },
  outro: 'Al-Faisal',
  registry: 'Commercial Registration',
  backToTop: 'Back to top',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  address: 'Address',
  openMap: 'Open the map',
  startChat: 'Start a chat',
  writeUs: 'Write to us',
  map: 'Map',
  recordLead: ['Every file adds to our experience…', 'and every client adds to our responsibility.'],
  fileDetails: 'Details of the file',
  scope: 'Scope of work',
  scopeOf: 'Scope of work:',
  form: {
    name: 'Name',
    phone: 'Mobile number',
    topic: 'Subject of consultation',
    message: 'A brief note about your file',
    errName: 'Please enter your name.',
    errPhone: 'Please enter a valid mobile number.',
    errMsg: 'Please write a short note about your file (at least ten characters).',
    greet: 'Hello,',
    signoff: '— Sent from the Al-Faisal Law Firm website',
    subject: 'Consultation request',
  },
  terms: [
    'Liquidation & Bankruptcy', 'Estates & Endowments', 'Corporate & Investment', 'Real Estate Assets', 'Arbitration & Mediation',
    'Commercial Court', 'Board of Grievances', 'Government Procurement', 'Personal Status', 'Governance',
    'Regulatory Compliance', 'Intellectual Property', 'Zakat & Tax', 'Mergers & Acquisitions', 'Construction Contracts',
    'Tenancy Disputes', 'Labour Disputes', 'Criminal Cases', 'Wills & Inheritance', 'Off-plan Sales',
    'Commercial Papers', 'Commercial Insurance', 'Enforcement Disputes', 'Private Wealth', 'Securities',
  ],
};
