// Hero slides, gallery, blog posts and reviews from the design files.

const heroSlides = [
  {
    title: 'Kedarnath',
    region: 'Rudraprayag',
    caption: 'Kedarnath Temple at dawn',
    link_url: '/packages/kedarnath-yatra-package',
  },
  {
    title: 'Auli',
    region: 'Chamoli',
    caption: 'Snow slopes above Auli',
    link_url: '/packages/auli-snow-escape-for-couples',
  },
  {
    title: 'Rishikesh',
    region: 'Dehradun',
    caption: 'Ganga aarti at Triveni Ghat',
    link_url: '/packages/rishikesh-rafting-and-camping',
  },
  {
    title: 'Valley of Flowers',
    region: 'Chamoli',
    caption: 'Valley of Flowers in bloom',
    link_url: '/packages/valley-of-flowers-trek',
  },
];

// design/Gallery.dc.html: 15 photos.
const galleryImages = [
  { caption: 'Kedarnath at first light', place: 'Rudraprayag', category: 'temples' },
  { caption: 'Auli ropeway', place: 'Chamoli', category: 'snow' },
  { caption: 'Rafting at Shivpuri', place: 'Rishikesh', category: 'lakes_rivers' },
  { caption: 'Naini Lake evening', place: 'Nainital', category: 'lakes_rivers' },
  { caption: 'Tungnath trail', place: 'Chopta', category: 'treks' },
  { caption: 'Badrinath temple', place: 'Chamoli', category: 'temples' },
  { caption: 'Family group at Mussoorie', place: 'Dehradun', category: 'travellers' },
  { caption: 'Kedarkantha summit', place: 'Uttarkashi', category: 'treks' },
  { caption: 'Ganga aarti, Triveni Ghat', place: 'Rishikesh', category: 'temples' },
  { caption: 'Snowfall in Auli', place: 'Chamoli', category: 'snow' },
  { caption: 'Valley of Flowers', place: 'Chamoli', category: 'treks' },
  { caption: 'Honeymooners in Munsiyari', place: 'Pithoragarh', category: 'travellers' },
  { caption: 'Devprayag confluence', place: 'Tehri', category: 'lakes_rivers' },
  { caption: 'Winter camp, Dayara', place: 'Uttarkashi', category: 'snow' },
  { caption: 'Pilgrims at Kedarnath', place: 'Rudraprayag', category: 'travellers' },
];

// design/Blog.dc.html + BlogDetail.dc.html. Content is sanitised-safe HTML (h2, p, ul, li, strong, blockquote).
const blogPosts = [
  {
    title: 'The complete Kedarnath Yatra guide for 2026',
    slug: 'complete-kedarnath-yatra-guide-2026',
    category: 'planning',
    excerpt:
      'Registration, the best months to go, trek or helicopter, what to pack and where to stay on the way.',
    author_name: 'Deepak Rawat',
    author_role: 'Lead trek guide',
    read_minutes: 8,
    related_package: 'kedarnath-yatra-package',
    is_featured: true,
    published_at: '2026-09-20T09:00:00+05:30',
    content: `<p>Kedarnath is one of the most rewarding journeys in India, and also one of the most weather-dependent. Here is what we tell every traveller before they book.</p>
<h2>When to go</h2>
<p>The temple opens around Akshaya Tritiya (late April or May) and closes after Diwali. May, June, September and early October are the best months. Avoid July and August, when landslides often close the road.</p>
<h2>Registration</h2>
<p>Every pilgrim must register with the Uttarakhand tourism portal before travel. We complete this for you once your booking is confirmed.</p>
<h2>Trek, pony or helicopter?</h2>
<p>The 16 km trek from Gaurikund takes 6 to 8 hours. Ponies and palkis are available at the base. Helicopters fly from Phata and Guptkashi, but seats sell out weeks ahead in peak season.</p>
<blockquote><p><strong>Our tip:</strong> start the trek before 6 am. You will walk in cool air and reach before the afternoon clouds come in.</p></blockquote>
<h2>What to pack</h2>
<ul>
<li>Waterproof jacket and a warm layer, even in June</li>
<li>Trekking shoes you have already walked in</li>
<li>Small torch, basic medicines and ORS sachets</li>
<li>Photo ID and your yatra registration slip</li>
</ul>`,
  },
  {
    title: '10 places you should visit in Uttarakhand',
    slug: '10-places-to-visit-in-uttarakhand',
    category: 'guides',
    excerpt: 'From Chopta meadows to the lakes of Nainital, our pick for a first trip.',
    author_name: 'Arjun Negi',
    author_role: 'Founder, trip planner',
    read_minutes: 6,
    related_package: null,
    is_featured: false,
    published_at: '2026-09-12T09:00:00+05:30',
    content: `<p>Uttarakhand packs temples, glaciers, lakes and forests into one small state. If this is your first visit, start with these ten.</p>
<h2>For the mountains</h2>
<ul>
<li><strong>Chopta and Tungnath</strong>: easy meadows and the highest Shiva temple in the world.</li>
<li><strong>Auli</strong>: snow in winter, flowers in summer, Nanda Devi all year.</li>
<li><strong>Munsiyari</strong>: quiet mornings facing the Panchachuli peaks.</li>
</ul>
<h2>For the spirit</h2>
<ul>
<li><strong>Kedarnath</strong> and <strong>Badrinath</strong>, two of the Char Dham.</li>
<li><strong>Rishikesh</strong>, for yoga and the evening Ganga aarti.</li>
<li><strong>Devprayag</strong>, where the Alaknanda and Bhagirathi become the Ganga.</li>
</ul>
<h2>For a slower holiday</h2>
<ul>
<li><strong>Nainital</strong> and its lakes.</li>
<li><strong>Mussoorie</strong> and Landour.</li>
<li><strong>Jim Corbett</strong>, for a jungle weekend.</li>
<li><strong>Valley of Flowers</strong>, in bloom from July to September.</li>
</ul>`,
  },
  {
    title: 'How to plan your first Char Dham Yatra',
    slug: 'how-to-plan-your-first-char-dham-yatra',
    category: 'planning',
    excerpt: 'Registration, the best months, fitness tips and a packing list.',
    author_name: 'Meera Bisht',
    author_role: 'Head of operations',
    read_minutes: 7,
    related_package: 'char-dham-yatra-by-road',
    is_featured: false,
    published_at: '2026-08-28T09:00:00+05:30',
    content: `<p>The Char Dham Yatra covers Yamunotri, Gangotri, Kedarnath and Badrinath. By road it takes 10 to 12 days, and good planning makes all the difference.</p>
<h2>Pick the right month</h2>
<p>May–June and September–October are the most comfortable. The monsoon months bring landslides and long delays.</p>
<h2>Register early</h2>
<p>Registration is mandatory for every pilgrim. Popular dates fill quickly, so register as soon as your dates are fixed.</p>
<h2>Prepare your body</h2>
<p>Two of the four dhams need a trek. Start walking 4–5 km a day a month before you travel.</p>
<h2>Pack light, pack warm</h2>
<ul><li>Layers and a rain jacket</li><li>Comfortable walking shoes</li><li>Medicines for altitude and motion sickness</li></ul>`,
  },
  {
    title: 'Romantic Himalayan escapes for winter',
    slug: 'romantic-himalayan-escapes-for-winter',
    category: 'couples',
    excerpt: 'Snow views in Auli, lakeside evenings in Nainital, quiet Mukteshwar.',
    author_name: 'Sana Qureshi',
    author_role: 'Customer support',
    read_minutes: 5,
    related_package: 'auli-snow-escape-for-couples',
    is_featured: false,
    published_at: '2026-08-05T09:00:00+05:30',
    content: `<p>Winter in the hills is made for couples: crisp mornings, warm rooms and no summer crowds.</p>
<h2>Auli</h2>
<p>Ride the ropeway over the snow and watch Nanda Devi turn pink at sunset.</p>
<h2>Nainital</h2>
<p>Lakeside evenings, hot chocolate on Mall Road and boating when the sun is out.</p>
<h2>Mukteshwar</h2>
<p>A quiet orchard town with old cottages and wide Himalayan views. Perfect for doing nothing at all.</p>`,
  },
  {
    title: 'Eight Pahadi dishes to try on your trip',
    slug: 'eight-pahadi-dishes-to-try',
    category: 'food',
    excerpt: 'Kafuli, bhatt ki churkani, singori and where to eat them.',
    author_name: 'Meera Bisht',
    author_role: 'Head of operations',
    read_minutes: 4,
    related_package: null,
    is_featured: false,
    published_at: '2026-07-22T09:00:00+05:30',
    content: `<p>Garhwali and Kumaoni food is simple, seasonal and full of flavour. Ask for these on your trip.</p>
<ul>
<li><strong>Kafuli</strong>: spinach and fenugreek curry thickened with rice paste.</li>
<li><strong>Bhatt ki churkani</strong>: black soybean curry from Kumaon.</li>
<li><strong>Aloo ke gutke</strong>: spiced potatoes with jakhiya seeds.</li>
<li><strong>Mandua roti</strong>: finger-millet flatbread with ghee.</li>
<li><strong>Chainsoo</strong>: roasted black gram dal.</li>
<li><strong>Jhangora kheer</strong>: barnyard millet pudding.</li>
<li><strong>Bal mithai</strong>: Almora's chocolate-brown fudge with sugar balls.</li>
<li><strong>Singori</strong>: khoya sweet wrapped in a maalu leaf.</li>
</ul>`,
  },
  {
    title: 'Kedarkantha vs Brahmatal: which winter trek?',
    slug: 'kedarkantha-vs-brahmatal-winter-trek',
    category: 'treks',
    excerpt: 'Difficulty, snow, views and cost compared side by side.',
    author_name: 'Deepak Rawat',
    author_role: 'Lead trek guide',
    read_minutes: 6,
    related_package: 'kedarkantha-winter-trek',
    is_featured: false,
    published_at: '2026-07-09T09:00:00+05:30',
    content: `<p>Both are excellent winter treks for beginners. Here is how they compare.</p>
<h2>Difficulty</h2>
<p>Kedarkantha has one steep summit push; Brahmatal is more gradual but longer on ridge walks.</p>
<h2>Snow</h2>
<p>Kedarkantha usually holds snow from mid-December. Brahmatal gets deep snow later, from January.</p>
<h2>Views</h2>
<p>Kedarkantha gives a 360° summit view. Brahmatal is famous for Mt Trishul and Nanda Ghunti up close.</p>
<h2>Our pick</h2>
<p>For a first snow trek with a real summit, choose Kedarkantha.</p>`,
  },
  {
    title: 'A monsoon guide to the Valley of Flowers',
    slug: 'monsoon-guide-valley-of-flowers',
    category: 'guides',
    excerpt: 'When it blooms, how to reach Ghangaria and what to carry.',
    author_name: 'Deepak Rawat',
    author_role: 'Lead trek guide',
    read_minutes: 5,
    related_package: 'valley-of-flowers-trek',
    is_featured: false,
    published_at: '2026-06-18T09:00:00+05:30',
    content: `<p>The valley is open from June to October, but the flowers peak from mid-July to mid-August.</p>
<h2>Getting there</h2>
<p>Drive to Govindghat, then trek 10 km to Ghangaria, the base for both the valley and Hemkund Sahib.</p>
<h2>What to carry</h2>
<ul><li>A proper rain jacket and pack cover</li><li>Quick-dry clothes</li><li>Leech socks for the lower trail</li></ul>
<p>Respect the rules: no plucking flowers and no staying overnight inside the park.</p>`,
  },
];

// Home page testimonials (no package) + package reviews.
const reviews = [
  {
    package: 'kedarnath-yatra-package',
    name: 'Priya Sharma',
    trip_label: 'Kedarnath Yatra · May 2026',
    rating: 5,
    text: 'The Guptkashi stay, the trek support, the darshan timing: all sorted. We only had to show up.',
  },
  {
    package: 'auli-snow-escape-for-couples',
    name: 'Rahul & Neha Verma',
    trip_label: 'Auli Snow Escape · Jan 2026',
    rating: 5,
    text: 'Warm rooms, a private cab and a guide who knew every viewpoint in Auli. A perfect honeymoon.',
  },
  {
    package: 'char-dham-yatra-by-road',
    name: 'Anand Iyer',
    trip_label: 'Char Dham Yatra · Jun 2026',
    rating: 5,
    text: 'With my parents on the Char Dham route, they planned rest stops and helped at every temple.',
  },
  {
    package: 'kedarnath-yatra-package',
    name: 'Vikram Rawat',
    trip_label: 'Kedarnath Yatra · Oct 2025',
    rating: 5,
    text: 'Driver was careful on the mountain roads and the camp near the temple was warm and clean.',
  },
  {
    package: 'kedarnath-yatra-package',
    name: 'Sunita Joshi',
    trip_label: 'Kedarnath Yatra · Sep 2025',
    rating: 4,
    text: 'Well organised trip. The trek was tough for my mother but the team arranged a pony quickly.',
  },
  {
    package: 'kedarkantha-winter-trek',
    name: 'Karan Mehta',
    trip_label: 'Kedarkantha Trek · Dec 2025',
    rating: 5,
    text: 'Our trek leader was calm, funny and very safety-minded. The summit sunrise was unreal.',
  },
  {
    package: 'rishikesh-rafting-and-camping',
    name: 'Aditi Rao',
    trip_label: 'Rishikesh Rafting · Mar 2026',
    rating: 5,
    text: 'Clean tents, great food and a rafting guide who made everyone feel safe.',
  },
  {
    package: 'valley-of-flowers-trek',
    name: 'Rohan Das',
    trip_label: 'Valley of Flowers · Aug 2025',
    rating: 5,
    text: 'It rained every day and we still loved it. The guide knew the name of every flower.',
  },
  {
    package: 'nainital-and-mussoorie-holiday',
    name: 'The Kapoor family',
    trip_label: 'Nainital & Mussoorie · May 2026',
    rating: 4,
    text: 'Kids loved the boating and Kempty Falls. Family rooms were spacious.',
  },
  {
    package: 'jim-corbett-wildlife-weekend',
    name: 'Farah Khan',
    trip_label: 'Corbett Weekend · Feb 2026',
    rating: 5,
    text: 'We saw a tigress on the morning safari! The resort was lovely too.',
  },
  {
    package: 'rishikesh-yoga-retreat',
    name: 'Meenal Gupta',
    trip_label: 'Yoga Retreat · Apr 2026',
    rating: 5,
    text: 'Exactly the quiet reset I needed. Simple food, kind teachers, beautiful aarti.',
  },
];

module.exports = { heroSlides, galleryImages, blogPosts, reviews };
