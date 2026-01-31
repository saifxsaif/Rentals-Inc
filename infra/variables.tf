variable "vercel_api_token" {
  type        = string
  description = "Vercel API token"
  sensitive   = true
}

variable "vercel_team_id" {
  type        = string
  description = "Optional Vercel team ID"
  default     = null
}

variable "web_project_name" {
  type        = string
  description = "Vercel project name for Next.js web app"
  default     = "rentals-inc-web"
}

variable "api_project_name" {
  type        = string
  description = "Vercel project name for API service"
  default     = "rentals-inc-api"
}

variable "database_url" {
  type        = string
  description = "Postgres connection string (Neon)"
  sensitive   = true
}

variable "grok_api_key" {
  type        = string
  description = "Grok (x.ai) API key for AI document analysis"
  sensitive   = true
}

variable "openai_api_key" {
  type        = string
  description = "OpenAI API key (fallback for AI analysis)"
  sensitive   = true
  default     = ""
}

variable "blob_read_write_token" {
  type        = string
  description = "Vercel Blob read/write token"
  sensitive   = true
  default     = ""
}

variable "api_base_url" {
  type        = string
  description = "API base URL for frontend"
  default     = "https://rentals-inc-api.vercel.app"
}
