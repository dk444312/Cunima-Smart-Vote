const fs = require('fs');

let content = fs.readFileSync('src/components/shared/UpdatesFeed.tsx', 'utf8');

// replace handleCreateUpdate prop type
content = content.replace(
  'handleCreateUpdate: (e: React.FormEvent) => void;',
  'handleCreateUpdate: (e: React.FormEvent, mediaUrl?: string) => void;'
);

// add LargeFileUploader import
content = content.replace(
  'import { Sparkles, Check, Trash2, Heart, MessageCircle } from "lucide-react";',
  'import { Sparkles, Check, Trash2, Heart, MessageCircle } from "lucide-react";\nimport { LargeFileUploader } from "./LargeFileUploader.tsx";\nimport { useState } from "react";'
);

// inside component, add state for mediaUrl
content = content.replace(
  '}: UpdatesFeedProps) {',
  '}: UpdatesFeedProps) {\n  const [mediaUrl, setMediaUrl] = useState("");'
);

// update the form onSubmit
content = content.replace(
  'onSubmit={handleCreateUpdate}',
  'onSubmit={(e) => { handleCreateUpdate(e, mediaUrl); setMediaUrl(""); }}'
);

// update the button disabled check
content = content.replace(
  'disabled={!newUpdateContent.trim()}',
  'disabled={!newUpdateContent.trim() && !mediaUrl}'
);

// add the LargeFileUploader above the form's submit button
content = content.replace(
  '<div className="flex items-center justify-between">',
  '<div className="mb-3">\n              <LargeFileUploader onUploadSuccess={(url) => setMediaUrl(url)} label="Attach Photo/Video" />\n              {mediaUrl && <div className="text-[10px] text-emerald-500 mt-1 font-semibold">Media successfully attached!</div>}\n            </div>\n            <div className="flex items-center justify-between">'
);

// render the media URL in the feed
const feedRender = `{update.content}
                    </p>`;
const feedRenderNew = `{update.content}
                    </p>
                    {update.media_url && (
                      <div className="mt-3">
                        {update.media_url.match(/\\.(mp4|webm|ogg)$/i) ? (
                          <video src={update.media_url} controls className="w-full max-h-96 rounded-xl object-contain bg-black" />
                        ) : (
                          <img src={update.media_url} alt="Update media" className="w-full max-h-96 rounded-xl object-contain bg-zinc-100 dark:bg-zinc-800" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    )}`;
content = content.replace(feedRender, feedRenderNew);


fs.writeFileSync('src/components/shared/UpdatesFeed.tsx', content);
console.log("Updated UpdatesFeed.tsx");
