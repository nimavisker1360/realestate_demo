import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleConsultants = [
  {
    name: "Sarah Johnson",
    title: "Senior Property Advisor",
    specialty: "Luxury Villas & Apartments",
    experience: "12 years",
    languages: ["English", "Turkish", "Arabic"],
    rating: 4.9,
    reviews: 127,
    deals: 89,
    phone: "+90 532 123 4567",
    whatsapp: "905321234567",
    email: "sarah.johnson@casacentral.com",
    linkedin: "https://linkedin.com/in/sarahjohnson",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face",
    bio: "Sarah is a seasoned real estate professional with over 12 years of experience in luxury property sales. She specializes in high-end villas and premium apartments.",
    available: true,
  },
  {
    name: "Michael Chen",
    title: "Investment Specialist",
    specialty: "Commercial & Investment Properties",
    experience: "8 years",
    languages: ["English", "Mandarin", "German"],
    rating: 4.8,
    reviews: 94,
    deals: 156,
    phone: "+90 533 234 5678",
    whatsapp: "905332345678",
    email: "michael.chen@casacentral.com",
    linkedin: "https://linkedin.com/in/michaelchen",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    bio: "Michael brings 8 years of expertise in commercial real estate and investment properties. He has helped numerous investors build profitable portfolios.",
    available: true,
  },
  {
    name: "Emma Williams",
    title: "Residential Expert",
    specialty: "Family Homes & Condos",
    experience: "6 years",
    languages: ["English", "French", "Spanish"],
    rating: 4.7,
    reviews: 78,
    deals: 67,
    phone: "+90 534 345 6789",
    whatsapp: "905343456789",
    email: "emma.williams@casacentral.com",
    linkedin: "https://linkedin.com/in/emmawilliams",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    bio: "Emma specializes in helping families find their perfect homes. Her attention to detail and understanding of family needs make her the ideal choice.",
    available: true,
  },
  {
    name: "David Martinez",
    title: "Rental Specialist",
    specialty: "Short & Long Term Rentals",
    experience: "5 years",
    languages: ["English", "Spanish", "Portuguese"],
    rating: 4.6,
    reviews: 52,
    deals: 234,
    phone: "+90 535 456 7890",
    whatsapp: "905354567890",
    email: "david.martinez@casacentral.com",
    linkedin: "https://linkedin.com/in/davidmartinez",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    bio: "David is the go-to expert for rental properties. Whether you need a short-term vacation home or a long-term residence, he's got you covered.",
    available: true,
  },
  {
    name: "Lisa Anderson",
    title: "New Development Consultant",
    specialty: "Off-Plan & New Projects",
    experience: "10 years",
    languages: ["English", "Russian", "Turkish"],
    rating: 4.9,
    reviews: 143,
    deals: 112,
    phone: "+90 536 567 8901",
    whatsapp: "905365678901",
    email: "lisa.anderson@casacentral.com",
    linkedin: "https://linkedin.com/in/lisaanderson",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    bio: "Lisa specializes in new developments and off-plan properties. She has exclusive access to the best new projects in the region.",
    available: false,
  },
  {
    name: "James Wilson",
    title: "Luxury Property Expert",
    specialty: "Waterfront & Premium Estates",
    experience: "15 years",
    languages: ["English", "Arabic", "Persian"],
    rating: 5.0,
    reviews: 189,
    deals: 78,
    phone: "+90 537 678 9012",
    whatsapp: "905376789012",
    email: "james.wilson@casacentral.com",
    linkedin: "https://linkedin.com/in/jameswilson",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    bio: "With 15 years in luxury real estate, James has unparalleled expertise in premium waterfront properties and exclusive estates.",
    available: true,
  },
];

async function seedConsultants() {
  console.log("🌱 Starting to seed consultants...");

  for (const consultant of sampleConsultants) {
    try {
      // Check if consultant already exists
      const existing = await prisma.consultant.findUnique({
        where: { email: consultant.email },
      });

      if (existing) {
        console.log(`⏭️  Consultant ${consultant.name} already exists, skipping...`);
        continue;
      }

      await prisma.consultant.create({
        data: consultant,
      });
      console.log(`✅ Created consultant: ${consultant.name}`);
    } catch (error) {
      console.error(`❌ Error creating ${consultant.name}:`, error.message);
    }
  }

  console.log("🎉 Seeding completed!");
}

seedConsultants()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
