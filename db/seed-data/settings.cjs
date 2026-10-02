// Every site_settings key, with the texts used in the design files.
// Shapes match `settingSchemas` in shared/src/schemas/settings.ts.

const { placeholderImage, PLACEHOLDER_PORTRAIT } = require('./helpers.cjs');

const POLICY_PLACEHOLDER_NOTE =
  '<p><em>Sample text — please replace with your final policy, reviewed by your legal advisor, from the admin panel.</em></p>';

module.exports = {
  gst_percent: 5,
  default_booking_percent: 20,

  company: {
    name: 'Norther Harier',
    legalName: 'Norther Harier Travels Pvt. Ltd.',
    tagline:
      'Handpicked Uttarakhand journeys, from Char Dham yatras to Himalayan treks, planned by people who live here.',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    supportPhone: '+91 90120 00000',
    email: 'hello@northerharier.com',
    address: '2nd floor, 118 Rajpur Road\nDehradun, Uttarakhand 248001',
    shortAddress: 'Rajpur Road, Dehradun',
    officeHours: 'Mon – Sat, 9:30 am – 7 pm',
    mapEmbedUrl: '',
  },

  social: {
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
    youtube: 'https://www.youtube.com/',
  },

  home: {
    hero: {
      overline: 'EXPLORE UTTARAKHAND',
      heading: 'Journeys into the heart of the Himalayas',
      subheading:
        'Char Dham yatras, snow escapes and river towns, planned end to end with verified stays and clear per person pricing.',
      primaryCtaLabel: 'Explore packages',
      secondaryCtaLabel: 'Plan my trip',
    },
    destinations: {
      overline: 'DESTINATIONS',
      title: 'Where would you like to go?',
      subtitle: '',
      linkLabel: 'All destinations',
    },
    packages: {
      overline: 'HANDPICKED PACKAGES',
      title: 'Popular trips this season',
      subtitle: '',
      linkLabel: 'View all packages',
    },
    offers: {
      overline: 'OFFERS FOR YOU',
      title: 'Save more on your next trip',
      subtitle: '',
      linkLabel: 'All offers',
    },
    gallery: {
      overline: 'GALLERY',
      title: 'Moments from our trips',
      subtitle: '',
      linkLabel: 'Open gallery',
    },
    about: {
      overline: 'ABOUT US',
      title: 'A Dehradun team planning Himalayan trips since 2014',
      subtitle:
        'We started with Char Dham yatras for families and now plan treks, snow trips and honeymoons across Uttarakhand, always with people we know on the ground.',
      linkLabel: 'Read our story',
      imageUrl: placeholderImage(2),
      stats: [
        { value: '12 yrs', label: 'on the road' },
        { value: '120+', label: 'local partners' },
        { value: '4.8 ★', label: 'average rating' },
      ],
    },
    testimonials: {
      overline: 'TRAVELLER STORIES',
      title: 'What travellers say',
      subtitle: '',
      linkLabel: '',
    },
    blog: {
      overline: 'FROM THE BLOG',
      title: 'Guides for the road',
      subtitle: '',
      linkLabel: 'All articles',
    },
    ctaBanner: {
      title: 'Not sure where to start?',
      text: 'Share your dates and group size, and we will plan it for you within 24 hours.',
      buttonLabel: 'Talk to a trip expert',
    },
  },

  about: {
    hero: {
      title: 'Travel made more meaningful',
      subtitle: 'We are a Dehradun team of planners, drivers and guides who grew up in these hills.',
      imageUrl: placeholderImage(0),
    },
    story: {
      overline: 'OUR STORY',
      title: 'It started with one family and one Char Dham yatra',
      paragraphs: [
        'In 2014 our founder planned a Char Dham trip for a family from Pune who could not find anyone they trusted. They told their friends, and those friends told theirs.',
        'Today we plan pilgrimages, treks, snow trips and honeymoons across Garhwal and Kumaon, still with the same idea: every hotel, driver and guide is someone we know personally.',
      ],
      imageUrl: placeholderImage(1),
    },
    valuesHeading: { overline: 'WHAT WE BELIEVE', title: 'Our mission and values' },
    values: [
      {
        title: 'People we know',
        text: 'Every hotel, driver and guide is someone our team has met and travelled with.',
      },
      {
        title: 'Honest pricing',
        text: 'Clear per person, per couple and group prices. What you see is what you pay.',
      },
      {
        title: 'Respect for the hills',
        text: 'Small groups, local partners and no single-use plastic on our treks.',
      },
    ],
    stats: [
      { value: '10K+', label: 'Travellers hosted' },
      { value: '50+', label: 'Destinations in Uttarakhand' },
      { value: '120+', label: 'Local partners' },
      { value: '4.8 / 5', label: 'Average rating' },
    ],
    teamHeading: { overline: 'OUR TEAM', title: 'The people behind your trip' },
    team: [
      { name: 'Arjun Negi', role: 'Founder, trip planner', photoUrl: PLACEHOLDER_PORTRAIT },
      { name: 'Meera Bisht', role: 'Head of operations', photoUrl: PLACEHOLDER_PORTRAIT },
      { name: 'Deepak Rawat', role: 'Lead trek guide', photoUrl: PLACEHOLDER_PORTRAIT },
      { name: 'Sana Qureshi', role: 'Customer support', photoUrl: PLACEHOLDER_PORTRAIT },
    ],
    cta: {
      title: 'Plan your trip with us',
      text: 'Tell us your dates and group size. A trip expert will call you back within 24 hours.',
      primaryLabel: 'Contact us',
      secondaryLabel: 'Browse packages',
    },
  },

  contact: {
    hero: {
      title: 'How can we help?',
      subtitle: 'Plan a trip, change a booking or ask anything. We reply within a few hours.',
      imageUrl: placeholderImage(3),
    },
    channels: [
      {
        title: 'Call us',
        value: '+91 98765 43210',
        note: 'Mon – Sat, 9:30 am – 7 pm',
        href: 'tel:+919876543210',
      },
      {
        title: 'Email',
        value: 'hello@northerharier.com',
        note: 'Reply within 4 hours',
        href: 'mailto:hello@northerharier.com',
      },
      {
        title: 'WhatsApp',
        value: '+91 98765 43210',
        note: 'Quick questions and updates',
        href: 'https://wa.me/919876543210',
      },
      {
        title: 'On-trip support',
        value: '+91 90120 00000',
        note: '24/7 while you travel',
        href: 'tel:+919012000000',
      },
    ],
    formTitle: 'Send us a message',
    formNote: 'We never share your details.',
    successMessage: 'Thank you, {name}. A trip expert will call you within 24 hours.',
    quickLinks: [
      { label: 'Cancellation and refunds', href: '/policies/cancellation' },
      { label: 'Using a coupon code', href: '/offers' },
      { label: 'Changing travel dates', href: '/policies/terms' },
    ],
  },

  booking: {
    pickupPoints: [
      'Dehradun railway station',
      'Jolly Grant airport',
      'Haridwar railway station',
      'Rishikesh bus stand',
    ],
    termsText:
      'I agree to the booking terms and cancellation policy. The booking amount confirms my seats; the balance is payable before departure.',
    freeCancellationNote: 'Free cancellation up to 15 days before travel',
    nextSteps: [
      { title: 'Yatra registration', text: 'We register all travellers and share the slips within 3 days.' },
      { title: 'Driver details', text: 'Driver name and cab number arrive by WhatsApp a day before.' },
      { title: 'On-trip support', text: 'Call +91 90120 00000 any time during your trip.' },
    ],
  },

  policies: {
    cancellation: {
      title: 'Cancellation policy',
      content: `${POLICY_PLACEHOLDER_NOTE}
<h2>Cancellations by you</h2>
<ul>
<li>15 days or more before travel: full refund of the amount paid.</li>
<li>Between 15 and 7 days before travel: 50% refund.</li>
<li>Less than 7 days before travel: no refund.</li>
</ul>
<h2>Date changes</h2>
<p>You can change your travel date once for free, up to 10 days before travel, subject to availability.</p>
<h2>Cancellations by us</h2>
<p>If we cancel because of weather, road closures or government orders, we offer a new date or a full refund.</p>`,
    },
    privacy: {
      title: 'Privacy policy',
      content: `${POLICY_PLACEHOLDER_NOTE}
<h2>What we collect</h2>
<p>Your name, email, phone number and traveller details, used only to plan and run your trip.</p>
<h2>Payments</h2>
<p>Payments are processed by Razorpay. We never see or store your card details.</p>
<h2>Sharing</h2>
<p>We share traveller details only with the hotels, drivers and authorities needed for your trip.</p>`,
    },
    terms: {
      title: 'Terms and conditions',
      content: `${POLICY_PLACEHOLDER_NOTE}
<h2>Bookings</h2>
<p>A booking is confirmed once the booking amount is paid. The balance is due before departure.</p>
<h2>Prices</h2>
<p>Prices are shown before GST. GST is added at checkout.</p>
<h2>Travel in the mountains</h2>
<p>Itineraries can change because of weather or road conditions. Extra costs from such changes are payable by the traveller.</p>`,
    },
  },

  seo: {
    defaultTitle: 'Norther Harier | Uttarakhand tour packages, Char Dham and Himalayan treks',
    titleTemplate: '%s | Norther Harier',
    description:
      'Handpicked Uttarakhand journeys: Char Dham yatras, Kedarnath, Auli, Rishikesh and Himalayan treks, planned by a Dehradun team with verified stays and clear pricing.',
    ogImageUrl: placeholderImage(0),
  },

  email: {
    senderName: 'Norther Harier',
    footerText: 'Norther Harier Travels Pvt. Ltd. · 118 Rajpur Road, Dehradun · +91 98765 43210',
  },

  pages: {
    packages: {
      title: 'Find your perfect journey',
      subtitle:
        'Pilgrimages, treks and hill holidays across Uttarakhand, with per person and per couple prices.',
      imageUrl: placeholderImage(1),
    },
    destinations: {
      title: 'Explore Uttarakhand',
      subtitle: 'From the shrines of Garhwal to the lakes and forests of Kumaon.',
      imageUrl: placeholderImage(0),
    },
    offers: {
      title: 'Offers and coupon codes',
      subtitle: 'Apply a code at checkout. One coupon per booking.',
      imageUrl: placeholderImage(4),
      steps: [
        'Copy a code below that fits your trip.',
        'Pick a package, then paste the code in the booking card.',
        'The discount shows in your total before you pay.',
      ],
      termsText:
        'Coupons apply to the package price before GST. Only one coupon per booking. Offers cannot be exchanged for cash and may be withdrawn after the validity date.',
    },
    gallery: {
      title: 'Gallery',
      subtitle: 'Photos from our trips and our travellers across Uttarakhand.',
      imageUrl: placeholderImage(2),
    },
    blog: {
      title: 'Travel stories and guides',
      subtitle: 'Tips, itineraries and stories from our team in Uttarakhand.',
      imageUrl: placeholderImage(3),
    },
  },
};
