import { mathRubric } from "./math";
import { englishRubric } from "./english";
import { scienceRubric } from "./science";
import { historyRubric } from "./history";
import { generalRubric } from "./general";

export function getRubricForSubject(subject: string): string {
  const normalized = subject.toLowerCase();
  
  if (normalized.includes("math")) return mathRubric;
  if (normalized.includes("english") || normalized.includes("language")) return englishRubric;
  if (normalized.includes("science") || normalized.includes("physics") || normalized.includes("chemistry") || normalized.includes("biology")) return scienceRubric;
  if (normalized.includes("history") || normalized.includes("geography") || normalized.includes("economics")) return historyRubric;
  
  return generalRubric;
}
