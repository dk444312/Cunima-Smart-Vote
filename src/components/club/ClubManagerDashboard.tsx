import React, { useState } from "react";
import { Vote, Trash2, Sparkles, Users, AlertCircle, Check, ShieldAlert, X } from "lucide-react";
import { LoggedInUser, ClubRow, ClubMemberRow, VoterRow, ElectionRow, VoteRow, UpdateRow, UpdateLikeRow, UpdateCommentRow } from "../../types.ts";
import { dbService } from "../../lib/supabase.ts";
import UpdatesFeed from "../shared/UpdatesFeed.tsx";

interface ClubManagerDashboardProps {
  currentUser: LoggedInUser;
  clubs: ClubRow[];
  clubMembers: ClubMemberRow[];
  voters: VoterRow[];
  elections: ElectionRow[];
  votes: VoteRow[];
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
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  activeTab: string;
}

export default function ClubManagerDashboard({
  currentUser,
  clubs,
  clubMembers,
  voters,
  elections,
  votes,
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
  isLoading,
  setIsLoading,
  activeTab
}: ClubManagerDashboardProps) {
  // Election form state
  const [electionTitle, setElectionTitle] = useState("");
  const [electionDesc, setElectionDesc] = useState("");
  const [candidateInput, setCandidateInput] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");

  // Profile Form State
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const managedClubs = clubs.filter(c => c.manager_id === currentUser.id);

  // Handlers
  const handleClubManagerCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionTitle.trim()) {
      showToast("Please provide an election title.");
      return;
    }
    if (!selectedClubId) {
      showToast("Please choose a club for this election.");
      return;
    }

    const finalCandidates = [...candidates];
    if (candidateInput.trim() && !finalCandidates.includes(candidateInput.trim())) {
      finalCandidates.push(candidateInput.trim());
    }

    const defaultCandidates = finalCandidates.length > 0 ? finalCandidates : ["Candidate A", "Candidate B"];

    try {
      setIsLoading(true);
      const created = await dbService.insertElection(
        electionTitle.trim(),
        electionDesc.trim(),
        defaultCandidates,
        selectedClubId,
        "active"
      );
      await refreshDatabaseState();

      setElectionTitle("");
      setElectionDesc("");
      setCandidateInput("");
      setCandidates([]);
      showToast(`SQL INSERT SUCCESS: Created club election "${created.title}" successfully.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateClubVotes = async (electionId: string, clubId: string) => {
    try {
      setIsLoading(true);
      const election = elections.find(e => e.id === electionId);
      if (!election) return;

      const activeClubMembers = clubMembers
        .filter(cm => cm.club_id === clubId)
        .map(cm => voters.find(v => v.id === cm.voter_id))
        .filter((v): v is VoterRow => !!v && !v.is_blocked);

      if (activeClubMembers.length === 0) {
        showToast("No active, non-blocked club members found to simulate voting.");
        return;
      }

      await Promise.all(
        activeClubMembers.map(async (voter) => {
          try {
            const randomCandidate = election.candidates[Math.floor(Math.random() * election.candidates.length)];
            await dbService.insertVote(voter.id, electionId, randomCandidate);
          } catch (e) {
            // skip duplicate voters gracefully
          }
        })
      );

      await dbService.updateElection(electionId, { status: "completed" });
      await refreshDatabaseState();
      showToast(`SQL TRANSACTION: Distributed simulated votes among members of your club.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePublishResults = async (id: string, published: boolean) => {
    try {
      setIsLoading(true);
      await dbService.updateElection(id, { published });
      await refreshDatabaseState();
      showToast(`SQL UPDATE SUCCESS: Feed visibility changed to ${published ? "Visible" : "Hidden"}.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteElection = async (id: string) => {
    try {
      setIsLoading(true);
      await dbService.deleteElection(id);
      await refreshDatabaseState();
      showToast("SQL DELETE SUCCESS: Election row deleted permanently.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
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

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col gap-4 items-start bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase font-mono">
            Club Management Portal
          </span>
          <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50 mt-1">
            Welcome back, Manager {currentUser.username}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            You are managing {managedClubs.length} {managedClubs.length === 1 ? "club" : "clubs"} assigned by administrators.
          </p>
        </div>
      </div>

      {managedClubs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
          <ShieldAlert className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Clubs Assigned</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            You do not have any clubs assigned to manage yet. Please request the System Admin to assign you as a club manager.
          </p>
        </div>
      ) : (
        <>
          {/* TAB: CLUB ELECTIONS */}
          {activeTab === "club_elections" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CREATE FORM */}
              <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">New Club Election</h3>
                  <p className="text-[11px] text-zinc-400">Publish a poll to targeted club members</p>
                </div>

                <form onSubmit={handleClubManagerCreateElection} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500">Select Club Target</label>
                    <select
                      value={selectedClubId}
                      onChange={(e) => setSelectedClubId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
                      required
                    >
                      <option value="">-- Choose Managed Club --</option>
                      {managedClubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500">Election Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Club Secretary Poll"
                      value={electionTitle}
                      onChange={(e) => setElectionTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500">Description</label>
                    <textarea
                      placeholder="Vote on candidate slates representing the club..."
                      value={electionDesc}
                      onChange={(e) => setElectionDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-zinc-900 dark:text-zinc-100 min-h-12"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500">Candidates Slates</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Candidate name"
                        value={candidateInput}
                        onChange={(e) => setCandidateInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-zinc-900 dark:text-zinc-100"
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
                        className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 rounded-xl"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {candidates.map((cand, idx) => (
                        <span key={idx} className="text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-100 dark:border-purple-900/30">
                          <span>{cand}</span>
                          <X 
                            className="w-3 h-3 text-purple-400 hover:text-purple-600 cursor-pointer" 
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
                    Publish Club Election Row
                  </button>
                </form>
              </div>

              {/* ACTIVE ELECTIONS */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Vote className="w-5 h-5 text-purple-500" />
                  <span>Active Club Polls</span>
                </h3>

                {elections.filter(e => e.club_id && managedClubs.some(c => c.id === e.club_id)).length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <p className="text-xs text-zinc-500">You haven't posted any elections for your clubs yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {elections.filter(e => e.club_id && managedClubs.some(c => c.id === e.club_id)).map((election) => {
                      const club = managedClubs.find(c => c.id === election.club_id);
                      const votesCount = votes.filter(v => v.election_id === election.id).length;

                      return (
                        <div key={election.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                {club?.name || "Target Club"}
                              </span>
                              <h4 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 mt-1">{election.title}</h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{election.description}</p>
                            </div>

                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                              election.status === "active" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
                                : election.status === "completed"
                                ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
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
                                  onChange={async (e) => {
                                    try {
                                      setIsLoading(true);
                                      await dbService.updateElection(election.id, { status: e.target.value as any });
                                      await refreshDatabaseState();
                                      showToast(`SQL UPDATE SUCCESS: Updated status to "${e.target.value}".`);
                                    } catch (err: any) {
                                      showToast(`SQL ERROR: ${err.message}`);
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }}
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
                                  className="w-3.5 h-3.5 text-purple-600 rounded cursor-pointer"
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
                                  onClick={() => simulateClubVotes(election.id, election.club_id!)}
                                  className="px-3 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer border border-purple-100 dark:border-purple-900/40"
                                  title="Distribute random ballots among active club members"
                                >
                                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                  <span>Simulate Ballots</span>
                                </button>
                              )}
                              <button
                                onClick={() => deleteElection(election.id)}
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

          {/* TAB: CLUB MEMBERS */}
          {activeTab === "club_members" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span>Targeted Club Roster</span>
              </h3>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 text-xs">
                      <th className="p-4">Club Name</th>
                      <th className="p-4">Member Username</th>
                      <th className="p-4">Voter ID</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {managedClubs.flatMap(club => {
                      const membersOfClub = clubMembers.filter(cm => cm.club_id === club.id);
                      return membersOfClub.map(member => {
                        const voterInfo = voters.find(v => v.id === member.voter_id);
                        return (
                          <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                            <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-50">{club.name}</td>
                            <td className="p-4 text-zinc-700 dark:text-zinc-300 font-medium">
                              {voterInfo ? voterInfo.username : "Unknown Voter ID"}
                            </td>
                            <td className="p-4 font-mono text-xs text-zinc-400">{member.voter_id}</td>
                            <td className="p-4">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                voterInfo?.is_blocked 
                                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                              }`}>
                                {voterInfo?.is_blocked ? "Blocked" : "Active Member"}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })}
                    {clubMembers.filter(cm => managedClubs.some(c => c.id === cm.club_id)).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-zinc-500 text-xs">
                          No club members have been registered in this club roster yet. Let the administrator add them.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: FEED */}
          {activeTab === "feed" && (
            <div className="space-y-6">
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
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === "profile" && (
            <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50">Profile Settings</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Change your active club manager details</p>
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
                    className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-purple-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 font-medium"
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
                    className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-purple-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500">Confirm Password</label>
                  <input 
                    type="password"
                    placeholder="Confirm your new password"
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-purple-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
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
        </>
      )}
    </div>
  );
}
