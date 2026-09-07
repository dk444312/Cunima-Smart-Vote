/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

export interface ElectionRow {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  candidates: string[]; // JSON representation or parsed array of string candidates
  created_at: string;
  published: boolean;
  published_at?: string;
  club_id?: string | null; // For specific club elections
}

export interface VoterRow {
  id: string;
  username: string;
  password?: string;
  created_at: string;
  is_blocked?: boolean;
  role?: 'voter' | 'club_manager' | 'admin'; // can be regular voter, club_manager, or admin
  guard_locked?: boolean;
}

export interface VoteRow {
  id: string;
  voter_id: string; // Foreign key references VoterRow.id
  election_id: string; // Foreign key references ElectionRow.id
  candidate: string;
  created_at: string;
}

export interface ClubRow {
  id: string;
  name: string;
  description: string;
  manager_id: string | null; // references VoterRow.id
  created_at: string;
}

export interface ClubMemberRow {
  id: string;
  club_id: string;
  voter_id: string;
}

export interface LoggedInUser {
  id: string;
  username: string;
  role: 'admin' | 'voter' | 'club_manager';
  is_blocked?: boolean;
  guard_locked?: boolean;
}

export interface UpdateRow {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface UpdateLikeRow {
  id: string;
  update_id: string;
  user_id: string;
  username: string;
}

export interface UpdateCommentRow {
  id: string;
  update_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  program_name: string;
  academic_year: string;
  registration_number: string;
  cum_number: string;
  surname: string;
  first_name: string;
  gender: string;
  uploaded_at: string;
  email?: string;
  status?: 'pending' | 'approved';
}
