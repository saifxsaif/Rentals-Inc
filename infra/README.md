# Infrastructure (Terraform)

This folder contains Terraform configuration for the Rentals Inc infrastructure on Vercel.

## Resources Defined

| Resource | Description |
|----------|-------------|
| `vercel_project.web` | Next.js frontend application |
| `vercel_project.api` | Node.js API with Vercel Functions |
| Environment Variables | DATABASE_URL, GROK_API_KEY, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_API_BASE_URL |

## Environment Variables

### API (`rentals-inc-api`)
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `GROK_API_KEY` - Grok (x.ai) API key for AI document analysis
- `OPENAI_API_KEY` - OpenAI API key (optional fallback)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token

### Web (`rentals-inc-web`)
- `NEXT_PUBLIC_API_BASE_URL` - API endpoint URL

## Usage

### Prerequisites
1. [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) >= 1.5.0
2. Vercel API token from https://vercel.com/account/tokens

### Commands

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan \
  -var="vercel_api_token=YOUR_TOKEN" \
  -var="database_url=postgresql://..." \
  -var="grok_api_key=xai-..." 

# Apply infrastructure
terraform apply \
  -var="vercel_api_token=YOUR_TOKEN" \
  -var="database_url=postgresql://..." \
  -var="grok_api_key=xai-..."
```

### Using a .tfvars file (recommended)

Create `terraform.tfvars`:
```hcl
vercel_api_token = "YOUR_VERCEL_TOKEN"
database_url     = "postgresql://..."
grok_api_key     = "xai-..."
openai_api_key   = "sk-..."  # optional
```

Then run:
```bash
terraform apply
```

## Current Deployment Note

The current production infrastructure was deployed using the Vercel CLI for rapid iteration. This Terraform configuration can be used to:
- Reproduce the infrastructure in a new environment
- Manage infrastructure changes via version control
- Automate deployments via CI/CD pipelines

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel                             │
│  ┌─────────────────┐       ┌─────────────────┐         │
│  │  rentals-inc-web│       │ rentals-inc-api │         │
│  │   (Next.js)     │──────▶│ (Vercel Funcs)  │         │
│  └─────────────────┘       └────────┬────────┘         │
│                                     │                   │
└─────────────────────────────────────┼───────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │   Neon Postgres │
                            │   (Database)    │
                            └─────────────────┘
```
