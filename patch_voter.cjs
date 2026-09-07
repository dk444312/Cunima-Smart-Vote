const fs = require('fs');

let content = fs.readFileSync('src/components/users/VoterDashboard.tsx', 'utf8');

// Replace {cand} with {typeof cand === 'string' ? cand : cand.name}
content = content.replace(
  /\{cand\}/g,
  '{typeof cand === "string" ? cand : cand.name}'
);

// Replace selectedCandidates[election.id] === cand with selectedCandidates[election.id] === (typeof cand === "string" ? cand : cand.name)
content = content.replace(
  /selectedCandidates\[election\.id\] === cand/g,
  'selectedCandidates[election.id] === (typeof cand === "string" ? cand : cand.name)'
);

// Replace resultsMap[cand] with resultsMap[typeof cand === "string" ? cand : cand.name]
content = content.replace(
  /resultsMap\[cand\]/g,
  'resultsMap[typeof cand === "string" ? cand : cand.name]'
);

// Replace () => setSelectedCandidates({...selectedCandidates, [election.id]: cand})
content = content.replace(
  /\[election\.id\]: cand/g,
  '[election.id]: (typeof cand === "string" ? cand : cand.name)'
);

fs.writeFileSync('src/components/users/VoterDashboard.tsx', content);
console.log("Updated VoterDashboard.tsx");
