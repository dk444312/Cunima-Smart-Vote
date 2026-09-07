const fs = require('fs');

let content = fs.readFileSync('src/components/shared/LargeFileUploader.tsx', 'utf8');

content = content.replace(
  'const [password, setPassword] = useState("");',
  'const [password, setPassword] = useState((import.meta as any).env?.VITE_UPLOADER_PASSWORD || "");'
);

fs.writeFileSync('src/components/shared/LargeFileUploader.tsx', content);
console.log("Updated LargeFileUploader.tsx");
