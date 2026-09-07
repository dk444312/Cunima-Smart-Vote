import React, { useState } from "react";
import {
  Vote,
  ShieldCheck,
  FileText,
  AlertCircle,
  Check,
  Sparkles,
  User,
  BadgeAlert,
} from "lucide-react";
import {
  LoggedInUser,
  ElectionRow,
  VoteRow,
  ClubMemberRow,
  UpdateRow,
  UpdateLikeRow,
  UpdateCommentRow,
  VoterRow,
  StudentRow,
} from "../../types.ts";
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
  students: StudentRow[];
  handleDeleteUpdate: (id: string) => void;
  handleToggleLikeUpdate: (id: string) => void;
  newCommentContents: Record<string, string>;
  setNewCommentContents: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  handlePostComment: (e: React.FormEvent, updateId: string) => void;
  refreshDatabaseState: () => Promise<void>;
  showToast: (msg: string) => void;
  setIsLoading: (val: boolean) => void;
  activeTab: string;
}

export default function VoterDashboard({
  currentUser,
  elections,
  votes,
  clubMembers,
  updates,
  updateLikes,
  updateComments,
  students,
  handleDeleteUpdate,
  handleToggleLikeUpdate,
  newCommentContents,
  setNewCommentContents,
  handlePostComment,
  refreshDatabaseState,
  showToast,
  setIsLoading,
  activeTab,
}: VoterDashboardProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, string>
  >({});

  // Profile fields state
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileGuardLocked, setProfileGuardLocked] = useState(
    !!currentUser.guard_locked,
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const handleCastVote = async (electionId: string) => {
    const chosenCandidate = selectedCandidates[electionId];
    if (!chosenCandidate) return;

    try {
      setIsLoading(true);
      await dbService.insertVote(currentUser.id, electionId, chosenCandidate);
      await refreshDatabaseState();
      showToast(
        `BALLOT TRANSACTION SUCCESS: Your vote for "${chosenCandidate}" has been successfully cast.`,
      );
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
      const updateData: Partial<VoterRow> = {
        username: profileUsername,
        guard_locked: profileGuardLocked,
      };
      if (profilePassword) {
        updateData.password = profilePassword;
      }

      await dbService.updateVoter(currentUser.id, updateData);

      // Synchronize active session storage state
      const localS = localStorage.getItem("g_election_active_user");
      if (localS) {
        const parsed = JSON.parse(localS);
        parsed.username = profileUsername;
        parsed.guard_locked = profileGuardLocked;
        localStorage.setItem("g_election_active_user", JSON.stringify(parsed));
        currentUser.username = profileUsername;
        currentUser.guard_locked = profileGuardLocked;
      }

      showToast("Profile credentials updated successfully.");
      setProfileMessage(
        "Your credentials and Guard Lock status have been updated successfully.",
      );
      setProfilePassword("");
      setProfileConfirmPassword("");
      await refreshDatabaseState();
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const visibleElections = elections.filter(
    (e) =>
      e.status === "active" &&
      (!e.club_id ||
        clubMembers.some(
          (cm) => cm.club_id === e.club_id && cm.voter_id === currentUser.id,
        )),
  );
  const visibleResults = elections.filter(
    (e) =>
      e.published &&
      (!e.club_id ||
        clubMembers.some(
          (cm) => cm.club_id === e.club_id && cm.voter_id === currentUser.id,
        )),
  );

  return (
    <div className="space-y-6">
      {/* Voter Header Panel */}
      <div className="flex flex-col gap-4 items-start bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#0B1E40] dark:text-blue-400 uppercase font-mono">
            Official Voter Ballot Portal
          </span>
          <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50 mt-1">
            Welcome back, {currentUser.username}
          </h2>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "ballot" && (
        <div className="space-y-6">
          {visibleElections.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
              <Vote className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                No Active Ballots
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                There are currently no active ballots available for selection in
                your registered roster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleElections.map((election) => {
                const hasVoted = votes.some(
                  (v) =>
                    v.voter_id === currentUser.id &&
                    v.election_id === election.id,
                );
                const recordedVote = votes.find(
                  (v) =>
                    v.voter_id === currentUser.id &&
                    v.election_id === election.id,
                );

                return (
                  <div
                    key={election.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm"
                  >
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-zinc-950 dark:text-zinc-50">
                            {election.title}
                          </h3>
                          {election.club_id && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                              Club Poll
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                          {election.description}
                        </p>
                      </div>

                      {hasVoted ? (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                          <div className="text-xs">
                            <p className="font-semibold">
                              Voted Cast Successfully
                            </p>
                            <p className="opacity-80 mt-0.5">
                              Your receipt points to:{" "}
                              <strong className="font-mono">
                                {recordedVote?.candidate}
                              </strong>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Select candidate on sheet:
                          </span>
                          <div className="flex flex-col gap-2">
                            {election.candidates.map((cand, idx) => (
                              <label
                                key={idx}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                                  selectedCandidates[election.id] ===
                                  (typeof cand === "string" ? cand : cand.name)
                                    ? "bg-blue-50/50 border-blue-500 dark:bg-blue-950/20"
                                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`election-${election.id}`}
                                  value={
                                    typeof cand === "string" ? cand : cand.name
                                  }
                                  checked={
                                    selectedCandidates[election.id] ===
                                    (typeof cand === "string"
                                      ? cand
                                      : cand.name)
                                  }
                                  onChange={() =>
                                    setSelectedCandidates((p) => ({
                                      ...p,
                                      [election.id]:
                                        typeof cand === "string"
                                          ? cand
                                          : cand.name,
                                    }))
                                  }
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="flex items-center gap-3">
                                  {typeof cand === "object" &&
                                    cand.photo_url && (
                                      <img
                                        src={cand.photo_url}
                                        alt={cand.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  <span>
                                    {typeof cand === "string"
                                      ? cand
                                      : cand.name}
                                  </span>
                                </div>
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
                        className="w-full mt-6 py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-semibold text-sm rounded-full disabled:opacity-50 transition-colors cursor-pointer"
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
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                No Published Results
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                There are currently no active polls published to the feed.
                Please verify again later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleResults.map((election) => {
                const resultsMap = votes
                  .filter((v) => v.election_id === election.id)
                  .reduce<Record<string, number>>((acc, curr) => {
                    acc[curr.candidate] = (acc[curr.candidate] || 0) + 1;
                    return acc;
                  }, {});

                const totalVotes = (
                  Object.values(resultsMap) as number[]
                ).reduce((a, b) => a + b, 0);

                return (
                  <div
                    key={election.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm"
                  >
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base">
                          {election.title}
                        </h4>
                        {election.club_id && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            Club Poll
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Total votes: {totalVotes}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {election.candidates.map((cand, idx) => {
                        const count =
                          resultsMap[
                            typeof cand === "string" ? cand : cand.name
                          ] || 0;
                        const pct =
                          totalVotes > 0
                            ? Math.round((count / totalVotes) * 100)
                            : 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>
                                {typeof cand === "string" ? cand : cand.name}
                              </span>
                              <span className="font-mono text-zinc-500">
                                {count} votes ({pct}%)
                              </span>
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

      {activeTab === "profile" &&
        (() => {
          const linkedStudent = students.find(
            (s) =>
              s.email?.toLowerCase() === currentUser.username.toLowerCase(),
          );
          return (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
              id="voter_profile_dashboard"
            >
              {/* Student Profile Card */}
              {linkedStudent ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Verified Student Profile
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Your official CUNIMA verified registration card
                    </p>
                  </div>

                  <div className="space-y-3 text-xs flex-grow my-4">
                    <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                          First Name
                        </span>
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {linkedStudent.first_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                          Surname
                        </span>
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {linkedStudent.surname}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                          Registration ID
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {linkedStudent.registration_number}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                          Program Course
                        </span>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {linkedStudent.program_name}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                            Academic Year
                          </span>
                          <span className="text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                            {linkedStudent.academic_year}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono text-right">
                            CUM Number
                          </span>
                          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 block text-right">
                            {linkedStudent.cum_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-[11px] font-mono">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>ELGIBILITY: REGISTERED VOTER APPROVED</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
                  <BadgeAlert className="w-12 h-12 text-amber-500" />
                  <div>
                    <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                      No Approved Student Record Linked
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
                      Your account is registered but does not have a linked
                      verified student card in the registry database. Please
                      contact your campus administrator.
                    </p>
                  </div>
                </div>
              )}

              {/* Credentials Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-normal text-zinc-900 dark:text-zinc-50">
                    Local Credentials
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Activate/Update a username and password to log in directly
                    without Google if desired
                  </p>
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
                    <label className="text-xs font-semibold text-zinc-500">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Set direct login password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={profileConfirmPassword}
                      onChange={(e) =>
                        setProfileConfirmPassword(e.target.value)
                      }
                      className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                    />
                  </div>

                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                          🔒 Activate Credential Guard Lock
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileGuardLocked}
                          onChange={(e) =>
                            setProfileGuardLocked(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      When active, signing in with your Google email will
                      require validating this local password as a mandatory
                      secondary authentication lock.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
                    >
                      Save Credentials
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
