const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

content = content.replace(
  'candidates: string[];',
  'candidates: any[];\n  candidatePhoto: string;\n  setCandidatePhoto: (val: string) => void;'
);

content = content.replace(
  '  candidates,\n  setCandidates,',
  '  candidates,\n  setCandidates,\n  candidatePhoto,\n  setCandidatePhoto,'
);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx");
