const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const handleCreateUpdate = async (e: React.FormEvent) => {',
  'const handleCreateUpdate = async (e: React.FormEvent, mediaUrl?: string) => {'
);

content = content.replace(
  'if (!newUpdateContent.trim()) return;',
  'if (!newUpdateContent.trim() && !mediaUrl) return;'
);

content = content.replace(
  'await dbService.insertUpdate(newUpdateContent.trim(), "Administrator");',
  'await dbService.insertUpdate(newUpdateContent.trim(), "Administrator", mediaUrl);'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx handleCreateUpdate");
