const fs = require('fs');

let content = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

content = content.replace(
  'import { Vote, Trash2, ShieldAlert, Check, X, Bell } from "lucide-react";',
  'import { Vote, Trash2, ShieldAlert, Check, X, Bell } from "lucide-react";\nimport { LargeFileUploader } from "../shared/LargeFileUploader.tsx";'
);

content = content.replace(
  'const [candidates, setCandidates] = useState<string[]>([]);',
  'const [candidates, setCandidates] = useState<any[]>([]);\n  const [candidatePhoto, setCandidatePhoto] = useState("");'
);

const oldCandidateInput = `<div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Candidate name"
                    value={candidateInput}
                    onChange={(e) => setCandidateInput(e.target.value)}
                    className="w-full px-3 py-1.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = candidateInput.trim();
                      if (val && !candidates.includes(val)) {
                        setCandidates([...candidates, val]);
                        setCandidateInput("");
                      }
                    }}
                    className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>`;

const newCandidateInput = `<div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Candidate name"
                      value={candidateInput}
                      onChange={(e) => setCandidateInput(e.target.value)}
                      className="w-full px-3 py-1.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = candidateInput.trim();
                        // check if already added by name
                        const exists = candidates.some(c => (typeof c === 'string' ? c : c.name) === val);
                        if (val && !exists) {
                          if (candidatePhoto) {
                            setCandidates([...candidates, { name: val, photo_url: candidatePhoto }]);
                          } else {
                            setCandidates([...candidates, val]);
                          }
                          setCandidateInput("");
                          setCandidatePhoto("");
                        }
                      }}
                      className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 rounded-xl cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2">
                    <LargeFileUploader onUploadSuccess={(url) => setCandidatePhoto(url)} label="Candidate Photo" />
                    {candidatePhoto && <div className="text-[10px] text-emerald-500 mt-1">Photo attached!</div>}
                  </div>
                </div>`;

content = content.replace(oldCandidateInput, newCandidateInput);

content = content.replace(
  '<span>{cand}</span>',
  '<span>{typeof cand === "string" ? cand : cand.name}</span>'
);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx");
