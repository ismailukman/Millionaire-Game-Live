import { parseCSV, validateCSV } from "../utils.mjs";

const sampleCSV = `level,question,A,B,C,D,correct
1,Test Q1,A1,B1,C1,D1,A
2,Test Q2,A2,B2,C2,D2,B
3,Test Q3,A3,B3,C3,D3,C
4,Test Q4,A4,B4,C4,D4,D
5,Test Q5,A5,B5,C5,D5,A
6,Test Q6,A6,B6,C6,D6,B
7,Test Q7,A7,B7,C7,D7,C
8,Test Q8,A8,B8,C8,D8,D
9,Test Q9,A9,B9,C9,D9,A
10,Test Q10,A10,B10,C10,D10,B
11,Test Q11,A11,B11,C11,D11,C
12,Test Q12,A12,B12,C12,D12,D
13,Test Q13,A13,B13,C13,D13,A
14,Test Q14,A14,B14,C14,D14,B
15,Test Q15,A15,B15,C15,D15,C`;

const rows = parseCSV(sampleCSV);
const result = validateCSV(rows);

if (!result.ok) {
  console.error("TEST FAILED:", result.error);
  process.exit(1);
}

if (result.questions.length !== 15) {
  console.error("TEST FAILED: expected 15 questions.");
  process.exit(1);
}

console.log("All tests passed.");
