/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { createClient } from "@supabase/supabase-js";
import { ElectionRow, VoterRow, VoteRow, UpdateRow, UpdateLikeRow, UpdateCommentRow, ClubRow, ClubMemberRow, StudentRow } from "../types.ts";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== "YOUR_SUPABASE_PROJECT_URL");

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// LocalStorage Keys for simulation fallback
const ELECTIONS_KEY = "g_election_elections_table";
const VOTERS_KEY = "g_election_voters_table";
const VOTES_KEY = "g_election_votes_table";
const UPDATES_KEY = "g_election_updates_table";
const UPDATE_LIKES_KEY = "g_election_update_likes_table";
const UPDATE_COMMENTS_KEY = "g_election_update_comments_table";
const CLUBS_KEY = "g_election_clubs_table";
const CLUB_MEMBERS_KEY = "g_election_club_members_table";
const STUDENTS_KEY = "g_election_students_table";

// Helper to get local storage tables
function getLocalTable<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveLocalTable<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Premade users for fallback / initialization
export const PREMADE_ADMIN = { id: "admin-id", username: "admin", password: "admin", role: "admin" };
export const PREMADE_VOTER = { id: "voter-id", username: "voter", password: "voter", role: "voter" };
export const PREMADE_MANAGER = { id: "manager-id", username: "manager", password: "manager", role: "club_manager" };

// Safe initialization function
export async function initializeDatabase() {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check if premade voter exists, if not, create it
      const { data: existingVoter, error: checkError } = await supabase
        .from("voters")
        .select("*")
        .eq("username", "voter")
        .maybeSingle();

      if (!checkError && !existingVoter) {
        await supabase.from("voters").insert({
          id: PREMADE_VOTER.id,
          username: PREMADE_VOTER.username,
          password: PREMADE_VOTER.password,
          created_at: new Date().toLocaleDateString()
        });
      }

      // 2. Check if premade manager exists, if not, create it
      const { data: existingManager, error: managerCheckError } = await supabase
        .from("voters")
        .select("*")
        .eq("username", "manager")
        .maybeSingle();

      if (!managerCheckError && !existingManager) {
        await supabase.from("voters").insert({
          id: PREMADE_MANAGER.id,
          username: PREMADE_MANAGER.username,
          password: PREMADE_MANAGER.password,
          role: "club_manager",
          created_at: new Date().toLocaleDateString()
        });
      }

      // 3. Seed initial club if non-existent
      const { data: existingClubs, error: clubCheckError } = await supabase
        .from("clubs")
        .select("*")
        .limit(1);

      if (!clubCheckError && (!existingClubs || existingClubs.length === 0)) {
        const sampleClubId = "club-sample-debate";
        await supabase.from("clubs").insert({
          id: sampleClubId,
          name: "General Debate Club",
          description: "An elite debating club for active election mock trials.",
          manager_id: PREMADE_MANAGER.id,
          created_at: new Date().toISOString()
        });

        // Also add the voter as a member of this club
        await supabase.from("club_members").insert({
          id: "cm-sample-1",
          club_id: sampleClubId,
          voter_id: PREMADE_VOTER.id
        });
      }

    } catch (err) {
      console.warn("Could not check/insert premade profiles in Supabase. Check if tables exist.", err);
    }
  } else {
    // Local fallback database seeding
    const voters = getLocalTable<VoterRow>(VOTERS_KEY);
    const hasPremadeVoter = voters.some(v => v.username === PREMADE_VOTER.username);
    if (!hasPremadeVoter) {
      voters.push({
        id: PREMADE_VOTER.id,
        username: PREMADE_VOTER.username,
        password: PREMADE_VOTER.password,
        role: "voter",
        created_at: new Date().toLocaleDateString()
      });
    }

    const hasPremadeManager = voters.some(v => v.username === PREMADE_MANAGER.username);
    if (!hasPremadeManager) {
      voters.push({
        id: PREMADE_MANAGER.id,
        username: PREMADE_MANAGER.username,
        password: PREMADE_MANAGER.password,
        role: "club_manager",
        created_at: new Date().toLocaleDateString()
      });
    }
    saveLocalTable(VOTERS_KEY, voters);

    const clubsList = getLocalTable<ClubRow>(CLUBS_KEY);
    if (clubsList.length === 0) {
      const sampleClubId = "club-sample-debate";
      clubsList.push({
        id: sampleClubId,
        name: "General Debate Club",
        description: "An elite debating club for active election mock trials.",
        manager_id: PREMADE_MANAGER.id,
        created_at: new Date().toISOString()
      });
      saveLocalTable(CLUBS_KEY, clubsList);

      const clubMembersList = getLocalTable<ClubMemberRow>(CLUB_MEMBERS_KEY);
      if (clubMembersList.length === 0) {
        clubMembersList.push({
          id: "cm-sample-1",
          club_id: sampleClubId,
          voter_id: PREMADE_VOTER.id
        });
        saveLocalTable(CLUB_MEMBERS_KEY, clubMembersList);
      }
    }
  }
}

// Unified Database CRUD wrapper
export const dbService = {
  // ELECTIONS
  async getElections(): Promise<ElectionRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("elections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<ElectionRow>(ELECTIONS_KEY);
  },

  async insertElection(title: string, description: string, candidates: string[], clubId?: string | null, status: "draft" | "active" | "completed" = "draft"): Promise<ElectionRow> {
    const id = "elec_" + Math.floor(Math.random() * 1000000).toString();
    const newElection: ElectionRow = {
      id,
      title: title.trim(),
      description: description.trim() || "No description provided.",
      status,
      candidates,
      created_at: new Date().toISOString(),
      published: false,
      club_id: clubId || null
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("elections")
        .insert(newElection)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const elections = getLocalTable<ElectionRow>(ELECTIONS_KEY);
    elections.push(newElection);
    saveLocalTable(ELECTIONS_KEY, elections);
    return newElection;
  },

  async updateElection(id: string, updates: Partial<ElectionRow>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("elections")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return;
    }

    const elections = getLocalTable<ElectionRow>(ELECTIONS_KEY);
    const updated = elections.map(el => el.id === id ? { ...el, ...updates } : el);
    saveLocalTable(ELECTIONS_KEY, updated);
  },

  async deleteElection(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("elections")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    }

    let elections = getLocalTable<ElectionRow>(ELECTIONS_KEY);
    elections = elections.filter(el => el.id !== id);
    saveLocalTable(ELECTIONS_KEY, elections);

    // Cascading delete votes
    let votes = getLocalTable<VoteRow>(VOTES_KEY);
    votes = votes.filter(v => v.election_id !== id);
    saveLocalTable(VOTES_KEY, votes);
  },

  // VOTERS
  async getVoters(): Promise<VoterRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("voters")
        .select("*")
        .order("username");
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<VoterRow>(VOTERS_KEY);
  },

  async insertVoter(username: string, password?: string, role: 'voter' | 'club_manager' | 'admin' = 'voter'): Promise<VoterRow> {
    const id = "voter_" + Math.floor(Math.random() * 1000000).toString();
    const newVoter: VoterRow = {
      id,
      username: username.trim(),
      password: password || "voter",
      created_at: new Date().toLocaleDateString(),
      is_blocked: false,
      role
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("voters")
        .insert(newVoter)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new Error(`UNIQUE constraint violation: Voter with username "${username}" already exists.`);
        }
        throw error;
      }
      return data;
    }

    const voters = getLocalTable<VoterRow>(VOTERS_KEY);
    if (voters.some(v => v.username.toLowerCase() === username.trim().toLowerCase())) {
      throw new Error(`UNIQUE constraint violation: Voter with username "${username}" already exists.`);
    }
    voters.push(newVoter);
    saveLocalTable(VOTERS_KEY, voters);
    return newVoter;
  },

  async updateVoter(id: string, updates: Partial<VoterRow>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("voters")
        .update(updates)
        .eq("id", id);
      if (error) {
        if (error.code === "23505") {
          throw new Error(`Username already taken by another user.`);
        }
        throw error;
      }
      return;
    }

    const voters = getLocalTable<VoterRow>(VOTERS_KEY);
    if (updates.username) {
      const exists = voters.some(v => v.id !== id && v.username.toLowerCase() === updates.username!.toLowerCase());
      if (exists) {
        throw new Error(`Username already taken by another user.`);
      }
    }
    const updated = voters.map(v => v.id === id ? { ...v, ...updates } : v);
    saveLocalTable(VOTERS_KEY, updated);
  },

  async deleteVoter(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("voters")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    }

    let voters = getLocalTable<VoterRow>(VOTERS_KEY);
    voters = voters.filter(v => v.id !== id);
    saveLocalTable(VOTERS_KEY, voters);

    // Cascading delete votes
    let votes = getLocalTable<VoteRow>(VOTES_KEY);
    votes = votes.filter(v => v.voter_id !== id);
    saveLocalTable(VOTES_KEY, votes);
  },

  // VOTES (Relational Junction)
  async getVotes(): Promise<VoteRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("votes")
        .select("*");
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<VoteRow>(VOTES_KEY);
  },

  async insertVote(voterId: string, electionId: string, candidate: string): Promise<VoteRow> {
    const id = "vote_" + Math.floor(Math.random() * 1000000).toString();
    const newVote: VoteRow = {
      id,
      voter_id: voterId,
      election_id: electionId,
      candidate,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("votes")
        .insert(newVote)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new Error("You have already cast a vote in this election.");
        }
        throw error;
      }
      return data;
    }

    const votes = getLocalTable<VoteRow>(VOTES_KEY);
    if (votes.some(v => v.voter_id === voterId && v.election_id === electionId)) {
      throw new Error("You have already cast a vote in this election.");
    }
    votes.push(newVote);
    saveLocalTable(VOTES_KEY, votes);
    return newVote;
  },

  // ELECTION UPDATES FEED
  async getUpdates(): Promise<UpdateRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<UpdateRow>(UPDATES_KEY).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async insertUpdate(content: string, author: string): Promise<UpdateRow> {
    const id = "upd_" + Math.floor(Math.random() * 1000000).toString();
    const newUpdate: UpdateRow = {
      id,
      content: content.trim(),
      author: author.trim(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("updates")
        .insert(newUpdate)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const updates = getLocalTable<UpdateRow>(UPDATES_KEY);
    updates.push(newUpdate);
    saveLocalTable(UPDATES_KEY, updates);
    return newUpdate;
  },

  async deleteUpdate(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("updates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    }

    let updates = getLocalTable<UpdateRow>(UPDATES_KEY);
    updates = updates.filter(u => u.id !== id);
    saveLocalTable(UPDATES_KEY, updates);

    let likes = getLocalTable<UpdateLikeRow>(UPDATE_LIKES_KEY);
    likes = likes.filter(l => l.update_id !== id);
    saveLocalTable(UPDATE_LIKES_KEY, likes);

    let comments = getLocalTable<UpdateCommentRow>(UPDATE_COMMENTS_KEY);
    comments = comments.filter(c => c.update_id !== id);
    saveLocalTable(UPDATE_COMMENTS_KEY, comments);
  },

  async getUpdateLikes(updateId: string): Promise<UpdateLikeRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("update_likes")
        .select("*")
        .eq("update_id", updateId);
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<UpdateLikeRow>(UPDATE_LIKES_KEY).filter(l => l.update_id === updateId);
  },

  async toggleLikeUpdate(updateId: string, userId: string, username: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { data: existing, error: checkError } = await supabase
        .from("update_likes")
        .select("*")
        .eq("update_id", updateId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        const { error: deleteError } = await supabase
          .from("update_likes")
          .delete()
          .eq("id", existing.id);
        if (deleteError) throw deleteError;
        return false;
      } else {
        const id = "like_" + Math.floor(Math.random() * 1000000).toString();
        const { error: insertError } = await supabase
          .from("update_likes")
          .insert({ id, update_id: updateId, user_id: userId, username });
        if (insertError) throw insertError;
        return true;
      }
    }

    const likes = getLocalTable<UpdateLikeRow>(UPDATE_LIKES_KEY);
    const index = likes.findIndex(l => l.update_id === updateId && l.user_id === userId);
    if (index > -1) {
      likes.splice(index, 1);
      saveLocalTable(UPDATE_LIKES_KEY, likes);
      return false;
    } else {
      const id = "like_" + Math.floor(Math.random() * 1000000).toString();
      likes.push({ id, update_id: updateId, user_id: userId, username });
      saveLocalTable(UPDATE_LIKES_KEY, likes);
      return true;
    }
  },

  async getUpdateComments(updateId: string): Promise<UpdateCommentRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("update_comments")
        .select("*")
        .eq("update_id", updateId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<UpdateCommentRow>(UPDATE_COMMENTS_KEY)
      .filter(c => c.update_id === updateId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async insertUpdateComment(updateId: string, userId: string, username: string, content: string): Promise<UpdateCommentRow> {
    const id = "comm_" + Math.floor(Math.random() * 1000000).toString();
    const newComment: UpdateCommentRow = {
      id,
      update_id: updateId,
      user_id: userId,
      username,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("update_comments")
        .insert(newComment)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const comments = getLocalTable<UpdateCommentRow>(UPDATE_COMMENTS_KEY);
    comments.push(newComment);
    saveLocalTable(UPDATE_COMMENTS_KEY, comments);
    return newComment;
  },

  // CLUBS
  async getClubs(): Promise<ClubRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<ClubRow>(CLUBS_KEY);
  },

  async insertClub(name: string, description: string, managerId: string | null): Promise<ClubRow> {
    const id = "club_" + Math.floor(Math.random() * 1000000).toString();
    const newClub: ClubRow = {
      id,
      name: name.trim(),
      description: description.trim(),
      manager_id: managerId,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("clubs")
        .insert(newClub)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const clubs = getLocalTable<ClubRow>(CLUBS_KEY);
    clubs.push(newClub);
    saveLocalTable(CLUBS_KEY, clubs);
    return newClub;
  },

  async updateClub(id: string, updates: Partial<ClubRow>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("clubs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return;
    }

    const clubs = getLocalTable<ClubRow>(CLUBS_KEY);
    const updated = clubs.map(c => c.id === id ? { ...c, ...updates } : c);
    saveLocalTable(CLUBS_KEY, updated);
  },

  async deleteClub(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("clubs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    }

    let clubs = getLocalTable<ClubRow>(CLUBS_KEY);
    clubs = clubs.filter(c => c.id !== id);
    saveLocalTable(CLUBS_KEY, clubs);

    let members = getLocalTable<ClubMemberRow>(CLUB_MEMBERS_KEY);
    members = members.filter(m => m.club_id !== id);
    saveLocalTable(CLUB_MEMBERS_KEY, members);
  },

  // CLUB MEMBERS
  async getClubMembers(clubId?: string): Promise<ClubMemberRow[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from("club_members").select("*");
      if (clubId) {
        query = query.eq("club_id", clubId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    const all = getLocalTable<ClubMemberRow>(CLUB_MEMBERS_KEY);
    if (clubId) {
      return all.filter(m => m.club_id === clubId);
    }
    return all;
  },

  async setClubMembers(clubId: string, voterIds: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error: delError } = await supabase
        .from("club_members")
        .delete()
        .eq("club_id", clubId);
      if (delError) throw delError;

      if (voterIds.length > 0) {
        const rowsToInsert = voterIds.map(vId => ({
          id: `cm_${clubId}_${vId}`,
          club_id: clubId,
          voter_id: vId
        }));
        const { error: insError } = await supabase
          .from("club_members")
          .insert(rowsToInsert);
        if (insError) throw insError;
      }
      return;
    }

    let allMembers = getLocalTable<ClubMemberRow>(CLUB_MEMBERS_KEY);
    allMembers = allMembers.filter(m => m.club_id !== clubId);
    voterIds.forEach(vId => {
      allMembers.push({
        id: `cm_${clubId}_${vId}`,
        club_id: clubId,
        voter_id: vId
      });
    });
    saveLocalTable(CLUB_MEMBERS_KEY, allMembers);
  },

  // STUDENTS
  async getStudents(): Promise<StudentRow[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("surname", { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return getLocalTable<StudentRow>(STUDENTS_KEY);
  },

  async insertStudent(student: Omit<StudentRow, 'id' | 'uploaded_at'>): Promise<StudentRow> {
    const id = "stud_" + Math.floor(Math.random() * 1000000).toString();
    const newStudent: StudentRow = {
      ...student,
      id,
      uploaded_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("students")
        .insert({
          id: newStudent.id,
          program_name: newStudent.program_name,
          academic_year: newStudent.academic_year,
          registration_number: newStudent.registration_number,
          cum_number: newStudent.cum_number,
          surname: newStudent.surname,
          first_name: newStudent.first_name,
          gender: newStudent.gender,
          email: newStudent.email || null,
          status: newStudent.status || 'approved'
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = getLocalTable<StudentRow>(STUDENTS_KEY);
    if (local.some(s => s.registration_number.toLowerCase() === student.registration_number.toLowerCase())) {
      throw new Error(`Student with registration number "${student.registration_number}" already exists.`);
    }
    local.push(newStudent);
    saveLocalTable(STUDENTS_KEY, local);
    return newStudent;
  },

  async deleteStudent(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    }
    const local = getLocalTable<StudentRow>(STUDENTS_KEY);
    saveLocalTable(STUDENTS_KEY, local.filter(s => s.id !== id));
  },

  async approveStudent(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("students")
        .update({ status: 'approved' })
        .eq("id", id);
      if (error) throw error;
      return;
    }
    const local = getLocalTable<StudentRow>(STUDENTS_KEY);
    const idx = local.findIndex(s => s.id === id);
    if (idx >= 0) {
      local[idx].status = 'approved';
      saveLocalTable(STUDENTS_KEY, local);
    }
  },

  async linkStudentEmail(id: string, email: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("students")
        .update({ email })
        .eq("id", id);
      if (error) throw error;
      return;
    }
    const local = getLocalTable<StudentRow>(STUDENTS_KEY);
    const idx = local.findIndex(s => s.id === id);
    if (idx >= 0) {
      local[idx].email = email;
      saveLocalTable(STUDENTS_KEY, local);
    }
  },

  async importStudentsBulk(students: Omit<StudentRow, 'id' | 'uploaded_at'>[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const insertPayload = students.map(s => ({
        id: "stud_" + Math.floor(Math.random() * 10000000).toString(),
        program_name: s.program_name,
        academic_year: s.academic_year,
        registration_number: s.registration_number,
        cum_number: s.cum_number,
        surname: s.surname,
        first_name: s.first_name,
        gender: s.gender,
        email: s.email || null,
        status: s.status || 'approved',
        uploaded_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("students")
        .upsert(insertPayload, { onConflict: "registration_number" });
      if (error) throw error;
      return;
    }

    const local = getLocalTable<StudentRow>(STUDENTS_KEY);
    students.forEach(s => {
      const idx = local.findIndex(x => x.registration_number.toLowerCase() === s.registration_number.toLowerCase());
      const row: StudentRow = {
        ...s,
        id: idx >= 0 ? local[idx].id : "stud_" + Math.floor(Math.random() * 1000000).toString(),
        uploaded_at: new Date().toISOString(),
        email: s.email,
        status: s.status || 'approved'
      };
      if (idx >= 0) {
        local[idx] = row;
      } else {
        local.push(row);
      }
    });
    saveLocalTable(STUDENTS_KEY, local);
  },

  // RESET
  async clearAllData(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from("club_members").delete().neq("id", "0");
      await supabase.from("clubs").delete().neq("id", "0");
      await supabase.from("update_comments").delete().neq("id", "0");
      await supabase.from("update_likes").delete().neq("id", "0");
      await supabase.from("updates").delete().neq("id", "0");
      await supabase.from("votes").delete().neq("id", "0");
      await supabase.from("elections").delete().neq("id", "0");
      await supabase.from("voters").delete().neq("id", "0");
      await supabase.from("students").delete().neq("id", "0");
      return;
    }

    localStorage.removeItem(ELECTIONS_KEY);
    localStorage.removeItem(VOTERS_KEY);
    localStorage.removeItem(VOTES_KEY);
    localStorage.removeItem(UPDATES_KEY);
    localStorage.removeItem(UPDATE_LIKES_KEY);
    localStorage.removeItem(UPDATE_COMMENTS_KEY);
    localStorage.removeItem(CLUBS_KEY);
    localStorage.removeItem(CLUB_MEMBERS_KEY);
    localStorage.removeItem(STUDENTS_KEY);
  }
};

// SQL SQL DDL text for copying
export const SUPABASE_SQL_DDL = `-- 1. CREATE VOTERS TABLE
CREATE TABLE IF NOT EXISTS voters (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT,
  is_blocked BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'voter'
);

-- 2. CREATE CLUBS TABLE
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id TEXT REFERENCES voters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CREATE CLUB MEMBERS (JUNCTION) TABLE
CREATE TABLE IF NOT EXISTS club_members (
  id TEXT PRIMARY KEY,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  voter_id TEXT REFERENCES voters(id) ON DELETE CASCADE,
  CONSTRAINT unique_club_member UNIQUE (club_id, voter_id)
);

-- 4. CREATE ELECTIONS TABLE
CREATE TABLE IF NOT EXISTS elections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  candidates TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  published BOOLEAN DEFAULT false,
  published_at TEXT,
  club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL
);

-- 5. CREATE VOTES (JUNCTION) TABLE
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  voter_id TEXT REFERENCES voters(id) ON DELETE CASCADE,
  election_id TEXT REFERENCES elections(id) ON DELETE CASCADE,
  candidate TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_voter_election UNIQUE (voter_id, election_id)
);

-- 6. CREATE UPDATES FEED TABLE
CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CREATE UPDATE LIKES TABLE
CREATE TABLE IF NOT EXISTS update_likes (
  id TEXT PRIMARY KEY,
  update_id TEXT REFERENCES updates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  CONSTRAINT unique_user_update_like UNIQUE (user_id, update_id)
);

-- 8. CREATE UPDATE COMMENTS TABLE
CREATE TABLE IF NOT EXISTS update_comments (
  id TEXT PRIMARY KEY,
  update_id TEXT REFERENCES updates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CREATE STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  cum_number TEXT NOT NULL,
  surname TEXT NOT NULL,
  first_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- Disable Row Level Security (RLS) for testing environment simplicity
ALTER TABLE elections DISABLE ROW LEVEL SECURITY;
ALTER TABLE voters DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE update_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE update_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
ALTER TABLE club_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
`;
