import React, { useState, useRef, useEffect } from "react";
import {
  Vote,
  Upload,
  Check,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  Plus,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Camera,
  Layers,
  Users,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  UserPlus,
  HelpCircle,
} from "lucide-react";
import { ElectionRow, Position, Candidate } from "../../types.ts";
import { dbService, getElectionPositions } from "../../lib/supabase.ts";
import { LargeFileUploader } from "../shared/LargeFileUploader.tsx";

interface CandidatesManagerProps {
  elections: ElectionRow[];
  onRefresh: () => Promise<void>;
  showToast: (msg: string) => void;
  setIsLoading: (val: boolean) => void;
  setActiveMenu: (menu: string) => void;
  initialElectionId?: string;
  onClearInitialElectionId?: () => void;
}

// Sample avatars for quick testing if user wants immediate presets
const SAMPLE_AVATARS = [
  {
    name: "Male Candidate A",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Female Candidate B",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Male Candidate C",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Female Candidate D",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80",
  },
];

const PRESET_POSITIONS = [
  "President",
  "Vice President",
  "Secretary General",
  "Treasurer",
  "Sports Director",
  "Social & Entertainment Director",
  "Publicity Secretary",
  "Director of Academic Affairs",
  "Speaker of Parliament",
];

type WorkflowStep =
  | "elections_list" // Step 1: Elections selection
  | "election_hub" // Step 2: Choose: "Add More Positions" or "Edit Current One & Candidates"
  | "add_position" // Step 2A: Dedicated position creator
  | "positions_list" // Step 2B: Dedicated positions manager (choose a position)
  | "candidates_workspace"; // Step 3: Dedicated candidate management for chosen position

export default function CandidatesManager({
  elections,
  onRefresh,
  showToast,
  setIsLoading,
  setActiveMenu,
  initialElectionId,
  onClearInitialElectionId,
}: CandidatesManagerProps) {
  // Navigation State
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(() => {
    if (initialElectionId && elections.some((e) => e.id === initialElectionId)) {
      return "election_hub";
    }
    return "elections_list";
  });
  const [selectedElectionId, setSelectedElectionId] = useState<string>(() => {
    if (initialElectionId && elections.some((e) => e.id === initialElectionId)) {
      return initialElectionId;
    }
    return "";
  });
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");

  // Candidate Sub-View: 'roster' (view candidates) or 'add' (add/edit form)
  const [candidateViewMode, setCandidateViewMode] = useState<"roster" | "form">("roster");

  // New Position Form State
  const [newPositionTitle, setNewPositionTitle] = useState<string>("");
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionTitle, setEditingPositionTitle] = useState<string>("");

  // Candidate Form State
  const [candidateFullName, setCandidateFullName] = useState<string>("");
  const [candidatePhoto, setCandidatePhoto] = useState<string>("");
  const [candidateManifesto, setCandidateManifesto] = useState<string>("");
  const [photoUploadTab, setPhotoUploadTab] = useState<"upload" | "url" | "samples" | "r2">("upload");
  const [urlInput, setUrlInput] = useState<string>("");
  const [isSavingCandidate, setIsSavingCandidate] = useState<boolean>(false);
  const [justSavedMessage, setJustSavedMessage] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when initialElectionId changes
  useEffect(() => {
    if (initialElectionId && elections.some((e) => e.id === initialElectionId)) {
      setSelectedElectionId(initialElectionId);
      setCurrentStep("election_hub");
      if (onClearInitialElectionId) {
        onClearInitialElectionId();
      }
    }
  }, [initialElectionId, elections, onClearInitialElectionId]);

  // Active election & positions computation
  const currentElection = elections.find((e) => e.id === selectedElectionId) || null;
  const electionPositions: Position[] = currentElection ? getElectionPositions(currentElection) : [];
  const activePosition = electionPositions.find((p) => p.id === selectedPositionId) || null;

  // Auto-sync if election is deleted or updated
  useEffect(() => {
    if (selectedElectionId && !elections.some((e) => e.id === selectedElectionId)) {
      setSelectedElectionId("");
      setCurrentStep("elections_list");
    }
  }, [elections, selectedElectionId]);

  // Handle image file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("File is larger than 10MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setCandidatePhoto(base64Url);
        showToast("Photo selected & ready! Click Save Candidate when ready.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to persist updated positions
  const savePositionsToElection = async (updatedPositions: Position[]) => {
    if (!currentElection) return;
    try {
      setIsLoading(true);
      const flatCandidates = updatedPositions.flatMap((p) =>
        p.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          photo_url: c.photo_url,
          manifesto: c.manifesto,
        }))
      );

      await dbService.updateElection(currentElection.id, {
        positions: updatedPositions,
        candidates: flatCandidates,
      });
      await onRefresh();
    } catch (err: any) {
      showToast(`Error saving: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Quick create election helper if no elections exist
  const handleQuickCreateElection = async () => {
    try {
      setIsLoading(true);
      const defaultPositions: Position[] = [
        {
          id: `pos_pres_${Date.now()}`,
          title: "President",
          candidates: [],
        },
        {
          id: `pos_vp_${Date.now()}`,
          title: "Vice President",
          candidates: [],
        },
        {
          id: `pos_sec_${Date.now()}`,
          title: "Secretary General",
          candidates: [],
        },
      ];

      const created = await dbService.insertElection(
        "CUNIMA Guild Council Elections 2026",
        "Official university student guild executive elections.",
        [],
        null,
        "draft",
        defaultPositions
      );

      await onRefresh();
      setSelectedElectionId(created.id);
      setCurrentStep("election_hub");
      showToast('Created "CUNIMA Guild Council Elections 2026"!');
    } catch (err: any) {
      showToast(`Error creating election: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Select Election
  const handleSelectElection = (electionId: string) => {
    setSelectedElectionId(electionId);
    setCurrentStep("election_hub");
  };

  // Add a position
  const handleAddPosition = async (titleToAdd?: string) => {
    const title = (titleToAdd || newPositionTitle).trim();
    if (!title) {
      showToast("Please enter a position title.");
      return;
    }
    if (!currentElection) return;

    const exists = electionPositions.some(
      (p) => p.title.toLowerCase() === title.toLowerCase()
    );
    if (exists) {
      showToast(`Position "${title}" already exists.`);
      return;
    }

    const newPos: Position = {
      id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title,
      candidates: [],
    };

    const updated = [...electionPositions, newPos];
    try {
      await savePositionsToElection(updated);
      setNewPositionTitle("");
      showToast(`Position "${title}" created successfully!`);
      // Ask if they want to immediately add candidates or stay in positions list
      setSelectedPositionId(newPos.id);
      setCurrentStep("positions_list");
    } catch (e) {}
  };

  // Edit position title
  const handleSaveEditPosition = async (posId: string) => {
    const title = editingPositionTitle.trim();
    if (!title) {
      showToast("Position title cannot be empty.");
      return;
    }

    const updated = electionPositions.map((p) =>
      p.id === posId ? { ...p, title } : p
    );

    try {
      await savePositionsToElection(updated);
      setEditingPositionId(null);
      setEditingPositionTitle("");
      showToast(`Position title updated to "${title}".`);
    } catch (e) {}
  };

  // Delete a position
  const handleDeletePosition = async (posId: string) => {
    const pos = electionPositions.find((p) => p.id === posId);
    if (!pos) return;

    if (pos.candidates.length > 0) {
      const confirm = window.confirm(
        `Position "${pos.title}" has ${pos.candidates.length} candidate(s). Deleting it will remove them too. Proceed?`
      );
      if (!confirm) return;
    }

    const updated = electionPositions.filter((p) => p.id !== posId);
    try {
      await savePositionsToElection(updated);
      showToast(`Position "${pos.title}" deleted.`);
      if (selectedPositionId === posId) {
        setSelectedPositionId("");
      }
    } catch (e) {}
  };

  // Open Candidates Workspace for a Position
  const handleOpenPositionCandidates = (positionId: string, directToAdd = false) => {
    setSelectedPositionId(positionId);
    setCurrentStep("candidates_workspace");
    setCandidateViewMode(directToAdd ? "form" : "roster");
    // Clear form state
    setEditingCandidateId(null);
    setCandidateFullName("");
    setCandidatePhoto("");
    setCandidateManifesto("");
    setUrlInput("");
  };

  // Start Editing a Candidate
  const handleStartEditCandidate = (candidate: Candidate) => {
    setEditingCandidateId(candidate.id);
    setCandidateFullName(candidate.name);
    setCandidatePhoto(candidate.photo_url || "");
    setCandidateManifesto(candidate.manifesto || "");
    setCandidateViewMode("form");
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candId: string, candName: string) => {
    if (!activePosition) return;
    const confirm = window.confirm(`Remove candidate "${candName}"?`);
    if (!confirm) return;

    const updated = electionPositions.map((p) => {
      if (p.id === activePosition.id) {
        return {
          ...p,
          candidates: p.candidates.filter((c) => c.id !== candId),
        };
      }
      return p;
    });

    try {
      await savePositionsToElection(updated);
      showToast(`Candidate "${candName}" removed.`);
    } catch (e) {}
  };

  // Save Candidate
  const handleSaveCandidate = async (andAddAnother: boolean = false) => {
    if (!currentElection || !activePosition) return;

    const name = candidateFullName.trim();
    if (!name) {
      showToast("Candidate Full Name is required.");
      nameInputRef.current?.focus();
      return;
    }

    setIsSavingCandidate(true);
    try {
      let updatedPositions = [...electionPositions];
      const posIndex = updatedPositions.findIndex((p) => p.id === activePosition.id);

      if (posIndex === -1) {
        showToast("Position not found.");
        return;
      }

      const targetPos = updatedPositions[posIndex];

      if (editingCandidateId) {
        // Edit existing
        const updatedCandidates = targetPos.candidates.map((c) =>
          c.id === editingCandidateId
            ? {
                ...c,
                name,
                photo_url: candidatePhoto || undefined,
                manifesto: candidateManifesto.trim() || undefined,
              }
            : c
        );
        updatedPositions[posIndex] = {
          ...targetPos,
          candidates: updatedCandidates,
        };
        await savePositionsToElection(updatedPositions);
        showToast(`Candidate "${name}" updated successfully!`);
        setEditingCandidateId(null);
        setCandidateViewMode("roster");
      } else {
        // Create new
        const newCandidate: Candidate = {
          id: `cand_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name,
          photo_url: candidatePhoto.trim() || undefined,
          manifesto: candidateManifesto.trim() || undefined,
        };

        updatedPositions[posIndex] = {
          ...targetPos,
          candidates: [...targetPos.candidates, newCandidate],
        };

        await savePositionsToElection(updatedPositions);

        const msg = `Saved "${name}" as candidate for ${activePosition.title}!`;
        showToast(msg);
        setJustSavedMessage(msg);
        setTimeout(() => setJustSavedMessage(null), 4000);

        if (andAddAnother) {
          // Reset form fields and remain in form mode
          setCandidateFullName("");
          setCandidatePhoto("");
          setCandidateManifesto("");
          setUrlInput("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          setTimeout(() => nameInputRef.current?.focus(), 150);
        } else {
          // Switch to roster view
          setCandidateFullName("");
          setCandidatePhoto("");
          setCandidateManifesto("");
          setUrlInput("");
          setCandidateViewMode("roster");
        }
      }
    } catch (err: any) {
      showToast(`Failed to save candidate: ${err.message}`);
    } finally {
      setIsSavingCandidate(false);
    }
  };

  // Helper for Breadcrumbs
  const renderBreadcrumbs = () => {
    return (
      <nav aria-label="Candidate Management Steps" className="flex items-center gap-2 text-xs font-medium text-zinc-500 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setCurrentStep("elections_list");
            setSelectedPositionId("");
          }}
          className={`hover:text-blue-600 transition-colors flex items-center gap-1 shrink-0 ${
            currentStep === "elections_list" ? "text-blue-600 font-bold" : ""
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Elections</span>
        </button>

        {currentElection && currentStep !== "elections_list" && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <button
              type="button"
              onClick={() => {
                setCurrentStep("election_hub");
                setSelectedPositionId("");
              }}
              className={`hover:text-blue-600 transition-colors truncate max-w-[160px] md:max-w-[240px] shrink-0 ${
                currentStep === "election_hub" ? "text-blue-600 font-bold" : ""
              }`}
            >
              {currentElection.title}
            </button>
          </>
        )}

        {(currentStep === "add_position" || currentStep === "positions_list") && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold shrink-0">
              {currentStep === "add_position" ? "Add Positions" : "Manage Positions"}
            </span>
          </>
        )}

        {currentStep === "candidates_workspace" && activePosition && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <button
              type="button"
              onClick={() => setCurrentStep("positions_list")}
              className="hover:text-blue-600 transition-colors shrink-0"
            >
              Positions
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">
              {activePosition.title} ({activePosition.candidates.length} candidates)
            </span>
          </>
        )}
      </nav>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#0B1E40] via-[#102a5c] to-blue-900 text-white rounded-3xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl text-blue-200">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Candidates & Electoral Positions
              </h1>
            </div>
            <p className="text-xs md:text-sm text-blue-100/80 max-w-2xl">
              A structured step-by-step workflow: select an election, configure positions, then add candidates with portrait photos.
            </p>
          </div>

          {currentElection && (
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-3 self-start md:self-auto">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                  Active Election
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[200px]">
                  {currentElection.title}
                </div>
              </div>
              <span className="h-6 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                  Candidates
                </div>
                <div className="text-xs font-mono font-bold text-emerald-300">
                  {electionPositions.reduce((acc, p) => acc + p.candidates.length, 0)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumbs Navigation Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 shadow-2xs">
        {renderBreadcrumbs()}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: ELECTIONS OVERVIEW / SELECTION ("Elections")                     */}
      {/* ========================================================================= */}
      {currentStep === "elections_list" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Vote className="w-5 h-5 text-blue-600" />
                <span>Elections</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select an election to configure its positions or manage candidate profiles.
              </p>
            </div>

            <button
              type="button"
              onClick={handleQuickCreateElection}
              className="px-4 py-2 bg-[#0B1E40] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Election</span>
            </button>
          </div>

          {elections.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Vote className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No Elections Configured Yet
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Click the button below to generate the official CUNIMA Guild Council Elections 2026 and start adding positions and candidates.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickCreateElection}
                className="px-5 py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create CUNIMA Guild Council Elections 2026</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {elections.map((el) => {
                const positions = getElectionPositions(el);
                const totalCands = positions.reduce((sum, p) => sum + p.candidates.length, 0);

                return (
                  <div
                    key={el.id}
                    onClick={() => handleSelectElection(el.id)}
                    className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            el.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : el.status === "completed"
                              ? "bg-zinc-100 text-zinc-600"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {el.status}
                        </span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{el.created_at ? new Date(el.created_at).getFullYear() : "2026"}</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors leading-snug">
                        {el.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {el.description || "Official university student guild election."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl">
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase">
                            Positions
                          </div>
                          <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                            {positions.length}
                          </div>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl">
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase">
                            Candidates
                          </div>
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {totalCands}
                          </div>
                        </div>
                      </div>

                      <div className="w-full py-2 px-3 bg-[#0B1E40] group-hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
                        <span>Select Election & Manage</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ELECTION HUB (Prompt: "Add More Positions" OR "Edit Current One")  */}
      {/* ========================================================================= */}
      {currentStep === "election_hub" && currentElection && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep("elections_list")}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Elections</span>
            </button>

            <span className="text-xs text-zinc-400">Step 2: Choose Management Action</span>
          </div>

          {/* Election Card Header */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Selected Election
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    Status: <strong className="text-zinc-700 dark:text-zinc-200 uppercase">{currentElection.status}</strong>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {currentElection.title}
                </h2>
                <p className="text-xs text-zinc-500 max-w-2xl">
                  {currentElection.description || "Official university student guild election."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Positions</div>
                  <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                    {electionPositions.length}
                  </div>
                </div>
                <div className="text-center px-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Total Candidates</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono">
                    {electionPositions.reduce((sum, p) => sum + p.candidates.length, 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TWO CLEAR CARDS: 1) ADD MORE POSITIONS vs 2) EDIT CURRENT ONE AND CANDIDATES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OPTION A: ADD MORE POSITIONS */}
            <div
              onClick={() => setCurrentStep("add_position")}
              className="group bg-gradient-to-br from-white to-blue-50/40 dark:from-zinc-900 dark:to-blue-950/20 border-2 border-blue-200 dark:border-blue-900/60 hover:border-blue-600 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                    Add More Positions
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Create new executive or guild roles (e.g. Sports Director, Publicity Secretary, Treasurer) to expand your ballot.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="text-[10px] font-semibold bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    + One-click presets
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    + Custom role titles
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-blue-700 dark:text-blue-400 font-bold text-xs">
                <span>Configure New Positions</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* OPTION B: EDIT CURRENT ONE AND CANDIDATES */}
            <div
              onClick={() => setCurrentStep("positions_list")}
              className="group bg-gradient-to-br from-white to-emerald-50/40 dark:from-zinc-900 dark:to-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-600 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">
                    Edit Current Positions & Candidates
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage current positions, rename roles, and add or edit candidate names, portrait photos, and manifestos.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="text-[10px] font-semibold bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    {electionPositions.length} Active Positions
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    {electionPositions.reduce((acc, p) => acc + p.candidates.length, 0)} Registered Candidates
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <span>Manage Positions & Candidates</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2A: DEDICATED ADD POSITION VIEW ("Add More Positions")               */}
      {/* ========================================================================= */}
      {currentStep === "add_position" && currentElection && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep("election_hub")}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Options</span>
            </button>

            <span className="text-xs text-zinc-400">Step: Add Positions</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Add New Electoral Positions
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Adding positions to <strong className="text-zinc-800 dark:text-zinc-200">{currentElection.title}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Custom Position Title
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Director of Academic Affairs or Speaker of Parliament"
                  value={newPositionTitle}
                  onChange={(e) => setNewPositionTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPosition();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleAddPosition()}
                  className="px-5 py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Position</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block">
                Or click any standard preset role to add instantly:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_POSITIONS.map((preset) => {
                  const alreadyExists = electionPositions.some(
                    (p) => p.title.toLowerCase() === preset.toLowerCase()
                  );
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={alreadyExists}
                      onClick={() => handleAddPosition(preset)}
                      className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                        alreadyExists
                          ? "opacity-50 cursor-default bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700"
                          : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-2xs"
                      }`}
                    >
                      {alreadyExists ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Positions in this election */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Current Positions in this Election ({electionPositions.length}):
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentStep("positions_list")}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Proceed to Manage Candidates →</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {electionPositions.map((pos) => (
                  <div
                    key={pos.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {pos.title}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {pos.candidates.length} candidate(s)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPositionCandidates(pos.id)}
                      className="text-[11px] px-2 py-1 bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-300 rounded-lg border border-zinc-200 dark:border-zinc-600 font-bold hover:bg-blue-50 cursor-pointer"
                    >
                      Candidates
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2B: DEDICATED POSITIONS LIST ("Edit Current One & Candidates")       */}
      {/* ========================================================================= */}
      {currentStep === "positions_list" && currentElection && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep("election_hub")}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Options</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep("add_position")}
              className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-900 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Another Position</span>
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Electoral Positions & Candidates</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Select any position below to view, add, or edit its registered candidates.
            </p>
          </div>

          {electionPositions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-3">
              <p className="text-xs text-zinc-400">
                No positions found in this election. Please add your first position.
              </p>
              <button
                type="button"
                onClick={() => setCurrentStep("add_position")}
                className="px-4 py-2 bg-[#0B1E40] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Add Positions Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {electionPositions.map((pos) => {
                const isEditing = editingPositionId === pos.id;

                return (
                  <div
                    key={pos.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Position Title / Edit Box */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingPositionTitle}
                            onChange={(e) => setEditingPositionTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 rounded-xl text-xs font-bold"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditPosition(pos.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPositionId(null)}
                              className="px-2.5 py-1 bg-zinc-200 text-zinc-700 text-[11px] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-tight">
                              {pos.title}
                            </h3>
                            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              {pos.candidates.length === 0
                                ? "No candidates yet"
                                : `${pos.candidates.length} candidate${
                                    pos.candidates.length === 1 ? "" : "s"
                                  } on ballot`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPositionId(pos.id);
                                setEditingPositionTitle(pos.title);
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer"
                              title="Rename position"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePosition(pos.id)}
                              className="p-1 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                              title="Delete position"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Candidate Avatars / Preview */}
                      <div className="space-y-1.5 pt-1">
                        {pos.candidates.length === 0 ? (
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-center text-[11px] text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800">
                            Ready for candidates to be added
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {pos.candidates.slice(0, 3).map((cand) => (
                              <div
                                key={cand.id}
                                className="flex items-center gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs"
                              >
                                {cand.photo_url ? (
                                  <img
                                    src={cand.photo_url}
                                    alt={cand.name}
                                    className="w-6 h-6 rounded-full object-cover shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {cand.name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                  {cand.name}
                                </span>
                              </div>
                            ))}
                            {pos.candidates.length > 3 && (
                              <div className="text-[10px] text-zinc-400 text-center font-medium">
                                + {pos.candidates.length - 3} more candidates
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPositionCandidates(pos.id, false)}
                        className="py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl cursor-pointer transition-colors text-center"
                      >
                        View Roster ({pos.candidates.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPositionCandidates(pos.id, true)}
                        className="py-2 px-3 bg-[#0B1E40] hover:bg-blue-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors text-center flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Candidate</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: DEDICATED CANDIDATES WORKSPACE FOR A SPECIFIC POSITION            */}
      {/* ========================================================================= */}
      {currentStep === "candidates_workspace" && currentElection && activePosition && (
        <div className="space-y-6">
          {/* Back button & position title banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep("positions_list")}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Positions</span>
            </button>

            {/* Toggle view mode: Roster vs Add Form */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setCandidateViewMode("roster");
                  setEditingCandidateId(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  candidateViewMode === "roster"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Candidates Roster ({activePosition.candidates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCandidateViewMode("form");
                  setEditingCandidateId(null);
                  setCandidateFullName("");
                  setCandidatePhoto("");
                  setCandidateManifesto("");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  candidateViewMode === "form"
                    ? "bg-[#0B1E40] text-white shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Candidate</span>
              </button>
            </div>
          </div>

          {/* Position Info Banner */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                Electoral Position
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {activePosition.title}
              </h2>
              <p className="text-xs text-zinc-400">
                Part of election: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{currentElection.title}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
                {activePosition.candidates.length} Registered Candidate{activePosition.candidates.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Banner notification if just saved */}
          {justSavedMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{justSavedMessage}</span>
            </div>
          )}

          {/* ================= FORM VIEW ================= */}
          {candidateViewMode === "form" && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {editingCandidateId ? "Edit Candidate Profile" : `Add Candidate to ${activePosition.title}`}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Enter the candidate's full name, portrait photo, and campaign slogan.
                  </p>
                </div>

                {editingCandidateId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCandidateId(null);
                      setCandidateViewMode("roster");
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-600 px-2.5 py-1 rounded-lg border"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveCandidate(false);
                }}
                className="space-y-5"
              >
                {/* 1. CANDIDATE FULL NAME */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                    <span>1. Candidate Full Name *</span>
                    <span className="text-[10px] text-zinc-400 font-normal">First & Last Name</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="e.g. Jonathan Phiri"
                    value={candidateFullName}
                    onChange={(e) => setCandidateFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:bg-white"
                    required
                    autoFocus
                  />
                </div>

                {/* 2. CANDIDATE PHOTO (DIRECTLY BELOW FULL NAME) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>2. Candidate Portrait Photo</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">JPG, PNG, WEBP, or Cloudflare R2</span>
                  </label>

                  {/* PREVIEW IF PHOTO SELECTED */}
                  {candidatePhoto ? (
                    <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={candidatePhoto}
                          alt="Candidate portrait"
                          className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
                          <Check className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            Photo Attached & Ready
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                          {candidatePhoto.startsWith("data:")
                            ? "Local image loaded (Instant preview)"
                            : candidatePhoto}
                        </p>

                        <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 border border-zinc-200 rounded-lg font-medium cursor-pointer"
                          >
                            Change Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCandidatePhoto("");
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="text-[11px] px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PHOTO UPLOAD OPTIONS TABS */
                    <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/70">
                      <div className="flex gap-1 p-1 bg-zinc-200/70 dark:bg-zinc-700/60 rounded-xl text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setPhotoUploadTab("upload")}
                          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            photoUploadTab === "upload"
                              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Computer / Phone</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPhotoUploadTab("url")}
                          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            photoUploadTab === "url"
                              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Web Link URL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPhotoUploadTab("samples")}
                          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            photoUploadTab === "samples"
                              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Sample Photos</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPhotoUploadTab("r2")}
                          className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
                            photoUploadTab === "r2"
                              ? "bg-white dark:bg-zinc-900 text-blue-600 font-bold shadow-xs"
                              : "text-zinc-500"
                          }`}
                        >
                          <span>R2</span>
                        </button>
                      </div>

                      {/* LOCAL DEVICE FILE UPLOAD */}
                      {photoUploadTab === "upload" && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="p-6 border-2 border-dashed border-blue-300 dark:border-blue-800/60 hover:border-blue-500 rounded-2xl bg-white dark:bg-zinc-900 text-center cursor-pointer transition-all group"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Click to Browse or Drag Photo Here
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Supports JPG, PNG, WEBP (Max 10MB). Image loads instantly.
                          </p>
                        </div>
                      )}

                      {/* URL INPUT */}
                      {photoUploadTab === "url" && (
                        <div className="space-y-2 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                          <div className="text-[11px] text-zinc-500">
                            Paste web image URL (e.g. from Google Drive, Unsplash, etc.):
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://example.com/candidate-photo.jpg"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 rounded-xl text-xs outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (urlInput.trim()) {
                                  setCandidatePhoto(urlInput.trim());
                                  showToast("Photo link attached!");
                                }
                              }}
                              className="px-3.5 py-2 bg-[#0B1E40] text-white text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SAMPLES */}
                      {photoUploadTab === "samples" && (
                        <div className="space-y-2 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                          <div className="text-[11px] text-zinc-500">
                            Select any sample portrait for testing:
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {SAMPLE_AVATARS.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setCandidatePhoto(s.url);
                                  showToast(`Selected sample portrait for ${s.name}`);
                                }}
                                className="group flex flex-col items-center gap-1 p-1.5 rounded-xl border hover:border-blue-500 cursor-pointer transition-all"
                              >
                                <img
                                  src={s.url}
                                  alt={s.name}
                                  className="w-12 h-12 rounded-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[9px] text-zinc-400 group-hover:text-blue-600 font-medium">
                                  Sample {idx + 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* R2 UPLOADER */}
                      {photoUploadTab === "r2" && (
                        <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200">
                          <LargeFileUploader
                            onUploadSuccess={(url) => {
                              setCandidatePhoto(url);
                              showToast("Photo uploaded to Cloudflare R2!");
                            }}
                            label="Upload directly to Cloudflare R2"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. CAMPAIGN SLOGAN / MANIFESTO (OPTIONAL) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                    <span>3. Campaign Slogan or Key Manifesto (Optional)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Appears on the digital ballot</span>
                  </label>
                  <textarea
                    placeholder="e.g. Committed to academic excellence, student rights, and transparent council governance."
                    value={candidateManifesto}
                    onChange={(e) => setCandidateManifesto(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:bg-white min-h-16"
                  />
                </div>

                {/* ACTION BUTTONS (SAVE & ADD ANOTHER vs SAVE & DONE) */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* BUTTON A: SAVE & ADD ANOTHER */}
                    <button
                      type="button"
                      disabled={isSavingCandidate}
                      onClick={() => handleSaveCandidate(true)}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSavingCandidate ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>Save & Add Another Candidate</span>
                    </button>

                    {/* BUTTON B: SAVE & VIEW ROSTER */}
                    <button
                      type="submit"
                      disabled={isSavingCandidate}
                      className="py-3 px-4 bg-[#0B1E40] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSavingCandidate ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>
                        {editingCandidateId ? "Update Candidate" : "Save & View Candidates"}
                      </span>
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setCandidateViewMode("roster")}
                      className="text-xs text-zinc-400 hover:text-zinc-600 py-1"
                    >
                      Cancel & Return to Roster
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ================= ROSTER VIEW ================= */}
          {candidateViewMode === "roster" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Registered Candidates for {activePosition.title}
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    setCandidateViewMode("form");
                    setEditingCandidateId(null);
                    setCandidateFullName("");
                    setCandidatePhoto("");
                    setCandidateManifesto("");
                  }}
                  className="px-4 py-2 bg-[#0B1E40] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Candidate to {activePosition.title}</span>
                </button>
              </div>

              {activePosition.candidates.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      No Candidates Registered for {activePosition.title}
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Click the button below to add the first candidate along with their portrait photo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCandidateViewMode("form")}
                    className="px-5 py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Candidate</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePosition.candidates.map((cand, idx) => (
                    <div
                      key={cand.id}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="relative">
                            {cand.photo_url ? (
                              <img
                                src={cand.photo_url}
                                alt={cand.name}
                                className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-zinc-800 shadow-md"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xl flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-md">
                                {cand.name.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -top-1 -right-1 bg-zinc-800 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCandidate(cand)}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                              title="Edit candidate"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                              title="Delete candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                            {cand.name}
                          </h4>
                          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            Candidate for {activePosition.title}
                          </div>
                          {cand.manifesto ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic line-clamp-3 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 mt-2">
                              "{cand.manifesto}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-zinc-400 italic mt-1">
                              No manifesto provided
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                        <span>Ballot Status:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
