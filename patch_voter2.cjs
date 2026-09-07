const fs = require('fs');

let content = fs.readFileSync('src/components/users/VoterDashboard.tsx', 'utf8');

content = content.replace(
  '<span>{typeof cand === "string" ? cand : cand.name}</span>',
  '<div className="flex items-center gap-3">\n                                  {typeof cand === "object" && cand.photo_url && (\n                                    <img src={cand.photo_url} alt={cand.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />\n                                  )}\n                                  <span>{typeof cand === "string" ? cand : cand.name}</span>\n                                </div>'
);

fs.writeFileSync('src/components/users/VoterDashboard.tsx', content);
console.log("Updated VoterDashboard.tsx");
