// Single source of truth for the site's copy and contact details.
// Text follows the client's content document (موقع شركة الفيصل للمحاماة.pdf).

export const site = {
  name: 'شركة الفيصل للمحاماة والاستشارات القانونية',
  shortName: 'الفيصل',
  tagline: ['محامون', 'مستشارون', 'محكمون'],
  url: 'https://www.alfaisllaw.com',
  domain: 'www.alfaisllaw.com',
  description:
    'شركة الفيصل للمحاماة والاستشارات القانونية في مكة المكرمة: منظومة قانونية متكاملة في التصفيات والإفلاس، والتركات والأوقاف، والشركات والاستثمار، والأصول العقارية، والنزاعات، والتحكيم والوساطة.',
  consultUrl: 'https://uhearu.com',
  commercialRegistry: '4031239047',
} as const;

export const contact = {
  phones: [
    { display: '054 545 5449', tel: '+966545455449', label: 'جوال' },
    { display: '059 144 0066', tel: '+966591440066', label: 'جوال' },
    { display: '012 565 5506', tel: '+966125655506', label: 'هاتف' },
  ],
  whatsapp: '966545455449',
  email: 'Alfaisllaw@gmail.com',
  address: {
    country: 'المملكة العربية السعودية',
    city: 'مكة المكرمة',
    line: 'العوالي – المحيسني سنتر',
  },
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('المحيسني سنتر، العوالي، مكة المكرمة'),
} as const;

export type NavItem = { label: string; href: string; soon?: boolean };

// Only the home page exists for now: each item scrolls to its section here.
// When the inner pages are built, point these hrefs at the pages.
export const nav: NavItem[] = [
  { label: 'الرئيسية', href: '#top' },
  { label: 'من نحن', href: '#about' },
  { label: 'خبراتنا', href: '#expertise' },
  { label: 'منهجيتنا', href: '#method' },
  // «فريقنا» returns here when the team page (page 3 of the PDF) is built.
  { label: 'تواصل معنا', href: '#contact' },
];

export const hero = {
  eyebrow: site.name,
  title: ['عندما تتعقد التفاصيل…', 'تحتاج إلى منظومة قانونية متكاملة'],
  body: [
    'في شركة الفيصل، لا نتعامل مع الملف القانوني باعتباره قضية منفصلة، بل ننظر إلى الصورة كاملة؛ من الحقوق والالتزامات إلى الأصول والعقود والنزاعات والقرارات المرتبطة بها.',
    'نجمع بين الخبرة القضائية والمعرفة القانونية والعمل المؤسسي، لنقدم حلولًا قانونية مدروسة للملفات التي تحتاج إلى أكثر من معالجة تقليدية.',
  ],
  cta: 'تواصل معنا',
};

export const stats = {
  label: 'الأرقام',
  lead: { prefix: 'أكثر من', value: 6750, unit: 'عميل' },
  subtitle: ['خبرة تتراكم…', 'وثقة تُبنى مع كل ملف'],
  items: [
    { value: 400, label: 'أصل عقاري' },
    { value: 25, label: 'تركة كبيرة' },
    { value: 17, label: 'تصفية تجارية' },
    { value: 40, label: 'خطة تسويقية' },
    { value: 640, label: 'قضية تجارية' },
    { value: 1230, label: 'قضية جزائية' },
    { value: 1730, label: 'قضايا منوعة' },
    { value: 6300, label: 'استشارة قانونية' },
    { value: 260, label: 'صياغة للعقود' },
  ],
};

export const story = {
  label: 'من نحن',
  title: 'ليست كل الملفات قضية',
  body: [
    'بعض الملفات تبدأ كقضية، لكنها في الحقيقة منظومة من التفاصيل المتداخلة.',
    'تركة، أصول، التزامات، نزاعات، عقود، مفاوضات أو قرارات تحتاج إلى إدارة متكاملة.',
    'وهنا تأتي قيمة الخبرة.',
  ],
  words: ['تركة', 'أصول', 'التزامات', 'نزاعات', 'عقود', 'مفاوضات', 'قرارات'],
  closing: ['نقرأ التفاصيل،', 'نربط المسارات، ونبني الحل.'],
};

export const expertise = {
  label: 'خبراتنا',
  title: 'خبرتنا حيث تتقاطع التفاصيل',
  items: [
    { title: 'التصفيات والإفلاس', body: 'إدارة الملفات القانونية للتصفيات والإفلاس وإعادة التنظيم المالي.' },
    { title: 'التركات والأوقاف', body: 'إدارة وتصفية التركات والأصول الموروثة والأوقاف.' },
    { title: 'الشركات والاستثمار', body: 'التأسيس والحوكمة والاستثمار والاندماج والاستحواذ والالتزام.' },
    { title: 'الأصول العقارية', body: 'المعالجة القانونية للأصول وتجهيزها ومتابعة أعمال بيعها.' },
    { title: 'النزاعات', body: 'التجارية والإدارية والجزائية والعمالية والعقارية والأحوال الشخصية.' },
    { title: 'التحكيم والوساطة', body: 'التحكيم المحلي والدولي والوساطة والتفاوض والصلح.' },
  ],
};

export const method = {
  label: 'منهجيتنا',
  title: ['من أول مستند…', 'إلى آخر إجراء'],
  steps: ['نفهم', 'نخطط', 'نعالج', 'ننفذ', 'نوثق'],
  body: 'من دراسة الملف وتحديد المخاطر، إلى بناء المسار المناسب ومتابعة الإجراءات والتوثيق.',
  statement: ['لأن الملفات الكبيرة لا تُدار بالاجتهاد الفردي…', 'بل بمنظومة.'],
  cta: 'تعرف على الفيصل',
};

export const values = {
  label: 'قيمنا',
  title: 'ما الذي يميز طريقة عملنا؟',
  items: [
    { title: 'الشفافية', body: 'الثقة أساس تعاملنا.' },
    { title: 'السرية', body: 'نحفظ خصوصية عملائنا وملفاتهم.' },
    { title: 'الاحترافية', body: 'نلتزم بأعلى المعايير المهنية.' },
    { title: 'الابتكار', body: 'نصنع حلولًا قانونية وقائية واستباقية.' },
    { title: 'التميز', body: 'نسعى دائمًا لتجاوز التوقعات.' },
    { title: 'المؤسسية', body: 'وضوح المسؤوليات والإجراءات والحوكمة.' },
  ],
};

export const closing = {
  label: 'تواصل معنا',
  lead: 'كل ملف يضيف إلى خبرتنا… وكل عميل يضيف إلى مسؤوليتنا.',
  record: {
    value: 6750,
    unit: 'عميل',
    text: 'خبرة تراكمية في التعامل مع جميع الملفات القانونية والقضائية والتجارية والعقارية.',
  },
  title: 'لنتحدث عن ملفك',
  body: ['لديك ملف يحتاج إلى خبرة قانونية متخصصة؟', 'ابدأ بالتواصل مع فريق الفيصل.'],
};

export const formatNumber = (n: number) => n.toLocaleString('en-US');
