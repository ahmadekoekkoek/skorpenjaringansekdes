import { createClient } from "@supabase/supabase-js"

// Types
export interface Candidate {
  id: number
  name: string
  education: string
  experience: string
  test_score: string | null
  totalResult: number
  last_updated: string
  next_stage_score?: string | null
}

export interface AppStatus {
  id: number
  status: "not_started" | "ongoing" | "under_correction" | "finished" | "next_stage"
  start_time: string | null
  end_time: string | null
  created_at: string
  has_tie: boolean
}

// Create a single supabase client for the entire app
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Get all candidates
export async function getCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase.from("candidates").select("*").order("id")

  if (error) {
    console.error("Error fetching candidates:", error)
    return []
  }

  // Calculate totalResult for each candidate
  return data.map((candidate) => ({
    ...candidate,
    // Ensure totalResult is always a number
    totalResult: Number(candidate.total_result) || 0,
  }))
}

// Get app status
export async function getAppStatus(): Promise<AppStatus | null> {
  const { data, error } = await supabase
    .from("app_status")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Error fetching app status:", error)
    return null
  }

  return {
    ...data,
    has_tie: data.has_tie || false, // Use the actual has_tie value from the database
  }
}

// Update a candidate
export async function updateCandidate(candidate: Candidate): Promise<boolean> {
  const { error } = await supabase
    .from("candidates")
    .update({
      education: candidate.education,
      experience: candidate.experience,
      test_score: candidate.test_score,
      total_result: candidate.totalResult,
      last_updated: candidate.last_updated,
      next_stage_score: candidate.next_stage_score,
    })
    .eq("id", candidate.id)

  if (error) {
    console.error("Error updating candidate:", error)
    return false
  }

  return true
}

// Update candidate ID (change drawing number)
export async function updateCandidateId(oldId: number, newId: number): Promise<boolean> {
  try {
    // First check if the new ID already exists
    const { data: existingData, error: checkError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", newId)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking if ID exists:", checkError)
      return false
    }

    if (existingData) {
      console.error("Cannot update ID: A candidate with this ID already exists")
      return false
    }

    // Use the SQL function we created
    const { data, error } = await supabase.rpc("update_candidate_id", {
      old_id: oldId,
      new_id: newId,
    })

    if (error) {
      console.error("Error updating candidate ID:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateCandidateId:", error)
    return false
  }
}

// Update app status
export async function updateAppStatus(statusData: Partial<AppStatus>): Promise<boolean> {
  // Now we can include has_tie in the update
  const { error } = await supabase.from("app_status").update(statusData).eq("id", 1)

  if (error) {
    console.error("Error updating app status:", error)
    return false
  }

  return true
}

// Update has_tie - now updates the actual database column
export async function updateHasTie(hasTie: boolean): Promise<boolean> {
  const { error } = await supabase.from("app_status").update({ has_tie: hasTie }).eq("id", 1)

  if (error) {
    console.error("Error updating has_tie:", error)
    return false
  }

  return true
}

// Insert initial candidates
export async function insertCandidates(candidates: Partial<Candidate>[]): Promise<boolean> {
  try {
    // First, delete all existing candidates
    const { error: deleteError } = await supabase.from("candidates").delete().neq("id", 0)

    if (deleteError) {
      console.error("Error deleting existing candidates:", deleteError)
      return false
    }

    // Then insert new candidates with explicit IDs
    const { error } = await supabase.from("candidates").insert(
      candidates.map((candidate, index) => ({
        id: index + 1, // Set initial ID to index + 1
        name: candidate.name,
        education: candidate.education,
        experience: candidate.experience,
        test_score: candidate.test_score,
        total_result: candidate.totalResult,
        last_updated: candidate.last_updated,
        next_stage_score: null, // Initialize next_stage_score as null
      })),
    )

    if (error) {
      console.error("Error inserting candidates:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in insertCandidates:", error)
    return false
  }
}

// Update next stage scores - now using the actual database column
export async function updateNextStageScore(candidateId: number, score: string | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("candidates")
      .update({
        next_stage_score: score,
        last_updated: new Date().toISOString(),
      })
      .eq("id", candidateId)

    if (error) {
      console.error("Error updating next stage score:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateNextStageScore:", error)
    return false
  }
}

// Get candidate by name
export async function getCandidateByName(name: string): Promise<Candidate | null> {
  const { data, error } = await supabase.from("candidates").select("*").eq("name", name).single()

  if (error) {
    console.error("Error fetching candidate by name:", error)
    return null
  }

  if (!data) return null

  return {
    ...data,
    totalResult: Number(data.total_result) || 0,
  }
}
