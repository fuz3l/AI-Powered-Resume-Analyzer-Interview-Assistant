import { loadEnv } from "../lib/load-env";
loadEnv();

import { appwriteDb } from "../lib/appwrite/db";
import { calculateMatchScore } from "../lib/matching/engine";

async function main() {
  console.log("Checking candidate count...");
  const existing = await appwriteDb.listCandidates();
  const candA = existing.find((c: any) => c.anonymizedName === "Candidate A" || c.name === "Elena Rostova");

  let candidateId = candA ? (candA.id || candA.$id) : null;

  if (!candidateId) {
    console.log("Seeding 5th candidate: Elena Rostova (Candidate A)...");
    const rawText = `Elena Rostova
elena.rostova.design@gmail.com | (555) 432-8765 | San Francisco, CA

Professional Summary:
Creative Graphic and Digital Marketing Designer with 2 years of experience crafting visual brand identities, digital illustrations, social media assets, and UX wireframes in Figma. Experienced in content management and SEO optimization.

Skills:
Figma, Adobe Creative Suite, Illustrator, Graphic Design, Social Media Marketing, Copywriting, SEO, Canva, Brand Identity

Experience:
Digital Design Specialist | Lumen Studio (2022 - Present)
- Designed visual marketing collateral, banners, and vector illustrations for 30+ client brand campaigns.
- Created interactive Figma UI wireframes and user flow prototypes for mobile consumer applications.
- Coordinated with marketing team to optimize social media engagement and digital brand presence.

Junior Marketing Associate | Apex Retail (2021 - 2022)
- Produced marketing copywriting, email newsletters, and content assets.
- Monitored Google Analytics and keyword SEO rankings for ecommerce product landing pages.

Education:
B.A. in Graphic Design & Digital Arts | San Francisco State University (2021)
`;

    const parsedJson = {
      name: "Elena Rostova",
      email: "elena.rostova.design@gmail.com",
      skills: ["Figma", "Adobe Illustrator", "Graphic Design", "SEO"],
      workExperience: [
        {
          company: "Lumen Studio",
          role: "Digital Design Specialist",
          duration: "2022 - Present",
          bullets: [
            "Designed visual marketing collateral, banners, and vector illustrations for 30+ client brand campaigns.",
            "Created interactive Figma UI wireframes and user flow prototypes for mobile consumer applications.",
            "Coordinated with marketing team to optimize social media engagement and digital brand presence."
          ]
        },
        {
          company: "Apex Retail",
          role: "Junior Marketing Associate",
          duration: "2021 - 2022",
          bullets: [
            "Produced marketing copywriting, email newsletters, and content assets.",
            "Monitored Google Analytics and keyword SEO rankings for ecommerce product landing pages."
          ]
        }
      ],
      education: [
        {
          institution: "San Francisco State University",
          degree: "B.A. in Graphic Design & Digital Arts",
          year: "2021"
        }
      ],
      certifications: []
    };

    const doc = await appwriteDb.createCandidate({
      name: "Elena Rostova",
      email: "elena.rostova.design@gmail.com",
      rawText,
      parsedJson,
      anonymizedName: "Candidate A",
      anonymizedText: rawText.replace(/Elena Rostova/g, "Candidate A").replace(/elena\.rostova\.design@gmail\.com/g, "[REDACTED]"),
      anonymizedJson: {
        ...parsedJson,
        name: "Candidate A",
        email: "[REDACTED]"
      },
      generalSummary: "Junior creative design and digital marketing candidate specializing in Figma, Illustrator, and visual UI layouts. Lacks backend software engineering experience.",
      parseConfidence: "HIGH"
    });

    candidateId = doc.id || doc.$id;
    console.log("Created candidate:", candidateId);
  }

  // Score candidate against Full Stack Developer JD
  const jdId = "6a996ccd0014b4b95d6a";
  console.log(`Scoring Elena Rostova against JD ${jdId}...`);
  const match = await calculateMatchScore(candidateId, jdId);
  console.log("Candidate A Score:", match.overallScore, "%");
}

main().catch(console.error);
