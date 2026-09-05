export interface AnonymizedResult {
  anonymizedName: string;
  anonymizedJson: any;
  anonymizedText: string;
}

const ALIAS_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const UNIVERSITY_MAP: Record<string, string> = {
  berkeley: "University X",
  ucb: "University X",
  sjsu: "University Y",
  "san jose state": "University Y",
  stanford: "University Z",
  mit: "University W",
  "washington": "University V",
  "harvard": "University U",
};

/**
 * Anonymizes candidate names, emails, phones, and university/college names.
 * Ensures structural bias reduction during vector scoring.
 */
export function anonymizeCandidateData(
  candidateIndex: number,
  parsedJson: any,
  rawText: string
): AnonymizedResult {
  const aliasLetter = ALIAS_LETTERS[candidateIndex % ALIAS_LETTERS.length] || `X${candidateIndex}`;
  const anonymizedName = `Candidate ${aliasLetter}`;
  const originalName = parsedJson?.name || "Candidate";
  const originalEmail = parsedJson?.email || "";
  const originalPhone = parsedJson?.phone || "";

  // Deep clone parsed JSON
  const anonymizedJson = JSON.parse(JSON.stringify(parsedJson || {}));
  anonymizedJson.name = anonymizedName;
  anonymizedJson.email = `candidate_${aliasLetter.toLowerCase()}@anonymous-ats.org`;
  anonymizedJson.phone = `+1 (555) 000-00${aliasLetter}`;

  // Mask university names in education entries
  if (Array.isArray(anonymizedJson.education)) {
    anonymizedJson.education = anonymizedJson.education.map((edu: any, i: number) => {
      const instLower = (edu.institution || "").toLowerCase();
      let maskedInst = `University ${String.fromCharCode(88 - i)}`; // X, W, V

      for (const [key, val] of Object.entries(UNIVERSITY_MAP)) {
        if (instLower.includes(key)) {
          maskedInst = val;
          break;
        }
      }
      return {
        ...edu,
        institution: maskedInst,
      };
    });
  }

  // Mask text in rawText
  let anonymizedText = rawText;
  if (originalName && originalName.trim().length > 2) {
    const escapedName = originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    anonymizedText = anonymizedText.replace(new RegExp(escapedName, "gi"), anonymizedName);
  }
  if (originalEmail && originalEmail.trim().length > 3) {
    const escapedEmail = originalEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    anonymizedText = anonymizedText.replace(new RegExp(escapedEmail, "gi"), anonymizedJson.email);
  }
  if (originalPhone && originalPhone.trim().length > 3) {
    const escapedPhone = originalPhone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    anonymizedText = anonymizedText.replace(new RegExp(escapedPhone, "gi"), anonymizedJson.phone);
  }

  // Mask university names in raw text
  for (const [key, val] of Object.entries(UNIVERSITY_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    anonymizedText = anonymizedText.replace(regex, val);
  }

  return {
    anonymizedName,
    anonymizedJson,
    anonymizedText,
  };
}
