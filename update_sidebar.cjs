const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { text: "My Profile", icon: "User" }
];

replacements.forEach(({ text, icon }) => {
  content = content.replaceAll(`<span>${text}</span>`, `<div className="flex items-center gap-2.5"><${icon} className="w-4 h-4" /><span>${text}</span></div>`);
});

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx");
