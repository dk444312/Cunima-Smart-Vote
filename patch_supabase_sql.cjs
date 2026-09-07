const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

// The candidates field is currently TEXT[]. Let's change it to JSONB to support the {name, photo_url} objects natively in PostgreSQL.
content = content.replace(
  "candidates TEXT[] DEFAULT '{}',",
  "candidates JSONB DEFAULT '[]'::jsonb,"
);

// For the updates table, add the media_url column
content = content.replace(
  "  content TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT now()\n);",
  "  content TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT now(),\n  media_url TEXT\n);"
);

fs.writeFileSync('src/lib/supabase.ts', content);
console.log("Updated Supabase SQL string.");
