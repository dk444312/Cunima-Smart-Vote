const fs = require('fs');

function addPhotoToSpan(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /<span>\{typeof cand === "string" \? cand : cand\.name\}<\/span>/g,
    '<div className="flex items-center gap-2">{typeof cand === "object" && cand.photo_url && <img src={cand.photo_url} className="w-5 h-5 rounded-full object-cover bg-zinc-200" referrerPolicy="no-referrer" />}<span>{typeof cand === "string" ? cand : cand.name}</span></div>'
  );
  fs.writeFileSync(file, content);
}

addPhotoToSpan('src/components/admin/AdminDashboard.tsx');
addPhotoToSpan('src/components/club/ClubManagerDashboard.tsx');

console.log("Added photos to spans");
