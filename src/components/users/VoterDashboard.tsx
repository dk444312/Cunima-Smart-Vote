import React, { useState } from "react";
import { Vote, ShieldCheck, FileText, AlertCircle, Check } from "lucide-react";
import { LoggedInUser, ElectionRow, VoteRow, ClubMemberRow, UpdateRow, UpdateLikeRow, UpdateCommentRow, VoterRow } from "../../types.ts";
import { dbService } from "../../lib/supabase.ts";
import UpdatesFeed from "../shared/UpdatesFeed.tsx";

interface VoterDashboardProps {
  currentUser: LoggedInUser;
  elections: ElectionRow[];
  votes: VoteRow[];
  clubMembers: ClubMemberRow[];
  updates: UpdateRow[];
  updateLikes: Record<string, UpdateLikeRow[]>;
  updateComments: Record<string, UpdateCommentRow[]>;
  handleDeleteUpdate: (id: string) => void;
  handleToggleLikeUpdate: (id: string) => void;
  newCommentContents: Record<string, string>;
  setNewCommentContents: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handlePostComment: (e: React.FormEvent, updateId: string) => void;
  refreshDatabaseState: () => Promise<void>;
  showToast: (msg: string) => void;
  setIsLoading: (val: boolean) => void;
}

export default function VoterDashboard({
  currentUser,
  elections,
  votes,
  clubMembers,
  updates,
  updateLikes,
  updateComments,
  handleDeleteUpdate,
  handleToggleLikeUpdate,
  newCommentContents,
  setNewCommentContents,
  handlePostComment,
  refreshDatabaseState,
  showToast,
  setIsLoading
}: VoterDashboardProps) {
  const [activeTab, setActiveTab] = useState<"ballot" | "results" | "updates" | "profile">("ballot");
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});

  // Profile fields state
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const handleCastVote = async (electionId: string) => {
    const chosenCandidate = selectedCandidates[electionId];
    if (!chosenCandidate) return;

    try {
      setIsLoading(true);
      await dbService.insertVote(currentUser.id, electionId, chosenCandidate);
      await refreshDatabaseState();
      showToast(`BALLOT TRANSACTION SUCCESS: Your vote for "${chosenCandidate}" has been successfully cast.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message || "Could not cast your vote."}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  const visibleElections = elections.filter(e => e.status === "active" && (!e.club_id || clubMembers.some(cm => cm.club_id === e.club_id && cm.voter_id === currentUser.id)));
  const visibleResults = elections.filter(e => e.published && (!e.club_id || clubMembers.some(cm => cm.club_id === e.club_id && cm.voter_id === currentUser.id)));

  return (
    <div className="space-y-6">
      
      {/* Voter Header Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#1a73e8] dark:text-blue-400 uppercase font-mono">
            Official Voter Ballot Portal
          </span>
          <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50 mt-1">
            Welcome back, {currentUser.username}
          </h2>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("ballot")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "ballot" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500"
            }`}
          >
            My Ballots
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "results" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500"
            }`}
          >
            Election Results
          </button>
          <button
            onClick={() => setActiveTab("updates")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "updates" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500"
            }`}
          >
            Election Updates
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "profile" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500"
            }`}
          >
            My Profile
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "ballot" && (
        <div className="space-y-6">
          {visibleElections.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
              <Vote className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Active Ballots</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                There are currently no active ballots available for selection in your registered roster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleElections.map((election) => {
                const hasVoted = votes.some(v => v.voter_id === currentUser.id && v.election_id === election.id);
                const recordedVote = votes.find(v => v.voter_id === currentUser.id && v.election_id === election.id);

                return (
                  <div key={election.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-zinc-950 dark:text-zinc-50">{election.title}</h3>
                          {election.club_id && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                              Club Poll
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{election.description}</p>
                      </div>

                      {hasVoted ? (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                          <div className="text-xs">
                            <p className="font-semibold">Voted Cast Successfully</p>
                            <p className="opacity-80 mt-0.5">Your receipt points to: <strong className="font-mono">{recordedVote?.candidate}</strong></p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select candidate on sheet:</span>
                          <div className="flex flex-col gap-2">
                            {election.candidates.map((cand, idx) => (
                              <label 
                                key={idx} 
                                className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                                  selectedCandidates[election.id] === cand 
                                    ? "bg-blue-50/50 border-blue-500 dark:bg-blue-950/20" 
                                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                                }`}
                              >
                                <input 
                                  type="radio" 
                                  name={`election-${election.id}`}
                                  value={cand}
                                  checked={selectedCandidates[election.id] === cand}
                                  onChange={() => setSelectedCandidates(p => ({ ...p, [election.id]: cand }))}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>{cand}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {!hasVoted && (
                      <button
                        onClick={() => handleCastVote(election.id)}
                        disabled={!selectedCandidates[election.id]}
                        className="w-full mt-6 py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-sm rounded-full disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Submit Encrypted Ballot Record
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "results" && (
        <div className="space-y-6">
          {visibleResults.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
              <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Published Results</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                There are currently no active polls published to the feed. Please verify again later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleResults.map((election) => {
                const resultsMap = votes.filter(v => v.election_id === election.id).reduce<Record<string, number>>((acc, curr) => {
                  acc[curr.candidate] = (acc[curr.candidate] || 0) + 1;
                  return acc;
                }, {});

                const totalVotes = (Object.values(resultsMap) as number[]).reduce((a, b) => a + b, 0);

                return (
                  <div key={election.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base">{election.title}</h4>
                        {election.club_id && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            Club Poll
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">Total votes: {totalVotes}</span>
                    </div>

                    <div className="space-y-2">
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
                                className="h-full bg-blue-600 rounded-full" 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "updates" && (
        <UpdatesFeed
          currentUser={currentUser}
          updates={updates}
          updateLikes={updateLikes}
          updateComments={updateComments}
          newUpdateContent=""
          setNewUpdateContent={() => {}}
          handleCreateUpdate={() => {}}
          handleDeleteUpdate={handleDeleteUpdate}
          handleToggleLikeUpdate={handleToggleLikeUpdate}
          newCommentContents={newCommentContents}
          setNewCommentContents={setNewCommentContents}
          handlePostComment={handlePostComment}
          isAdmin={false}
        />
      )}

      {activeTab === "profile" && (
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50">Profile Settings</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Change your active voter login username and password details</p>
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
              <label className="text-xs font-semibold text-zinc-500">Username</label>
              <input 
                type="text"
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">New Password (optional)</label>
              <input 
                type="password"
                placeholder="Leave blank to keep current password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Confirm Password</label>
              <input 
                type="password"
                placeholder="Confirm your new password"
                value={profileConfirmPassword}
                onChange={(e) => setProfileConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
              >
                Update Credentials
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
