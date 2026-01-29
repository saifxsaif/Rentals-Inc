terraform {
  required_version = ">= 1.5.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = ">= 1.13.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team_id   = var.vercel_team_id
}

resource "vercel_project" "web" {
  name      = var.web_project_name
  framework = "nextjs"
  root_directory = "apps/web"
}

resource "vercel_project" "api" {
  name      = var.api_project_name
  framework = "other"
  root_directory = "apps/api"
}

resource "vercel_project_environment_variable" "api_database_url" {
  project_id = vercel_project.api.id
  key        = "DATABASE_URL"
  value      = var.database_url
  target     = ["development", "preview", "production"]
}

resource "vercel_project_environment_variable" "api_ai_key" {
  project_id = vercel_project.api.id
  key        = "AI_API_KEY"
  value      = var.ai_api_key
  target     = ["development", "preview", "production"]
}

resource "vercel_project_environment_variable" "api_blob_token" {
  project_id = vercel_project.api.id
  key        = "BLOB_READ_WRITE_TOKEN"
  value      = var.blob_read_write_token
  target     = ["development", "preview", "production"]
}
