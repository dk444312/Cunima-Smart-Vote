/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  Info,
  Moon,
  Sun,
  LogOut,
  RefreshCw,
  Copy,
  TrendingUp,
  Award,
  ShieldCheck,
  Database,
  Users2,
  ShieldAlert,
  Vote,
  Check,
  UserCheck,
  Lock,
  Megaphone,
  User,
  PieChart,
  Bell,
  List,
  Home,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  dbService,
  isSupabaseConfigured,
  initializeDatabase,
  getElectionPositions,
  PREMADE_ADMIN,
  PREMADE_VOTER,
  PREMADE_MANAGER,
} from "./lib/supabase.ts";
import {
  ElectionRow,
  VoterRow,
  VoteRow,
  LoggedInUser,
  UpdateRow,
  UpdateLikeRow,
  UpdateCommentRow,
  ClubRow,
  ClubMemberRow,
  StudentRow,
  Position,
  Candidate,
} from "./types.ts";
import { signInWithGoogle, logoutFirebase } from "./lib/firebase.ts";
import { getUserAvatarUrl } from "./lib/avatar.ts";

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
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [showCredentialsWarningModal, setShowCredentialsWarningModal] = useState(false);

  // Database State Mirrors
  const [elections, setElections] = useState<ElectionRow[]>([]);
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMemberRow[]>([]);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [updateLikes, setUpdateLikes] = useState<
    Record<string, UpdateLikeRow[]>
  >({});
  const [updateComments, setUpdateComments] = useState<
    Record<string, UpdateCommentRow[]>
  >({});
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Student Registration Form States (Google or Username/Password Auth)
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    email: string;
    displayName: string;
    uid?: string;
    source?: "google" | "credentials" | "manual";
    customMessage?: string;
  } | null>(null);
  const [googleRegSuccess, setGoogleRegSuccess] = useState(false);
  const [unregisteredUsernamePrompt, setUnregisteredUsernamePrompt] = useState<
    string | null
  >(null);
  const [regFirstName, setRegFirstName] = useState("");
  const [regSurname, setRegSurname] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regProgram, setRegProgram] = useState("");
  const [regYear, setRegYear] = useState("");
  const [regCum, setRegCum] = useState("");
  const [regGender, setRegGender] = useState("M");

  // Google Searching Similarity Loader States
  const [isSearchingProfile, setIsSearchingProfile] = useState(false);
  const [searchStateMessage, setSearchStateMessage] = useState("");
  const [currentUserDisplay, setCurrentUserDisplay] = useState("");
  const [pendingIdentityConfirm, setPendingIdentityConfirm] = useState<{
    student: StudentRow;
    activeUser: LoggedInUser;
  } | null>(null);
  const [activeGuardLockUser, setActiveGuardLockUser] =
    useState<LoggedInUser | null>(null);
  const [guardLockPasswordInput, setGuardLockPasswordInput] = useState("");

  // Form states for Admin (passed down or handled centrally)
  const [newElectionTitle, setNewElectionTitle] = useState("");
  const [newElectionDesc, setNewElectionDesc] = useState("");
  const [candidateInput, setCandidateInput] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidatePhoto, setCandidatePhoto] = useState("");
  const [positions, setPositions] = useState<Position[]>([
    {
      id: "pos_pres",
      title: "President",
      candidates: [],
    },
    {
      id: "pos_vp",
      title: "Vice President",
      candidates: [],
    },
  ]);

  const [newVoterUsername, setNewVoterUsername] = useState("");
  const [newVoterPassword, setNewVoterPassword] = useState("");
  const [newVoterRole, setNewVoterRole] = useState("voter");

  const [newClubName, setNewClubName] = useState("");
  const [newClubDesc, setNewClubDesc] = useState("");
  const [newClubManagerId, setNewClubManagerId] = useState("");

  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [newCommentContents, setNewCommentContents] = useState<
    Record<string, string>
  >({}); // updateId -> commentText

  // Navigation state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string>("election");
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [selectedClubIdForManage, setSelectedClubIdForManage] = useState<
    string | null
  >(null);

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
      const [
        allElections,
        allVoters,
        allVotes,
        allClubs,
        allClubMembers,
        allUpdates,
        allStudents,
      ] = await Promise.all([
        dbService.getElections(),
        dbService.getVoters(),
        dbService.getVotes(),
        dbService.getClubs(),
        dbService.getClubMembers(),
        dbService.getUpdates(),
        dbService.getStudents(),
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
            dbService.getUpdateComments(upd.id),
          ]);
          likesMap[upd.id] = likes;
          commentsMap[upd.id] = comments;
        }),
      );

      setUpdateLikes(likesMap);
      setUpdateComments(commentsMap);
    } catch (err: any) {
      console.error("Database connection refresh delay or error:", err);
      showToast(
        `Database Delay / Fallback active: ${err.message || "using local cached rows"}`,
      );
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

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        setActiveMenu("election");
      } else if (currentUser.role === "club_manager") {
        setActiveMenu("club_elections");
      } else {
        setActiveMenu("home");
      }
    }
  }, [currentUser]);

  // Sync Dark Mode Class on Document Body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Helper to check if a user identifier is connected to an approved student profile
  const findMatchingStudent = (
    identifier: string,
    studentsList: StudentRow[],
  ): StudentRow | undefined => {
    const cleanId = identifier.toLowerCase().trim();
    if (!cleanId) return undefined;

    return studentsList.find((s) => {
      // 1. Direct Email Match
      if (s.email && s.email.toLowerCase().trim() === cleanId) {
        return true;
      }

      // 2. Direct Registration Number Match
      if (
        s.registration_number &&
        s.registration_number.toLowerCase().trim() === cleanId
      ) {
        return true;
      }

      // 3. If identifier is an email, parse local part (e.g. "desire.kandodo@cunima.ac.mw")
      if (cleanId.includes("@")) {
        const emailLocalPart = cleanId.split("@")[0].toLowerCase().trim();
        const emailParts = emailLocalPart
          .split(/[\._\-]/)
          .filter((p) => p.length > 0);
        const cleanLocalPart = emailLocalPart.replace(/[^a-z0-9]/g, "");
        const cleanFirst = s.first_name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");
        const cleanSurname = s.surname
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");

        if (
          cleanLocalPart === cleanFirst + cleanSurname ||
          cleanLocalPart === cleanSurname + cleanFirst
        ) {
          return true;
        }
        if (
          emailParts.includes(cleanFirst) &&
          emailParts.includes(cleanSurname)
        ) {
          return true;
        }
      } else {
        // 4. Identifier might be username like "desire.kandodo" or "kandodo"
        const userParts = cleanId.split(/[\._\-]/).filter((p) => p.length > 0);
        const cleanUsername = cleanId.replace(/[^a-z0-9]/g, "");
        const cleanFirst = s.first_name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");
        const cleanSurname = s.surname
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");

        if (
          cleanUsername === cleanFirst + cleanSurname ||
          cleanUsername === cleanSurname + cleanFirst
        ) {
          return true;
        }
        if (
          userParts.includes(cleanFirst) &&
          userParts.includes(cleanSurname)
        ) {
          return true;
        }
      }

      return false;
    });
  };

  const openSubmissionForm = (
    accountIdentifier?: string,
    source: "google" | "credentials" | "manual" = "credentials",
    noticeMessage?: string,
  ) => {
    const rawInput = (accountIdentifier || usernameInput).trim();
    const isEmail = rawInput.includes("@");
    const defaultEmail = isEmail
      ? rawInput
      : rawInput
        ? `${rawInput.toLowerCase()}@cunima.ac.mw`
        : "";

    setPendingGoogleUser({
      email: defaultEmail,
      displayName: rawInput || "Student Voter",
      uid: "cred_" + Date.now(),
      source,
      customMessage: noticeMessage,
    });
    setRegEmail(defaultEmail);
    if (!isEmail && rawInput) {
      setRegNumber(rawInput);
    }
    setLoginError("");
    setUnregisteredUsernamePrompt(null);
  };

  // Auth Operations
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setUnregisteredUsernamePrompt(null);

    const user = usernameInput.trim();
    const pass = passwordInput.trim();

    if (!user || !pass) {
      setLoginError("Please enter both username and password.");
      return;
    }

    // Admin Premade Match
    if (user === PREMADE_ADMIN.username && pass === PREMADE_ADMIN.password) {
      const adminUser = {
        id: PREMADE_ADMIN.id,
        username: PREMADE_ADMIN.username,
        role: "admin" as const,
      };
      setCurrentUser(adminUser);
      localStorage.setItem("g_election_active_user", JSON.stringify(adminUser));
      setUsernameInput("");
      setPasswordInput("");
      showToast("Access Granted: Welcome back, Administrator.");
      return;
    }

    // Check seed / registered voters table
    const matchedVoter = voters.find(
      (v) => v.username.toLowerCase() === user.toLowerCase(),
    );

    if (matchedVoter) {
      if (matchedVoter.password === pass) {
        if (matchedVoter.is_blocked) {
          setLoginError(
            "This user account has been blocked by administrators.",
          );
          return;
        }

        // Admin accounts do not need student registry linkage
        if (matchedVoter.role === "admin") {
          const adminUser = {
            id: matchedVoter.id,
            username: matchedVoter.username,
            role: "admin" as const,
          };
          setCurrentUser(adminUser);
          localStorage.setItem(
            "g_election_active_user",
            JSON.stringify(adminUser),
          );
          setUsernameInput("");
          setPasswordInput("");
          showToast("Access Granted: Welcome back, Administrator.");
          return;
        }

        // Check if student profile is connected in Socrates student directory!
        const matchedStudent = findMatchingStudent(
          matchedVoter.username,
          students,
        );

        if (!matchedStudent) {
          // Account credentials verified, but student record is NOT connected!
          // Show the student submission form!
          openSubmissionForm(
            matchedVoter.username,
            "credentials",
            "Account credentials verified, but your student record is not yet connected in the database. Please submit your registration details to the administrator.",
          );
          showToast(
            "Account verified, but not connected to a student record. Please submit your details.",
          );
          return;
        }

        if (matchedStudent.status === "pending") {
          setLoginError(
            "Your student registration application is currently pending administrator approval. Please wait for approval before accessing ballots.",
          );
          return;
        }

        const voterUser = {
          id: matchedVoter.id,
          username: matchedVoter.username,
          role: matchedVoter.role || "voter",
        };
        setCurrentUser(voterUser);
        localStorage.setItem(
          "g_election_active_user",
          JSON.stringify(voterUser),
        );
        setUsernameInput("");
        setPasswordInput("");
        showToast(`Access Granted: Welcome back, ${voterUser.username}.`);
      } else {
        setLoginError(
          "Incorrect password. Please verify your credentials sheet.",
        );
      }
    } else {
      setLoginError(
        `Account "${user}" is not in the database. If you are a student, submit your registration details below.`,
      );
      setUnregisteredUsernamePrompt(user);
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
        throw new Error(
          "Could not fetch user profile from Google Authentication.",
        );
      }

      const email = user.email || "";
      const displayName =
        user.displayName || user.email?.split("@")[0] || "Student Voter";

      // Strict Domain Check: Only @cunima.ac.mw Google emails are allowed
      if (!email.toLowerCase().endsWith("@cunima.ac.mw")) {
        setLoginError(
          "Access Restricted: Only official @cunima.ac.mw student/staff Google accounts are allowed to authenticate.",
        );
        setIsLoading(false);
        return;
      }

      // Check if user is the administrator bypass
      const isAdminEmail =
        email.toLowerCase() === "admin@cunima.ac.mw" ||
        email.toLowerCase().startsWith("admin.");

      if (isAdminEmail) {
        // Find or create admin voter row
        let matchedVoter = voters.find(
          (v) => v.username.toLowerCase() === email.toLowerCase(),
        );
        if (!matchedVoter) {
          try {
            matchedVoter = await dbService.insertVoter(
              email,
              "firebase_secret",
              "admin",
            );
            await refreshDatabaseState();
          } catch (dbErr) {
            console.error("Inserting admin voter matched:", dbErr);
          }
        }
        const activeUser: LoggedInUser = {
          id: matchedVoter?.id || user.uid,
          username: email,
          role: "admin",
        };
        setCurrentUser(activeUser);
        localStorage.setItem(
          "g_election_active_user",
          JSON.stringify(activeUser),
        );
        showToast(`Google Auth Success: Welcome back, Admin ${displayName}.`);
        return;
      }

      // Trigger Searching UI
      setIsSearchingProfile(true);
      setCurrentUserDisplay(displayName);
      setSearchStateMessage(
        "Establishing secure connection to Socrates Database...",
      );
      await new Promise((resolve) => setTimeout(resolve, 700));

      setSearchStateMessage(
        `Parsing name structures from authenticated email "${email}"...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSearchStateMessage(
        "Scanning student registry columns for bi-directional similarities...",
      );
      await new Promise((resolve) => setTimeout(resolve, 900));

      // Check Student Register Database: Check full name and the email address name
      const matchedStudent = students.find((s) => {
        // 1. Direct Email Match
        if (s.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
          return true;
        }

        // 2. Parse local part of Google email (e.g., "desire.kandodo" from "desire.kandodo@cunima.ac.mw")
        const emailLocalPart = email.split("@")[0].toLowerCase().trim();

        // Split by punctuation to get raw segments (e.g. ["desire", "kandodo"])
        const emailParts = emailLocalPart
          .split(/[\._\-]/)
          .filter((p) => p.length > 0);

        const firstNameLower = s.first_name.toLowerCase().trim();
        const surnameLower = s.surname.toLowerCase().trim();

        // Standardized concatenated matching (e.g., "desirekandodo" or "kandododesire")
        const cleanLocalPart = emailLocalPart.replace(/[^a-z0-9]/g, "");
        const cleanFirst = firstNameLower.replace(/[^a-z0-9]/g, "");
        const cleanSurname = surnameLower.replace(/[^a-z0-9]/g, "");

        const opt1 = cleanFirst + cleanSurname; // "desirekandodo"
        const opt2 = cleanSurname + cleanFirst; // "kandododesire"

        // Check if the clean local part exactly matches one of the full-name order options
        if (cleanLocalPart === opt1 || cleanLocalPart === opt2) {
          return true;
        }

        // Also check segment intersection (e.g., emailParts has both "desire" and "kandodo" in any order)
        if (
          emailParts.includes(cleanFirst) &&
          emailParts.includes(cleanSurname)
        ) {
          return true;
        }

        return false;
      });

      if (matchedStudent) {
        setSearchStateMessage(
          `Match Identified! Connecting to student profile of "${matchedStudent.first_name} ${matchedStudent.surname}" [${matchedStudent.registration_number}]...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 900));

        // Automatically save their Google email to their student record if it's not set
        if (
          !matchedStudent.email ||
          matchedStudent.email.toLowerCase() !== email.toLowerCase()
        ) {
          try {
            await dbService.linkStudentEmail(matchedStudent.id, email);
            await refreshDatabaseState();
          } catch (linkErr) {
            console.error(
              "Auto linking Google email to student profile failed:",
              linkErr,
            );
          }
        }

        if (matchedStudent.status === "pending") {
          setLoginError(
            "Your registration application is currently pending administrator approval. Please wait.",
          );
          setIsSearchingProfile(false);
          setIsLoading(false);
          return;
        }

        // Student exists and is APPROVED! Let's connect them
        let matchedVoter = voters.find(
          (v) => v.username.toLowerCase() === email.toLowerCase(),
        );
        if (!matchedVoter) {
          try {
            // Auto-create voter account linked to student
            matchedVoter = await dbService.insertVoter(
              email,
              "firebase_secret",
              "voter",
            );
            await refreshDatabaseState();
          } catch (dbErr) {
            console.error("Auto registration voter failed:", dbErr);
          }
        }

        if (matchedVoter?.is_blocked) {
          setLoginError(
            "This student account has been blocked by administrators.",
          );
          setIsSearchingProfile(false);
          setIsLoading(false);
          return;
        }

        const activeUser: LoggedInUser = {
          id: matchedVoter?.id || user.uid,
          username: email,
          role: matchedVoter?.role || "voter",
        };

        // Intercept immediate login to show identity confirmation details modal
        setPendingIdentityConfirm({
          student: matchedStudent,
          activeUser,
        });
        showToast("Profile Match Identified: Please confirm your identity.");
      } else {
        setSearchStateMessage(
          "No matching student profile found in standard directory database. Redirecting to registration...",
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // NOT in database at all! Trigger Student Profile Registration form!
        setPendingGoogleUser({ email, displayName, uid: user.uid });
        showToast(
          "Student record not found. Please submit your details for verification.",
        );
      }
    } catch (err: any) {
      console.error("Google login failure:", err);
      setLoginError(err.message || "Google Sign-In was cancelled or failed.");
    } finally {
      setIsSearchingProfile(false);
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;

    if (
      !regFirstName ||
      !regSurname ||
      !regNumber ||
      !regProgram ||
      !regYear ||
      !regCum ||
      !regGender
    ) {
      showToast("Please fill in all student profile registration fields.");
      return;
    }

    try {
      setIsLoading(true);
      const emailToUse = (regEmail || pendingGoogleUser.email || "").trim().toLowerCase();
      await dbService.insertStudent({
        first_name: regFirstName.trim(),
        surname: regSurname.trim(),
        registration_number: regNumber.trim(),
        program_name: regProgram.trim(),
        academic_year: regYear.trim(),
        cum_number: regCum.trim(),
        gender: regGender.trim(),
        email: emailToUse || null,
        status: "pending", // Needs to be approved by administrator!
      });

      // Reset fields
      setRegFirstName("");
      setRegSurname("");
      setRegEmail("");
      setRegNumber("");
      setRegProgram("");
      setRegYear("");
      setRegCum("");
      setRegGender("M");

      // Sync the states
      await refreshDatabaseState();
      setGoogleRegSuccess(true);
      showToast(
        "Your registration profile has been successfully submitted for administrator approval.",
      );
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

    // Filter out positions with empty title
    let validPositions = positions.filter((p) => p.title.trim().length > 0);

    // Fallback: If no positions defined or empty, create from candidates or default slates
    if (validPositions.length === 0) {
      const finalCandidates = [...candidates];
      if (
        candidateInput.trim() &&
        !finalCandidates.some((c) => (typeof c === "string" ? c : c.name) === candidateInput.trim())
      ) {
        if (candidatePhoto) {
          finalCandidates.push({ id: `cand_${Date.now()}`, name: candidateInput.trim(), photo_url: candidatePhoto });
        } else {
          finalCandidates.push({ id: `cand_${Date.now()}`, name: candidateInput.trim() });
        }
      }
      const slates = finalCandidates.length > 0 ? finalCandidates : [
        { id: "cand_1", name: "Candidate A" },
        { id: "cand_2", name: "Candidate B" },
      ];
      validPositions = [
        {
          id: `pos_${Date.now()}`,
          title: "Executive Office",
          candidates: slates.map((s, idx) =>
            typeof s === "string" ? { id: `cand_${idx}`, name: s } : s
          ),
        },
      ];
    }

    // For legacy candidates column, flatten candidates
    const legacyCandidates = validPositions.flatMap((p) => p.candidates);

    try {
      setIsLoading(true);
      await dbService.insertElection(
        newElectionTitle.trim(),
        newElectionDesc.trim(),
        legacyCandidates,
        null,
        "draft",
        validPositions,
      );
      await refreshDatabaseState();

      setNewElectionTitle("");
      setNewElectionDesc("");
      setCandidateInput("");
      setCandidatePhoto("");
      setCandidates([]);
      setPositions([
        {
          id: `pos_${Date.now()}_1`,
          title: "President",
          candidates: [],
        },
        {
          id: `pos_${Date.now()}_2`,
          title: "Vice President",
          candidates: [],
        },
      ]);
      showToast("SQL INSERT SUCCESS: Created new structured election with positions and candidate photos.");
    } catch (err: any) {
      showToast(`SQL INSERT FAIL: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateElectionStatus = async (
    id: string,
    status: "draft" | "active" | "completed",
  ) => {
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
      const election = elections.find((e) => e.id === electionId);
      if (!election) return;

      const activeVoters = voters.filter(
        (v) => !v.is_blocked && v.role !== "admin",
      );

      if (activeVoters.length === 0) {
        showToast("No active voters found in directory to simulate ballots.");
        return;
      }

      const electionPositions = getElectionPositions(election);

      await Promise.all(
        activeVoters.map(async (voter) => {
          try {
            for (const pos of electionPositions) {
              if (pos.candidates.length > 0) {
                const randomCandidate =
                  pos.candidates[
                    Math.floor(Math.random() * pos.candidates.length)
                  ];
                await dbService.insertVote(
                  voter.id,
                  electionId,
                  randomCandidate.name,
                  pos.id,
                  randomCandidate.id,
                );
              }
            }
          } catch (e) {
            // gracefully skip duplicate voter constraints
          }
        }),
      );

      await dbService.updateElection(electionId, { status: "completed" });
      await refreshDatabaseState();
      showToast(
        `SQL SIMULATION: Distributed random ballot entries across all positions to active voter base.`,
      );
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
        newVoterRole as any,
      );
      await refreshDatabaseState();

      setNewVoterUsername("");
      setNewVoterPassword("");
      showToast(
        `SQL INSERT SUCCESS: Created ${newVoterRole === "club_manager" ? "Club Manager" : "Voter"} account.`,
      );
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
      showToast(
        `SQL UPDATE SUCCESS: Changed "${v.username}" to ${nextRole === "club_manager" ? "Club Manager" : "Voter"}.`,
      );
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
      showToast(
        `SQL UPDATE SUCCESS: ${v.is_blocked ? "Unblocked" : "Blocked"} voter "${v.username}".`,
      );
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
      showToast(
        `SQL UPDATE SUCCESS: Feed visibility changed to ${published ? "Visible" : "Hidden"}.`,
      );
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
        newClubManagerId,
      );
      await refreshDatabaseState();

      setNewClubName("");
      setNewClubDesc("");
      setNewClubManagerId("");
      showToast(
        `SQL INSERT SUCCESS: New club "${newClubName}" created successfully.`,
      );
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
    const existingIds = clubMembers
      .filter((cm) => cm.club_id === clubId)
      .map((cm) => cm.voter_id);
    const updatedIds = existingIds.includes(voterId)
      ? existingIds.filter((id) => id !== voterId)
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
  const handleCreateUpdate = async (e: React.FormEvent, mediaUrl?: string) => {
    e.preventDefault();
    if (!newUpdateContent.trim() && !mediaUrl) return;

    try {
      setIsLoading(true);
      await dbService.insertUpdate(
        newUpdateContent.trim(),
        "Administrator",
        mediaUrl,
      );
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
      await dbService.toggleLikeUpdate(
        updateId,
        currentUser.id,
        currentUser.username,
      );
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
      await dbService.insertUpdateComment(
        updateId,
        currentUser.id,
        currentUser.username,
        text.trim(),
      );
      setNewCommentContents((prev) => ({ ...prev, [updateId]: "" }));
      await refreshDatabaseState();
      showToast("SQL COMMENT SUCCESS: Comment post row added.");
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    }
  };

  const truncateDatabase = async () => {
    if (
      !window.confirm(
        "Are you sure you want to drop and truncate all mock tables data? This action is irreversible.",
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await dbService.clearAllData();
      await refreshDatabaseState();
      showToast(
        "SQL TRUNCATE TRADITIONAL DELEGATION SUCCESS: All table schemas are cleared.",
      );
    } catch (err: any) {
      showToast(`SQL ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 font-sans antialiased flex flex-col">
      {/* GLOBAL BANNER */}
      {currentUser && (
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-3 px-4 sm:px-6 sticky top-0 z-40 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 -ml-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-transparent">
              <img
                src="/images/campus vote logo.png"
                alt="CampusVote Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                CampusVote
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                />
                <span className="hidden xs:inline">
                  {isSupabaseConfigured ? "Online Postgres" : "Local Mock Storage"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={refreshDatabaseState}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer"
              title="Refresh tables state"
              aria-label="Refresh tables state"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors cursor-pointer"
              title="Toggle theme appearance"
              aria-label="Toggle theme appearance"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-500 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="End active session"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
      )}

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
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Profile Submitted!
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Thank you! Your verified CUNIMA student profile has been
                    submitted to the platform administrator for approval.
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed font-semibold">
                    Email address:{" "}
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {pendingGoogleUser?.email}
                    </span>
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 py-2 px-3 rounded-full border border-amber-100 dark:border-amber-900/30 mt-4 text-[11px] font-medium leading-relaxed">
                    Status: Pending Verification. You will be connected
                    automatically once approved by the administrator.
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
              <div
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-5 animate-fadeIn"
                id="student_registration_form"
              >
                <div>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                    CUNIMA Student Registration
                  </h3>
                  <p className="text-xs text-zinc-950 dark:text-zinc-200 mt-1.5 leading-relaxed font-semibold">
                    {pendingGoogleUser.customMessage ||
                      (pendingGoogleUser.source === "google"
                        ? "Your Google account is authenticated, but your student record is not yet in the voter database. Please submit your registration details to the administrator."
                        : "Your credentials are verified, but your account is not yet connected to a student record in the database. Please submit your details below for verification.")}
                  </p>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-950 dark:text-blue-100 font-mono flex items-center justify-between gap-2">
                  <span className="truncate">
                    Account:{" "}
                    <strong className="text-blue-950 dark:text-blue-100">
                      {pendingGoogleUser.displayName || pendingGoogleUser.email}
                    </strong>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex-shrink-0">
                    {pendingGoogleUser.source === "google"
                      ? "Google Account"
                      : "Credential Login"}
                  </span>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="e.g. Desire"
                        className="w-full px-3 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-950 dark:text-zinc-50 font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                        Surname
                      </label>
                      <input
                        type="text"
                        value={regSurname}
                        onChange={(e) => setRegSurname(e.target.value)}
                        placeholder="e.g. Kandodo"
                        className="w-full px-3 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-950 dark:text-zinc-50 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                      University Email (@cunima.ac.mw)
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. desire.kandodo@cunima.ac.mw"
                      className="w-full px-3.5 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-950 dark:text-zinc-50 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                        Registration ID
                      </label>
                      <input
                        type="text"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        placeholder="e.g. REG/CS/2026/011"
                        className="w-full px-3 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-950 dark:text-zinc-50 font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                        CUM Number
                      </label>
                      <input
                        type="text"
                        value={regCum}
                        onChange={(e) => setRegCum(e.target.value)}
                        placeholder="e.g. 3.75 or 76.5"
                        className="w-full px-3 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-950 dark:text-zinc-50 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                      Program Course
                    </label>
                    <input
                      type="text"
                      value={regProgram}
                      onChange={(e) => setRegProgram(e.target.value)}
                      placeholder="e.g. BSc Computer Science"
                      className="w-full px-3.5 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-950 dark:text-zinc-50 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                        placeholder="e.g. 2026/2027"
                        className="w-full px-3 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs font-mono text-zinc-950 dark:text-zinc-50 font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider block">
                        Gender
                      </label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="w-full px-3 py-2.5 bg-transparent border border-zinc-400 dark:border-zinc-600 rounded-full focus:border-blue-500 focus:outline-none text-xs text-zinc-950 dark:text-zinc-50 font-medium"
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
                      className="flex-1 py-2.5 bg-[#1565D8] hover:bg-blue-900 disabled:opacity-50 text-white font-semibold text-xs rounded-full shadow-md shadow-blue-500/15 transition-colors cursor-pointer text-center"
                    >
                      {isLoading ? "Submitting..." : "Submit Registration"}
                    </button>
                  </div>
                </form>
              </div>
            ) : pendingIdentityConfirm ? (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="text-center space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                    <UserCheck className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                    Confirm Your Identity
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Socrates matching engine found the following student profile
                    connected to your Google credentials. Please verify details
                    before exploring the portal.
                  </p>
                </div>

                <div className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        First Name
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                        {pendingIdentityConfirm.student.first_name}
                      </p>
                    </div>

                    <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        Surname
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                        {pendingIdentityConfirm.student.surname}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        Registration Number
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 font-mono text-[13px]">
                        {pendingIdentityConfirm.student.registration_number}
                      </p>
                    </div>

                    <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        Academic Year
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 font-mono">
                        {pendingIdentityConfirm.student.academic_year}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                      Registered Program Course
                    </span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {pendingIdentityConfirm.student.program_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        CUM Number
                      </span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {pendingIdentityConfirm.student.cum_number}
                      </p>
                    </div>

                    <div className="space-y-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-full border border-zinc-100 dark:border-zinc-900/50">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        Connected Google Account
                      </span>
                      <p className="font-semibold text-blue-600 dark:text-blue-400 font-mono truncate">
                        {pendingIdentityConfirm.activeUser.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3.5 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingIdentityConfirm(null);
                      showToast("Identity confirmation cancelled.");
                    }}
                    className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold rounded-full transition-all active:scale-95 cursor-pointer text-center"
                  >
                    No, Disconnect Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const userObj = pendingIdentityConfirm.activeUser;
                      if (userObj.guard_locked) {
                        setActiveGuardLockUser(userObj);
                        setPendingIdentityConfirm(null);
                        setGuardLockPasswordInput("");
                        showToast(
                          "Guard Lock Active: Please enter your credential password.",
                        );
                      } else {
                        setCurrentUser(userObj);
                        localStorage.setItem(
                          "g_election_active_user",
                          JSON.stringify(userObj),
                        );
                        setPendingIdentityConfirm(null);
                        showToast(
                          "Identity Confirmed: Welcome to Socrates Campus Portal.",
                        );
                      }
                    }}
                    className="flex-1 py-3 bg-[#1565D8] hover:bg-blue-900 text-white font-semibold text-xs rounded-full shadow-lg shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer text-center"
                  >
                    Yes, Confirm & Explore
                  </button>
                </div>
              </div>
            ) : activeGuardLockUser ? (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="text-center space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                    <Lock className="w-6 h-6 animate-bounce" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                    🔒 Credential Guard Lock
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Your account has active Guard Lock protection. Please enter
                    your secondary voter credential password to access the
                    voting ballots.
                  </p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setIsLoading(true);
                      // Match password in database/localStorage
                      const votersList = await dbService.getVoters();
                      const liveV = votersList.find(
                        (v) => v.id === activeGuardLockUser.id,
                      );
                      if (liveV && liveV.password === guardLockPasswordInput) {
                        setCurrentUser(activeGuardLockUser);
                        localStorage.setItem(
                          "g_election_active_user",
                          JSON.stringify(activeGuardLockUser),
                        );
                        setActiveGuardLockUser(null);
                        setGuardLockPasswordInput("");
                        showToast(
                          "Guard Lock Passed: Welcome to Socrates Campus Portal.",
                        );
                      } else {
                        showToast(
                          "Authentication Error: Invalid credential password.",
                        );
                      }
                    } catch (err: any) {
                      showToast(`Error: ${err.message}`);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                      Username / ID
                    </label>
                    <input
                      type="text"
                      value={activeGuardLockUser.username}
                      disabled
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-full text-zinc-400 font-semibold text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                      Guard Passcode / Password
                    </label>
                    <input
                      type="password"
                      value={guardLockPasswordInput}
                      onChange={(e) =>
                        setGuardLockPasswordInput(e.target.value)
                      }
                      placeholder="Enter guard password"
                      className="w-full px-4 py-3 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-amber-500 focus:outline-none text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGuardLockUser(null);
                        setGuardLockPasswordInput("");
                        showToast("Guard Lock verification cancelled.");
                      }}
                      className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold rounded-full transition-all cursor-pointer text-center"
                    >
                      Cancel Login
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#1565D8] hover:bg-blue-900 text-white font-semibold text-xs rounded-full shadow-lg shadow-amber-500/10 transition-all cursor-pointer text-center"
                    >
                      Unlock Session
                    </button>
                  </div>
                </form>
              </div>
            ) : isSearchingProfile ? (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6 text-center animate-fadeIn">
                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                  <div className="w-24 h-24 overflow-hidden rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-md flex items-center justify-center bg-white mb-2 animate-[pulse_1.5s_infinite]">
                    <img
                      src="/images/Cunima logo.jpg"
                      alt="CUNIMA Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <h3 className="text-sm font-black tracking-wider text-zinc-900 dark:text-zinc-50 uppercase font-sans">
                    CUNIMA STUDENT VERIFICATION
                  </h3>

                  <div className="flex items-center gap-1.5 justify-center py-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1565D8] dark:bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1565D8] dark:bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1565D8] dark:bg-blue-400 animate-bounce" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Authenticated as{" "}
                      <strong className="text-zinc-700 dark:text-zinc-300">
                        {currentUserDisplay}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 font-mono text-[11px] text-left space-y-2 text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">
                      Registry Scanner Active
                    </span>
                  </div>
                  <p className="font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                    {searchStateMessage}
                  </p>
                </div>

                <div className="text-[10px] text-zinc-400 font-mono">
                  Socrates Intelligent Verification Engine v1.2
                </div>
              </div>
            ) : (
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 mx-auto overflow-hidden rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm flex items-center justify-center bg-transparent">
                    <img
                      src="/images/Cunima logo.jpg"
                      alt="CUNIMA Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                    CUNIMA STUDENT VOTER PORTAL
                  </h2>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 max-w-md mx-auto leading-relaxed">
                    welcome to student voting platform managed by cunima
                  </p>
                </div>

                 {/* GOOGLE SIGN IN - PRIMARY ENTRANCE */}
                <div className="space-y-4">
                  {loginError && (
                    <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#1565D8] hover:bg-blue-900 text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/15 border-none transition-all active:scale-95 cursor-pointer"
                    id="btn_google_signin"
                  >
                    <svg
                      className="w-4 h-4 filter brightness-0 invert"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Sign In with @cunima.ac.mw Google</span>
                  </button>

                  {!showCredentialsForm && (
                    <button
                      type="button"
                      onClick={() => setShowCredentialsWarningModal(true)}
                      className="w-full py-3.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm rounded-full transition-all active:scale-95 cursor-pointer mt-2"
                    >
                      Other Login Options
                    </button>
                  )}
                </div>

                {showCredentialsForm && (
                  <>
                    <div className="relative flex items-center justify-center my-4">
                      <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
                      <span className="bg-white dark:bg-zinc-900 px-3 text-[10px] uppercase tracking-wider text-zinc-400 font-bold absolute font-mono">
                        or authenticate with credentials
                      </span>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500">
                          Username
                        </label>
                        <input
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Enter your credential username"
                          className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-sm text-zinc-950 dark:text-zinc-50"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-zinc-500">
                            Password
                          </label>
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
                          className="w-full px-4 py-2.5 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full focus:border-blue-500 focus:outline-none text-sm text-zinc-950 dark:text-zinc-50"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm rounded-full transition-all active:scale-95 cursor-pointer"
                      >
                        {isLoading
                          ? "Validating Session..."
                          : "Verify Username & Password"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </main>
        ) : (
          /* ================== LOGGED-IN MULTI-DASHBOARD VIEWS ================== */
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex md:w-64 bg-[#0B2D6B] text-white flex-col justify-between flex-shrink-0">
              <div className="p-4 space-y-4">
                <span className="text-sm font-bold tracking-tight text-white block px-3 pt-2 pb-1 font-['-apple-system',BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]">
                  {currentUser.role === "admin"
                    ? "Admin Workspace"
                    : currentUser.role === "club_manager"
                      ? "Club Management"
                      : "Voter Portal"}
                </span>

                <nav className="space-y-1">
                  {currentUser.role === "admin" && (
                    <>
                      <button
                        onClick={() => setActiveMenu("election")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "election"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Vote className="w-4 h-4" />
                          <span>Public Elections</span>
                        </div>
                        <span className="bg-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {elections.filter((e) => !e.club_id).length}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu("candidates")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "candidates"
                            ? "bg-white/20 text-white font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserCheck className="w-4 h-4" />
                          <span>Candidates</span>
                        </div>
                        <span className="bg-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {elections.reduce(
                            (acc, el) =>
                              acc +
                              getElectionPositions(el).reduce(
                                (pAcc, p) => pAcc + p.candidates.length,
                                0
                              ),
                            0
                          )}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu("voters")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "voters"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users2 className="w-4 h-4" />
                          <span>Manage Users</span>
                        </div>
                        <span className="bg-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {voters.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu("clubs")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "clubs"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Award className="w-4 h-4" />
                          <span>Student Clubs</span>
                        </div>
                        <span className="bg-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {clubs.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu("results")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "results"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <List className="w-4 h-4" />
                          <span>Publish Feed</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveMenu("updates")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "updates"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Megaphone className="w-4 h-4" />
                          <span>Broadcast Socials</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveMenu("profile")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "profile"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveMenu("students")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "students"
                            ? "bg-emerald-500/20 text-emerald-300 font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4" />
                          <span>Students Database</span>
                        </div>
                        <span className="bg-emerald-900/50 text-[10px] px-2 py-0.5 rounded-full font-bold text-emerald-300">
                          {students.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu("verified")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "verified"
                            ? "bg-emerald-500/20 text-emerald-300 font-bold animate-pulse"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verified (Connected)</span>
                        </div>
                        <span className="bg-emerald-900/50 text-[10px] px-2 py-0.5 rounded-full font-bold text-emerald-300">
                          {
                            voters.filter((v) =>
                              students.some(
                                (s) =>
                                  s.email &&
                                  s.email.toLowerCase() ===
                                    v.username.toLowerCase(),
                              ),
                            ).length
                          }
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveMenu("sql_db")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "sql_db"
                            ? "bg-purple-500/20 text-purple-300"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4" />
                          <span>SQL DB Inspector</span>
                        </div>
                      </button>
                    </>
                  )}

                  {currentUser.role === "club_manager" && (
                    <>
                      <button
                        onClick={() => setActiveMenu("club_elections")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "club_elections"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Vote className="w-4 h-4" />
                          <span>My Club Elections</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveMenu("club_members")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "club_members"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users2 className="w-4 h-4" />
                          <span>Club Roster</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveMenu("feed")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "feed"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <List className="w-4 h-4" />
                          <span>Elections Feed</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveMenu("profile")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "profile"
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </div>
                      </button>
                    </>
                  )}

                  {currentUser.role === "voter" && (
                    <>
                      <button
                        onClick={() => setActiveMenu("home")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "home"
                            ? "bg-white/20 text-white font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Home className="w-4 h-4" />
                          <span>Home</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveMenu("elections")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "elections" || activeMenu === "ballot"
                            ? "bg-white/20 text-white font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Vote className="w-4 h-4" />
                          <span>Elections</span>
                        </div>
                        {elections.filter(
                          (e) =>
                            e.status === "active" &&
                            (!e.club_id ||
                              clubMembers.some(
                                (cm) =>
                                  cm.club_id === e.club_id &&
                                  cm.voter_id === currentUser.id,
                              )),
                        ).length > 0 && (
                          <span className="bg-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold text-white">
                            {
                              elections.filter(
                                (e) =>
                                  e.status === "active" &&
                                  (!e.club_id ||
                                    clubMembers.some(
                                      (cm) =>
                                        cm.club_id === e.club_id &&
                                        cm.voter_id === currentUser.id,
                                    )),
                              ).length
                            }
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveMenu("results")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "results"
                            ? "bg-white/20 text-white font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <PieChart className="w-4 h-4" />
                          <span>Election Results</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveMenu("security")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "security"
                            ? "bg-white/20 text-white font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Lock className="w-4 h-4" />
                          <span>Security</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveMenu("profile")}
                        className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          activeMenu === "profile"
                            ? "bg-white/20 text-white font-bold"
                            : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </div>
                      </button>
                    </>
                  )}
                </nav>
              </div>

              {/* DESKTOP SIDEBAR FOOTER */}
              <div className="p-3 bg-blue-950/70 border-t border-blue-900/60 flex items-center justify-between gap-2 text-[10px] text-blue-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-[9px] text-blue-300">CUNIMA E-Democracy</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-blue-300 font-mono">Online</span>
                </div>
              </div>
            </aside>

            {/* MAIN PORTLET CONTAINER */}
            <main className="flex-1 p-4 sm:p-6 md:p-8 pb-28 md:pb-8 max-w-6xl mx-auto w-full overflow-y-auto min-w-0">
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
                  candidatePhoto={candidatePhoto}
                  setCandidatePhoto={setCandidatePhoto}
                  setCandidates={setCandidates}
                  positions={positions}
                  setPositions={setPositions}
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
                  activeTab={activeMenu}
                />
              ) : (
                /* ================== ROUTED GENERAL VOTER PORTAL ================== */
                <VoterDashboard
                  currentUser={currentUser}
                  students={students}
                  elections={elections}
                  clubs={clubs}
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
                  activeTab={activeMenu}
                  onNavigate={(tab) => setActiveMenu(tab)}
                />
              )}
            </main>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Shown for all logged-in roles on small viewports) */}
      {currentUser && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-2 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around"
        >
          {currentUser.role === "voter" && (
            <>
              <button
                onClick={() => setActiveMenu("home")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "home"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Home</span>
              </button>

              <button
                onClick={() => setActiveMenu("elections")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                  activeMenu === "elections" || activeMenu === "ballot"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="relative">
                  <Vote className="w-5 h-5" />
                  {elections.filter(
                    (e) =>
                      e.status === "active" &&
                      (!e.club_id ||
                        clubMembers.some(
                          (cm) =>
                            cm.club_id === e.club_id &&
                            cm.voter_id === currentUser.id,
                        )),
                  ).length > 0 && (
                    <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {
                        elections.filter(
                          (e) =>
                            e.status === "active" &&
                            (!e.club_id ||
                              clubMembers.some(
                                (cm) =>
                                  cm.club_id === e.club_id &&
                                  cm.voter_id === currentUser.id,
                              )),
                        ).length
                      }
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">Elections</span>
              </button>

              <button
                onClick={() => setActiveMenu("results")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "results"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <PieChart className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Results</span>
              </button>

              <button
                onClick={() => setActiveMenu("security")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "security"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Lock className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Security</span>
              </button>

              <button
                onClick={() => setActiveMenu("profile")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "profile"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Profile</span>
              </button>
            </>
          )}

          {currentUser.role === "club_manager" && (
            <>
              <button
                onClick={() => setActiveMenu("club_elections")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "club_elections"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Vote className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Elections</span>
              </button>

              <button
                onClick={() => setActiveMenu("club_members")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "club_members"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Users2 className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Roster</span>
              </button>

              <button
                onClick={() => setActiveMenu("feed")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "feed"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <List className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Feed</span>
              </button>

              <button
                onClick={() => setActiveMenu("profile")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  activeMenu === "profile"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Profile</span>
              </button>
            </>
          )}

          {currentUser.role === "admin" && (
            <>
              <button
                onClick={() => setActiveMenu("election")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                  activeMenu === "election"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="relative">
                  <Vote className="w-5 h-5" />
                  <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] px-1 rounded-full font-bold">
                    {elections.filter((e) => !e.club_id).length}
                  </span>
                </div>
                <span className="text-[10px] tracking-tight">Elections</span>
              </button>

              <button
                onClick={() => setActiveMenu("candidates")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                  activeMenu === "candidates"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="relative">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight">Candidates</span>
              </button>

              <button
                onClick={() => setActiveMenu("students")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                  activeMenu === "students"
                    ? "text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="relative">
                  <Database className="w-5 h-5" />
                  <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] px-1 rounded-full font-bold">
                    {students.length}
                  </span>
                </div>
                <span className="text-[10px] tracking-tight">Students</span>
              </button>

              <button
                onClick={() => setActiveMenu("voters")}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer relative ${
                  activeMenu === "voters"
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="relative">
                  <Users2 className="w-5 h-5" />
                  <span className="absolute -top-1 -right-2 bg-zinc-700 text-white text-[9px] px-1 rounded-full font-bold">
                    {voters.length}
                  </span>
                </div>
                <span className="text-[10px] tracking-tight">Users</span>
              </button>

              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className={`flex-1 min-h-[46px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  [
                    "clubs",
                    "results",
                    "updates",
                    "profile",
                    "verified",
                    "sql_db",
                  ].includes(activeMenu)
                    ? "text-[#0B2D6B] dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/50"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">More</span>
              </button>
            </>
          )}
        </nav>
      )}

      {/* MOBILE EXPANDED DRAWER SHEET */}
      <AnimatePresence>
        {isMobileDrawerOpen && currentUser && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4"
            >
              {/* Decorative Drawer Header Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2D6B] via-[#0f449e] to-[#1565D8] p-4 text-white shadow-md">
                <div className="absolute right-0 top-0 bottom-0 w-28 opacity-20 pointer-events-none flex items-center justify-center">
                  <img
                    src="/images/Home SVG.jpg"
                    alt="Campus Accent"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 bg-white/10 backdrop-blur-xs">
                      <img
                        src={getUserAvatarUrl(
                          students.find((s) => {
                            const cleanU = currentUser.username.trim().toLowerCase();
                            return (
                              s.registration_number.trim().toLowerCase() === cleanU ||
                              (s.email && s.email.trim().toLowerCase() === cleanU) ||
                              `${s.first_name} ${s.surname}`.trim().toLowerCase() === cleanU
                            );
                          })?.gender
                        )}
                        alt="User Profile"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {currentUser.username}
                      </h3>
                      <span className="text-[10px] text-blue-200 uppercase font-mono tracking-wider">
                        {currentUser.role.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 font-mono">
                  Navigation Menu
                </span>

                {currentUser.role === "admin" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => {
                        setActiveMenu("election");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "election"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Vote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Elections</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("candidates");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "candidates"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Candidates</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("students");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "students"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Students DB</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("voters");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "voters"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Users</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("clubs");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "clubs"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Clubs</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("updates");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "updates"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Megaphone className="w-4 h-4 text-purple-500" />
                      <span>Socials</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("results");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "results"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <List className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Publish Feed</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("verified");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "verified"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Verified Sync</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("sql_db");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "sql_db"
                          ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Database className="w-4 h-4 text-purple-500" />
                      <span>SQL Inspector</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("profile");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "profile"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>My Profile</span>
                    </button>
                  </div>
                )}

                {currentUser.role === "club_manager" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => {
                        setActiveMenu("club_elections");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "club_elections"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Vote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Club Elections</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("club_members");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "club_members"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Roster</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("feed");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "feed"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <List className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Feed</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("profile");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "profile"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>My Profile</span>
                    </button>
                  </div>
                )}

                {currentUser.role === "voter" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => {
                        setActiveMenu("home");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "home"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Home Feed</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("elections");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "elections" || activeMenu === "ballot"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Vote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Elections</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("results");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "results"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Results</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("security");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "security"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Security</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("profile");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-left transition-all ${
                        activeMenu === "profile"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0B2D6B] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>My Profile</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Decorative Bottom Banner */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 p-1.5 flex-shrink-0 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50">
                  <img
                    src="/images/election icon.png"
                    alt="Ballot"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    CUNIMA Student Democracy
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    Official voting portal powered by Socrates Engine
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-500" />
                  )}
                  <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL FULL SCREEN LOADER */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none cursor-wait text-center">
          <div className="relative w-36 h-36 flex items-center justify-center animate-[pulse_1.5s_infinite] mb-2">
            <img
              src="/images/campusvote loader.png"
              alt="Loading"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="mt-4 w-32 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-[#1565D8] rounded-full animate-[pulse_1s_infinite]" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {/* CREDENTIALS LOGIN SECURITY WARNING MODAL */}
      {showCredentialsWarningModal && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-5 text-center">
            <div className="w-full h-40 overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 flex items-center justify-center">
              <img
                src="/images/security.jpg"
                alt="Security"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Security Verification
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                u must login with google first to use this feature
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCredentialsWarningModal(false);
                  setShowCredentialsForm(true);
                }}
                className="w-full py-2.5 bg-[#1565D8] hover:bg-blue-900 text-white font-semibold text-xs rounded-full transition-colors cursor-pointer text-center"
              >
                Proceed to Login with Username & Password
              </button>
              <button
                type="button"
                onClick={() => setShowCredentialsWarningModal(false)}
                className="w-full py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST FEEDBACK */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-4 py-3.5 rounded-2xl shadow-xl max-w-xs sm:max-w-sm text-xs font-semibold flex items-center gap-2 border border-zinc-800 dark:border-zinc-200"
          >
            <Info className="w-4 h-4 text-blue-400 dark:text-blue-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
