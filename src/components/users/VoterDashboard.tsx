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
  Award,
  Lock,
  Home,
  PieChart,
  Users2,
  KeyRound,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  LoggedInUser,
  ElectionRow,
  VoteRow,
  ClubMemberRow,
  ClubRow,
  UpdateRow,
  UpdateLikeRow,
  UpdateCommentRow,
  VoterRow,
  StudentRow,
  Position,
  Candidate,
} from "../../types.ts";
import { dbService, getElectionPositions, preferenceStorage } from "../../lib/supabase.ts";
import { getUserAvatarUrl } from "../../lib/avatar.ts";

// Lazy load social updates feed to optimize bundle size and speed
const UpdatesFeed = React.lazy(() => import("../shared/UpdatesFeed.tsx"));

interface VoterDashboardProps {
  currentUser: LoggedInUser;
  elections: ElectionRow[];
  votes: VoteRow[];
  clubMembers: ClubMemberRow[];
  clubs?: ClubRow[];
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
  onNavigate?: (tab: string) => void;
  onRequireLogin?: () => void;
}

export default function VoterDashboard({
  currentUser,
  elections,
  votes,
  clubMembers,
  clubs = [],
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
  onNavigate,
}: VoterDashboardProps) {
  // Keyed by `${electionId}_${positionId}` -> { candidateName, candidateId }
  // Locally persisted so that refreshing or navigating doesn't wipe voter's drafted ballot selections
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, { candidateName: string; candidateId?: string }>
  >(() => {
    return preferenceStorage.getBallotDraft(currentUser.id);
  });

  // Profile fields state
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileGuardLocked, setProfileGuardLocked] = useState(
    !!currentUser.guard_locked,
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Student Clubs Modal state
  const [isClubsModalOpen, setIsClubsModalOpen] = useState(false);

  // Unlinked student submission modal state
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subFirstName, setSubFirstName] = useState("");
  const [subSurname, setSubSurname] = useState("");
  const [subRegNumber, setSubRegNumber] = useState(
    currentUser.username.includes("@") ? "" : currentUser.username,
  );
  const [subEmail, setSubEmail] = useState(
    currentUser.username.includes("@") ? currentUser.username : "",
  );
  const [subProgram, setSubProgram] = useState("");
  const [subYear, setSubYear] = useState("");
  const [subCum, setSubCum] = useState("");
  const [subGender, setSubGender] = useState("M");

  // Edit profile modal state
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editCum, setEditCum] = useState("");
  const [editGender, setEditGender] = useState("M");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Search query for favorite candidates in election voting portal - saved locally
  const [voterSearchQueries, setVoterSearchQueries] = useState<Record<string, string>>(() => {
    return preferenceStorage.getPreference<Record<string, string>>(`voter_search_${currentUser.id}`, {});
  });

  const normUser = currentUser.username.trim().toLowerCase();
  const linkedStudent = students.find((s) => {
    const sEmail = s.email ? s.email.trim().toLowerCase() : "";
    const sReg = s.registration_number ? s.registration_number.trim().toLowerCase() : "";
    const sCum = s.cum_number ? s.cum_number.trim().toLowerCase() : "";
    if (sEmail && sEmail === normUser) return true;
    if (sReg && sReg === normUser) return true;
    if (sCum && sCum === normUser) return true;
    if (sEmail && normUser.includes("@") && sEmail.split("@")[0] === normUser.split("@")[0]) return true;
    return false;
  });

  const handleSubmitStudentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !subFirstName ||
      !subSurname ||
      !subRegNumber ||
      !subProgram ||
      !subYear ||
      !subCum
    ) {
      showToast("Please fill in all student profile fields.");
      return;
    }
    try {
      setIsSubmitting(true);
      setIsLoading(true);
      await dbService.insertStudent({
        first_name: subFirstName.trim(),
        surname: subSurname.trim(),
        registration_number: subRegNumber.trim(),
        program_name: subProgram.trim(),
        academic_year: subYear.trim(),
        cum_number: subCum.trim(),
        gender: subGender.trim(),
        email: (subEmail || currentUser.username).trim().toLowerCase(),
        status: "pending",
      });
      await refreshDatabaseState();
      setIsSubmissionModalOpen(false);
      showToast("Student profile submitted for administrator approval.");
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleOpenEditProfile = (student: StudentRow) => {
    setEditFirstName(student.first_name);
    setEditSurname(student.surname);
    setEditProgram(student.program_name);
    setEditYear(student.academic_year);
    setEditCum(student.cum_number);
    setEditGender(student.gender || "M");
    setIsEditProfileModalOpen(true);
  };

  const handleSaveEditedProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedStudent) return;
    if (!editFirstName.trim() || !editSurname.trim() || !editProgram.trim() || !editYear.trim() || !editCum.trim()) {
      showToast("Please fill in all fields.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setIsLoading(true);
      await dbService.updateStudentProfile(linkedStudent.id, {
        first_name: editFirstName.trim(),
        surname: editSurname.trim(),
        program_name: editProgram.trim(),
        academic_year: editYear.trim(),
        gender: editGender.trim(),
        cum_number: editCum.trim(),
      });
      await refreshDatabaseState();
      setIsEditProfileModalOpen(false);
      showToast("Profile updated successfully!");
    } catch (err: any) {
      showToast(`Error updating profile: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
      setIsLoading(false);
    }
  };

  const handleCastVote = async (
    electionId: string,
    positionId: string,
    candidateName: string,
    candidateId?: string,
  ) => {
    if (!candidateName) return;

    try {
      setIsLoading(true);
      await dbService.insertVote(
        currentUser.id,
        electionId,
        candidateName,
        positionId,
        candidateId,
      );
      await refreshDatabaseState();
      showToast(
        `BALLOT SUCCESS: Your vote for "${candidateName}" has been securely recorded in the database.`,
      );
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message || "Could not cast your vote."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastBulkBallot = async (
    electionId: string,
    electionPositions: any[],
  ) => {
    // Collect all selections for this election
    const ballotVotes: Array<{ positionId: string; candidateName: string; candidateId?: string }> = [];
    for (const pos of electionPositions) {
      const selectionKey = `${electionId}_${pos.id}`;
      const selection = selectedCandidates[selectionKey];
      if (selection && selection.candidateName) {
        ballotVotes.push({
          positionId: pos.id,
          candidateName: selection.candidateName,
          candidateId: selection.candidateId,
        });
      }
    }

    if (ballotVotes.length === 0) {
      showToast("Please make at least one candidate selection before submitting your ballot.");
      return;
    }

    try {
      setIsLoading(true);
      // Cast all votes
      for (const voteItem of ballotVotes) {
        await dbService.insertVote(
          currentUser.id,
          electionId,
          voteItem.candidateName,
          voteItem.positionId,
          voteItem.candidateId,
        );
      }

      // Clear persisted ballot draft for this election
      preferenceStorage.clearBallotDraft(currentUser.id, electionId);
      setSelectedCandidates((prev) => {
        const next = { ...prev };
        for (const pos of electionPositions) {
          delete next[`${electionId}_${pos.id}`];
        }
        return next;
      });

      await refreshDatabaseState();
      showToast(
        `BALLOT SUCCESS: Your official ballot of ${ballotVotes.length} selection(s) has been securely submitted!`,
      );
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message || "Could not cast your bulk ballot."}`);
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
      {/* ================== HOME TAB (POSTS & UPDATES FOCUS WITH VOTE / RESULTS CTAS) ================== */}
      {activeTab === "home" && (
        <div className="space-y-6">
          {/* TOP BLUE USER & SYSTEM STATUS CARD */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2D6B] via-[#0f449e] to-[#1565D8] p-5 sm:p-6 text-white shadow-lg border border-white/20">
            <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-20 pointer-events-none flex items-center justify-center">
              <img
                src="/images/people svg.jpg"
                alt="Campus Community"
                className="w-full h-full object-cover object-right"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 bg-white/10 backdrop-blur-xs">
                  <img
                    src={getUserAvatarUrl(linkedStudent?.gender)}
                    alt="Profile Photo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    {linkedStudent ? `${linkedStudent.first_name} ${linkedStudent.surname}` : currentUser.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    {linkedStudent && (!linkedStudent.status || linkedStudent.status === "approved") ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-xs shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        <span className="text-white font-medium">Verified Student</span>
                      </span>
                    ) : linkedStudent && linkedStudent.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/30 backdrop-blur-xs">
                        <BadgeAlert className="w-3.5 h-3.5 text-amber-200" />
                        <span>Registration Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-blue-100 border border-white/20 backdrop-blur-xs">
                        <User className="w-3.5 h-3.5 text-blue-200" />
                        <span>Student Voter</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VOTER HEADER PANEL: HEADLINE & ACTION BUTTONS */}
          <div className="space-y-4 bg-transparent p-0">
            <div>
              {!linkedStudent && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setIsSubmissionModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/40 text-zinc-950 dark:text-zinc-50 border border-amber-300 dark:border-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900/20 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <BadgeAlert className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>Not in the database yet? Submit student details</span>
                  </button>
                </div>
              )}

              <h2 className="text-3xl font-bold text-[#0B2D6B] dark:text-blue-400 font-['Poppins']">
                Your Voice. Your Campus.
              </h2>
              <p className="text-[#667085] dark:text-zinc-400 font-['Montserrat'] mt-1 text-base">
                Participate in the decisions that matter.
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-6 py-3 bg-[#1565D8] hover:bg-[#0D5BE1] text-white font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  onClick={() => onNavigate && onNavigate("elections")}
                >
                  <Vote className="w-4 h-4" />
                  <span>Vote Now</span>
                  {visibleElections.length > 0 && (
                    <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-bold ml-1">
                      {visibleElections.length} Active
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-zinc-900 border border-[#1565D8] text-[#1565D8] dark:text-blue-400 font-semibold text-sm rounded-xl hover:bg-[#EAF2FF] dark:hover:bg-blue-900/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  onClick={() => onNavigate && onNavigate("results")}
                >
                  <FileText className="w-4 h-4" />
                  <span>See Results</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pending Verification Banner (if user has pending registration) */}
          {linkedStudent && linkedStudent.status === "pending" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <BadgeAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      Student Registration Pending Approval
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                      Under Review
                    </span>
                  </div>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Your student record for <strong>{linkedStudent.first_name} {linkedStudent.surname} ({linkedStudent.registration_number})</strong> is awaiting review. Once approved by an administrator, your full voting clearance will be active.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("profile")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
              >
                View Status in Profile &rarr;
              </button>
            </div>
          )}

          {/* Active Election Notification Banner (shown when there is a new / active election) */}
          {visibleElections.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1565D8] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0B2D6B] dark:text-blue-300 font-['Poppins']">
                      Live Elections Open for Voting
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0E9F6E]/10 text-[#0E9F6E] dark:bg-emerald-950/60 dark:text-emerald-400 border border-[#0E9F6E]/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[#667085] dark:text-zinc-400 font-['Montserrat'] mt-0.5">
                    {visibleElections.length} election{visibleElections.length === 1 ? "" : "s"} waiting for your ballot. Cast your vote securely now.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("elections")}
                className="px-4 py-2 bg-[#1565D8] hover:bg-[#0D5BE1] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
              >
                Go to Elections &rarr;
              </button>
            </div>
          )}

          {/* QUICK BUTTONS GRID (VOTE, RESULTS, CLUBS, PROFILE, SECURITY, SUBMISSIONS) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                Quick Actions
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Vote */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("elections")}
                className="group p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-[#1565D8] dark:bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Vote className="w-5 h-5" />
                  </div>
                  {visibleElections.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#1565D8] transition-colors">
                    Vote
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {visibleElections.length > 0 ? `${visibleElections.length} Active` : "Elections"}
                  </p>
                </div>
              </button>

              {/* 2. Results */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("results")}
                className="group p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PieChart className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                    Results
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Live tallies
                  </p>
                </div>
              </button>

              {/* 3. Clubs */}
              <button
                type="button"
                onClick={() => setIsClubsModalOpen(true)}
                className="group p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-purple-600 dark:bg-purple-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  {clubs.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded-full">
                      {clubs.length}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 transition-colors">
                    Clubs
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Societies & Hubs
                  </p>
                </div>
              </button>

              {/* 4. Profile */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("profile")}
                className="group p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">
                    Profile
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Student ID
                  </p>
                </div>
              </button>

              {/* 5. Security */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("security")}
                className="group p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 transition-colors">
                    Security
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Credential Guard
                  </p>
                </div>
              </button>

              {/* 6. Submissions */}
              <button
                type="button"
                onClick={() => setIsSubmissionModalOpen(true)}
                className="group p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 transition-colors">
                    Submissions
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Registration Data
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* CAMPUS UPDATES & POSTS FOCUS (BELOW THE QUICK BUTTONS) */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-[#0B2D6B] dark:text-blue-400 font-['Poppins']">
                  Campus Updates & Announcements
                </h3>
                <p className="text-xs text-[#667085] dark:text-zinc-400 font-['Montserrat'] mt-0.5">
                  Real-time broadcast posts, candidate news, and university updates.
                </p>
              </div>
            </div>

            <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading campus updates...</div>}>
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
            </React.Suspense>
          </div>
        </div>
      )}

      {/* ================== ELECTIONS TAB (DEDICATED ELECTION BOOTH & BALLOTS) ================== */}
      {(activeTab === "elections" || activeTab === "ballot") && (
        <div id="active-elections-section" className="space-y-6">
          {/* TOP GREEN ELECTION & BALLOT STATION CARD WITH ELECTION COVER IMAGE (MINIMALIST) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#059669] p-5 sm:p-6 text-white shadow-lg border border-white/20">
            <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 md:w-96 opacity-25 pointer-events-none flex items-center justify-center">
              <img
                src="/images/election cover.jpg"
                alt="Election Cover"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 backdrop-blur-xs">
                  <Vote className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    Election Portal
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5 font-['Montserrat']">
                    Vote for your candidates
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-semibold text-[#0B2D6B] dark:text-blue-400 font-['Poppins']">
              Active Elections
            </h3>
            <p className="text-sm text-[#667085] dark:text-zinc-400 font-['Montserrat']">
              Review candidates and cast your official vote for open positions.
            </p>
          </div>

          {visibleElections.length === 0 ? (
            <div className="p-10 md:p-14 text-center bg-white dark:bg-zinc-900 border border-[#E4E7EC] dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center">
                <img
                  src="/images/election.png.jpg"
                  alt="No Active Elections"
                  className="w-full h-full object-contain rounded-2xl drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl font-bold text-[#172033] dark:text-zinc-100 font-['Poppins']">
                No Active Elections Available
              </h3>
              <p className="text-sm text-[#667085] dark:text-zinc-400 max-w-sm mx-auto font-['Montserrat'] leading-relaxed">
                There are currently no active elections open for your account. You can check published results or view campus updates.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("results")}
                  className="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer flex items-center gap-2"
                >
                  <img src="/images/election icon.png" alt="Results" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
                  <span>View Election Results</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("home")}
                  className="px-4 py-2.5 bg-[#1565D8] text-white text-xs font-semibold rounded-xl hover:bg-[#0D5BE1] transition-all cursor-pointer flex items-center gap-2"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Return to Home Feed</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleElections.map((election) => {
                const electionPositions = getElectionPositions(election);
                const userVotesInElection = votes.filter(
                  (v) =>
                    v.voter_id === currentUser.id &&
                    v.election_id === election.id,
                );

                // Check how many positions the user has voted for
                const votedCount = electionPositions.filter((pos) =>
                  userVotesInElection.some(
                    (v) =>
                      (v.position_id && v.position_id === pos.id) ||
                      (!v.position_id &&
                        pos.candidates.some((c) => c.name === v.candidate)),
                  ),
                ).length;

                const allPositionsVoted =
                  electionPositions.length > 0 &&
                  votedCount === electionPositions.length;

                return (
                  <div
                    key={election.id}
                    className="bg-white dark:bg-zinc-900 border border-[#E4E7EC] dark:border-zinc-800 rounded-[16px] p-6 shadow-sm space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-semibold text-lg text-[#172033] dark:text-zinc-50 font-['Poppins'] leading-tight">
                            {election.title}
                          </h4>
                          {electionPositions.length > 0 && (
                            <p className="text-sm text-[#667085] dark:text-zinc-400 mt-1 font-['Montserrat'] line-clamp-1">
                              {electionPositions.map((p) => p.title).join(" • ")}
                            </p>
                          )}
                        </div>
                        {election.club_id && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-900/40">
                            Club Election
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 text-[#0E9F6E] dark:text-emerald-400 text-sm font-semibold font-['Montserrat']">
                        <span className="w-2 h-2 rounded-full bg-[#0E9F6E] dark:bg-emerald-400" />
                        Voting open
                      </div>
                      
                      <div className="mt-6 border-t border-[#E4E7EC] dark:border-zinc-800 pt-5">
                        {!allPositionsVoted && (
                          <div className="relative mb-5">
                            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search your favorite candidate by name..."
                              value={voterSearchQueries[election.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVoterSearchQueries((prev) => {
                                  const next = { ...prev, [election.id]: val };
                                  preferenceStorage.setPreference(`voter_search_${currentUser.id}`, next);
                                  return next;
                                });
                              }}
                              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:border-[#1565D8] focus:ring-1 focus:ring-[#1565D8] focus:outline-none text-xs text-zinc-950 dark:text-zinc-100 placeholder-zinc-400"
                            />
                          </div>
                        )}

                        {allPositionsVoted ? (
                           <div className="w-full py-4 bg-[#E8F8F1] dark:bg-emerald-950/20 border border-[#0E9F6E]/30 text-[#0E9F6E] dark:text-emerald-400 text-center font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
                             <Check className="w-5 h-5 font-black" />
                             <span>Official Ballot Submitted & Verified</span>
                           </div>
                        ) : (
                          <div className="space-y-8">
                             {electionPositions.map((pos) => {
                               const existingVote = userVotesInElection.find(
                                 (v) =>
                                   (v.position_id && v.position_id === pos.id) ||
                                   (!v.position_id &&
                                     pos.candidates.some(
                                       (c) => c.name === v.candidate,
                                     )),
                               );
                               const selectionKey = `${election.id}_${pos.id}`;
                               const currentSelection = selectedCandidates[selectionKey];
                               const searchQuery = (voterSearchQueries[election.id] || "").trim().toLowerCase();
                               const filteredCandidates = pos.candidates.filter((cand) =>
                                 !searchQuery || cand.name.toLowerCase().includes(searchQuery)
                               );

                               return (
                                 <div key={pos.id} className="space-y-4">
                                   <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                      <span className="font-bold text-base text-[#0B2D6B] dark:text-blue-300 font-['Poppins']">
                                        {pos.title}
                                      </span>
                                      {existingVote && (
                                        <span className="text-xs text-[#0E9F6E] font-bold bg-[#E8F8F1] dark:bg-emerald-950/40 px-3 py-1 rounded-full flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" /> Voted
                                        </span>
                                      )}
                                   </div>
                                   {existingVote ? (
                                      <div className="p-4 bg-[#E8F8F1] dark:bg-emerald-950/20 border border-[#0E9F6E]/20 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-['Montserrat'] flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#0E9F6E]" />
                                        <span>You cast your official vote for <strong className="text-[#0E9F6E]">{existingVote.candidate}</strong></span>
                                      </div>
                                   ) : (
                                     <div className="space-y-3">
                                        {filteredCandidates.length === 0 ? (
                                          <p className="text-xs text-zinc-400 italic">
                                            No candidates in this position match your search.
                                          </p>
                                        ) : (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                            {filteredCandidates.map((cand) => (
                                              <div
                                                key={cand.id}
                                                onClick={() => {
                                                  const updated = {
                                                    ...selectedCandidates,
                                                    [selectionKey]: {
                                                      candidateName: cand.name,
                                                      candidateId: cand.id,
                                                    },
                                                  };
                                                  setSelectedCandidates(updated);
                                                  preferenceStorage.setBallotDraft(currentUser.id, updated);
                                                }}
                                                className={`relative rounded-3xl border overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                                                  currentSelection?.candidateName === cand.name
                                                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-[#1565D8] ring-2 ring-[#1565D8]/50 shadow-md scale-[1.01]"
                                                    : "bg-white dark:bg-zinc-900 border-[#E4E7EC] dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 shadow-xs hover:shadow-sm"
                                                }`}
                                              >
                                                <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                                  {cand.photo_url ? (
                                                    <img
                                                      src={cand.photo_url}
                                                      alt={cand.name}
                                                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                                      referrerPolicy="no-referrer"
                                                    />
                                                  ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-zinc-800 dark:to-zinc-950 text-blue-700 dark:text-blue-300 font-extrabold text-5xl flex items-center justify-center">
                                                      {cand.name.charAt(0).toUpperCase()}
                                                    </div>
                                                  )}
                                                  
                                                  <div className="absolute top-3 left-3">
                                                    <span className="text-[9px] font-extrabold uppercase tracking-widest bg-[#0B1E40] text-white px-2.5 py-1 rounded-md shadow-sm">
                                                      {pos.title}
                                                    </span>
                                                  </div>

                                                  <div className="absolute top-3 right-3">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                      currentSelection?.candidateName === cand.name
                                                        ? "bg-[#1565D8] border-[#1565D8] text-white scale-110"
                                                        : "bg-white/90 dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-600 text-transparent"
                                                    }`}>
                                                      <Check className="w-3.5 h-3.5 font-extrabold" />
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="p-4 flex-grow flex flex-col justify-between space-y-2">
                                                  <div>
                                                    <h5 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                                                      {cand.name}
                                                    </h5>
                                                    {cand.manifesto ? (
                                                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic line-clamp-2 mt-1.5 leading-normal">
                                                        "${cand.manifesto}"
                                                      </p>
                                                    ) : (
                                                      <p className="text-[10px] text-zinc-400 italic mt-1">
                                                        No manifesto statement submitted.
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                     </div>
                                   )}
                                 </div>
                               );
                             })}

                             <div className="pt-6 border-t border-[#E4E7EC] dark:border-zinc-800">
                               <button
                                 type="button"
                                 onClick={() => handleCastBulkBallot(election.id, electionPositions)}
                                 className="w-full py-3.5 bg-[#1565D8] hover:bg-[#0D5BE1] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2"
                               >
                                 <Vote className="w-4 h-4" />
                                 <span>Submit Official Ballot</span>
                               </button>
                               <p className="text-[10px] text-center text-zinc-400 mt-2">
                                 Your selections will be permanently locked and submitted securely to the verified election records.
                               </p>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "results" && (
        <div className="space-y-6">
          {/* TOP BLUE RESULTS HEADER CARD */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2D6B] via-[#0f449e] to-[#1565D8] p-5 sm:p-6 text-white shadow-lg border border-white/20">
            <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-20 pointer-events-none flex items-center justify-center">
              <img
                src="/images/results.jpg"
                alt="Results Background"
                className="w-full h-full object-cover object-right"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 bg-white/10 backdrop-blur-xs">
                  <img
                    src="/images/results.jpg"
                    alt="Results"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    Election Results
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
                    Live tallies, verified votes, and official election outcomes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {visibleResults.length === 0 ? (
            <div className="p-10 md:p-14 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
                <img
                  src="/images/election icon.png"
                  alt="No Published Results"
                  className="w-full h-full object-contain drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-['Poppins']">
                No Published Results
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-['Montserrat'] leading-relaxed">
                There are currently no active polls or election outcomes published to the feed. Please verify again later.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("home")}
                  className="px-4 py-2.5 bg-[#1565D8] text-white text-xs font-semibold rounded-xl hover:bg-[#0D5BE1] transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Return to Home</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleResults.map((election) => {
                const electionPositions = getElectionPositions(election);
                const electionVotes = votes.filter((v) => v.election_id === election.id);
                const totalVotes = electionVotes.length;

                return (
                  <div
                    key={election.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4"
                  >
                    <div>
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
                        Total ballots cast: {totalVotes} | Positions: {electionPositions.length}
                      </span>
                    </div>

                    {/* Results per Position */}
                    <div className="space-y-3.5">
                      {electionPositions.map((pos) => {
                        const posVotes = electionVotes.filter(
                          (v) =>
                            (v.position_id && v.position_id === pos.id) ||
                            pos.candidates.some((c) => c.name === v.candidate),
                        );
                        const posTotal = posVotes.length;

                        const candCounts = pos.candidates.map((cand) => {
                          const count = posVotes.filter(
                            (v) =>
                              (v.candidate_id && v.candidate_id === cand.id) ||
                              v.candidate === cand.name,
                          ).length;
                          return {
                            cand,
                            count,
                            pct: posTotal > 0 ? Math.round((count / posTotal) * 100) : 0,
                          };
                        });

                        const maxVotes = Math.max(0, ...candCounts.map((c) => c.count));

                        return (
                          <div
                            key={pos.id}
                            className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-700/50 pb-1">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-blue-600" />
                                <span>{pos.title}</span>
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {posTotal} votes
                              </span>
                            </div>

                            <div className="space-y-2">
                              {candCounts.map(({ cand, count, pct }) => {
                                const isLeader = maxVotes > 0 && count === maxVotes;
                                return (
                                  <div key={cand.id} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                      <div className="flex items-center gap-2">
                                        {cand.photo_url ? (
                                          <img
                                            src={cand.photo_url}
                                            alt={cand.name}
                                            className="w-5 h-5 rounded-full object-cover border border-zinc-200"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[9px] flex items-center justify-center">
                                            {cand.name.charAt(0)}
                                          </div>
                                        )}
                                        <span className="text-zinc-800 dark:text-zinc-200">
                                          {cand.name}
                                        </span>
                                        {isLeader && (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                            Leading
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono text-zinc-500 text-[11px]">
                                        {count} votes ({pct}%)
                                      </span>
                                    </div>
                                    <div className="h-2 bg-zinc-200/70 dark:bg-zinc-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isLeader ? "bg-[#1565D8] dark:bg-blue-500" : "bg-zinc-400 dark:bg-zinc-600"
                                        }`}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "updates" && (
        <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading campus updates...</div>}>
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
        </React.Suspense>
      )}

      {activeTab === "profile" &&
        (() => {
          const normUser = currentUser.username.trim().toLowerCase();
          const linkedStudent = students.find((s) => {
            const sEmail = s.email ? s.email.trim().toLowerCase() : "";
            const sReg = s.registration_number ? s.registration_number.trim().toLowerCase() : "";
            const sCum = s.cum_number ? s.cum_number.trim().toLowerCase() : "";
            if (sEmail && sEmail === normUser) return true;
            if (sReg && sReg === normUser) return true;
            if (sCum && sCum === normUser) return true;
            if (sEmail && normUser.includes("@") && sEmail.split("@")[0] === normUser.split("@")[0]) return true;
            return false;
          });

          return (
            <div className="space-y-6 max-w-4xl mx-auto" id="voter_profile_dashboard">
              {/* TOP BLUE PROFILE CARD WITH PROFILE IMAGE */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2D6B] via-[#0f449e] to-[#1565D8] p-5 sm:p-6 text-white shadow-lg border border-white/20">
                <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 pointer-events-none flex items-center justify-center">
                  <img
                    src="/images/Profile.png"
                    alt="Profile Background"
                    className="w-full h-full object-cover object-right"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 bg-white/10 backdrop-blur-xs">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                        {linkedStudent ? `${linkedStudent.first_name} ${linkedStudent.surname}` : currentUser.username}
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 font-['Montserrat']">
                        {linkedStudent
                          ? `Reg No: ${linkedStudent.registration_number} • ${linkedStudent.program_name}`
                          : "Student Profile & Credentials"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                {/* Student Profile Card */}
                {linkedStudent && (!linkedStudent.status || linkedStudent.status === "approved") ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-[#1565D8] dark:text-blue-400 shadow-sm flex-shrink-0 bg-blue-50">
                          <img
                            src={getUserAvatarUrl(linkedStudent?.gender)}
                            alt="Student Profile Photo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight truncate">
                            Verified Profile
                          </h3>
                          <p className="text-xs sm:text-sm text-[#1565D8] dark:text-blue-400 font-semibold tracking-tight mt-0.5 leading-tight truncate">
                            CUNIMA Active Student
                          </p>
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 rounded-full">
                        Approved
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs flex-grow my-4">
                    <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                          First Name
                        </span>
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {linkedStudent.first_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                          Surname
                        </span>
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {linkedStudent.surname}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                          Registration ID
                        </span>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {linkedStudent.registration_number}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                          Program Course
                        </span>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {linkedStudent.program_name}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                            Academic Year
                          </span>
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {linkedStudent.academic_year}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider text-right">
                            CUM Number
                          </span>
                          <span className="text-sm font-bold text-[#1565D8] dark:text-blue-400 block text-right">
                            {linkedStudent.cum_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 text-[11px] font-semibold">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 text-[#1565D8] dark:text-blue-400" />
                    <span>ELIGIBILITY: REGISTERED VOTER APPROVED</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditProfile(linkedStudent)}
                      className="w-full py-2.5 bg-[#1565D8] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer text-center uppercase tracking-wider"
                    >
                      Edit Profile Details
                    </button>
                  </div>
                </div>
              ) : linkedStudent && linkedStudent.status === "pending" ? (
                <div className="bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-amber-900/50 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BadgeAlert className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          Registration Pending Approval
                        </h3>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-full font-mono">
                        Pending Review
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Your submitted student record is currently under administrative review
                    </p>
                  </div>

                  <div className="space-y-3 text-xs flex-grow my-2">
                    <div className="grid grid-cols-2 gap-3 bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100/60 dark:border-amber-900/30">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                          Submitted Name
                        </span>
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {linkedStudent.first_name} {linkedStudent.surname}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-mono">
                          Reg Number
                        </span>
                        <span className="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                          {linkedStudent.registration_number}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                      <div>
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
                          <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 block text-right">
                            {linkedStudent.cum_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs flex items-start gap-2.5">
                    <BadgeAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Your details have been registered and are awaiting verification by the election administrator. Once approved, your official verified student profile and voting clearance will be activated.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
                  <BadgeAlert className="w-12 h-12 text-amber-500 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-zinc-950 dark:text-zinc-50 text-base uppercase">
                      Not in the database yet?
                    </h3>
                    <p className="text-xs text-zinc-950 dark:text-zinc-200 max-w-xs mt-1 leading-relaxed font-semibold">
                      Your voter credentials are active, but your official student card is not yet connected to your account.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSubmissionModalOpen(true)}
                    className="px-5 py-3 bg-[#1565D8] hover:bg-blue-900 text-white font-black text-xs rounded-full shadow-md shadow-blue-500/15 cursor-pointer transition-all active:scale-95 uppercase tracking-wide"
                  >
                    Submit student details
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })()}

      {/* ================== SECURITY & CREDENTIALS TAB ================== */}
      {activeTab === "security" && (
        <div className="space-y-6 max-w-2xl mx-auto" id="voter_security_dashboard">
          {/* TOP BLUE SECURITY CARD */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2D6B] via-[#0f449e] to-[#1565D8] p-5 sm:p-6 text-white shadow-lg border border-white/20">
            <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-20 pointer-events-none flex items-center justify-center">
              <img
                src="/images/security.jpg"
                alt="Security Background"
                className="w-full h-full object-cover object-right"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 bg-white/10 backdrop-blur-xs">
                  <img
                    src="/images/security.jpg"
                    alt="Security Credentials"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    Security & Credentials
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 font-['Montserrat']">
                    Manage direct authentication and account passwords
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm flex-shrink-0 bg-blue-50">
                <img
                  src="/images/security.jpg"
                  alt="Security Credentials"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h2 className="text-xl font-normal text-zinc-900 dark:text-zinc-50">
                  Local Credentials
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Activate/Update a username and password to log in directly
                  without Google if desired
                </p>
              </div>
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



              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1565D8] hover:bg-[#0D5BE1] text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile Submission Modal */}
      {isSubmissionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Submit Student Profile
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Submit your student details to the administrator to connect your account and activate your voting eligibility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmissionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {linkedStudent ? (
              <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#1565D8] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1565D8] text-white flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Voter Connection Status
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Your CUNIMA registration status is active.
                    </p>
                  </div>
                </div>
                
                <p className="text-sm font-semibold leading-relaxed text-blue-800 dark:text-blue-300">
                  you are already connected voter
                </p>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Your voter credentials are fully verified and linked to <span className="font-semibold">{linkedStudent.first_name} {linkedStudent.surname}</span> (Registration ID: <span className="font-mono font-medium">{linkedStudent.registration_number}</span>). You are eligible to cast votes in all active student elections.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmissionModalOpen(false)}
                    className="w-full py-2.5 bg-[#1565D8] hover:bg-[#0D5BE1] text-white font-semibold text-xs rounded-full shadow-md shadow-blue-500/15 cursor-pointer transition-all active:scale-95 text-center block"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitStudentProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={subFirstName}
                      onChange={(e) => setSubFirstName(e.target.value)}
                      placeholder="e.g. Desire"
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Surname
                    </label>
                    <input
                      type="text"
                      value={subSurname}
                      onChange={(e) => setSubSurname(e.target.value)}
                      placeholder="e.g. Kandodo"
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    University Email (@cunima.ac.mw)
                  </label>
                  <input
                    type="email"
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    placeholder="e.g. desire.kandodo@cunima.ac.mw"
                    className="w-full px-3.5 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Registration ID
                    </label>
                    <input
                      type="text"
                      value={subRegNumber}
                      onChange={(e) => setSubRegNumber(e.target.value)}
                      placeholder="e.g. REG/CS/2026/011"
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      CUM Number
                    </label>
                    <input
                      type="text"
                      value={subCum}
                      onChange={(e) => setSubCum(e.target.value)}
                      placeholder="e.g. 3.75 or 76.5"
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Program Course
                  </label>
                  <input
                    type="text"
                    value={subProgram}
                    onChange={(e) => setSubProgram(e.target.value)}
                    placeholder="e.g. BSc Computer Science"
                    className="w-full px-3.5 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={subYear}
                      onChange={(e) => setSubYear(e.target.value)}
                      placeholder="e.g. 2026/2027"
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={subGender}
                      onChange={(e) => setSubGender(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmissionModalOpen(false)}
                    className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-semibold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-[#1565D8] hover:bg-[#0D5BE1] disabled:opacity-50 text-white font-semibold text-xs rounded-full shadow-md shadow-blue-500/15 transition-colors cursor-pointer text-center"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Details"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CLUBS DIRECTORY MODAL */}
      {isClubsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Campus Clubs & Societies
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Explore university student bodies & your active memberships
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClubsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {clubs && clubs.length > 0 ? (
                clubs.map((c) => {
                  const isMember = clubMembers.some(
                    (cm) => cm.club_id === c.id && cm.voter_id === currentUser.id,
                  );
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {c.name}
                          </h4>
                        </div>
                        {c.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {c.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isMember ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3.5 h-3.5" />
                            Member
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 px-2 py-1">
                            Registered Club
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No registered clubs found at this time.
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsClubsModalOpen(false)}
                className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  Edit Student Profile Details
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Update your active university profile info.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Surname
                  </label>
                  <input
                    type="text"
                    value={editSurname}
                    onChange={(e) => setEditSurname(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  CUM Number
                </label>
                <input
                  type="text"
                  value={editCum}
                  onChange={(e) => setEditCum(e.target.value)}
                  className="w-full px-3.5 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Program Course
                </label>
                <input
                  type="text"
                  value={editProgram}
                  onChange={(e) => setEditProgram(e.target.value)}
                  className="w-full px-3.5 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-semibold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 bg-[#1565D8] hover:bg-[#0D5BE1] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/15 transition-colors cursor-pointer text-center"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
