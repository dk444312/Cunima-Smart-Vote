const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const [candidates, setCandidates] = useState<string[]>([]);',
  'const [candidates, setCandidates] = useState<any[]>([]);\n  const [candidatePhoto, setCandidatePhoto] = useState("");'
);

content = content.replace(
  'candidates={candidates}',
  'candidates={candidates}\n                  candidatePhoto={candidatePhoto}\n                  setCandidatePhoto={setCandidatePhoto}'
);

content = content.replace(
  'const finalCandidates = [...candidates];',
  'const finalCandidates = [...candidates];'
);

content = content.replace(
  'if (\n      candidateInput.trim() &&\n      !finalCandidates.includes(candidateInput.trim())\n    ) {\n      finalCandidates.push(candidateInput.trim());\n    }',
  `if (
      candidateInput.trim() &&
      !finalCandidates.some((c) => (typeof c === "string" ? c : c.name) === candidateInput.trim())
    ) {
      if (candidatePhoto) {
        finalCandidates.push({ name: candidateInput.trim(), photo_url: candidatePhoto });
      } else {
        finalCandidates.push(candidateInput.trim());
      }
    }
    setCandidatePhoto("");`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx");
