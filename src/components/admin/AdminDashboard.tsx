import React, { useState } from "react";
import { 
  Plus, Vote, Sparkles, Trash2, Key, Users, Eye, EyeOff, FileText, Database, Users2, Briefcase, Check, Square, CheckSquare, X, AlertCircle, ShieldCheck
} from "lucide-react";
import { LoggedInUser, ElectionRow, VoteRow, VoterRow, ClubRow, ClubMemberRow, UpdateRow, UpdateLikeRow, UpdateCommentRow, StudentRow } from "../../types.ts";
import { dbService } from "../../lib/supabase.ts";
import UpdatesFeed from "../shared/UpdatesFeed.tsx";
import StudentsManager from "./StudentsManager.tsx";

interface AdminDashboardProps {
  currentUser: LoggedInUser;
  activeMenu: "election" | "voters" | "clubs" | "results" | "profile" | "sql_db" | "updates" | "students" | "verified";
  setActiveMenu: (menu: "election" | "voters" | "clubs" | "results" | "profile" | "sql_db" | "updates" | "students" | "verified") => void;
  elections: ElectionRow[];
  votes: VoteRow[];
  voters: VoterRow[];
  clubs: ClubRow[];
  clubMembers: ClubMemberRow[];
  updates: UpdateRow[];
  updateLikes: Record<string, UpdateLikeRow[]>;
  updateComments: Record<string, UpdateCommentRow[]>;
  visiblePasswords: Record<string, boolean>;
  setVisiblePasswords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  students: StudentRow[];
  
  // Create Election Form States
  newElectionTitle: string;
  setNewElectionTitle: (val: string) => void;
  newElectionDesc: string;
  setNewElectionDesc: (val: string) => void;
  candidateInput: string;
  setCandidateInput: (val: string) => void;
  candidates: string[];
  setCandidates: (val: string[]) => void;
  handleCreateElection: (e: React.FormEvent) => void;
  
  // Create Voter Form States
  newVoterUsername: string;
  setNewVoterUsername: (val: string) => void;
  newVoterPassword: string;
  setNewVoterPassword: (val: string) => void;
  newVoterRole: string;
  setNewVoterRole: (val: string) => void;
  handleCreateVoter: (e: React.FormEvent) => void;
  
  // Actions
  handleUpdateElectionStatus: (id: string, status: "draft" | "active" | "completed") => void;
  handleDeleteElection: (id: string) => void;
  simulateVotes: (id: string) => void;
  toggleVoterRole: (v: VoterRow) => void;
  toggleBlockVoter: (v: VoterRow) => void;
  handleDeleteVoter: (id: string) => void;
  togglePublishResults: (id: string, published: boolean) => void;

  // Club Form States
  newClubName: string;
  setNewClubName: (val: string) => void;
  newClubDesc: string;
  setNewClubDesc: (val: string) => void;
  newClubManagerId: string;
  setNewClubManagerId: (val: string) => void;
  handleCreateClub: (e: React.FormEvent) => void;
  handleDeleteClub: (id: string) => void;
  handleToggleClubMember: (clubId: string, voterId: string) => void;
  selectedClubIdForManage: string | null;
  setSelectedClubIdForManage: (id: string | null) => void;

  // Social updates composer
  newUpdateContent: string;
  setNewUpdateContent: (val: string) => void;
  handleCreateUpdate: (e: React.FormEvent) => void;
  handleDeleteUpdate: (id: string) => void;
  handleToggleLikeUpdate: (id: string) => void;
  newCommentContents: Record<string, string>;
  setNewCommentContents: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handlePostComment: (e: React.FormEvent, updateId: string) => void;

  // General helpers
  truncateDatabase: () => void;
  refreshDatabaseState: () => Promise<void>;
  showToast: (msg: string) => void;
  setIsLoading: (val: boolean) => void;
}

export default function AdminDashboard({
  currentUser,
  activeMenu,
  setActiveMenu,
  elections,
  votes,
  voters,
  clubs,
  clubMembers,
  updates,
  updateLikes,
  updateComments,
  visiblePasswords,
  setVisiblePasswords,
  students,
  newElectionTitle,
  setNewElectionTitle,
  newElectionDesc,
  setNewElectionDesc,
  candidateInput,
  setCandidateInput,
  candidates,
  setCandidates,
  handleCreateElection,
  newVoterUsername,
  setNewVoterUsername,
  newVoterPassword,
  setNewVoterPassword,
  newVoterRole,
  setNewVoterRole,
  handleCreateVoter,
  handleUpdateElectionStatus,
  handleDeleteElection,
  simulateVotes,
  toggleVoterRole,
  toggleBlockVoter,
  handleDeleteVoter,
  togglePublishResults,
  newClubName,
  setNewClubName,
  newClubDesc,
  setNewClubDesc,
  newClubManagerId,
  setNewClubManagerId,
  handleCreateClub,
  handleDeleteClub,
  handleToggleClubMember,
  selectedClubIdForManage,
  setSelectedClubIdForManage,
  newUpdateContent,
  setNewUpdateContent,
  handleCreateUpdate,
  handleDeleteUpdate,
  handleToggleLikeUpdate,
  newCommentContents,
  setNewCommentContents,
  handlePostComment,
  truncateDatabase,
  refreshDatabaseState,
  showToast,
  setIsLoading
}: AdminDashboardProps) {

  // Club voter members filter & inline membership management states
  const [voterFilter, setVoterFilter] = useState<"all" | "club" | "non_club">("all");
  const [activeDropdownVoterId, setActiveDropdownVoterId] = useState<string | null>(null);

  // Admin Profile settings form
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);

    if (profilePassword && profilePassword !== profileConfirmPassword) {
      setProfileError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const updateData: Partial<VoterRow> = { username: profileUsername };
      if (profilePassword) {
        updateData.password = profilePassword;
      }

      await dbService.updateVoter(currentUser.id, updateData);
      showToast("Profile credentials updated successfully.");
      setProfileMessage("Your credentials have been updated. Changes will apply immediately.");
      setProfilePassword("");
      setProfileConfirmPassword("");
      await refreshDatabaseState();
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ================== ELECTION VIEW ================== */}
      {activeMenu === "election" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Election Sheet */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">New Election Sheet</h3>
              <p className="text-[11px] text-zinc-400">Initialize a custom polling sheet targeted to voters</p>
            </div>

            <form onSubmit={handleCreateElection} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Election Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Student Body President"
                  value={newElectionTitle}
                  onChange={(e) => setNewElectionTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Description</label>
                <textarea
                  placeholder="Define context, candidate standards, and key requirements..."
                  value={newElectionDesc}
                  onChange={(e) => setNewElectionDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100 min-h-12"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500">Candidate Slates</label>
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
                      if (val && !candidates.includes(val)) {
                        setCandidates([...candidates, val]);
                        setCandidateInput("");
                      }
                    }}
                    className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {candidates.map((cand, idx) => (
                    <span key={idx} className="text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-100 dark:border-blue-900/30">
                      <span>{cand}</span>
                      <X 
                        className="w-3 h-3 text-blue-400 hover:text-blue-600 cursor-pointer" 
                        onClick={() => setCandidates(candidates.filter((_, i) => i !== idx))}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#0B1E40] hover:bg-blue-900 text-white font-semibold text-xs rounded-full transition-colors cursor-pointer"
              >
                Insert Election Row
              </button>
            </form>
          </div>

          {/* Active Polls Panel */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Vote className="w-5 h-5 text-blue-500" />
              <span>Active Public Ballots</span>
            </h3>

            {elections.filter(e => !e.club_id).length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <p className="text-xs text-zinc-500">No public elections have been initialized yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {elections.filter(e => !e.club_id).map((election) => {
                  const votesCount = votes.filter(v => v.election_id === election.id).length;

                  return (
                    <div key={election.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{election.title}</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{election.description}</p>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                          election.status === "active" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : election.status === "completed"
                            ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}>
                          {election.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-zinc-50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/40 font-mono">
                        <div>
                          <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Poll Status</div>
                          <div className="font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5">
                            <select 
                              value={election.status}
                              onChange={(e) => handleUpdateElectionStatus(election.id, e.target.value as any)}
                              className="bg-transparent border-none text-xs focus:outline-none font-bold text-zinc-700 dark:text-zinc-200 cursor-pointer"
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Published Feed</div>
                          <div className="font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5">
                            <input 
                              type="checkbox"
                              checked={election.published}
                              onChange={(e) => togglePublishResults(election.id, e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                            />
                            <span>{election.published ? "Visible" : "Hidden"}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Ballots cast</div>
                          <div className="font-semibold text-zinc-700 dark:text-zinc-200 mt-0.5">{votesCount} votes</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex gap-1 flex-wrap">
                          {election.candidates.map((cand, idx) => (
                            <span key={idx} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full border border-zinc-200/50 dark:border-zinc-700">
                              {cand}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          {election.status !== "completed" && (
                            <button
                              onClick={() => simulateVotes(election.id)}
                              className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer border border-blue-100 dark:border-blue-900/40"
                              title="Distribute random ballots among active voters"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              <span>Simulate Ballots</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteElection(election.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full cursor-pointer"
                            title="Delete election row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================== VOTERS VIEW ================== */}
      {activeMenu === "voters" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Voter Form */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">New User Account</h3>
              <p className="text-[11px] text-zinc-400">Initialize a voter credentials row into voters table</p>
            </div>

            <form onSubmit={handleCreateVoter} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Username</label>
                <input 
                  type="text"
                  placeholder="e.g. john_voter"
                  value={newVoterUsername}
                  onChange={(e) => setNewVoterUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Password</label>
                <input 
                  type="text"
                  placeholder="e.g. SecureSecret123"
                  value={newVoterPassword}
                  onChange={(e) => setNewVoterPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Assigned Role</label>
                <select
                  value={newVoterRole}
                  onChange={(e) => setNewVoterRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value="voter">General Voter</option>
                  <option value="club_manager">Club Manager</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:bg-zinc-800 text-xs font-semibold rounded-full transition-colors cursor-pointer mt-2"
              >
                Register Credentials Row
              </button>
            </form>
          </div>

          {/* Voters List Table */}
          <div className="lg:col-span-2 space-y-4">
            {(() => {
              const displayedVoters = voters.filter(v => {
                const isMember = clubMembers.some(cm => cm.voter_id === v.id);
                if (voterFilter === "club") return isMember;
                if (voterFilter === "non_club") return !isMember;
                return true;
              });

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      <span>Registered Voter Base ({displayedVoters.length})</span>
                    </h3>

                    {/* Filter Pills */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl text-[11px] font-semibold border border-zinc-200/40 dark:border-zinc-700/60 w-fit">
                      <button
                        type="button"
                        onClick={() => setVoterFilter("all")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${voterFilter === "all" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                      >
                        All Users
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoterFilter("club")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${voterFilter === "club" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                      >
                        Club Members
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoterFilter("non_club")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${voterFilter === "non_club" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                      >
                        Non-Members
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-visible shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 text-xs">
                            <th className="p-4">Voter ID</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Plain Secret</th>
                            <th className="p-4">Club Memberships</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {displayedVoters.map((v) => (
                            <tr key={v.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                              <td className="p-4 font-mono text-xs text-zinc-400">{v.id}</td>
                              <td className="p-4 font-semibold text-zinc-950 dark:text-zinc-50">{v.username}</td>
                              <td className="p-4">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                  v.role === "club_manager"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                }`}>
                                  {v.role === "club_manager" ? "Club Manager" : "Voter"}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-xs text-zinc-500">
                                <div className="flex items-center gap-2">
                                  <span>{visiblePasswords[v.id] ? v.password : "••••••••••••"}</span>
                                  <button 
                                    onClick={() => setVisiblePasswords(p => ({ ...p, [v.id]: !p[v.id] }))}
                                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400"
                                  >
                                    {visiblePasswords[v.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="relative">
                                  {/* List of active clubs for this voter */}
                                  {(() => {
                                    const voterClubs = clubs.filter(c => clubMembers.some(cm => cm.club_id === c.id && cm.voter_id === v.id));
                                    return (
                                      <div className="flex flex-wrap items-center gap-1">
                                        {voterClubs.length === 0 ? (
                                          <span className="text-[10px] text-zinc-400 italic">No clubs</span>
                                        ) : (
                                          voterClubs.map(c => (
                                            <span key={c.id} className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium border border-blue-100/60 dark:border-blue-900/40">
                                              {c.name}
                                            </span>
                                          ))
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setActiveDropdownVoterId(activeDropdownVoterId === v.id ? null : v.id)}
                                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all ml-1 cursor-pointer"
                                          title="Add/remove voter clubs"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })()}

                                  {/* Quick Club Assign Selector Dropdown */}
                                  {activeDropdownVoterId === v.id && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setActiveDropdownVoterId(null)} 
                                      />
                                      <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-2.5 space-y-1">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 pb-1">
                                          Toggle Club Memberships
                                        </div>
                                        {clubs.length === 0 ? (
                                          <p className="text-[11px] text-zinc-400 p-1">No clubs registered.</p>
                                        ) : (
                                          clubs.map(club => {
                                            const isMember = clubMembers.some(cm => cm.club_id === club.id && cm.voter_id === v.id);
                                            return (
                                              <button
                                                type="button"
                                                key={club.id}
                                                onClick={() => handleToggleClubMember(club.id, v.id)}
                                                className={`w-full flex items-center justify-between text-left text-xs px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                                  isMember 
                                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold" 
                                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                }`}
                                              >
                                                <span className="truncate max-w-[140px]">{club.name}</span>
                                                {isMember ? <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Square className="w-3.5 h-3.5 text-zinc-400" />}
                                              </button>
                                            );
                                          })
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                  v.is_blocked 
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                }`}>
                                  {v.is_blocked ? "Blocked" : "Active"}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => toggleVoterRole(v)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100 transition-colors cursor-pointer"
                                  >
                                    Toggle Role
                                  </button>
                                  <button
                                    onClick={() => toggleBlockVoter(v)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                      v.is_blocked
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100"
                                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100"
                                    }`}
                                  >
                                    {v.is_blocked ? "Unblock" : "Block"}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteVoter(v.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors cursor-pointer"
                                    title="Delete voter index"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================== CLUBS VIEW ================== */}
      {activeMenu === "clubs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Club Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">New Student Club</h3>
              <p className="text-[11px] text-zinc-400">Initialize a club page with assigned manager</p>
            </div>

            <form onSubmit={handleCreateClub} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Club Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Science & Biotech Club"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Description</label>
                <textarea
                  placeholder="Describe the club guidelines, target voters, and meeting hours..."
                  value={newClubDesc}
                  onChange={(e) => setNewClubDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100 min-h-12"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Assigned Club Manager</label>
                <select
                  value={newClubManagerId}
                  onChange={(e) => setNewClubManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-zinc-100"
                  required
                >
                  <option value="">-- Select a Club Manager --</option>
                  {voters.filter(v => v.role === 'club_manager').map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.username} (Club Manager)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Note: Register user accounts and set their role to "Club Manager" inside the <strong>Manage Users</strong> tab first if none are available.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#0B1E40] hover:bg-blue-900 text-white font-semibold text-xs rounded-full transition-colors cursor-pointer"
              >
                Create Club Page
              </button>
            </form>
          </div>

          {/* Clubs Grid List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Users2 className="w-5 h-5 text-blue-500" />
              <span>Active Student Clubs</span>
            </h3>

            {clubs.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <p className="text-xs text-zinc-500">No student clubs have been registered yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clubs.map((club) => {
                  const manager = voters.find(v => v.id === club.manager_id);
                  const membersCount = clubMembers.filter(m => m.club_id === club.id).length;
                  const isManaging = selectedClubIdForManage === club.id;

                  return (
                    <div 
                      key={club.id} 
                      className={`p-5 rounded-2xl border transition-all bg-white dark:bg-zinc-900 shadow-sm ${
                        isManaging 
                          ? "border-blue-500 ring-1 ring-blue-500" 
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 text-base">
                            <span>{club.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold font-mono">
                              {membersCount} Members
                            </span>
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{club.description}</p>
                          
                          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 font-mono">
                            <span className="flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                              <span>
                                Manager: {manager ? (
                                  <strong className="text-zinc-700 dark:text-zinc-300 font-bold">{manager.username}</strong>
                                ) : (
                                  <span className="text-zinc-400 italic font-normal">None assigned</span>
                                )}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedClubIdForManage(isManaging ? null : club.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              isManaging 
                                ? "bg-[#0B1E40] text-white" 
                                : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                            }`}
                          >
                            {isManaging ? "Close Member List" : "Tick members"}
                          </button>

                          <button 
                            onClick={() => handleDeleteClub(club.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Delete Club"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Ticking Members Panel */}
                      {isManaging && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                              Tick Club Members for "{club.name}"
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                              ⚠️ Verified Students Only
                            </span>
                          </div>

                          <p className="text-[10px] text-zinc-400">
                            Only official, Google-verified student accounts in the directory can be ticked for membership eligibility.
                          </p>

                          {voters.filter(v => students.some(s => s.email && s.email.toLowerCase() === v.username.toLowerCase())).length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">No verified, connected student users are currently in the directory to select.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                              {voters.filter(v => students.some(s => s.email && s.email.toLowerCase() === v.username.toLowerCase())).map((voter) => {
                                const isMember = clubMembers.some(
                                  m => m.club_id === club.id && m.voter_id === voter.id
                                );

                                const linkedStudent = students.find(s => s.email && s.email.toLowerCase() === voter.username.toLowerCase());

                                return (
                                  <button
                                    type="button"
                                    key={voter.id}
                                    onClick={() => handleToggleClubMember(club.id, voter.id)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                                      isMember 
                                        ? "bg-blue-50/50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-900 text-blue-900 dark:text-blue-200" 
                                        : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold">
                                        {linkedStudent ? `${linkedStudent.first_name} ${linkedStudent.surname}` : voter.username}
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">{voter.username}</span>
                                    </div>
                                    <div>
                                      {isMember ? (
                                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-zinc-400" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================== RESULTS FEED VIEW ================== */}
      {activeMenu === "results" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50">Publish Results Feed</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Determine which finalized voting sheets are visible to public voters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {elections.map((election) => {
              const resultsMap = votes.filter(v => v.election_id === election.id).reduce<Record<string, number>>((acc, curr) => {
                acc[curr.candidate] = (acc[curr.candidate] || 0) + 1;
                return acc;
              }, {});

              const totalVotes = (Object.values(resultsMap) as number[]).reduce((a, b) => a + b, 0);

              return (
                <div key={election.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base flex items-center gap-2">
                        <span>{election.title}</span>
                        {election.club_id && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                            Club Poll
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400">Total votes: {totalVotes}</span>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      election.published 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400"
                    }`}>
                      {election.published ? "Published" : "Hidden"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    {election.candidates.map((cand, idx) => {
                      const count = resultsMap[cand] || 0;
                      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{cand}</span>
                            <span className="font-mono text-zinc-500">{count} votes ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#0B1E40] rounded-full" 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => togglePublishResults(election.id, !election.published)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        election.published 
                          ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200" 
                          : "bg-[#0B1E40] hover:bg-blue-900 text-white border-blue-500"
                      }`}
                    >
                      {election.published ? "Withdraw Publication" : "Publish to Feed"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================== UPDATES VIEW ================== */}
      {activeMenu === "updates" && (
        <UpdatesFeed
          currentUser={currentUser}
          updates={updates}
          updateLikes={updateLikes}
          updateComments={updateComments}
          newUpdateContent={newUpdateContent}
          setNewUpdateContent={setNewUpdateContent}
          handleCreateUpdate={handleCreateUpdate}
          handleDeleteUpdate={handleDeleteUpdate}
          handleToggleLikeUpdate={handleToggleLikeUpdate}
          newCommentContents={newCommentContents}
          setNewCommentContents={setNewCommentContents}
          handlePostComment={handlePostComment}
          isAdmin={true}
        />
      )}

      {/* ================== PROFILE VIEW ================== */}
      {activeMenu === "profile" && (
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50">Profile Settings</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-sans">Change your administrator login username and password details</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 border border-emerald-200 dark:border-emerald-900/50">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                <span>{profileMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 font-sans">Username</label>
              <input 
                type="text"
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 font-medium font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 font-sans">New Password (optional)</label>
              <input 
                type="password"
                placeholder="Leave blank to keep current password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 font-sans">Confirm Password</label>
              <input 
                type="password"
                placeholder="Confirm your new password"
                value={profileConfirmPassword}
                onChange={(e) => setProfileConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-medium"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
              >
                Update Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================== STUDENTS VIEW ================== */}
      {activeMenu === "students" && (
        <StudentsManager
          students={students}
          refreshDatabaseState={refreshDatabaseState}
          showToast={showToast}
          setIsLoading={setIsLoading}
        />
      )}

      {/* ================== VERIFIED USERS VIEW ================== */}
      {activeMenu === "verified" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <span>Verified Campus Directory</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                List of official students who have successfully linked and verified their identity using university Google credentials.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider font-mono">Total Verified Accounts</span>
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {voters.filter(v => students.some(s => s.email && s.email.toLowerCase() === v.username.toLowerCase())).length}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider font-mono font-sans">Registry Records</span>
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {students.length}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider font-sans text-emerald-600 dark:text-emerald-400">Club Eligibility Rate</span>
              <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {students.length > 0 
                  ? `${Math.round((voters.filter(v => students.some(s => s.email && s.email.toLowerCase() === v.username.toLowerCase())).length / students.length) * 100)}%`
                  : "0%"
                }
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Verified Student Directories</span>
              <span className="text-[10px] font-bold text-zinc-400 font-mono">CLUB MEMBERSHIP GATEWAY</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/40 text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4">Student Profile</th>
                    <th className="p-4">Reg Number</th>
                    <th className="p-4">Program Course</th>
                    <th className="p-4">CUM</th>
                    <th className="p-4">Clubs Engaged</th>
                    <th className="p-4 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {voters.filter(v => students.some(s => s.email && s.email.toLowerCase() === v.username.toLowerCase())).map((voter) => {
                    const student = students.find(s => s.email && s.email.toLowerCase() === voter.username.toLowerCase())!;
                    const userClubs = clubMembers
                      .filter(m => m.voter_id === voter.id)
                      .map(m => clubs.find(c => c.id === m.club_id)?.name || "")
                      .filter(Boolean);

                    return (
                      <tr key={voter.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                              {student.first_name[0]}{student.surname[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                                {student.first_name} {student.surname}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">{voter.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-zinc-600 dark:text-zinc-400">{student.registration_number}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">{student.program_name}</td>
                        <td className="p-4 font-mono text-zinc-600 dark:text-zinc-400 font-bold">{student.cum_number}</td>
                        <td className="p-4">
                          {userClubs.length === 0 ? (
                            <span className="text-zinc-400 italic">None active</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {userClubs.map((club, i) => (
                                <span key={i} className="text-[9px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900/30">
                                  {club}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30">
                            <Check className="w-3 h-3" />
                            <span>Linked Google Session</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {voters.filter(v => students.some(s => s.email && s.email.toLowerCase() === v.username.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                        No verified student accounts have initialized their Google OAuth sessions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================== SQL DB INSPECTOR VIEW ================== */}
      {activeMenu === "sql_db" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-normal text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <Database className="w-6 h-6 animate-pulse" />
                <span>SQL DB Inspector</span>
              </h2>
              <p className="text-xs text-zinc-500 font-sans">Live schema tables representation of your active relational database sheets</p>
            </div>

            <button
              onClick={truncateDatabase}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer border border-red-500 shadow-sm font-sans"
            >
              <Trash2 className="w-4 h-4" />
              <span>Truncate All Tables</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
            
            {/* ELECTIONS TABLE */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">TABLE elections</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                  {elections.length} rows
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {elections.map(e => (
                  <div key={e.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span className="truncate max-w-[120px]">{e.title}</span>
                      <span>{e.id}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">Status: {e.status}</div>
                    {e.club_id && <div className="text-[10px] text-zinc-400">club_id: {e.club_id}</div>}
                    <div className="text-[10px] text-zinc-400">Candidates: {JSON.stringify(e.candidates)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* VOTERS TABLE */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">TABLE voters</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                  {voters.length} rows
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {voters.map(v => (
                  <div key={v.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>{v.username}</span>
                      <span>{v.id}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">Role: {v.role}</div>
                    <div className="text-[10px] text-zinc-400">Secret: {v.password}</div>
                    <div className="text-[10px] text-zinc-400">Blocked: {v.is_blocked ? "True" : "False"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* VOTES TABLE */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">TABLE votes</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                  {votes.length} rows
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {votes.map(v => (
                  <div key={v.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>Candidate: {v.candidate}</span>
                      <span>{v.id}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">voter_id: {v.voter_id}</div>
                    <div className="text-[10px] text-zinc-400">election_id: {v.election_id}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
