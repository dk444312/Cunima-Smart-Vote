const fs = require('fs');

let content = fs.readFileSync('src/components/shared/LargeFileUploader.tsx', 'utf8');

content = content.replace(
  'const uploadedUrl = presignedData.publicUrl || `https://pub-2f741d402ce04533a388b0a996f4ab48.r2.dev/${presignedData.fileKey}`;',
  'const uploadedUrl = presignedData.publicUrl || `https://voting-upload-worker.desire-kandodo.workers.dev/${presignedData.fileKey}`;'
);
content = content.replace(
  'onUploadSuccess(presignedData.fileKey || presignedData.publicUrl || "");',
  'onUploadSuccess(uploadedUrl);'
);

fs.writeFileSync('src/components/shared/LargeFileUploader.tsx', content);
console.log("Updated LargeFileUploader.tsx");
