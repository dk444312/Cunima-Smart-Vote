const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /\{cand\}/g,
  '{typeof cand === "string" ? cand : cand.name}'
);

content = content.replace(
  /resultsMap\[cand\]/g,
  'resultsMap[typeof cand === "string" ? cand : cand.name]'
);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx");
