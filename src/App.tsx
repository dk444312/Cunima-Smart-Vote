/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { 
  Menu, Info, Moon, Sun, LogOut, RefreshCw, Copy, TrendingUp, Award, ShieldCheck, Database, Users2, ShieldAlert, Vote, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { dbService, isSupabaseConfigured, initializeDatabase, PREMADE_ADMIN, PREMADE_VOTER, PREMADE_MANAGER } from "./lib/supabase.ts";
import { ElectionRow, VoterRow, VoteRow, LoggedInUser, UpdateRow, UpdateLikeRow, UpdateCommentRow, ClubRow, ClubMemberRow, StudentRow } from "./types.ts";
import { signInWithGoogle, logoutFirebase } from "./lib/firebase.ts";

// Restructured modular dashboard views
import AdminDashboard from "./components/admin/AdminDashboard.tsx";
import VoterDashboard from "./components/users/VoterDashboard.tsx";
import ClubManagerDashboard from "./components/club/ClubManagerDashboard.tsx";

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Database State Mirrors
  const [elections, setElections] = useState<ElectionRow[]>([]);
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMemberRow[]>([]);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [updateLikes, setUpdateLikes] = useState<Record<string, UpdateLikeRow[]>>({});
  const [updateComments, setUpdateComments] = useState<Record<string, UpdateCommentRow[]>>({});
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Google Student Registration Form States
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ email: string; displayName: string; uid: string } | null>(null);
  const [googleRegSuccess, setGoogleRegSuccess] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regSurname, setRegSurname] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regProgram, setRegProgram] = useState("");
  const [regYear, setRegYear] = useState("");
  const [regCum, setRegCum] = useState("");
  const [regGender, setRegGender] = useState("M");

  // Form states for Admin (passed down or handled centrally)
  const [newElectionTitle, setNewElectionTitle] = useState("");
  const [newElectionDesc, setNewElectionDesc] = useState("");
  const [candidateInput, setCandidateInput] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);

  const [newVoterUsername, setNewVoterUsername] = useState("");
  const [newVoterPassword, setNewVoterPassword] = useState("");
  const [newVoterRole, setNewVoterRole] = useState("voter");

  const [newClubName, setNewClubName] = useState("");
  const [newClubDesc, setNewClubDesc] = useState("");
  const [newClubManagerId, setNewClubManagerId] = useState("");

  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [newCommentContents, setNewCommentContents] = useState<Record<string, string>>({}); // updateId -> commentText

  // Navigation state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<"election" | "voters" | "clubs" | "results" | "profile" | "sql_db" | "updates" | "students">("election");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [selectedClubIdForManage, setSelectedClubIdForManage] = useState<string | null>(null);

  // Toast messaging
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync state with database
  const refreshDatabaseState = async () => {
    try {
      setIsLoading(true);
      const [allElections, allVoters, allVotes, allClubs, allClubMembers, allUpdates, allStudents] = await Promise.all([
        dbService.getElections(),
        dbService.getVoters(),
        dbService.getVotes(),
        dbService.getClubs(),
        dbService.getClubMembers(),
        dbService.getUpdates(),
        dbService.getStudents()
      ]);

      setElections(allElections);
      setVoters(allVoters);
      setVotes(allVotes);
      setClubs(allClubs);
      setClubMembers(allClubMembers);
      setUpdates(allUpdates);
      setStudents(allStudents);

      // Fetch social details in parallel for each update
      const likesMap: Record<string, UpdateLikeRow[]> = {};
      const commentsMap: Record<string, UpdateCommentRow[]> = {};

      await Promise.all(
        allUpdates.map(async (upd) => {
          const [likes, comments] = await Promise.all([
            dbService.getUpdateLikes(upd.id),
            dbService.getUpdateComments(upd.id)
          ]);
          likesMap[upd.id] = likes;
          commentsMap[upd.id] = comments;
        })
      );

      setUpdateLikes(likesMap);
      setUpdateComments(commentsMap);
    } catch (err: any) {
      console.error("Database connection refresh delay or error:", err);
      showToast(`Database Delay / Fallback active: ${err.message || "using local cached rows"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize DB and state
  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await refreshDatabaseState();
    };
    init();

    // Recover logged-in user if saved locally
    const saved = localStorage.getItem("g_election_active_user");
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
  }, []);

  // Sync Dark Mode Class on Document Body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Auth Operations
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const user = usernameInput.trim();
    const pass = passwordInput.trim();

    if (!user || !pass) {
      setLoginError("Please enter both username and password.");
      return;
    }

    // Admin Premade Match
    if (user === PREMADE_ADMIN.username && pass === PREMADE_ADMIN.password) {
      const adminUser = { id: PREMADE_ADMIN.id, username: PREMADE_ADMIN.username, role: "admin" as const };
      setCurrentUser(adminUser);
      localStorage.setItem("g_election_active_user", JSON.stringify(adminUser));
      setUsernameInput("");
      setPasswordInput("");
      showToast("Access Granted: Welcome back, Administrator.");
      return;
    }

    // Check seed / registered voters table
    const matchedVoter = voters.find(v => v.username.toLowerCase() === user.toLowerCase());

    if (matchedVoter) {
      if (matchedVoter.password === pass) {
        if (matchedVoter.is_blocked) {
          setLoginError("This user account has been blocked by administrators.");
          return;
        }

        const voterUser = { 
          id: matchedVoter.id, 
          username: matchedVoter.username, 
          role: matchedVoter.role || "voter" 
        };
        setCurrentUser(voterUser);
        localStorage.setItem("g_election_active_user", JSON.stringify(voterUser));
        setUsernameInput("");
        setPasswordInput("");
        showToast(`Access Granted: Welcome back, ${voterUser.username}.`);
      } else {
        setLoginError("Incorrect password. Please verify your credentials sheet.");
      }
    } else {
      setLoginError("Account does not exist. Verify username or contact administrator.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setLoginError("");
      setGoogleRegSuccess(false);
      setPendingGoogleUser(null);

      const user = await signInWithGoogle();
      if (!user) {
        throw new Error("Could not fetch user profile from Google Authentication.");
      }

      const email = user.email || "";
      const displayName = user.displayName || user.email?.split("@")[0] || "Student Voter";

      // Strict Domain Check: Only @cunima.ac.mw Google emails are allowed
      if (!email.toLowerCase().endsWith("@cunima.ac.mw")) {
        setLoginError("Access Restricted: Only official @cunima.ac.mw student/staff Google accounts are allowed to authenticate.");
        setIsLoading(false);
        return;
      }

      // Check if user is the administrator bypass
      const isAdminEmail = 
        email.toLowerCase() === "admin@cunima.ac.mw" ||
        email.toLowerCase().startsWith("admin.");

      if (isAdminEmail) {
        // Find or create admin voter row
        let matchedVoter = voters.find(v => v.username.toLowerCase() === email.toLowerCase());
        if (!matchedVoter) {
          try {
            matchedVoter = await dbService.insertVoter(email, "firebase_secret", "admin");
            await refreshDatabaseState();
          } catch (dbErr) {
            console.error("Inserting admin voter matched:", dbErr);
          }
        }
        const activeUser: LoggedInUser = {
          id: matchedVoter?.id || user.uid,
          username: email,
          role: "admin"
        };
        setCurrentUser(activeUser);
        localStorage.setItem("g_election_active_user", JSON.stringify(activeUser));
        showToast(`Google Auth Success: Welcome back, Admin ${displayName}.`);
        return;
      }

      // Check Student Register Database: Check full name and the email address name
      const matchedStudent = students.find(s => {
        // 1. Direct Email Match
        if (s.email?.toLowerCase() === email.toLowerCase()) {
          return true;
        }

        // 2. Parse local part of Google email (e.g., "desire.kandodo" from "desire.kandodo@cunima.ac.mw")
        const emailLocalPart = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        const firstNameLower = s.first_name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const surnameLower = s.surname.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Match if email local part contains both first name and surname (e.g., "desire.kandodo" has both "desire" and "kandodo")
        const matchesFullName = emailLocalPart.includes(firstNameLower) && emailLocalPart.includes(surnameLower);
        return matchesFullName;
      });

      if (matchedStudent) {
        // Automatically save their Google email to their student record if it's not set
        if (!matchedStudent.email || matchedStudent.email.toLowerCase() !== email.toLowerCase()) {
          try {
            await dbService.linkStudentEmail(matchedStudent.id, email);
            await refreshDatabaseState();
          } catch (linkErr) {
            console.error("Auto linking Google email to student profile failed:", linkErr);
          }
        }

        if (matchedStudent.status === "pending") {
          setLoginError("Your registration application is currently pending administrator approval. Please wait.");
          setIsLoading(false);
          return;
        }

        // Student exists and is APPROVED! Let's connect them
        let matchedVoter = voters.find(v => v.username.toLowerCase() === email.toLowerCase());
        if (!matchedVoter) {
          try {
            // Auto-create voter account linked to student
            matchedVoter = await dbService.insertVoter(email, "firebase_secret", "voter");
            await refreshDatabaseState();
          } catch (dbErr) {
            console.error("Auto registration voter failed:", dbErr);
          }
        }

        if (matchedVoter?.is_blocked) {
          setLoginError("This student account has been blocked by administrators.");
          setIsLoading(false);
          return;
        }

        const activeUser: LoggedInUser = {
          id: matchedVoter?.id || user.uid,
          username: email,
          role: matchedVoter?.role || "voter"
        };

        setCurrentUser(activeUser);
        localStorage.setItem("g_election_active_user", JSON.stringify(activeUser));
        showToast(`Google Auth Success: Connected to your student profile.`);
      } else {
        // NOT in database at all! Trigger Student Profile Registration form!
        setPendingGoogleUser({ email, displayName, uid: user.uid });
        showToast("Student record not found. Please submit your details for verification.");
      }
    } catch (err: any) {
      console.error("Google login failure:", err);
      setLoginError(err.message || "Google Sign-In was cancelled or failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;

    if (!regFirstName || !regSurname || !regNumber || !regProgram || !regYear || !regCum || !regGender) {
      showToast("Please fill in all student profile registration fields.");
      return;
    }

    try {
      setIsLoading(true);
      await dbService.insertStudent({
        first_name: regFirstName.trim(),
        surname: regSurname.trim(),
        registration_number: regNumber.trim(),
        program_name: regProgram.trim(),
        academic_year: regYear.trim(),
        cum_number: regCum.trim(),
        gender: regGender.trim(),
        email: pendingGoogleUser.email,
        status: "pending" // Needs to be approved by administrator!
      });

      // Reset fields
      setRegFirstName("");
      setRegSurname("");
      setRegNumber("");
      setRegProgram("");
      setRegYear("");
      setRegCum("");
      setRegGender("M");

      // Sync the states
      await refreshDatabaseState();
      setGoogleRegSuccess(true);
      showToast("Your registration profile has been successfully submitted for administrator approval.");
    } catch (err: any) {
      showToast(`Registration failure: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch (e) {
      console.error("Firebase logout error:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("g_election_active_user");
    showToast("Session ended. You have logged out successfully.");
  };

  // ADMIN OPERATIONS
  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newElectionTitle.trim()) {
      showToast("Election title is required.");
      return;
    }

    const finalCandidates = [...candidates];
    if (candidateInput.trim() && !finalCandidates.includes(candidateInput.trim())) {
      finalCandidates.push(candidateInput.trim());
    }

    const slates = finalCandidates.length > 0 ? finalCandidates : ["Yes", "No"];

    try {
      setIsLoading(true);
      await dbService.insertElection(
        newElectionTitle.trim(),
        newElectionDesc.trim(),
        slates,
        null
      );
      await refreshDatabaseState();

      setNewElectionTitle("");
      setNewElectionDesc("");
      setCandidateInput("");
      setCandidates([]);
      showToast("SQL INSERT SUCCESS: Created new public election row.");
    } catch (err: any) {
      showToast(`SQL INSERT FAIL: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateElectionStatus = async (id: string, status: "draft" | "active" | "completed") => {
    try {
      setIsLoading(true);
      await dbService.updateElection(id, { status });
      await refreshDatabaseState();
      showToast(`SQL UPDATE SUCCESS: Election status updated to "${status}".`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteElection = async (id: string) => {
    try {
      setIsLoading(true);
      await dbService.deleteElection(id);
      await refreshDatabaseState();
      showToast("SQL DELETE SUCCESS: Election sheet deleted permanently.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateVotes = async (electionId: string) => {
    try {
      setIsLoading(true);
      const election = elections.find(e => e.id === electionId);
      if (!election) return;

      const activeVoters = voters.filter(v => !v.is_blocked && v.role !== "admin");

      if (activeVoters.length === 0) {
        showToast("No active voters found in directory to simulate ballots.");
        return;
      }

      await Promise.all(
        activeVoters.map(async (voter) => {
          try {
            const randomCandidate = election.candidates[Math.floor(Math.random() * election.candidates.length)];
            await dbService.insertVote(voter.id, electionId, randomCandidate);
          } catch (e) {
            // gracefully skip duplicate voter constraints
          }
        })
      );

      await dbService.updateElection(electionId, { status: "completed" });
      await refreshDatabaseState();
      showToast(`SQL SIMULATION: Distributed random ballot entries to active voter base.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoterUsername.trim()) return;

    try {
      setIsLoading(true);
      await dbService.insertVoter(
        newVoterUsername.trim(),
        newVoterPassword.trim() || "Pass123",
        newVoterRole as any
      );
      await refreshDatabaseState();

      setNewVoterUsername("");
      setNewVoterPassword("");
      showToast(`SQL INSERT SUCCESS: Created ${newVoterRole === "club_manager" ? "Club Manager" : "Voter"} account.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoterRole = async (v: VoterRow) => {
    const nextRole = v.role === "club_manager" ? "voter" : "club_manager";
    try {
      setIsLoading(true);
      await dbService.updateVoter(v.id, { role: nextRole });
      await refreshDatabaseState();
      showToast(`SQL UPDATE SUCCESS: Changed "${v.username}" to ${nextRole === "club_manager" ? "Club Manager" : "Voter"}.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBlockVoter = async (v: VoterRow) => {
    try {
      setIsLoading(true);
      await dbService.updateVoter(v.id, { is_blocked: !v.is_blocked });
      await refreshDatabaseState();
      showToast(`SQL UPDATE SUCCESS: ${v.is_blocked ? "Unblocked" : "Blocked"} voter "${v.username}".`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVoter = async (id: string) => {
    try {
      setIsLoading(true);
      await dbService.deleteVoter(id);
      await refreshDatabaseState();
      showToast("SQL DELETE SUCCESS: Account credentials deleted permanently.");
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

  // CLUB ACTIONS
  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubManagerId) {
      showToast("Club name and assigned manager are required.");
      return;
    }

    try {
      setIsLoading(true);
      await dbService.insertClub(
        newClubName.trim(),
        newClubDesc.trim() || "No description provided.",
        newClubManagerId
      );
      await refreshDatabaseState();

      setNewClubName("");
      setNewClubDesc("");
      setNewClubManagerId("");
      showToast(`SQL INSERT SUCCESS: New club "${newClubName}" created successfully.`);
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClub = async (id: string) => {
    try {
      setIsLoading(true);
      await dbService.deleteClub(id);
      await refreshDatabaseState();
      showToast("SQL DELETE SUCCESS: Club page deleted permanently.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleClubMember = async (clubId: string, voterId: string) => {
    const existingIds = clubMembers.filter(cm => cm.club_id === clubId).map(cm => cm.voter_id);
    const updatedIds = existingIds.includes(voterId)
      ? existingIds.filter(id => id !== voterId)
      : [...existingIds, voterId];

    try {
      setIsLoading(true);
      await dbService.setClubMembers(clubId, updatedIds);
      showToast("SQL TRANSACTION SUCCESS: Club roster updated.");
      await refreshDatabaseState();
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // BROADCAST SOCIAL ACTIONS
  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateContent.trim()) return;

    try {
      setIsLoading(true);
      await dbService.insertUpdate(newUpdateContent.trim(), "Administrator");
      await refreshDatabaseState();
      setNewUpdateContent("");
      showToast("SQL BROADCAST SUCCESS: Verified update broadcasted globally.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    try {
      setIsLoading(true);
      await dbService.deleteUpdate(id);
      await refreshDatabaseState();
      showToast("SQL DELETE SUCCESS: Broadcast update deleted permanently.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLikeUpdate = async (updateId: string) => {
    if (!currentUser) return;
    try {
      await dbService.toggleLikeUpdate(updateId, currentUser.id, currentUser.username);
      await refreshDatabaseState();
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    }
  };

  const handlePostComment = async (e: React.FormEvent, updateId: string) => {
    e.preventDefault();
    if (!currentUser) return;
    const text = newCommentContents[updateId] || "";
    if (!text.trim()) return;

    try {
      await dbService.insertUpdateComment(updateId, currentUser.id, currentUser.username, text.trim());
      setNewCommentContents(prev => ({ ...prev, [updateId]: "" }));
      await refreshDatabaseState();
      showToast("SQL COMMENT SUCCESS: Comment post row added.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    }
  };

  const truncateDatabase = async () => {
    if (!window.confirm("Are you sure you want to drop and truncate all mock tables data? This action is irreversible.")) {
      return;
    }

    try {
      setIsLoading(true);
      await dbService.clearAllData();
      await refreshDatabaseState();
      showToast("SQL TRUNCATE TRADITIONAL DELEGATION SUCCESS: All table schemas are cleared.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 font-sans antialiased flex flex-col">
      
      {/* GLOBAL BANNER */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-3.5 px-6 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Vote className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
              Socrates Poll Desk
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
              <span>Relational Postgres State</span>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              <span>{isSupabaseConfigured ? "Supabase Live" : "Local Mock Storage"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={refreshDatabaseState}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer"
            title="Refresh tables state"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer"
            title="Toggle theme appearance"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser && (
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-500 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="End active session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* WORKSPACE VIEW CONTENT */}
      <div className="flex-1 flex flex-col">
        {!currentUser ? (
          /* ================== SIGN IN LAYOUT ================== */
          <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-lg mx-auto w-full">
            {googleRegSuccess ? (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100 dark:border-emerald-900/50">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Profile Submitted!</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Thank you! Your verified CUNIMA student profile has been submitted to the platform administrator for approval.
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed font-semibold">
                    Email address: <span className="font-mono text-blue-600 dark:text-blue-400">{pendingGoogleUser?.email}</span>
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 py-2 px-3 rounded-xl border border-amber-100 dark:border-amber-900/30 mt-4 text-[11px] font-medium leading-relaxed">
                    Status: Pending Verification. You will be connected automatically once approved by the administrator.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGoogleRegSuccess(false);
                    setPendingGoogleUser(null);
                    setLoginError("");
                  }}
                  className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs rounded-full cursor-pointer hover:bg-zinc-800 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : pendingGoogleUser ? (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-5 animate-fadeIn" id="student_registration_form">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">CUNIMA Student Registration</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Your Google account is authenticated, but your student record is not yet in the voter database. Please submit your registration details to the administrator.
                  </p>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300 font-mono break-all">
                  Connected: {pendingGoogleUser.email}
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">First Name</label>
                      <input 
                        type="text"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="e.g. Desire"
                        className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Surname</label>
                      <input 
                        type="text"
                        value={regSurname}
                        onChange={(e) => setRegSurname(e.target.value)}
                        placeholder="e.g. Kandodo"
                        className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Registration ID</label>
                      <input 
                        type="text"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        placeholder="e.g. REG/CS/2026/011"
                        className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CUM Number</label>
                      <input 
                        type="text"
                        value={regCum}
                        onChange={(e) => setRegCum(e.target.value)}
                        placeholder="e.g. 3.75 or 76.5"
                        className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Program Course</label>
                    <input 
                      type="text"
                      value={regProgram}
                      onChange={(e) => setRegProgram(e.target.value)}
                      placeholder="e.g. BSc Computer Science"
                      className="w-full px-3.5 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Academic Year</label>
                      <input 
                        type="text"
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                        placeholder="e.g. 2026/2027"
                        className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gender</label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingGoogleUser(null);
                        setLoginError("");
                      }}
                      className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-semibold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-full shadow-md shadow-blue-500/15 transition-colors cursor-pointer text-center"
                    >
                      {isLoading ? "Submitting..." : "Submit Registration"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-normal text-zinc-950 dark:text-zinc-50">CUNIMA Voter Portal</h2>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Socrates campus elections portal. Sign in with your official university account to access active ballots.
                  </p>
                </div>

                {/* GOOGLE SIGN IN - PRIMARY ENTRANCE */}
                <div className="space-y-4">
                  {loginError && (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/15 border-none transition-all active:scale-95 cursor-pointer"
                    id="btn_google_signin"
                  >
                    <svg className="w-4 h-4 filter brightness-0 invert" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Sign In with @cunima.ac.mw Google</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
                  <span className="bg-white dark:bg-zinc-900 px-3 text-[10px] uppercase tracking-wider text-zinc-400 font-bold absolute font-mono">
                    or authenticate with credentials
                  </span>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500">Username</label>
                    <input 
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter your credential username"
                      className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-zinc-950 dark:text-zinc-50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-500">Password</label>
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        {isPasswordVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input 
                      type={isPasswordVisible ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-zinc-950 dark:text-zinc-50"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm rounded-full transition-all active:scale-95 cursor-pointer"
                  >
                    {isLoading ? "Validating Session..." : "Verify Username & Password"}
                  </button>
                </form>

                {/* SANDBOX PREMADE CREDS DECK */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center font-mono">
                    Sandbox Testing Credentials
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-zinc-500">
                    <button 
                      onClick={() => { setUsernameInput("admin"); setPasswordInput("admin"); }}
                      className="p-2 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-center border border-zinc-200/60 dark:border-zinc-800/60 transition-all cursor-pointer"
                    >
                      <span className="block text-zinc-800 dark:text-zinc-200 font-bold">Admin Panel</span>
                      <span className="text-[10px] text-zinc-400 font-mono">admin / admin</span>
                    </button>

                    <button 
                      onClick={() => { setUsernameInput("manager"); setPasswordInput("manager"); }}
                      className="p-2 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 rounded-xl text-center border border-purple-200/60 dark:border-purple-900/60 transition-all cursor-pointer text-purple-700 dark:text-purple-300"
                    >
                      <span className="block font-bold">Club Manager</span>
                      <span className="text-[10px] text-purple-400 font-mono">manager / manager</span>
                    </button>

                    <button 
                      onClick={() => { setUsernameInput("voter"); setPasswordInput("voter"); }}
                      className="p-2 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 rounded-xl text-center border border-blue-200/60 dark:border-blue-900/60 transition-all cursor-pointer text-blue-700 dark:text-blue-300"
                    >
                      <span className="block font-bold">Voter Card</span>
                      <span className="text-[10px] text-blue-400 font-mono">voter / voter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        ) : (
          /* ================== LOGGED-IN MULTI-DASHBOARD VIEWS ================== */
          <div className="flex-1 flex flex-col md:flex-row">
            
            {/* SIDEBAR FOR ADMINISTRATIVE ONLY */}
            {currentUser.role === "admin" && (
              <aside className={`w-full md:w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between ${isSidebarOpen ? "block" : "hidden md:flex"}`}>
                <div className="p-4 space-y-6">
                  <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono block px-3">
                    Admin workspace
                  </span>

                  <nav className="space-y-1">
                    <button 
                      onClick={() => setActiveMenu("election")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "election" ? "bg-blue-50 dark:bg-blue-950/40 text-[#1a73e8] dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>Public Elections</span>
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {elections.filter(e => !e.club_id).length}
                      </span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("voters")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "voters" ? "bg-blue-50 dark:bg-blue-950/40 text-[#1a73e8] dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>Manage Users</span>
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {voters.length}
                      </span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("clubs")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "clubs" ? "bg-blue-50 dark:bg-blue-950/40 text-[#1a73e8] dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>Student Clubs</span>
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {clubs.length}
                      </span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("results")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "results" ? "bg-blue-50 dark:bg-blue-950/40 text-[#1a73e8] dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>Publish Feed</span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("updates")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "updates" ? "bg-blue-50 dark:bg-blue-950/40 text-[#1a73e8] dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>Broadcast Socials</span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("profile")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "profile" ? "bg-blue-50 dark:bg-blue-950/40 text-[#1a73e8] dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>My Profile</span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("students")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "students" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>Students Database</span>
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-[10px] px-2 py-0.5 rounded-full font-bold text-emerald-700 dark:text-emerald-400">
                        {students.length}
                      </span>
                    </button>

                    <button 
                      onClick={() => setActiveMenu("sql_db")}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeMenu === "sql_db" ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>SQL DB Inspector</span>
                    </button>
                  </nav>
                </div>

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 font-mono">
                  <p>Logged as: {currentUser.username}</p>
                </div>
              </aside>
            )}

            {/* MAIN PORTLET CONTAINER */}
            <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto">
              
              {isLoading && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 text-xs font-mono flex items-center gap-2 border border-blue-100 dark:border-blue-900/20">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing state with Supabase servers...</span>
                </div>
              )}

              {currentUser.role === "admin" ? (
                /* ================== ROUTED ADMIN PORTAL ================== */
                <AdminDashboard
                  currentUser={currentUser}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  elections={elections}
                  votes={votes}
                  voters={voters}
                  clubs={clubs}
                  clubMembers={clubMembers}
                  updates={updates}
                  updateLikes={updateLikes}
                  updateComments={updateComments}
                  visiblePasswords={visiblePasswords}
                  setVisiblePasswords={setVisiblePasswords}
                  students={students}
                  newElectionTitle={newElectionTitle}
                  setNewElectionTitle={setNewElectionTitle}
                  newElectionDesc={newElectionDesc}
                  setNewElectionDesc={setNewElectionDesc}
                  candidateInput={candidateInput}
                  setCandidateInput={setCandidateInput}
                  candidates={candidates}
                  setCandidates={setCandidates}
                  handleCreateElection={handleCreateElection}
                  newVoterUsername={newVoterUsername}
                  setNewVoterUsername={setNewVoterUsername}
                  newVoterPassword={newVoterPassword}
                  setNewVoterPassword={setNewVoterPassword}
                  newVoterRole={newVoterRole}
                  setNewVoterRole={setNewVoterRole}
                  handleCreateVoter={handleCreateVoter}
                  handleUpdateElectionStatus={handleUpdateElectionStatus}
                  handleDeleteElection={handleDeleteElection}
                  simulateVotes={simulateVotes}
                  toggleVoterRole={toggleVoterRole}
                  toggleBlockVoter={toggleBlockVoter}
                  handleDeleteVoter={handleDeleteVoter}
                  togglePublishResults={togglePublishResults}
                  newClubName={newClubName}
                  setNewClubName={setNewClubName}
                  newClubDesc={newClubDesc}
                  setNewClubDesc={setNewClubDesc}
                  newClubManagerId={newClubManagerId}
                  setNewClubManagerId={setNewClubManagerId}
                  handleCreateClub={handleCreateClub}
                  handleDeleteClub={handleDeleteClub}
                  handleToggleClubMember={handleToggleClubMember}
                  selectedClubIdForManage={selectedClubIdForManage}
                  setSelectedClubIdForManage={setSelectedClubIdForManage}
                  newUpdateContent={newUpdateContent}
                  setNewUpdateContent={setNewUpdateContent}
                  handleCreateUpdate={handleCreateUpdate}
                  handleDeleteUpdate={handleDeleteUpdate}
                  handleToggleLikeUpdate={handleToggleLikeUpdate}
                  newCommentContents={newCommentContents}
                  setNewCommentContents={setNewCommentContents}
                  handlePostComment={handlePostComment}
                  truncateDatabase={truncateDatabase}
                  refreshDatabaseState={refreshDatabaseState}
                  showToast={showToast}
                  setIsLoading={setIsLoading}
                />
              ) : currentUser.role === "club_manager" ? (
                /* ================== ROUTED CLUB MANAGER PORTAL ================== */
                <ClubManagerDashboard
                  currentUser={currentUser}
                  clubs={clubs}
                  clubMembers={clubMembers}
                  voters={voters}
                  elections={elections}
                  votes={votes}
                  updates={updates}
                  updateLikes={updateLikes}
                  updateComments={updateComments}
                  handleDeleteUpdate={handleDeleteUpdate}
                  handleToggleLikeUpdate={handleToggleLikeUpdate}
                  newCommentContents={newCommentContents}
                  setNewCommentContents={setNewCommentContents}
                  handlePostComment={handlePostComment}
                  refreshDatabaseState={refreshDatabaseState}
                  showToast={showToast}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              ) : (
                /* ================== ROUTED GENERAL VOTER PORTAL ================== */
                <VoterDashboard
                  currentUser={currentUser}
                  students={students}
                  elections={elections}
                  votes={votes}
                  clubMembers={clubMembers}
                  updates={updates}
                  updateLikes={updateLikes}
                  updateComments={updateComments}
                  handleDeleteUpdate={handleDeleteUpdate}
                  handleToggleLikeUpdate={handleToggleLikeUpdate}
                  newCommentContents={newCommentContents}
                  setNewCommentContents={setNewCommentContents}
                  handlePostComment={handlePostComment}
                  refreshDatabaseState={refreshDatabaseState}
                  showToast={showToast}
                  setIsLoading={setIsLoading}
                />
              )}

            </main>
          </div>
        )}
      </div>

      {/* FLOATING TOAST FEEDBACK */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-5 py-3.5 rounded-2xl shadow-xl max-w-sm text-xs font-semibold flex items-center gap-2 border border-zinc-800 dark:border-zinc-200"
          >
            <Info className="w-4 h-4 text-blue-400 dark:text-blue-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
