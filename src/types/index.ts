export type UserRole = "admin" | "client" | "prospect"
export type ClientStatus = "prospect" | "active" | "inactive" | "churned"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  profile_id: string | null
  full_name: string
  email: string
  phone: string | null
  company: string | null
  status: ClientStatus
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface QuestionnaireField {
  id: string
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "email" | "phone" | "date"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

export interface Questionnaire {
  id: string
  title: string
  description: string | null
  fields: QuestionnaireField[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface QuestionnaireAssignment {
  id: string
  questionnaire_id: string
  client_id: string
  assigned_by: string
  status: "pending" | "in_progress" | "completed"
  responses: Record<string, unknown>
  completed_at: string | null
  created_at: string
  questionnaire?: Questionnaire
  client?: Client
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
}

export interface Invoice {
  id: string
  client_id: string
  number: string
  amount: number
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  due_date: string | null
  paid_at: string | null
  line_items: InvoiceLineItem[]
  notes: string | null
  created_at: string
  updated_at: string
  client?: Client
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  client_id: string
  subject: string | null
  body: string
  read: boolean
  created_at: string
  sender?: Profile
}

export interface FileRecord {
  id: string
  client_id: string | null
  uploaded_by: string
  name: string
  size: number
  mime_type: string
  storage_path: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  read: boolean
  link: string | null
  created_at: string
}
