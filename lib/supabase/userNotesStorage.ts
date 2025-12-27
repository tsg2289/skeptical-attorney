import { createClient } from './client'

export interface UserNote {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
  order: number
}

// Helper to convert snake_case DB response to camelCase frontend format
function mapNoteFromDb(dbNote: any): UserNote {
  return {
    id: dbNote.id,
    content: dbNote.content,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
    order: dbNote.order_index ?? 0
  }
}

export const supabaseUserNotesStorage = {
  // Get all notes for the current user
  async getUserNotes(): Promise<UserNote[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
    
    if (error || !data) {
      console.error('Error fetching user notes:', error)
      return []
    }
    
    return data.map(mapNoteFromDb)
  },

  // Add a new note
  async addNote(content: string): Promise<UserNote | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Get the current max order
    const { data: existingNotes } = await supabase
      .from('user_notes')
      .select('order_index')
      .eq('user_id', user.id)
      .order('order_index', { ascending: false })
      .limit(1)
    
    const nextOrder = existingNotes && existingNotes.length > 0 
      ? (existingNotes[0].order_index || 0) + 1 
      : 0
    
    const { data, error } = await supabase
      .from('user_notes')
      .insert({
        user_id: user.id,
        content: content,
        order_index: nextOrder
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error adding note:', error)
      return null
    }
    
    return mapNoteFromDb(data)
  },

  // Update a note
  async updateNote(noteId: string, content: string): Promise<UserNote | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('user_notes')
      .update({ 
        content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating note:', error)
      return null
    }
    
    return mapNoteFromDb(data)
  },

  // Delete a note
  async deleteNote(noteId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting note:', error)
      return false
    }
    
    return true
  },

  // Reorder notes
  async reorderNotes(noteIds: string[]): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false

    // Update each note with its new order
    const updates = noteIds.map((id, index) => 
      supabase
        .from('user_notes')
        .update({ order_index: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )
    
    const results = await Promise.all(updates)
    const hasError = results.some(r => r.error)
    
    if (hasError) {
      console.error('Error reordering notes')
      return false
    }
    
    return true
  }
}



