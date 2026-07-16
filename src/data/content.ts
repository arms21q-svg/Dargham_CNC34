export type Lang = 'ar' | 'en'

export interface Translations {
  nav: {
    home: string
    works: string
    allWorks: string
    about: string
    faq: string
    contact: string
    saved: string
  }
  home: {
    heroTitle: string
    heroSubtitle: string
    heroDesc: string
    contactUs: string
    ourWorks: string
    viewAll: string
    featuredWorks: string
    whyUs: string
    whyUsItems: string[]
  }
  works: {
    title: string
    subtitle: string
    featured: string
    allWorks: string
    categories: string
    search: string
    searchPlaceholder: string
    resultsCount: string
    noResults: string
    save: string
    saved: string
    download: string
    details: string
    viewDetails: string
    materials: string
    dimensions: string
    category: string
    related: string
    filterAll: string
  }
  about: {
    title: string
    subtitle: string
    story: string
    storyText: string
    mission: string
    missionText: string
    vision: string
    visionText: string
    stats: { value: string; label: string }[]
  }
  faq: {
    title: string
    subtitle: string
    items: { q: string; a: string }[]
  }
  contact: {
    title: string
    subtitle: string
    name: string
    email: string
    phone: string
    message: string
    send: string
    success: string
    sendAnother: string
    whatsappNote: string
    address: string
    followUs: string
    whatsapp: string
    facebook: string
    openMaps: string
    location: string
  }
  footer: {
    rights: string
    tagline: string
  }
  common: {
    back: string
    loading: string
  }
}

export const translations: Record<Lang, Translations> = {
  ar: {
    nav: {
      home: 'الرئيسية',
      works: 'أعمالنا',
      allWorks: 'جميع الأعمال',
      about: 'من نحن',
      faq: 'أسئلة شائعة',
      contact: 'تواصل معنا',
      saved: 'المحفوظات',
    },
    home: {
      heroTitle: 'ضرغام CNC',
      heroSubtitle: 'من فكرتك… إلى قطعة خشبية تفخر بها',
      heroDesc:
        'نحوّل صورك وتصاميمك إلى جداريات وأبواب وديكور خشبي بدقة CNC. جودة فاخرة، تشطيب أنيق، وتنفيذ حسب مقاسك — خدمة في كل العراق.',
      contactUs: 'تواصل معنا',
      ourWorks: 'أعمالنا',
      viewAll: 'عرض جميع الأعمال',
      featuredWorks: 'أعمال مميزة',
      whyUs: 'لماذا ضرغام؟',
      whyUsItems: [
        'دقة نحت عالية بآلات CNC حديثة',
        'تصميم مخصص حسب فكرتك أو صورتك',
        'أخشاب طبيعية مختارة بعناية',
        'التزام بمواعيد التسليم',
      ],
    },
    works: {
      title: 'أعمالنا',
      subtitle: 'استكشف مجموعة من أفضل تصاميمنا الخشبية',
      featured: 'أعمال مميزة',
      allWorks: 'جميع الأعمال',
      categories: 'التصنيفات',
      search: 'بحث',
      searchPlaceholder: 'ابحث عن تصميم...',
      resultsCount: 'نتيجة',
      noResults: 'لا توجد نتائج مطابقة',
      save: 'حفظ',
      saved: 'محفوظ',
      download: 'تحميل',
      details: 'التفاصيل',
      viewDetails: 'عرض التفاصيل',
      materials: 'الخامات',
      dimensions: 'الأبعاد',
      category: 'التصنيف',
      related: 'أعمال مشابهة',
      filterAll: 'الكل',
    },
    about: {
      title: 'من نحن',
      subtitle: 'قصة شغف بالخشب والإبداع',
      story: 'قصتنا',
      storyText:
        'بدأت رحلة ضرغام CNC من شغف عميق بفن النحت على الخشب في العراق. نجمع بين الحرفية العراقية الأصيلة وتقنية CNC الحديثة لنقدم لك قطعاً فريدة تعكس ذوقك وتضيف لمسة فاخرة لمساحتك.',
      mission: 'مهمتنا',
      missionText:
        'تقديم تصاميم خشبية استثنائية تجمع بين الجمال والوظيفة، مع الالتزام بأعلى معايير الجودة والدقة.',
      vision: 'رؤيتنا',
      visionText:
        'أن نكون الخيار الأول لعشاق التصاميم الخشبية الفاخرة في العراق، مع الابتكار المستمر في التقنيات والتصاميم.',
      stats: [
        { value: '+500', label: 'مشروع منجز' },
        { value: '+8', label: 'سنوات خبرة' },
        { value: '98%', label: 'رضا العملاء' },
        { value: '+50', label: 'تصميم حصري' },
      ],
    },
    faq: {
      title: 'أسئلة شائعة',
      subtitle: 'إجابات على أكثر الأسئلة شيوعاً',
      items: [
        {
          q: 'ما هي تقنية CNC؟',
          a: 'CNC هي تقنية تحكم رقمي بالحاسوب تتيح نحت الخشب بدقة عالية جداً، مما يضمن تنفيذ التصاميم المعقدة بشكل مثالي.',
        },
        {
          q: 'كم يستغرق تنفيذ الطلب؟',
          a: 'يعتمد على حجم وتعقيد التصميم. عادةً من 5 إلى 21 يوم عمل. نزودك بجدول زمني واضح عند تأكيد الطلب.',
        },
        {
          q: 'هل يمكنني تقديم تصميم خاص؟',
          a: 'بالتأكيد! نقبل التصاميم المخصصة ونساعدك في تحويل فكرتك إلى واقع بتصميم ثلاثي الأبعاد قبل التنفيذ.',
        },
        {
          q: 'ما أنواع الخشب المتوفرة؟',
          a: 'نوفر مجموعة واسعة تشمل الجوز، الماهوجني، خشب الزان، عرعر، والخشب الصناعي حسب احتياجاتك.',
        },
        {
          q: 'هل تقدمون خدمة التوصيل؟',
          a: 'نعم، نوفر خدمة التوصيل والتركيب داخل بغداد وجميع المحافظات العراقية مع تغليف آمن لحماية المنتج.',
        },
        {
          q: 'ما سياسة الضمان؟',
          a: 'نقدم ضماناً لمدة سنة على جميع منتجاتنا ضد عيوب التصنيع، مع خدمة صيانة مجانية خلال أول 6 أشهر.',
        },
      ],
    },
    contact: {
      title: 'تواصل معنا',
      subtitle: 'نحن هنا لمساعدتك في تحقيق رؤيتك',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      message: 'رسالتك',
      send: 'إرسال عبر واتساب',
      success: 'تم فتح واتساب — اضغط «إرسال» هناك لإكمال رسالتك.',
      sendAnother: 'رسالة جديدة',
      whatsappNote: 'املأ النموذج وسنفتح واتساب مباشرة مع رسالتك جاهزة.',
      address: 'بغداد، العراق',
      followUs: 'تابعنا',
      whatsapp: 'تواصل عبر واتساب',
      facebook: 'تابعنا على فيسبوك',
      openMaps: 'عرض الموقع على الخريطة',
      location: 'موقعنا على الخريطة',
    },
    footer: {
      rights: 'جميع الحقوق محفوظة',
      tagline: 'فن النحت على الخشب بتقنية CNC',
    },
    common: {
      back: 'رجوع',
      loading: 'جاري التحميل...',
    },
  },
  en: {
    nav: {
      home: 'Home',
      works: 'Our Works',
      allWorks: 'All Works',
      about: 'About Us',
      faq: 'FAQ',
      contact: 'Contact',
      saved: 'Saved',
    },
    home: {
      heroTitle: 'Dorgham CNC',
      heroSubtitle: 'From your idea… to wood you’ll be proud of',
      heroDesc:
        'We turn your photos and sketches into CNC wall art, doors, and décor. Premium finish, exact sizing, and delivery across Iraq.',
      contactUs: 'Contact Us',
      ourWorks: 'Our Works',
      viewAll: 'View All Works',
      featuredWorks: 'Featured Works',
      whyUs: 'Why Dorgham?',
      whyUsItems: [
        'High-precision carving with modern CNC',
        'Custom work from your idea or photo',
        'Carefully selected natural woods',
        'Reliable delivery timelines',
      ],
    },
    works: {
      title: 'Our Works',
      subtitle: 'Explore our finest wooden design collection',
      featured: 'Featured Works',
      allWorks: 'All Works',
      categories: 'Categories',
      search: 'Search',
      searchPlaceholder: 'Search for a design...',
      resultsCount: 'results',
      noResults: 'No matching results found',
      save: 'Save',
      saved: 'Saved',
      download: 'Download',
      details: 'Details',
      viewDetails: 'View Details',
      materials: 'Materials',
      dimensions: 'Dimensions',
      category: 'Category',
      related: 'Related Works',
      filterAll: 'All',
    },
    about: {
      title: 'About Us',
      subtitle: 'A story of passion for wood and creativity',
      story: 'Our Story',
      storyText:
        'Dorgham CNC began from a deep passion for wood carving art in Iraq. We combine authentic Iraqi craftsmanship with modern CNC technology to deliver unique pieces that reflect your taste and add a luxurious touch to your space.',
      mission: 'Our Mission',
      missionText:
        'To deliver exceptional wooden designs that blend beauty and functionality, while maintaining the highest standards of quality and precision.',
      vision: 'Our Vision',
      visionText:
        'To be the first choice for premium wooden design enthusiasts in the region, with continuous innovation in techniques and designs.',
      stats: [
        { value: '500+', label: 'Projects Done' },
        { value: '8+', label: 'Years Experience' },
        { value: '98%', label: 'Client Satisfaction' },
        { value: '50+', label: 'Exclusive Designs' },
      ],
    },
    faq: {
      title: 'FAQ',
      subtitle: 'Answers to the most common questions',
      items: [
        {
          q: 'What is CNC technology?',
          a: 'CNC is Computer Numerical Control technology that enables wood carving with extreme precision, ensuring perfect execution of complex designs.',
        },
        {
          q: 'How long does an order take?',
          a: 'It depends on the size and complexity of the design. Typically 5 to 21 business days. We provide a clear timeline upon order confirmation.',
        },
        {
          q: 'Can I submit a custom design?',
          a: 'Absolutely! We accept custom designs and help you turn your idea into reality with a 3D preview before production.',
        },
        {
          q: 'What types of wood are available?',
          a: 'We offer a wide range including oak, walnut, mahogany, beech, and engineered wood based on your needs.',
        },
        {
          q: 'Do you offer delivery service?',
          a: 'Yes, we provide delivery and installation within and outside the city with secure packaging to protect your product.',
        },
        {
          q: 'What is the warranty policy?',
          a: 'We offer a one-year warranty on all products against manufacturing defects, with free maintenance during the first 6 months.',
        },
      ],
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'We are here to help bring your vision to life',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      message: 'Message',
      send: 'Send via WhatsApp',
      success: 'WhatsApp opened — tap Send there to complete your message.',
      sendAnother: 'New message',
      whatsappNote: 'Fill the form and we will open WhatsApp with your message ready.',
      address: 'Riyadh, Saudi Arabia',
      followUs: 'Follow Us',
      whatsapp: 'Chat on WhatsApp',
      facebook: 'Follow us on Facebook',
      openMaps: 'View on map',
      location: 'Our location on map',
    },
    footer: {
      rights: 'All rights reserved',
      tagline: 'Wood carving art with CNC technology',
    },
    common: {
      back: 'Back',
      loading: 'Loading...',
    },
  },
}

export type Category =
  | 'wallArt'
  | 'furniture'
  | 'decor'
  | 'doors'
  | 'panels'
  | 'custom'

export const categoryLabels: Record<Lang, Record<Category, string>> = {
  ar: {
    wallArt: 'فن جداري',
    furniture: 'أثاث',
    decor: 'ديكور',
    doors: 'أبواب',
    panels: 'ألواح منحوتة',
    custom: 'تصاميم مخصصة',
  },
  en: {
    wallArt: 'Wall Art',
    furniture: 'Furniture',
    decor: 'Decor',
    doors: 'Doors',
    panels: 'Carved Panels',
    custom: 'Custom Designs',
  },
}

export interface Product {
  id: string
  title: { ar: string; en: string }
  description: { ar: string; en: string }
  category: Category
  image: string
  materials: { ar: string; en: string }
  dimensions: { ar: string; en: string }
  featured: boolean
  colors: string[]
}

export const products: Product[] = [
  {
    id: '1',
    title: { ar: 'لوحة عربية فاخرة', en: 'Luxury Arabic Panel' },
    description: {
      ar: 'لوحة جدارية بنقوش عربية إسلامية معقدة، منحوتة بدقة على خشب الماهوجني الطبيعي.',
      en: 'Wall panel with intricate Islamic Arabic patterns, precisely carved on natural mahogany wood.',
    },
    category: 'wallArt',
    image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'ماهوجني طبيعي', en: 'Natural Mahogany' },
    dimensions: { ar: '120 × 80 سم', en: '120 × 80 cm' },
    featured: true,
    colors: ['#8B4513', '#D2691E', '#A0522D'],
  },
  {
    id: '2',
    title: { ar: 'طاولة قهوة منحوتة', en: 'Carved Coffee Table' },
    description: {
      ar: 'طاولة قهوة بتصميم عصري مع نقوش هندسية على سطح خشب البلوط.',
      en: 'Modern coffee table with geometric patterns carved on oak wood surface.',
    },
    category: 'furniture',
    image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'بلوط طبيعي', en: 'Natural Oak' },
    dimensions: { ar: '100 × 60 × 45 سم', en: '100 × 60 × 45 cm' },
    featured: true,
    colors: ['#DEB887', '#F5DEB3', '#D2B48C'],
  },
  {
    id: '3',
    title: { ar: 'باب منحوت كلاسيكي', en: 'Classic Carved Door' },
    description: {
      ar: 'باب خشبي فاخر بنقوش كلاسيكية تضفي أناقة على مدخل منزلك.',
      en: 'Premium wooden door with classic carvings that add elegance to your entrance.',
    },
    category: 'doors',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'جوز طبيعي', en: 'Natural Walnut' },
    dimensions: { ar: '220 × 90 سم', en: '220 × 90 cm' },
    featured: true,
    colors: ['#5C4033', '#3E2723', '#4E342E'],
  },
  {
    id: '4',
    title: { ar: 'مزهرية خشبية منحوتة', en: 'Carved Wooden Vase' },
    description: {
      ar: 'قطعة ديكور فنية بتصميم عربي أصيل، مثالية للرفوف والطاولات.',
      en: 'Artistic decor piece with authentic Arabic design, perfect for shelves and tables.',
    },
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'خشب زان', en: 'Beech Wood' },
    dimensions: { ar: '35 × 20 سم', en: '35 × 20 cm' },
    featured: true,
    colors: ['#C4A882', '#D4B896', '#B8956A'],
  },
  {
    id: '5',
    title: { ar: 'لوحة هندسية عصرية', en: 'Modern Geometric Panel' },
    description: {
      ar: 'تصميم هندسي معاصر يناسب الديكورات الحديثة والمينيمال.',
      en: 'Contemporary geometric design suitable for modern and minimalist decor.',
    },
    category: 'panels',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'خشب م engineered', en: 'Engineered Wood' },
    dimensions: { ar: '150 × 100 سم', en: '150 × 100 cm' },
    featured: false,
    colors: ['#E8E0D5', '#D5C4B1', '#C9B99A'],
  },
  {
    id: '6',
    title: { ar: 'رف كتب منحوت', en: 'Carved Bookshelf' },
    description: {
      ar: 'رف كتب بتصميم فريد يجمع بين الوظيفة والجمال الفني.',
      en: 'Bookshelf with unique design combining functionality and artistic beauty.',
    },
    category: 'furniture',
    image: 'https://images.unsplash.com/photo-1594620302200-ffee4a121ec5?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'بلوط وجوز', en: 'Oak & Walnut' },
    dimensions: { ar: '180 × 90 × 30 سم', en: '180 × 90 × 30 cm' },
    featured: false,
    colors: ['#8B7355', '#A0826D', '#6B5344'],
  },
  {
    id: '7',
    title: { ar: 'إطار مرآة فاخر', en: 'Luxury Mirror Frame' },
    description: {
      ar: 'إطار مرآة بنقوش عربية رقيقة يضيف لمسة فخامة لأي غرفة.',
      en: 'Mirror frame with delicate Arabic patterns adding a touch of luxury to any room.',
    },
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1618221195750-d11726b4e6a9?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'ماهوجني وذهبي', en: 'Mahogany & Gold' },
    dimensions: { ar: '90 × 60 سم', en: '90 × 60 cm' },
    featured: false,
    colors: ['#C4A882', '#FFD700', '#8B6914'],
  },
  {
    id: '8',
    title: { ar: 'لوحة مخصصة بتصميمك', en: 'Custom Design Panel' },
    description: {
      ar: 'ننفذ تصميمك الخاص بدقة عالية مع معاينة ثلاثية الأبعاد قبل التنفيذ.',
      en: 'We execute your custom design with high precision and 3D preview before production.',
    },
    category: 'custom',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'حسب الطلب', en: 'As Requested' },
    dimensions: { ar: 'حسب الطلب', en: 'As Requested' },
    featured: true,
    colors: ['#A0826D', '#C4A882', '#8B7355'],
  },
  {
    id: '9',
    title: { ar: 'لوحة طبيعة منحوتة', en: 'Nature Carved Panel' },
    description: {
      ar: 'تصميم مستوحى من الطبيعة بنقوش أوراق وأغصان على خشب الجوز.',
      en: 'Nature-inspired design with leaf and branch carvings on walnut wood.',
    },
    category: 'wallArt',
    image: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'جوز طبيعي', en: 'Natural Walnut' },
    dimensions: { ar: '100 × 70 سم', en: '100 × 70 cm' },
    featured: false,
    colors: ['#556B2F', '#6B8E23', '#8B7355'],
  },
  {
    id: '10',
    title: { ar: 'باب زجاجي منحوت', en: 'Carved Glass Door' },
    description: {
      ar: 'باب بتصميم عصري يجمع بين الخشب المنحوت والزجاج المزخرف.',
      en: 'Modern door design combining carved wood and decorative glass.',
    },
    category: 'doors',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'جوز وزجاج', en: 'Walnut & Glass' },
    dimensions: { ar: '230 × 100 سم', en: '230 × 100 cm' },
    featured: false,
    colors: ['#4E342E', '#FFFFFF', '#8D6E63'],
  },
  {
    id: '11',
    title: { ar: 'طقم ديكور عربي', en: 'Arabic Decor Set' },
    description: {
      ar: 'مجموعة قطع ديكور متناسقة بنقوش عربية تقليدية.',
      en: 'Coordinated decor set with traditional Arabic patterns.',
    },
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'خشب زان وماهوجني', en: 'Beech & Mahogany' },
    dimensions: { ar: 'متنوع', en: 'Various' },
    featured: false,
    colors: ['#C4A882', '#8B4513', '#D2691E'],
  },
  {
    id: '12',
    title: { ar: 'لوحة إسلامية كبيرة', en: 'Large Islamic Panel' },
    description: {
      ar: 'لوحة جدارية ضخمة بنقوش إسلامية تقليدية للقاعات والمجالس.',
      en: 'Large wall panel with traditional Islamic patterns for halls and majlis.',
    },
    category: 'panels',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&fm=webp&w=640&q=72',
    materials: { ar: 'ماهوجني فاخر', en: 'Premium Mahogany' },
    dimensions: { ar: '200 × 150 سم', en: '200 × 150 cm' },
    featured: true,
    colors: ['#5C4033', '#8B4513', '#A0522D'],
  },
]

export const slideImages = [
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&fm=webp&w=900&q=75',
  'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&fm=webp&w=900&q=75',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&fm=webp&w=900&q=75',
  'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&fm=webp&w=900&q=75',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&fm=webp&w=900&q=75',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&fm=webp&w=900&q=75',
]
