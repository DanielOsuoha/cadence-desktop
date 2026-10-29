const coordinatingConjunctions = /\b(for|and|nor|but|or|yet|so)\b/i;
const subordinatingConjunctions = /\b(after|although|as|because|before|even though|if|once|since|though|unless|until|when|whenever|while)\b/i;

export type SyntaxResult = {
  valid: boolean;
  message: string;
};

function hasIndependentClausePair(sentence: string): boolean {
  return sentence
    .split(/[.;!?]|\s*,\s*(?=(?:for|and|nor|but|or|yet|so)\b)/i)
    .filter((clause) => clause.trim().split(/\s+/).length >= 3).length >= 2;
}

export function validateCompound(sentence: string): SyntaxResult {
  const trimmed = sentence.trim();
  if (!trimmed) return { valid: false, message: "Add a compound sentence to continue." };
  if (!hasIndependentClausePair(trimmed)) {
    return { valid: false, message: "Add two complete thoughts, each with a subject and a verb." };
  }
  if (!coordinatingConjunctions.test(trimmed) && !trimmed.includes(";")) {
    return { valid: false, message: "Connect the two independent clauses with a FANBOYS conjunction or a semicolon." };
  }
  return { valid: true, message: "Two independent clauses are connected clearly." };
}

export function validateComplex(sentence: string): SyntaxResult {
  const trimmed = sentence.trim();
  if (!trimmed) return { valid: false, message: "Add a complex sentence to continue." };
  if (!subordinatingConjunctions.test(trimmed)) {
    return { valid: false, message: "Add a dependent clause with a subordinating conjunction such as although, because, or while." };
  }
  if (!hasIndependentClausePair(trimmed)) {
    return { valid: false, message: "Include one complete main clause alongside the dependent clause." };
  }
  return { valid: true, message: "Your dependent and independent clauses work together." };
}
